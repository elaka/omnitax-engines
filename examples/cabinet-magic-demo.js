'use strict';

/**
 * omnitax-engines — Real-World Tunisian Cabinet Magic Demo
 *
 * Demonstrates an end-to-end statutory workflow for a Tunisian Accounting Cabinet
 * ("Cabinet Carthage Audit & Conseil SARL"):
 *   1. Standard domestic B2B invoice (19% VAT + mandatory 1.000 TND Timbre Fiscal)
 *   2. Export corridor invoice (TN -> IT, 0% VAT Art. 11 Exemption, Luhn P.IVA)
 *   3. Deliberate IEEE-754 float-drift trap caught by decimalMath + validated into
 *      TEIF v1.8.8 + cleared by TTN sandbox + logged in SHA-256 WORM Merkle ledger.
 *
 * Run directly:
 *   node examples/cabinet-magic-demo.js
 */

const assert = require('assert');

// Safe loader: works both inside repo and when installed as a package
const omnitax = (() => {
  try {
    return require('..');
  } catch {
    return require('omnitax-engines');
  }
})();

const { decimalMath, statutoryXml, gateways, wormLedger } = omnitax;

const TENANT_ID = 'cabinet-carthage-audit';
const CABINET_MF = '1234567A/A/M/000'; // Tunisian Matricule Fiscal [0-9]{7}[A-Z]/[A-Z]/[A-Z]/[0-9]{3}

console.log('='.repeat(78));
console.log('   OMNITAX-ENGINES :: REAL-WORLD TUNISIAN CABINET WORKFLOW DEMO');
console.log('   Zero Float Drift | TEIF v1.8.8 | TTN Sandbox | SHA-256 WORM Ledger');
console.log('='.repeat(78));
console.log(`[Cabinet Context] Tenant: ${TENANT_ID} | Matricule Fiscal: ${CABINET_MF}\n`);

// Reset ledger for clean demo run
if (typeof wormLedger.resetLedgerForTesting === 'function') {
  wormLedger.resetLedgerForTesting();
}

// -----------------------------------------------------------------------------
// 1. INVOICE 1: Standard Domestic B2B Invoice (19% VAT + 1.000 TND Timbre Fiscal)
// -----------------------------------------------------------------------------
console.log('--- 1. STANDARD DOMESTIC B2B INVOICE (TN-2026-0001) ---');

const invoice1Math = decimalMath.calculateTaxBreakdown({
  baseHt: '1000.000',
  taxRatePct: 19,
  stampDuty: '1.000',
  currency: 'TND'
});

assert.strictEqual(invoice1Math.invariantVerified, true);
assert.strictEqual(invoice1Math.ht, '1000.000');
assert.strictEqual(invoice1Math.tva, '190.000');
assert.strictEqual(invoice1Math.stamp, '1.000');
assert.strictEqual(invoice1Math.ttc, '1191.000');

console.log(`[Decimal Math] Base HT:  ${invoice1Math.ht} TND (${invoice1Math.htMinor} millimes)`);
console.log(`[Decimal Math] TVA 19%:  ${invoice1Math.tva} TND (${invoice1Math.tvaMinor} millimes)`);
console.log(`[Decimal Math] Timbre:    ${invoice1Math.stamp} TND (${invoice1Math.stampMinor} millimes)`);
console.log(`[Decimal Math] Total TTC: ${invoice1Math.ttc} TND (${invoice1Math.ttcMinor} millimes)`);
console.log(`[Decimal Math] Invariant HT + TVA + Timbre === TTC: VERIFIED (0 millime drift)`);

const invoice1Xml = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTEIF version="1.8.8">
  <InvoiceHeader>
    <InvoiceNumber>TN-2026-0001</InvoiceNumber>
    <IssueDate>2026-10-23</IssueDate>
    <Currency>TND</Currency>
  </InvoiceHeader>
  <SellerParty>
    <Name>Cabinet Carthage Audit &amp; Conseil SARL</Name>
    <MatriculeFiscal>${CABINET_MF}</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </SellerParty>
  <BuyerParty>
    <Name>Société Atlas Distribution SARL</Name>
    <MatriculeFiscal>7654321B/P/M/000</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </BuyerParty>
  <InvoiceLines>
    <InvoiceLine>
      <LineNumber>1</LineNumber>
      <Description>Audit comptable et commissariat aux comptes - Exercice 2026</Description>
      <LineExtensionAmount>${invoice1Math.ht}</LineExtensionAmount>
    </InvoiceLine>
  </InvoiceLines>
  <TaxSummary>
    <TotalHT>${invoice1Math.ht}</TotalHT>
    <TaxRate>19</TaxRate>
    <TotalTVA>${invoice1Math.tva}</TotalTVA>
    <TimbreFiscal>${invoice1Math.stamp}</TimbreFiscal>
    <TotalTTC>${invoice1Math.ttc}</TotalTTC>
  </TaxSummary>
</InvoiceTEIF>`;

const val1 = statutoryXml.validateXmlDocument(invoice1Xml);
assert.strictEqual(val1.valid, true, `Invoice 1 XML should be valid: ${JSON.stringify(val1.errors)}`);
console.log(`[TEIF v1.8.8] Structural & Arithmetic Validation: VALID (${val1.schema})`);

const ttn1 = gateways.simulateTtnClearance(invoice1Xml);
assert.strictEqual(ttn1.cleared, true);
assert.strictEqual(ttn1.statut, 'ACCEPTE');
console.log(`[TTN Gateway] Statut: ${ttn1.statut} | Clearance Ref: ${ttn1.referenceTTN}`);

const worm1 = wormLedger.appendWormRecord({
  tenantId: TENANT_ID,
  documentId: 'TN-2026-0001',
  eventType: 'TTN_CLEARED',
  jurisdiction: 'TN',
  payload: {
    invoiceNumber: 'TN-2026-0001',
    buyer: 'Société Atlas Distribution SARL',
    totalTtc: invoice1Math.ttc,
    currency: 'TND',
    ttnReference: ttn1.referenceTTN
  }
});
console.log(`[WORM Ledger] Appended Block #${worm1.sequenceIndex} | Hash: ${worm1.entryHash.slice(0, 16)}...\n`);

// -----------------------------------------------------------------------------
// 2. INVOICE 2: Export Corridor Invoice (TN -> IT, 0% VAT Art. 11, No Timbre)
// -----------------------------------------------------------------------------
console.log('--- 2. EXPORT CORRIDOR INVOICE (TN -> IT, ART. 11 EXEMPTION) ---');

// Validate Italian client's Partita IVA using Italian Luhn checksum
const italianVat = '01234567897';
const isPivaValid = statutoryXml.validateItalianPartitaIva(italianVat);
assert.strictEqual(isPivaValid, true);
console.log(`[Client Check] Italian Client P.IVA: ${italianVat} (Luhn Modulo 10 Check: PASS)`);

const invoice2Math = decimalMath.calculateTaxBreakdown({
  baseHt: '3200.000',
  taxRatePct: 0,
  stampDuty: '0.000',
  currency: 'TND'
});

assert.strictEqual(invoice2Math.ht, '3200.000');
assert.strictEqual(invoice2Math.tva, '0.000');
assert.strictEqual(invoice2Math.ttc, '3200.000');

console.log(`[Decimal Math] Export Base HT: ${invoice2Math.ht} TND (0% VAT Corridor)`);
console.log(`[Decimal Math] Total TTC:      ${invoice2Math.ttc} TND (Timbre Fiscal exempt)`);

const invoice2Xml = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTEIF version="1.8.8" exportExempt="true">
  <InvoiceHeader>
    <InvoiceNumber>TN-2026-0002</InvoiceNumber>
    <IssueDate>2026-10-23</IssueDate>
    <Currency>TND</Currency>
    <TaxRegime>Art. 11 Export</TaxRegime>
  </InvoiceHeader>
  <SellerParty>
    <Name>Cabinet Carthage Audit &amp; Conseil SARL</Name>
    <MatriculeFiscal>${CABINET_MF}</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </SellerParty>
  <BuyerParty>
    <Name>Studio Milano Consulenza Fiscale SRL</Name>
    <TaxIdentifier>${italianVat}</TaxIdentifier>
    <CountryCode>IT</CountryCode>
    <ExemptionReason>Art. 11 Export</ExemptionReason>
  </BuyerParty>
  <InvoiceLines>
    <InvoiceLine>
      <LineNumber>1</LineNumber>
      <Description>Audit transfrontalier et structuration fiscale bilatérale Tunisie-Italie</Description>
      <LineExtensionAmount>${invoice2Math.ht}</LineExtensionAmount>
    </InvoiceLine>
  </InvoiceLines>
  <TaxSummary>
    <TotalHT>${invoice2Math.ht}</TotalHT>
    <TaxRate>0</TaxRate>
    <TotalTVA>${invoice2Math.tva}</TotalTVA>
    <TimbreFiscal>0.000</TimbreFiscal>
    <TotalTTC>${invoice2Math.ttc}</TotalTTC>
  </TaxSummary>
</InvoiceTEIF>`;

const val2 = statutoryXml.validateXmlDocument(invoice2Xml);
assert.strictEqual(val2.valid, true, `Invoice 2 XML should be valid: ${JSON.stringify(val2.errors)}`);
console.log(`[TEIF v1.8.8] Export Exemption Validation: VALID (ExportExempt: ${val2.arithmeticAudit.details.exportExempt})`);

const ttn2 = gateways.simulateTtnClearance(invoice2Xml);
assert.strictEqual(ttn2.cleared, true);
assert.strictEqual(ttn2.statut, 'ACCEPTE');
console.log(`[TTN Gateway] Statut: ${ttn2.statut} | Clearance Ref: ${ttn2.referenceTTN}`);

const worm2 = wormLedger.appendWormRecord({
  tenantId: TENANT_ID,
  documentId: 'TN-2026-0002',
  eventType: 'TTN_CLEARED_EXPORT',
  jurisdiction: 'TN',
  payload: {
    invoiceNumber: 'TN-2026-0002',
    buyer: 'Studio Milano Consulenza Fiscale SRL',
    buyerCountry: 'IT',
    buyerVat: italianVat,
    totalTtc: invoice2Math.ttc,
    currency: 'TND',
    ttnReference: ttn2.referenceTTN
  }
});
console.log(`[WORM Ledger] Appended Block #${worm2.sequenceIndex} | Hash: ${worm2.entryHash.slice(0, 16)}...\n`);

// -----------------------------------------------------------------------------
// 3. INVOICE 3: The IEEE-754 Float-Drift Trap & Deterministic Resolution
// -----------------------------------------------------------------------------
console.log('--- 3. IEEE-754 FLOAT-DRIFT TRAP & EXACT RECONCILIATION ---');

// The billing scenario: 3 multi-line consulting deliverables with fractional millimes
// In legacy billing tools using IEEE-754 floats or unconstrained LLMs:
const line1 = 160.333;
const line2 = 240.334;
const line3 = 100.333;

// Naive float calculations:
// In float arithmetic, summing line-by-line VAT with truncation or float rounding causes drift.
// Suppose a naive integration calculated VAT line-by-line and truncated/drifted:
// Line 1: 160.333 * 0.19 = 30.46327 -> 30.463
// Line 2: 240.334 * 0.19 = 45.66346 -> 45.663
// Line 3: 100.333 * 0.19 = 19.06327 -> 19.063
// Naive Sum of Line VATs = 95.189 TND (off by 1 millime from 501.000 * 0.19 = 95.190 TND!)
// Even worse: the legacy system omitted the mandatory 1.000 TND Timbre Fiscal!
const naiveBrokenXml = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTEIF version="1.8.8">
  <InvoiceHeader>
    <InvoiceNumber>TN-2026-0003-TRAP</InvoiceNumber>
    <IssueDate>2026-10-23</IssueDate>
    <Currency>TND</Currency>
  </InvoiceHeader>
  <SellerParty>
    <Name>Cabinet Carthage Audit &amp; Conseil SARL</Name>
    <MatriculeFiscal>${CABINET_MF}</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </SellerParty>
  <BuyerParty>
    <Name>Comptoir Commercial Maghreb SARL</Name>
    <MatriculeFiscal>9876543C/A/M/000</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </BuyerParty>
  <InvoiceLines>
    <InvoiceLine><LineNumber>1</LineNumber><Description>Phase 1</Description><LineExtensionAmount>160.333</LineExtensionAmount></InvoiceLine>
    <InvoiceLine><LineNumber>2</LineNumber><Description>Phase 2</Description><LineExtensionAmount>240.334</LineExtensionAmount></InvoiceLine>
    <InvoiceLine><LineNumber>3</LineNumber><Description>Phase 3</Description><LineExtensionAmount>100.333</LineExtensionAmount></InvoiceLine>
  </InvoiceLines>
  <TaxSummary>
    <TotalHT>501.000</TotalHT>
    <TaxRate>19</TaxRate>
    <!-- Drift trap: line sum was 501.000, but naive system had a 0.010 drift and missing timbre -->
    <TotalTVA>95.170</TotalTVA>
    <TotalTTC>596.170</TotalTTC>
  </TaxSummary>
</InvoiceTEIF>`;

const trapValidation = statutoryXml.validateXmlDocument(naiveBrokenXml);
console.log(`[Trap Caught!] Statutory validation caught arithmetic drift & missing timbre:`);
console.log(`  Valid: ${trapValidation.valid}`);
console.log(`  Errors caught (${trapValidation.errors.length}):`);
for (const err of trapValidation.errors) {
  console.log(`    - [${err.code}] ${err.message}`);
}
assert.strictEqual(trapValidation.valid, false, 'Naive drifted XML must fail statutory validation');

const trapTtn = gateways.simulateTtnClearance(naiveBrokenXml);
assert.strictEqual(trapTtn.cleared, false);
assert.strictEqual(trapTtn.statut, 'REJETE');
console.log(`[TTN Gateway] Statut: ${trapTtn.statut} (Clearance blocked before submission)`);

// Now, resolve deterministically using omnitax-engines reconcileInvoiceLines
console.log(`\n[Deterministic Resolution] Running decimalMath.reconcileInvoiceLines in BigInt minor units...`);
const reconciled = decimalMath.reconcileInvoiceLines(
  [
    { quantity: 1, unitPriceHt: '160.333', taxRatePct: 19, description: 'Audit phase 1' },
    { quantity: 1, unitPriceHt: '240.334', taxRatePct: 19, description: 'Audit phase 2' },
    { quantity: 1, unitPriceHt: '100.333', taxRatePct: 19, description: 'Final report' }
  ],
  { currency: 'TND', stampDuty: '1.000' }
);

assert.strictEqual(reconciled.reconciled, true);
assert.strictEqual(reconciled.driftMinor, 0);
assert.strictEqual(reconciled.ht, '501.000');
assert.strictEqual(reconciled.tva, '95.189');
assert.strictEqual(reconciled.stamp, '1.000');
assert.strictEqual(reconciled.ttc, '597.189');

console.log(`[Reconciled] Reconciled Base HT:  ${reconciled.ht} TND (exact ${reconciled.htMinor} millimes)`);
console.log(`[Reconciled] Reconciled TVA 19%: ${reconciled.tva} TND (exact ${reconciled.tvaMinor} millimes)`);
console.log(`[Reconciled] Reconciled Timbre:   ${reconciled.stamp} TND (exact ${reconciled.stampMinor} millimes)`);
console.log(`[Reconciled] Reconciled Total TTC:${reconciled.ttc} TND (exact ${reconciled.ttcMinor} millimes)`);
console.log(`[Reconciled] Residual Drift:      ${reconciled.driftMinor} millimes (Exact integer math)`);

const invoice3CleanXml = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTEIF version="1.8.8">
  <InvoiceHeader>
    <InvoiceNumber>TN-2026-0003</InvoiceNumber>
    <IssueDate>2026-10-23</IssueDate>
    <Currency>TND</Currency>
  </InvoiceHeader>
  <SellerParty>
    <Name>Cabinet Carthage Audit &amp; Conseil SARL</Name>
    <MatriculeFiscal>${CABINET_MF}</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </SellerParty>
  <BuyerParty>
    <Name>Comptoir Commercial Maghreb SARL</Name>
    <MatriculeFiscal>9876543C/A/M/000</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </BuyerParty>
  <InvoiceLines>
    <InvoiceLine><LineNumber>1</LineNumber><Description>Audit phase 1</Description><LineExtensionAmount>160.333</LineExtensionAmount></InvoiceLine>
    <InvoiceLine><LineNumber>2</LineNumber><Description>Audit phase 2</Description><LineExtensionAmount>240.334</LineExtensionAmount></InvoiceLine>
    <InvoiceLine><LineNumber>3</LineNumber><Description>Final report</Description><LineExtensionAmount>100.333</LineExtensionAmount></InvoiceLine>
  </InvoiceLines>
  <TaxSummary>
    <TotalHT>${reconciled.ht}</TotalHT>
    <TaxRate>19</TaxRate>
    <TotalTVA>${reconciled.tva}</TotalTVA>
    <TimbreFiscal>${reconciled.stamp}</TimbreFiscal>
    <TotalTTC>${reconciled.ttc}</TotalTTC>
  </TaxSummary>
</InvoiceTEIF>`;

const val3 = statutoryXml.validateXmlDocument(invoice3CleanXml);
assert.strictEqual(val3.valid, true, `Invoice 3 clean XML must validate: ${JSON.stringify(val3.errors)}`);
console.log(`[TEIF v1.8.8] Reconciled XML Validation: VALID (${val3.schema})`);

const ttn3 = gateways.simulateTtnClearance(invoice3CleanXml);
assert.strictEqual(ttn3.cleared, true);
assert.strictEqual(ttn3.statut, 'ACCEPTE');
console.log(`[TTN Gateway] Statut: ${ttn3.statut} | Clearance Ref: ${ttn3.referenceTTN}`);

const worm3 = wormLedger.appendWormRecord({
  tenantId: TENANT_ID,
  documentId: 'TN-2026-0003',
  eventType: 'TTN_CLEARED_RECONCILED',
  jurisdiction: 'TN',
  payload: {
    invoiceNumber: 'TN-2026-0003',
    buyer: 'Comptoir Commercial Maghreb SARL',
    totalTtc: reconciled.ttc,
    currency: 'TND',
    ttnReference: ttn3.referenceTTN,
    mathMode: 'exact_minor_unit_millimes'
  }
});
console.log(`[WORM Ledger] Appended Block #${worm3.sequenceIndex} | Hash: ${worm3.entryHash.slice(0, 16)}...\n`);

// -----------------------------------------------------------------------------
// 4. CRYPTOGRAPHIC AUDIT: Hash-Chain Integrity & Merkle Proof Receipt
// -----------------------------------------------------------------------------
console.log('--- 4. CRYPTOGRAPHIC WORM AUDIT & MERKLE INCLUSION RECEIPT ---');

const integrity = wormLedger.verifyChainIntegrity(TENANT_ID);
assert.strictEqual(integrity.intact, true);
assert.strictEqual(integrity.totalBlocks, 3);
console.log(`[Hash Chain] Tenant Chain Intact: ${integrity.intact}`);
console.log(`[Hash Chain] Total Blocks Sealed:  ${integrity.totalBlocks}`);
console.log(`[Hash Chain] Head Hash:           ${integrity.headHash}`);
console.log(`[Hash Chain] Merkle Root:         ${integrity.merkleRoot}`);

const proofDoc3 = wormLedger.getDocumentProof(TENANT_ID, 'TN-2026-0003');
assert.strictEqual(proofDoc3.proofVerified, true);
console.log(`\n[Merkle Receipt for TN-2026-0003]`);
console.log(`  Sequence Index:   #${proofDoc3.sequenceIndex}`);
console.log(`  Document ID:      ${proofDoc3.documentId}`);
console.log(`  Entry Hash:       ${proofDoc3.entryHash}`);
console.log(`  Previous Hash:    ${proofDoc3.previousHash}`);
console.log(`  Payload Hash:     ${proofDoc3.payloadHash}`);
console.log(`  Merkle Path Len:  ${proofDoc3.merkleProof.length} sibling(s)`);
console.log(`  Cryptographic Proof Verified: ${proofDoc3.proofVerified}`);

console.log('\n' + '='.repeat(78));
console.log('   DEMO COMPLETED SUCCESSFULLY: 3/3 INVOICES CLEARED & AUDIT SEALED');
console.log('='.repeat(78));
