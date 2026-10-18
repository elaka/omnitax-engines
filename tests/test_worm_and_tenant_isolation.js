/**
 * tests/test_worm_and_tenant_isolation.js
 * Comprehensive verification suite for:
 *   1. Cryptographic WORM Merkle / Hash-Chain Ledger (`engines/worm-merkle-ledger.js`)
 *   2. Multi-Tenant Row-Level Security (RLS) Guard (`engines/tenant-rls-guard.js`)
 * MIT License
 */

'use strict';

// NOTE: platform-only openapi_v31_spec tests removed — that module is not part of this standalone repo.
const assert = require('assert');

const {
  GENESIS_HASH,
  canonicalJson,
  computePayloadHash,
  computeEntryHash,
  computeMerkleRoot,
  verifyMerkleProof,
  appendWormRecord,
  verifyChainIntegrity,
  getDocumentProof,
  getAdapter,
  resetLedgerForTesting,
  _simulateDiskTamperForTesting
} = require('../engines/worm-merkle-ledger');

const {
  TENANT_SENSITIVE_TABLES,
  assertTenantContext,
  scopeQueryByTenant,
  verifyCrossTenantIsolation,
  withPostgresTenantRLS,
  getPostgresRLSMigrationSQL
} = require('../engines/tenant-rls-guard');

async function runTests() {
  let passed = 0;

  function check(name, fn) {
    try {
      fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  console.log('=== Track 3 Verification: WORM Merkle Ledger & Multi-Tenant RLS Guard ===');

  // Clean test state
  resetLedgerForTesting();

  // ---------------------------------------------------------------------------
  // PART 1: Cryptographic WORM Hash-Chain & Merkle Ledger
  // ---------------------------------------------------------------------------
  check('1.1 Canonical JSON & deterministic SHA-256 hash primitives', () => {
    const p1 = { b: 200, a: 'TEIF_CLEARED', nested: { z: true, x: 1 } };
    const p2 = { nested: { x: 1, z: true }, a: 'TEIF_CLEARED', b: 200 };
    assert.strictEqual(canonicalJson(p1), canonicalJson(p2));
    assert.strictEqual(computePayloadHash(p1), computePayloadHash(p2));
    assert.strictEqual(GENESIS_HASH.length, 64);
    assert.strictEqual(
      GENESIS_HASH,
      '0000000000000000000000000000000000000000000000000000000000000000'
    );
  });

  check('1.2 Append multiple documents to WORM ledger & verify chain integrity', () => {
    const rec1 = appendWormRecord({
      tenantId: 'tenant_A',
      documentId: 'DOC-A-001',
      eventType: 'TEIF_CLEARED',
      jurisdiction: 'TN',
      payload: { invoiceNumber: 'TN-2026-001', totalTtc: 1190.0, currency: 'TND' },
      timestampIso: '2026-10-16T01:00:00.000Z'
    });

    assert.strictEqual(rec1.sequenceIndex, 1);
    assert.strictEqual(rec1.previousHash, GENESIS_HASH);
    const expectedEntry1 = computeEntryHash({
      sequenceIndex: 1,
      previousHash: GENESIS_HASH,
      tenantId: 'tenant_A',
      documentId: 'DOC-A-001',
      eventType: 'TEIF_CLEARED',
      payloadHash: rec1.payloadHash,
      timestampIso: '2026-10-16T01:00:00.000Z'
    });
    assert.strictEqual(rec1.entryHash, expectedEntry1);

    const rec2 = appendWormRecord({
      tenantId: 'tenant_A',
      documentId: 'DOC-A-002',
      eventType: 'SDI_CLEARED',
      jurisdiction: 'IT',
      payload: { invoiceNumber: 'IT-2026-002', totalTtc: 2440.0, currency: 'EUR' },
      timestampIso: '2026-10-16T01:05:00.000Z'
    });
    assert.strictEqual(rec2.sequenceIndex, 2);
    assert.strictEqual(rec2.previousHash, rec1.entryHash);

    const rec3 = appendWormRecord({
      tenantId: 'tenant_A',
      documentId: 'DOC-A-003',
      eventType: 'ZATCA_CLEARED',
      jurisdiction: 'SA',
      payload: { invoiceNumber: 'SA-2026-003', totalTtc: 5750.0, currency: 'SAR' },
      timestampIso: '2026-10-16T01:10:00.000Z'
    });
    assert.strictEqual(rec3.sequenceIndex, 3);
    assert.strictEqual(rec3.previousHash, rec2.entryHash);
    assert.strictEqual(
      rec3.merkleRoot,
      computeMerkleRoot([rec1.entryHash, rec2.entryHash, rec3.entryHash])
    );

    // Append isolated record for tenant_B
    const recB1 = appendWormRecord({
      tenantId: 'tenant_B',
      documentId: 'DOC-B-001',
      eventType: 'CHORUS_CLEARED',
      jurisdiction: 'FR',
      payload: { invoiceNumber: 'FR-2026-900', totalTtc: 12000.0, currency: 'EUR' },
      timestampIso: '2026-10-16T01:12:00.000Z'
    });
    assert.strictEqual(recB1.sequenceIndex, 1);
    assert.strictEqual(recB1.previousHash, GENESIS_HASH);

    const integrityA = verifyChainIntegrity('tenant_A');
    assert.strictEqual(integrityA.intact, true);
    assert.strictEqual(integrityA.totalBlocks, 3);
    assert.strictEqual(integrityA.genesisHash, GENESIS_HASH);
    assert.strictEqual(integrityA.headHash, rec3.entryHash);
    assert.strictEqual(integrityA.merkleRoot, rec3.merkleRoot);
    assert.strictEqual(integrityA.brokenAtSequence, null);

    const integrityGlobal = verifyChainIntegrity();
    assert.strictEqual(integrityGlobal.intact, true);
    assert.strictEqual(integrityGlobal.totalBlocks, 4);
    assert.strictEqual(integrityGlobal.brokenAtSequence, null);
  });

  check('1.3 SQLite WORM triggers block UPDATE and DELETE with WORM_VIOLATION', () => {
    const adapter = getAdapter();
    assert.throws(
      () => {
        adapter.run("UPDATE worm_audit_chain SET event_type = 'TAMPERED' WHERE sequence_index = 1");
      },
      (err) => err.message.includes('WORM_VIOLATION: Ledger records are immutable')
    );

    assert.throws(
      () => {
        adapter.run('DELETE FROM worm_audit_chain WHERE sequence_index = 1');
      },
      (err) => err.message.includes('WORM_VIOLATION: Ledger records cannot be deleted')
    );
  });

  check('1.4 Document inclusion proof generation & Merkle path verification', () => {
    const proof = getDocumentProof('tenant_A', 'DOC-A-002');
    assert.ok(proof);
    assert.strictEqual(proof.tenantId, 'tenant_A');
    assert.strictEqual(proof.documentId, 'DOC-A-002');
    assert.strictEqual(proof.sequenceIndex, 2);
    assert.strictEqual(proof.proofVerified, true);
    assert.strictEqual(
      verifyMerkleProof(proof.entryHash, proof.merkleProof, proof.currentChainMerkleRoot),
      true
    );
  });

  check('1.5 Simulate tamper attempt & prove verifyChainIntegrity catches exact sequence number', () => {
    // Corrupt block #2 of tenant_A
    _simulateDiskTamperForTesting('tenant_A', 2, {
      payload_json: '{"currency":"EUR","invoiceNumber":"IT-2026-002","totalTtc":999999.99}'
    });

    const tamperedCheck = verifyChainIntegrity('tenant_A');
    assert.strictEqual(tamperedCheck.intact, false);
    assert.strictEqual(tamperedCheck.brokenAtSequence, 2);

    // Verify tenant_B remains completely intact despite tenant_A corruption
    const tenantBCheck = verifyChainIntegrity('tenant_B');
    assert.strictEqual(tenantBCheck.intact, true);
    assert.strictEqual(tenantBCheck.totalBlocks, 1);
    assert.strictEqual(tenantBCheck.brokenAtSequence, null);

    // Restore original payload of block #2 and verify chain returns to intact: true
    _simulateDiskTamperForTesting('tenant_A', 2, {
      payload_json: canonicalJson({
        invoiceNumber: 'IT-2026-002',
        totalTtc: 2440.0,
        currency: 'EUR'
      })
    });
    const restoredCheck = verifyChainIntegrity('tenant_A');
    assert.strictEqual(restoredCheck.intact, true);
    assert.strictEqual(restoredCheck.brokenAtSequence, null);
  });

  // ---------------------------------------------------------------------------
  // PART 2: Multi-Tenant RLS Guard & Cross-Tenant Isolation (Rule 5)
  // ---------------------------------------------------------------------------
  check('2.1 Cross-tenant proof read attempt (tenant_A reading tenant_B document) throws 403 FORBIDDEN_CROSS_TENANT_ACCESS', () => {
    assert.throws(
      () => {
        getDocumentProof('tenant_A', 'DOC-B-001');
      },
      (err) =>
        err.status === 403 &&
        err.code === 'FORBIDDEN_CROSS_TENANT_ACCESS' &&
        err.message.includes('403 FORBIDDEN_CROSS_TENANT_ACCESS')
    );
  });

  check('2.2 verifyCrossTenantIsolation throws 403 FORBIDDEN_CROSS_TENANT_ACCESS on mismatched tenant', () => {
    const tenantBRecord = { id: 'inv_999', tenant_id: 'tenant_B', total: 500 };
    assert.strictEqual(verifyCrossTenantIsolation(tenantBRecord, 'tenant_B'), true);

    assert.throws(
      () => {
        verifyCrossTenantIsolation(tenantBRecord, 'tenant_A');
      },
      (err) =>
        err.status === 403 &&
        err.code === 'FORBIDDEN_CROSS_TENANT_ACCESS' &&
        err.message.includes('403 FORBIDDEN_CROSS_TENANT_ACCESS')
    );
  });

  check('2.3 assertTenantContext blocks missing, wildcard, null/undefined, and SQLi tenant IDs', () => {
    const invalidInputs = [
      '',
      '   ',
      null,
      undefined,
      'undefined',
      'null',
      '*',
      'tenant_*',
      "tenant_A' OR '1'='1",
      'tenant_A; DROP TABLE invoices;--'
    ];
    for (const badId of invalidInputs) {
      assert.throws(
        () => assertTenantContext(badId),
        (err) => err.status === 403 && err.code === 'FORBIDDEN_CROSS_TENANT_ACCESS'
      );
    }

    assert.throws(
      () =>
        appendWormRecord({
          tenantId: '',
          documentId: 'DOC-FAIL',
          eventType: 'TEST',
          payload: {}
        }),
      (err) => err.status === 403 && err.code === 'FORBIDDEN_CROSS_TENANT_ACCESS'
    );
  });

  check('2.4 scopeQueryByTenant rejects unscoped SQL queries on all tenant-sensitive tables', () => {
    for (const table of TENANT_SENSITIVE_TABLES) {
      // Unscoped SELECT without tenant_id predicate
      assert.throws(
        () => {
          scopeQueryByTenant(`SELECT * FROM ${table} WHERE id = ?`, ['id_123'], 'tenant_A');
        },
        (err) =>
          err.status === 403 &&
          err.code === 'FORBIDDEN_CROSS_TENANT_ACCESS' &&
          err.message.includes(table)
      );

      // Query has tenant_id = ? in SQL, but binds tenant_B while context is tenant_A
      assert.throws(
        () => {
          scopeQueryByTenant(
            `SELECT * FROM ${table} WHERE tenant_id = ? AND id = ?`,
            ['tenant_B', 'id_123'],
            'tenant_A'
          );
        },
        (err) => err.status === 403 && err.code === 'FORBIDDEN_CROSS_TENANT_ACCESS'
      );

      // Properly scoped query succeeds
      const valid = scopeQueryByTenant(
        `SELECT * FROM ${table} WHERE tenant_id = ? AND id = ?`,
        ['tenant_A', 'id_123'],
        'tenant_A'
      );
      assert.strictEqual(valid.scoped, true);
      assert.strictEqual(valid.tenantId, 'tenant_A');
    }
  });

  // Test async PostgreSQL RLS transaction wrapper & DDL generator
  const executedPgQueries = [];
  const mockPgClient = {
    async query(sql, params) {
      executedPgQueries.push({ sql, params });
      return { rows: [{ ok: true }] };
    }
  };

  const rlsResult = await withPostgresTenantRLS(mockPgClient, 'tenant_A', async (client, tId) => {
    await client.query('SELECT * FROM invoices WHERE tenant_id = $1', [tId]);
    return 'RLS_TX_COMPLETED';
  });

  check('2.5 withPostgresTenantRLS sets app.current_tenant_id inside transaction & generates RLS DDL', () => {
    assert.strictEqual(rlsResult, 'RLS_TX_COMPLETED');
    assert.strictEqual(executedPgQueries.length, 4);
    assert.strictEqual(executedPgQueries[0].sql, 'BEGIN');
    assert.strictEqual(
      executedPgQueries[1].sql,
      "SELECT set_config('app.current_tenant_id', $1, true)"
    );
    assert.deepStrictEqual(executedPgQueries[1].params, ['tenant_A']);
    assert.strictEqual(executedPgQueries[3].sql, 'COMMIT');

    const ddl = getPostgresRLSMigrationSQL();
    for (const table of TENANT_SENSITIVE_TABLES) {
      assert.ok(ddl.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`));
      assert.ok(ddl.includes(`CREATE POLICY tenant_isolation_policy ON ${table}`));
    }
  });

  // Leave clean seeded verification record in ledger for runtime inspection
  resetLedgerForTesting();
  appendWormRecord({
    tenantId: 'tenant_sovereign_001',
    documentId: 'DOC-GENESIS-SEAL-001',
    eventType: 'SYSTEM_AUDIT_SEAL',
    jurisdiction: 'TN',
    payload: { status: 'VERIFIED', module: 'worm_merkle_ledger' }
  });

  console.log(`\nALL ${passed} TRACK 3 TESTS PASSED (100%).`);
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
