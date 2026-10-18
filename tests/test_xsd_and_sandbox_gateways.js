'use strict';

const assert = require('assert');
const {
  validateXmlDocument,
  validateItalianPartitaIva,
  validateTunisianMatriculeFiscal,
  validateSaudiVatNumber,
  encodeZatcaTlvQr
} = require('../engines/statutory-xml-validator');
const {
  simulateSdiClearance,
  simulateTtnClearance,
  simulateZatcaClearance,
  simulateEtaClearance,
  simulateGatewayClearance
} = require('../engines/gateway-simulator');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failed++;
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

console.log('=== Track 2: Statutory XSD Schema Validation & Sandbox Gateway Simulator Tests ===\n');

// ---------------------------------------------------------------------------
// 1. Italy FatturaPA v1.2.2 & SdI Collaudo Sandbox
// ---------------------------------------------------------------------------
const validFatturaPaXml = `<?xml version="1.0" encoding="UTF-8"?>
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

test('Italy FatturaPA v1.2.2: valid XML passes XSD, Luhn P.IVA, and SdI RC receipt', () => {
  assert.strictEqual(validateItalianPartitaIva('01234567897'), true);
  assert.strictEqual(validateItalianPartitaIva('01234567890'), false);

  const res = validateXmlDocument(validFatturaPaXml);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.schema, 'FatturaPA_v1.2.2');
  assert.strictEqual(res.version, '1.2.2');
  assert.strictEqual(res.errors.length, 0);
  assert.strictEqual(res.arithmeticAudit.passed, true);

  const sdi = simulateSdiClearance(validFatturaPaXml);
  assert.strictEqual(sdi.cleared, true);
  assert.strictEqual(sdi.TipoRicevuta, 'RC');
  assert.ok(sdi.receiptXml.includes('<ns2:RicevutaConsegna'));
});

test('Italy FatturaPA v1.2.2: missing Natura with 0.00% IVA triggers SdI error 00427 and invalid P.IVA triggers 00311', () => {
  const invalidFatturaPa = validFatturaPaXml
    .replace('<IdCodice>01234567897</IdCodice>', '<IdCodice>01234567897</IdCodice>')
    .replace(
      '<CedentePrestatore>\n      <DatiAnagrafici>\n        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567897</IdCodice></IdFiscaleIVA>',
      '<CedentePrestatore>\n      <DatiAnagrafici>\n        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA>'
    )
    .replace(/<AliquotaIVA>22\.00<\/AliquotaIVA>/g, '<AliquotaIVA>0.00</AliquotaIVA>')
    .replace('<Imposta>220.00</Imposta>', '<Imposta>0.00</Imposta>')
    .replace('<ImportoTotaleDocumento>1220.00</ImportoTotaleDocumento>', '<ImportoTotaleDocumento>1000.00</ImportoTotaleDocumento>');

  const sdi = simulateSdiClearance(invalidFatturaPa);
  assert.strictEqual(sdi.cleared, false);
  assert.strictEqual(sdi.TipoRicevuta, 'NS');
  const codes = sdi.ListaErrori.map((e) => e.Codice);
  assert.ok(codes.includes('00311'), 'Expected error 00311 for invalid Partita IVA');
  assert.ok(codes.includes('00427'), 'Expected error 00427 for missing Natura on zero IVA');
  assert.ok(sdi.receiptXml.includes('<ns2:NotificaScarto'));
});

test('Italy FatturaPA v1.2.2: arithmetic mismatch triggers SdI error 00423 & duplicate triggers 00404', () => {
  const badMathXml = validFatturaPaXml.replace('<Imposta>220.00</Imposta>', '<Imposta>199.00</Imposta>');
  const sdiMath = simulateSdiClearance(badMathXml);
  assert.strictEqual(sdiMath.TipoRicevuta, 'NS');
  assert.ok(sdiMath.ListaErrori.some((e) => e.Codice === '00423'));

  const sdiDup = simulateSdiClearance(validFatturaPaXml, { isDuplicate: true });
  assert.strictEqual(sdiDup.TipoRicevuta, 'NS');
  assert.ok(sdiDup.ListaErrori.some((e) => e.Codice === '00404'));
});

// ---------------------------------------------------------------------------
// 2. Tunisia TEIF v1.8.8 & TTN El Fatoora Sandbox
// ---------------------------------------------------------------------------
const validTeifXml = `<?xml version="1.0" encoding="UTF-8"?>
<InvoiceTEIF version="1.8.8">
  <InvoiceHeader>
    <InvoiceNumber>TN-2026-0042</InvoiceNumber>
    <IssueDate>2026-10-16</IssueDate>
    <Currency>TND</Currency>
  </InvoiceHeader>
  <SellerParty>
    <Name>Société Tunisienne Tech SARL</Name>
    <MatriculeFiscal>1234567A/A/M/000</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </SellerParty>
  <BuyerParty>
    <Name>Client Carthage SA</Name>
    <MatriculeFiscal>7654321B/P/M/000</MatriculeFiscal>
    <CountryCode>TN</CountryCode>
  </BuyerParty>
  <InvoiceLines>
    <InvoiceLine>
      <LineNumber>1</LineNumber>
      <Description>Licence SaaS Annuelle</Description>
      <LineExtensionAmount>1000.000</LineExtensionAmount>
    </InvoiceLine>
  </InvoiceLines>
  <TaxSummary>
    <TotalHT>1000.000</TotalHT>
    <TaxRate>19</TaxRate>
    <TotalTVA>190.000</TotalTVA>
    <TimbreFiscal>1.000</TimbreFiscal>
    <TotalTTC>1191.000</TotalTTC>
  </TaxSummary>
</InvoiceTEIF>`;

test('Tunisia TEIF v1.8.8: valid XML passes Matricule Fiscal, TimbreFiscal 1.000 TND, and TTN ACCEPTE', () => {
  assert.strictEqual(validateTunisianMatriculeFiscal('1234567A/A/M/000'), true);
  assert.strictEqual(validateTunisianMatriculeFiscal('INVALID-MF'), false);

  const ttn = simulateTtnClearance(validTeifXml);
  assert.strictEqual(ttn.cleared, true);
  assert.strictEqual(ttn.statut, 'ACCEPTE');
  assert.ok(ttn.referenceTTN && ttn.referenceTTN.startsWith('TTN-SBX-'));
  assert.strictEqual(ttn.erreurs.length, 0);
});

test('Tunisia TEIF v1.8.8: invalid Matricule Fiscal & missing TimbreFiscal trigger official TTN rejection codes', () => {
  const invalidTeifXml = validTeifXml
    .replace('<MatriculeFiscal>1234567A/A/M/000</MatriculeFiscal>', '<MatriculeFiscal>99999/BAD</MatriculeFiscal>')
    .replace('<TimbreFiscal>1.000</TimbreFiscal>', '');

  const ttn = simulateTtnClearance(invalidTeifXml);
  assert.strictEqual(ttn.cleared, false);
  assert.strictEqual(ttn.statut, 'REJETE');
  const errCodes = ttn.erreurs.map((e) => e.code);
  assert.ok(errCodes.includes('ERR_TEIF_02_MATRICULE_FISCAL'), 'Expected ERR_TEIF_02_MATRICULE_FISCAL');
  assert.ok(errCodes.includes('ERR_TEIF_03_TIMBRE_1000_MILLIMES'), 'Expected ERR_TEIF_03_TIMBRE_1000_MILLIMES');
});

// ---------------------------------------------------------------------------
// 3. Saudi Arabia ZATCA Phase 2 UBL 2.1 & Fatoora Sandbox
// ---------------------------------------------------------------------------
const validZatcaQr = encodeZatcaTlvQr({
  1: 'Al Riyadh Trading Co',
  2: '300000000000003',
  3: '2026-10-16T01:00:00Z',
  4: '1150.00',
  5: '150.00',
  6: 'aGFzaC1vZi14bWwtaW52b2ljZQ==',
  7: 'ZWNkc2Etc2lnbmF0dXJlLWJ5dGVz',
  8: 'ZWNkc2EtcHVibGljLWtleS1ieXRlcw==',
  9: 'Y2Etc3RhbXAtc2lnbmF0dXJl'
});

const validZatcaXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>clearance:1.0</cbc:ProfileID>
  <cbc:ID>SME00042</cbc:ID>
  <cbc:UUID>8e6000cf-1a98-4174-b3e7-b5d5954bc10d</cbc:UUID>
  <cbc:IssueDate>2026-10-16</cbc:IssueDate>
  <cbc:InvoiceTypeCode name="0100000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>42</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjZjljMmJj</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${validZatcaQr}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>300000000000003</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>311111111111113</cbc:CompanyID>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">150.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">1000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">150.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">1000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">1150.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">1150.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

test('Saudi ZATCA Phase 2 UBL 2.1: valid XML with 15-digit TIN & Phase 2 TLV QR Tags 1-9 clears sandbox', () => {
  assert.strictEqual(validateSaudiVatNumber('300000000000003'), true);
  assert.strictEqual(validateSaudiVatNumber('200000000000003'), false);

  const zatca = simulateZatcaClearance(validZatcaXml);
  assert.strictEqual(zatca.cleared, true);
  assert.strictEqual(zatca.clearanceStatus, 'CLEARED');
  assert.strictEqual(zatca.validationResults.errorMessages.length, 0);
  assert.ok(zatca.clearedInvoice && zatca.clearedInvoice.length > 50);
});

test('Saudi ZATCA Phase 2 UBL 2.1: invalid 15-digit TIN and incomplete Phase 1 QR trigger REJECTED', () => {
  const phase1OnlyQr = encodeZatcaTlvQr({
    1: 'Al Riyadh Trading Co',
    2: '300000000000003',
    3: '2026-10-16T01:00:00Z',
    4: '1150.00',
    5: '150.00'
  });

  const invalidZatcaXml = validZatcaXml
    .replace('<cbc:CompanyID>300000000000003</cbc:CompanyID>', '<cbc:CompanyID>123456789012345</cbc:CompanyID>')
    .replace(validZatcaQr, phase1OnlyQr);

  const zatca = simulateZatcaClearance(invalidZatcaXml);
  assert.strictEqual(zatca.cleared, false);
  assert.strictEqual(zatca.clearanceStatus, 'REJECTED');
  const codes = zatca.validationResults.errorMessages.map((e) => e.code);
  assert.ok(codes.includes('BR-KSA-39'), 'Expected BR-KSA-39 for invalid 15-digit VAT number');
  assert.ok(codes.includes('BR-KSA-27'), 'Expected BR-KSA-27 for missing Phase 2 QR tags 6..9');
});

// ---------------------------------------------------------------------------
// 4. EU / France Peppol BIS Billing 3.0 (FacturX_UBL_BIS3)
// ---------------------------------------------------------------------------
const validPeppolXml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>FR-2026-900</cbc:ID>
  <cbc:IssueDate>2026-10-16</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0009">12345678900012</cbc:EndpointID>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Hexagone SAS</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0009">98765432100019</cbc:EndpointID>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>Lumiere Lyon SARL</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">200.00</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">1000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">1200.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="EUR">1200.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>
  </cac:InvoiceLine>
</Invoice>`;

test('EU Peppol BIS 3.0: valid UBL 2.1 invoice passes EN 16931 BR rules & arithmetic audit', () => {
  const res = simulateGatewayClearance({ country: 'FR', documentContent: validPeppolXml });
  assert.strictEqual(res.cleared, true);
  assert.strictEqual(res.validation.schema, 'FacturX_UBL_BIS3');
  assert.strictEqual(res.validation.arithmeticAudit.passed, true);
});

test('EU Peppol BIS 3.0: missing EndpointID & broken line total trigger PEPPOL-EN16931-R020 & BR-CO-10', () => {
  const invalidPeppol = validPeppolXml
    .replace('<cbc:EndpointID schemeID="0009">12345678900012</cbc:EndpointID>', '')
    .replace('<cbc:LineExtensionAmount currencyID="EUR">1000.00</cbc:LineExtensionAmount>', '<cbc:LineExtensionAmount currencyID="EUR">950.00</cbc:LineExtensionAmount>');

  const res = simulateGatewayClearance({ country: 'EU', documentContent: invalidPeppol });
  assert.strictEqual(res.cleared, false);
  const codes = res.errors.map((e) => e.code);
  assert.ok(codes.includes('PEPPOL-EN16931-R020'));
  assert.ok(codes.includes('BR-CO-10'));
});

// ---------------------------------------------------------------------------
// 5. Egypt ETA v1.0 Pre-Prod Sandbox & XML Well-Formedness Check
// ---------------------------------------------------------------------------
test('Egypt ETA v1.0 Sandbox: accepts valid 9-digit RIN & GS1 line and rejects invalid RIN', () => {
  const validEta = simulateEtaClearance({
    issuer: { id: '123456789', name: 'Cairo Trade LLC' },
    documentTypeVersion: '1.0',
    taxpayerActivityCode: '6201',
    internalID: 'EG-2026-01',
    invoiceLines: [{ itemType: 'GS1', itemCode: '6221234567890', netTotal: 1000 }]
  });
  assert.strictEqual(validEta.cleared, true);
  assert.strictEqual(validEta.acceptedDocuments.length, 1);

  const badEta = simulateEtaClearance({
    issuer: { id: '123', name: 'Bad RIN' },
    documentTypeVersion: '1.0',
    taxpayerActivityCode: '6201',
    internalID: 'EG-2026-02',
    invoiceLines: []
  });
  assert.strictEqual(badEta.cleared, false);
  assert.strictEqual(badEta.rejectedDocuments.length, 1);
});

test('XML Well-Formedness: detects mismatched closing tags with line numbers', () => {
  const brokenXml = '<InvoiceTEIF>\n  <InvoiceHeader>\n  </WrongClosingTag>\n</InvoiceTEIF>';
  const res = validateXmlDocument(brokenXml);
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some((e) => e.code === 'XML_TAG_MISMATCH' && e.line === 3));
});

console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
