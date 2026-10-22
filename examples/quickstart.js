'use strict';

/**
 * omnitax-engines — six-engine quickstart.
 *
 * Run from the repository:
 *   node examples/quickstart.js
 *
 * Run from an installed package:
 *   node node_modules/omnitax-engines/examples/quickstart.js
 *
 * Everything below is deterministic and offline. The WORM ledger writes only
 * to the OS temp directory (or OMNITAX_WORM_LEDGER_DIR when set).
 */

const {
  decimalMath,
  statutoryXml,
  gateways,
  wormLedger,
  tenantGuard,
  idempotency
} = require('..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// A minimal valid FatturaPA v1.2.2 invoice (synthetic fixture, no real data).
const fatturaPaXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fattura/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>01234567897</IdCodice></IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>ABC1234</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567897</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Alfa SRL</Denominazione></Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567897</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Beta SPA</Denominazione></Anagrafica>
      </DatiAnagrafici>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2026-10-16</Data>
        <Numero>FATT-2026-001</Numero>
        <ImportoTotaleDocumento>1220.00</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Consulenza fiscale internazionale</Descrizione>
        <Quantita>10.00</Quantita>
        <PrezzoUnitario>100.00</PrezzoUnitario>
        <PrezzoTotale>1000.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>1000.00</ImponibileImporto>
        <Imposta>220.00</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

// 1. Exact minor-unit money math — no floats in the core arithmetic.
const totals = decimalMath.calculateTaxBreakdown({
  baseHt: '1000.00',
  taxRatePct: 22,
  currency: 'EUR'
});
assert(totals.invariantVerified === true, 'tax invariant must hold');
assert(totals.ht === '1000.00' && totals.tva === '220.00' && totals.ttc === '1220.00',
  'unexpected EUR totals');
console.log(`1. money      HT ${totals.ht} + VAT ${totals.tva} = TTC ${totals.ttc}`);

// 2. Rule-based statutory XML validation (implemented subset, offline).
const validation = statutoryXml.validateXmlDocument(fatturaPaXml);
assert(validation.valid === true, 'FatturaPA fixture must validate');
assert(validation.schema === 'FatturaPA_v1.2.2', 'unexpected schema');
console.log(`2. xml        ${validation.schema} valid=${validation.valid}`);

// 3. Offline gateway simulator — no network, no real clearance.
const receipt = gateways.simulateSdiClearance(fatturaPaXml);
assert(receipt.cleared === true, 'SdI simulator must clear the fixture');
assert(receipt.TipoRicevuta === 'RC', 'expected an RC receipt');
console.log(`3. gateway    SdI ${receipt.TipoRicevuta} cleared=${receipt.cleared}`);

// 4. Append-only WORM hash-chain ledger, scoped by tenant.
const block = wormLedger.appendWormRecord({
  tenantId: 'demo-tenant',
  documentId: 'FATT-2026-001',
  eventType: 'SDI_CLEARED',
  jurisdiction: 'IT',
  payload: { invoiceNumber: 'FATT-2026-001', totalTtc: totals.ttc, currency: totals.currency },
  timestampIso: '2026-10-22T00:00:00.000Z'
});
const integrity = wormLedger.verifyChainIntegrity('demo-tenant');
assert(integrity.intact === true, 'WORM chain must verify');
console.log(`4. ledger     block ${block.sequenceIndex} chain intact=${integrity.intact}`);

// 5. Tenant guard rejects unscoped queries and binds the authenticated tenant.
const scoped = tenantGuard.scopeQueryByTenant(
  'SELECT * FROM invoices WHERE tenant_id = $1 AND id = $2',
  ['demo-tenant', 'FATT-2026-001'],
  'demo-tenant'
);
assert(scoped.scoped === true, 'tenant-scoped query must pass');
console.log(`5. tenant     ${scoped.tenantId} query scoped=${scoped.scoped}`);

// 6. Idempotency: first request is NEW, exact replay is REPLAY.
const key = 'quickstart-idem-001';
const payload = { invoice: 'FATT-2026-001', total: totals.ttc };
const payloadHash = idempotency.computePayloadHash(payload);
const first = idempotency.checkIdempotencyKey({ key, tenantId: 'demo-tenant', payloadHash });
assert(first.status === 'NEW', 'first request must be NEW');
idempotency.saveIdempotencyResult({
  key,
  tenantId: 'demo-tenant',
  payloadHash,
  statusCode: 201,
  body: { status: 'CLEARED', invoiceId: 'FATT-2026-001' }
});
const replay = idempotency.checkIdempotencyKey({ key, tenantId: 'demo-tenant', payloadHash });
assert(replay.status === 'REPLAY', 'exact replay must be REPLAY');
console.log(`6. idempotency ${first.status} -> ${replay.status}`);

console.log('\nOK — all six engines ran deterministically and offline.');
