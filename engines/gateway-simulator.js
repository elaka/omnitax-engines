'use strict';

const crypto = require('crypto');
const { validateXmlDocument } = require('./statutory-xml-validator');

/**
 * Deterministic Sandbox Clearinghouse Simulator (`SANDBOX` mode / `vm_test_` keys)
 *
 * Simulates official statutory government gateways without hitting live state servers:
 *   - Italy:   Agenzia delle Entrate — Sistema di Interscambio (SdI Collaudo)
 *   - Tunisia: Tunisie TradeNet — TTN El Fatoora (TEIF v1.8.8 Sandbox)
 *   - Saudi:   ZATCA Fatoora Phase 2 Integration Sandbox (UBL 2.1)
 *   - Egypt:   Egyptian Tax Authority — ETA e-Invoicing v1.0 Pre-Prod Sandbox
 *   - EU/FR:   Peppol BIS 3.0 / Chorus Pro Access Point Sandbox
 */

const SDI_OFFICIAL_DESCRIPTIONS = {
  '00200': 'File non conforme al formato (XSD FatturaPA v1.2.2)',
  '00311': 'IdFiscaleIVA non valido in Anagrafica Tributaria',
  '00404': 'Fattura duplicata',
  '00423': 'Importo totale o Imposta non coerente con Imponibile e AliquotaIVA',
  '00427': 'Natura non presente a fronte di AliquotaIVA pari a zero'
};

function deterministicHash(input) {
  return crypto.createHash('sha256').update(String(input || ''), 'utf8').digest('hex');
}

function deterministicNumericId(hashHex, digits = 10) {
  const slice = hashHex.slice(0, 12);
  const num = BigInt('0x' + slice) % BigInt(10 ** digits);
  return num.toString().padStart(digits, '0');
}

/**
 * 1. Italy Agenzia delle Entrate — SdI Collaudo Simulator
 */
function simulateSdiClearance(xmlString, options = {}) {
  const validation = validateXmlDocument(xmlString, {
    schemaType: 'FatturaPA_v1.2.2',
    country: 'IT'
  });

  const hashHex = deterministicHash(xmlString);
  const identificativoSdI = deterministicNumericId(hashHex, 10);
  const timestamp = options.timestamp || '2026-10-16T01:00:00.000Z';
  const nomeFile = options.fileName || `IT_SANDBOX_${identificativoSdI.slice(0, 5)}.xml`;

  const errors = [...validation.errors];

  // Optional duplicate invoice simulation (00404)
  if (options.isDuplicate === true) {
    errors.push({
      code: 'FPA_DUPLICATE_INVOICE',
      govermentCode: '00404',
      governmentCode: '00404',
      path: '/FatturaElettronica/FatturaElettronicaBody/DatiGenerali/DatiGeneraliDocumento/Numero',
      line: 1,
      message: '00404 - Fattura duplicata già acquisita dal Sistema di Interscambio',
      severity: 'FATAL'
    });
  }

  if (errors.length === 0) {
    const receiptXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ns2:RicevutaConsegna xmlns:ns2="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fattura/messaggi/v1.0" versione="1.0">',
      `  <IdentificativoSdI>${identificativoSdI}</IdentificativoSdI>`,
      `  <NomeFile>${nomeFile}</NomeFile>`,
      `  <DataOraRicezione>${timestamp}</DataOraRicezione>`,
      `  <DataOraConsegna>${timestamp}</DataOraConsegna>`,
      '  <Destinatario>',
      '    <Codice>SANDBOX</Codice>',
      '  </Destinatario>',
      `  <Hash>${hashHex}</Hash>`,
      '</ns2:RicevutaConsegna>'
    ].join('\n');

    return {
      sandboxMode: true,
      gateway: 'AGENZIA_ENTRATE_SDI_COLLAUDO',
      country: 'IT',
      cleared: true,
      TipoRicevuta: 'RC',
      DescrizioneRicevuta: 'Ricevuta di Consegna',
      IdentificativoSdI: identificativoSdI,
      NomeFile: nomeFile,
      DataOraRicezione: timestamp,
      Hash: hashHex,
      ListaErrori: [],
      receiptXml,
      validation
    };
  }

  const listaErrori = errors.map((e) => {
    const codice = e.governmentCode || e.govermentCode || '00200';
    return {
      Codice: codice,
      Descrizione: SDI_OFFICIAL_DESCRIPTIONS[codice] || e.message,
      Dettaglio: e.message,
      Path: e.path
    };
  });

  const erroriXml = listaErrori
    .map(
      (err) =>
        `    <Errore>\n      <Codice>${err.Codice}</Codice>\n      <Descrizione>${err.Descrizione}</Descrizione>\n    </Errore>`
    )
    .join('\n');

  const receiptXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ns2:NotificaScarto xmlns:ns2="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fattura/messaggi/v1.0" versione="1.0">',
    `  <IdentificativoSdI>${identificativoSdI}</IdentificativoSdI>`,
    `  <NomeFile>${nomeFile}</NomeFile>`,
    `  <DataOraRicezione>${timestamp}</DataOraRicezione>`,
    '  <ListaErrori>',
    erroriXml,
    '  </ListaErrori>',
    '</ns2:NotificaScarto>'
  ].join('\n');

  return {
    sandboxMode: true,
    gateway: 'AGENZIA_ENTRATE_SDI_COLLAUDO',
    country: 'IT',
    cleared: false,
    TipoRicevuta: 'NS',
    DescrizioneRicevuta: 'Notifica di Scarto',
    IdentificativoSdI: identificativoSdI,
    NomeFile: nomeFile,
    DataOraRicezione: timestamp,
    Hash: hashHex,
    ListaErrori: listaErrori,
    receiptXml,
    validation
  };
}

/**
 * 2. Tunisia TTN El Fatoora Sandbox Simulator (TEIF v1.8.8)
 */
function simulateTtnClearance(xmlString, options = {}) {
  const validation = validateXmlDocument(xmlString, {
    schemaType: 'TEIF_v1.8.8',
    country: 'TN'
  });

  const hashHex = deterministicHash(xmlString);
  const timestamp = options.timestamp || '2026-10-16T01:00:00.000Z';

  if (validation.valid) {
    const referenceTTN = `TTN-SBX-${hashHex.slice(0, 12).toUpperCase()}`;
    return {
      sandboxMode: true,
      gateway: 'TTN_EL_FATOORA_SANDBOX',
      country: 'TN',
      cleared: true,
      statut: 'ACCEPTE',
      referenceTTN,
      horodatage: timestamp,
      empreinteSHA256: hashHex,
      erreurs: [],
      validation
    };
  }

  const erreurs = validation.errors.map((e) => ({
    code: e.governmentCode || e.code,
    message: e.message,
    path: e.path,
    line: e.line
  }));

  return {
    sandboxMode: true,
    gateway: 'TTN_EL_FATOORA_SANDBOX',
    country: 'TN',
    cleared: false,
    statut: 'REJETE',
    referenceTTN: null,
    horodatage: timestamp,
    empreinteSHA256: hashHex,
    erreurs,
    validation
  };
}

/**
 * 3. Saudi Arabia ZATCA Fatoora Phase 2 Sandbox Simulator
 */
function simulateZatcaClearance(xmlString, options = {}) {
  const validation = validateXmlDocument(xmlString, {
    schemaType: 'ZATCA_UBL_2.1',
    country: 'SA'
  });

  const hashBase64 = crypto.createHash('sha256').update(String(xmlString || ''), 'utf8').digest('base64');

  const infoMessages = [
    {
      type: 'INFO',
      code: 'XSD_ZATCA_VALID',
      category: 'XSD validation',
      message: 'Complied with UBL 2.1 standards in line with ZATCA specifications',
      status: validation.valid ? 'PASS' : 'WARNING'
    }
  ];

  const warningMessages = validation.warnings.map((w) => ({
    type: 'WARNING',
    code: w.governmentCode || w.code,
    category: 'EN_16931',
    message: w.message,
    status: 'WARNING'
  }));

  const errorMessages = validation.errors.map((e) => ({
    type: 'ERROR',
    code: e.governmentCode || e.code,
    category: 'KSA-Validation-Rule',
    message: e.message,
    path: e.path,
    status: 'ERROR'
  }));

  if (validation.valid) {
    const clearedXml = String(xmlString).trim();
    const clearedInvoice = Buffer.from(clearedXml, 'utf8').toString('base64');
    return {
      sandboxMode: true,
      gateway: 'ZATCA_FATOORA_SANDBOX_V2',
      country: 'SA',
      cleared: true,
      clearanceStatus: 'CLEARED',
      reportingStatus: 'REPORTED',
      qrCodeStatus: 'GENERATED',
      cryptographicStampStatus: 'STAMPED',
      invoiceHash: hashBase64,
      clearedInvoice,
      validationResults: {
        infoMessages,
        warningMessages,
        errorMessages: [],
        status: 'PASS'
      },
      validation
    };
  }

  return {
    sandboxMode: true,
    gateway: 'ZATCA_FATOORA_SANDBOX_V2',
    country: 'SA',
    cleared: false,
    clearanceStatus: 'REJECTED',
    reportingStatus: 'NOT_REPORTED',
    qrCodeStatus: 'INVALID',
    cryptographicStampStatus: 'REJECTED',
    invoiceHash: hashBase64,
    clearedInvoice: null,
    validationResults: {
      infoMessages,
      warningMessages,
      errorMessages,
      status: 'ERROR'
    },
    validation
  };
}

/**
 * 4. Egypt ETA e-Invoicing v1.0 Pre-Prod Sandbox Simulator
 */
function simulateEtaClearance(payload, options = {}) {
  let parsed = payload;
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload);
    } catch (err) {
      return {
        sandboxMode: true,
        gateway: 'EGYPT_ETA_PREPROD_V1',
        country: 'EG',
        cleared: false,
        submissionId: null,
        acceptedDocuments: [],
        rejectedDocuments: [
          {
            internalId: 'UNKNOWN',
            error: {
              code: 'ETA_INVALID_JSON',
              message: `Invalid JSON payload: ${err.message}`,
              details: []
            }
          }
        ]
      };
    }
  }

  const docs = Array.isArray(parsed?.documents)
    ? parsed.documents
    : parsed && typeof parsed === 'object'
    ? [parsed]
    : [];

  const submissionHash = deterministicHash(JSON.stringify(parsed || {}));
  const submissionId = `ETA-SUB-${submissionHash.slice(0, 16).toUpperCase()}`;

  const acceptedDocuments = [];
  const rejectedDocuments = [];

  for (const doc of docs) {
    const docErrors = [];
    const internalId = doc.internalID || doc.internalId || 'DOC-001';

    // Validate issuer 9-digit Egyptian RIN
    const issuerId = String(doc?.issuer?.id || '').trim();
    if (!/^\d{9}$/.test(issuerId)) {
      docErrors.push({
        code: 'CF302',
        target: 'issuer.id',
        message: `Issuer Registration Number (RIN) '${issuerId}' must be a valid 9-digit Egyptian Tax ID`
      });
    }

    // Validate documentTypeVersion
    const docVersion = String(doc?.documentTypeVersion || '1.0');
    if (docVersion !== '1.0' && docVersion !== '0.9') {
      docErrors.push({
        code: 'CF305',
        target: 'documentTypeVersion',
        message: `Unsupported ETA documentTypeVersion '${docVersion}' (expected '1.0' or '0.9')`
      });
    }

    // Validate taxpayerActivityCode
    const activityCode = String(doc?.taxpayerActivityCode || '').trim();
    if (!/^\d{4}$/.test(activityCode)) {
      docErrors.push({
        code: 'CF310',
        target: 'taxpayerActivityCode',
        message: `taxpayerActivityCode '${activityCode}' must be a 4-digit ISIC activity code`
      });
    }

    // Validate invoiceLines & GS1/EGS codes
    const lines = Array.isArray(doc?.invoiceLines) ? doc.invoiceLines : [];
    if (lines.length === 0) {
      docErrors.push({
        code: 'CF320',
        target: 'invoiceLines',
        message: 'At least one invoiceLine is required in ETA v1.0 document'
      });
    } else {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!['GS1', 'EGS'].includes(line.itemType)) {
          docErrors.push({
            code: 'CF325',
            target: `invoiceLines[${i}].itemType`,
            message: `Line ${i + 1} itemType '${line.itemType}' must be 'GS1' or 'EGS'`
          });
        }
        if (!line.itemCode) {
          docErrors.push({
            code: 'CF326',
            target: `invoiceLines[${i}].itemCode`,
            message: `Line ${i + 1} itemCode is required`
          });
        }
      }
    }

    if (docErrors.length === 0) {
      const docHash = deterministicHash(JSON.stringify(doc));
      acceptedDocuments.push({
        uuid: docHash.slice(0, 26).toUpperCase(),
        longId: docHash.slice(0, 32).toUpperCase(),
        internalId,
        hashKey: docHash
      });
    } else {
      rejectedDocuments.push({
        internalId,
        error: {
          code: 'InvalidStructure',
          message: 'Document failed Egyptian Tax Authority (ETA v1.0) validation',
          details: docErrors
        }
      });
    }
  }

  return {
    sandboxMode: true,
    gateway: 'EGYPT_ETA_PREPROD_V1',
    country: 'EG',
    cleared: rejectedDocuments.length === 0 && acceptedDocuments.length > 0,
    submissionId,
    acceptedDocuments,
    rejectedDocuments
  };
}

/**
 * 5. EU / France Peppol BIS 3.0 / Chorus Pro Sandbox Simulator
 */
function simulatePeppolClearance(xmlString, options = {}) {
  const validation = validateXmlDocument(xmlString, {
    schemaType: 'FacturX_UBL_BIS3',
    country: options.country || 'EU'
  });

  const hashHex = deterministicHash(xmlString);
  const messageId = `PEPPOL-SBX-${hashHex.slice(0, 12).toUpperCase()}`;

  return {
    sandboxMode: true,
    gateway: 'PEPPOL_AS4_SANDBOX',
    country: options.country || 'EU',
    cleared: validation.valid,
    status: validation.valid ? 'ACCEPTED' : 'REJECTED',
    messageId,
    receiptHash: hashHex,
    errors: validation.errors,
    validation
  };
}

/**
 * Master Router Function: simulateGatewayClearance
 *
 * @param {object} params
 * @param {string} [params.country='auto']
 * @param {string|object} params.documentContent
 * @param {string} [params.documentFormat='auto']
 * @param {object} [params.options={}]
 */
function simulateGatewayClearance({ country = 'auto', documentContent, documentFormat = 'auto', options = {} } = {}) {
  const ct = String(country || 'auto').toUpperCase();
  const fmt = String(documentFormat || 'auto').toUpperCase();

  if (ct === 'EG' || fmt.includes('ETA') || typeof documentContent === 'object') {
    return simulateEtaClearance(documentContent, options);
  }
  if (ct === 'IT' || fmt.includes('FATTURAPA') || fmt.includes('SDI')) {
    return simulateSdiClearance(documentContent, options);
  }
  if (ct === 'TN' || fmt.includes('TEIF') || fmt.includes('TTN')) {
    return simulateTtnClearance(documentContent, options);
  }
  if (ct === 'SA' || fmt.includes('ZATCA')) {
    return simulateZatcaClearance(documentContent, options);
  }
  if (ct === 'EU' || ct === 'FR' || ct === 'DE' || fmt.includes('PEPPOL') || fmt.includes('FACTURX')) {
    return simulatePeppolClearance(documentContent, { ...options, country: ct === 'AUTO' ? 'EU' : ct });
  }

  // Auto-detect from content
  const probe = validateXmlDocument(String(documentContent || ''), { schemaType: 'auto', country: 'auto' });
  switch (probe.schema) {
    case 'FatturaPA_v1.2.2':
      return simulateSdiClearance(documentContent, options);
    case 'TEIF_v1.8.8':
      return simulateTtnClearance(documentContent, options);
    case 'ZATCA_UBL_2.1':
      return simulateZatcaClearance(documentContent, options);
    case 'FacturX_UBL_BIS3':
      return simulatePeppolClearance(documentContent, options);
    default:
      return {
        sandboxMode: true,
        gateway: 'UNKNOWN_SANDBOX',
        country: ct,
        cleared: false,
        errors: probe.errors,
        validation: probe
      };
  }
}

module.exports = {
  simulateSdiClearance,
  simulateTtnClearance,
  simulateZatcaClearance,
  simulateEtaClearance,
  simulatePeppolClearance,
  simulateGatewayClearance
};
