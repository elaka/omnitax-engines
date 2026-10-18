'use strict';

// NOTE: platform-only environment_mode.middleware (commercial billing gate) tests removed — that module is not part of this standalone repo.
const assert = require('assert');
const {
  getCurrencyDecimals,
  toMinorUnits,
  fromMinorUnits,
  calculateTaxBreakdown,
  reconcileInvoiceLines
} = require('../engines/decimal-math');

const {
  handleIdempotency,
  checkIdempotencyKey,
  saveIdempotencyResult,
  clearExpiredKeys,
  computePayloadHash,
  storeEngine
} = require('../engines/idempotency');

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    bodyStr: '',
    ended: false,
    setHeader(k, v) {
      headers[k] = v;
    },
    getHeader(k) {
      return headers[k];
    },
    writeHead(code, hdrs = {}) {
      this.statusCode = code;
      for (const [k, v] of Object.entries(hdrs)) {
        headers[k] = v;
      }
    },
    write(chunk) {
      this.bodyStr += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    },
    end(chunk = '') {
      if (chunk) {
        this.bodyStr += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      }
      this.ended = true;
    }
  };
}

function runSuite() {
  console.log('=== Track 1 Test Suite: Decimal Math & Idempotency ===');

  // ---------------------------------------------------------------------------
  // 1. Currency Decimals & Canonical Conversions
  // ---------------------------------------------------------------------------
  const twoDec = ['EUR', 'USD', 'GBP', 'MAD', 'SAR', 'AED', 'EGP', 'CHF', 'CAD'];
  for (const c of twoDec) {
    assert.strictEqual(getCurrencyDecimals(c), 2, `Expected 2 decimals for ${c}`);
  }
  const threeDec = ['TND', 'KWD', 'OMR', 'BHD'];
  for (const c of threeDec) {
    assert.strictEqual(getCurrencyDecimals(c), 3, `Expected 3 decimals for ${c}`);
  }

  assert.strictEqual(toMinorUnits('160.000', 'TND'), 160000);
  assert.strictEqual(toMinorUnits(160, 'TND'), 160000);
  assert.strictEqual(fromMinorUnits(160000, 'TND').formatted, '160.000');
  assert.strictEqual(fromMinorUnits(160000, 'TND').value, 160);
  assert.strictEqual(String(fromMinorUnits(160000, 'TND')), '160.000');

  assert.strictEqual(toMinorUnits('49.00', 'EUR'), 4900);
  assert.strictEqual(toMinorUnits(49, 'EUR'), 4900);
  assert.strictEqual(fromMinorUnits(4900, 'EUR').formatted, '49.00');
  assert.strictEqual(fromMinorUnits(4900, 'EUR').value, 49);

  // Classic IEEE-754 float trap: 0.1 + 0.2 = 0.30000000000000004, 19.99 * 100 = 1998.9999999999998
  assert.strictEqual(toMinorUnits(19.99, 'EUR'), 1999);
  assert.strictEqual(toMinorUnits('19.995', 'TND'), 19995);

  console.log('[PASS] Currency scale and minor-unit conversions verified (2-decimal & 3-decimal).');

  // ---------------------------------------------------------------------------
  // 2. 1,000 Randomized Invoice Combinations (EUR & TND) — Zero Drift Proof
  // ---------------------------------------------------------------------------
  const taxRates = [0, 5.5, 7, 10, 13, 19, 20, 22];
  const whtRates = [0, 1, 1.5, 3, 5, 10, 15];
  let seed = 133742;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 1000; i += 1) {
    const currency = i % 2 === 0 ? 'EUR' : 'TND';
    const decimals = getCurrencyDecimals(currency);
    const scale = 10 ** decimals;

    // Single-breakdown check
    const rawAmount = (nextRand() * 50000 + 0.001).toFixed(decimals + 2);
    const taxRatePct = taxRates[Math.floor(nextRand() * taxRates.length)];
    const whtRatePct = whtRates[Math.floor(nextRand() * whtRates.length)];
    const stampDuty = currency === 'TND' ? '1.000' : '0.00';

    const bd = calculateTaxBreakdown({
      baseHt: rawAmount,
      taxRatePct,
      stampDuty,
      withholdingRatePct: whtRatePct,
      currency
    });

    assert.strictEqual(
      bd.htMinor + bd.tvaMinor + bd.stampMinor,
      bd.ttcMinor,
      `Invariant failure at iteration ${i} (${currency})`
    );
    assert.strictEqual(
      bd.ttcMinor - bd.whtMinor,
      bd.netPayableMinor,
      `Net payable invariant failure at iteration ${i} (${currency})`
    );

    // Verify major formatted string arithmetic matches minor units with 0.000 drift
    const htMajorScaled = Math.round(Number(bd.ht) * scale);
    const tvaMajorScaled = Math.round(Number(bd.tva) * scale);
    const stampMajorScaled = Math.round(Number(bd.stamp) * scale);
    const ttcMajorScaled = Math.round(Number(bd.ttc) * scale);
    assert.strictEqual(
      htMajorScaled + tvaMajorScaled + stampMajorScaled - ttcMajorScaled,
      0,
      `Formatted drift detected at iteration ${i}`
    );

    // Multi-line invoice reconciliation check
    const lineCount = (i % 5) + 1;
    const lines = [];
    for (let l = 0; l < lineCount; l += 1) {
      lines.push({
        description: `Item ${l + 1}`,
        quantity: Number((nextRand() * 25 + 1).toFixed(2)),
        unitPriceHt: (nextRand() * 1200 + 0.05).toFixed(decimals + 1),
        taxRatePct: taxRates[(i + l) % taxRates.length]
      });
    }

    const reconciled = reconcileInvoiceLines(lines, {
      currency,
      stampDuty,
      discountHt: 0,
      withholdingRatePct: whtRatePct
    });

    assert.strictEqual(reconciled.driftMinor, 0, `Line drift at iteration ${i}`);
    assert.strictEqual(
      reconciled.htMinor + reconciled.tvaMinor + reconciled.stampMinor,
      reconciled.ttcMinor,
      `Reconciled total mismatch at iteration ${i}`
    );
  }

  console.log('[PASS] 1,000 randomized invoice combinations across EUR and TND verified with 0.000 drift.');

  // ---------------------------------------------------------------------------
  // 3. Idempotency Middleware Verification
  // ---------------------------------------------------------------------------
  storeEngine.clearAll();

  // 3a. Pass-through when no Idempotency-Key header is present
  const reqNoKey = {
    method: 'POST',
    url: '/api/v1/invoices',
    headers: {}
  };
  const resNoKey = createMockRes();
  const passResult = handleIdempotency(reqNoKey, resNoKey, '{"amount":160}', 'tenant_tn_1');
  assert.strictEqual(passResult.intercepted, false);
  assert.strictEqual(passResult.action, 'PASS_THROUGH');

  // 3b. First execution with Idempotency-Key -> acquires IN_PROGRESS lock, then saves on res.end
  const idemKey = 'idem_key_tn_001';
  const payload1 = JSON.stringify({ invoiceNumber: 'INV-2026-001', baseHt: '160.000', currency: 'TND' });
  const reqFirst = {
    method: 'POST',
    url: '/api/v1/invoices',
    headers: { 'Idempotency-Key': idemKey }
  };
  const resFirst = createMockRes();
  const firstStep = handleIdempotency(reqFirst, resFirst, payload1, 'tenant_tn_1');
  assert.strictEqual(firstStep.intercepted, false);
  assert.strictEqual(firstStep.action, 'ACQUIRED');

  // 3c. Concurrent in-flight request while first request has NOT called res.end yet -> 409 Conflict
  const reqConcurrent = {
    method: 'POST',
    url: '/api/v1/invoices',
    headers: { 'Idempotency-Key': idemKey }
  };
  const resConcurrent = createMockRes();
  const conflictStep = handleIdempotency(reqConcurrent, resConcurrent, payload1, 'tenant_tn_1');
  assert.strictEqual(conflictStep.intercepted, true);
  assert.strictEqual(conflictStep.statusCode, 409);
  assert.strictEqual(resConcurrent.statusCode, 409);
  const conflictBody = JSON.parse(resConcurrent.bodyStr);
  assert.strictEqual(conflictBody.error, 'IDEMPOTENCY_CONFLICT');

  // Complete the first request
  resFirst.writeHead(201, { 'Content-Type': 'application/json' });
  resFirst.end(JSON.stringify({ status: 'CLEARED', invoiceId: 'inv_999', ttc: '191.400' }));

  // 3d. Exact replay with same Idempotency-Key and same payload -> replays 201 + X-Idempotent-Replay: true
  const reqReplay = {
    method: 'POST',
    url: '/api/v1/invoices',
    headers: { 'x-idempotency-key': idemKey }
  };
  const resReplay = createMockRes();
  const replayStep = handleIdempotency(reqReplay, resReplay, payload1, 'tenant_tn_1');
  assert.strictEqual(replayStep.intercepted, true);
  assert.strictEqual(replayStep.replayed, true);
  assert.strictEqual(replayStep.statusCode, 201);
  assert.strictEqual(resReplay.statusCode, 201);
  assert.strictEqual(resReplay.getHeader('X-Idempotent-Replay'), 'true');
  const replayBody = JSON.parse(resReplay.bodyStr);
  assert.strictEqual(replayBody.invoiceId, 'inv_999');
  assert.strictEqual(replayBody.ttc, '191.400');

  // 3e. Payload mismatch with same Idempotency-Key -> 422 Unprocessable Entity
  const mutatedPayload = JSON.stringify({ invoiceNumber: 'INV-2026-001', baseHt: '999.000', currency: 'TND' });
  const reqMismatch = {
    method: 'POST',
    url: '/api/v1/invoices',
    headers: { 'Idempotency-Key': idemKey }
  };
  const resMismatch = createMockRes();
  const mismatchStep = handleIdempotency(reqMismatch, resMismatch, mutatedPayload, 'tenant_tn_1');
  assert.strictEqual(mismatchStep.intercepted, true);
  assert.strictEqual(mismatchStep.statusCode, 422);
  assert.strictEqual(resMismatch.statusCode, 422);
  const mismatchBody = JSON.parse(resMismatch.bodyStr);
  assert.strictEqual(mismatchBody.error, 'IDEMPOTENCY_KEY_MISMATCH');

  // 3f. Direct store methods + TTL expiry check
  const directHash = computePayloadHash('tenant_tn_2', 'POST', '/api/v1/pay', '{"a":1}');
  const directCheck = checkIdempotencyKey({
    key: 'expiring_key_1',
    tenantId: 'tenant_tn_2',
    payloadHash: directHash,
    ttlMs: 10
  });
  assert.strictEqual(directCheck.status, 'NEW');
  saveIdempotencyResult({
    key: 'expiring_key_1',
    tenantId: 'tenant_tn_2',
    payloadHash: directHash,
    statusCode: 200,
    body: { ok: true }
  });
  const purgedCount = clearExpiredKeys(Date.now() + 5000);
  assert.ok(purgedCount >= 1, 'Expected expired key to be purged');

  console.log('[PASS] Idempotency middleware verified (First Execution, Replay, 422 Mismatch, 409 Conflict, TTL).');

  console.log('=== ALL TRACK 1 TESTS PASSED (100%) ===');
}

runSuite();
