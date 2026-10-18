'use strict';

/**
 * Pure Node.js, Zero-External-Binary Statutory XML / XSD / Schematron Validator
 *
 * Supported Official Schemas:
 *   1. Italy     — FatturaPA_v1.2.2 (Agenzia delle Entrate SdI)
 *   2. Tunisia   — TEIF_v1.8.8 (TTN El Fatoora)
 *   3. Saudi     — ZATCA_UBL_2.1 (ZATCA Fatoora Phase 2)
 *   4. EU/France — FacturX_UBL_BIS3 (PEPPOL BIS Billing 3.0 / EN 16931)
 */

const VALID_FATTURAPA_NATURA = new Set([
  'N1',
  'N2', 'N2.1', 'N2.2',
  'N3', 'N3.1', 'N3.2', 'N3.3', 'N3.4', 'N3.5', 'N3.6',
  'N4',
  'N5',
  'N6', 'N6.1', 'N6.2', 'N6.3', 'N6.4', 'N6.5', 'N6.6', 'N6.7', 'N6.8', 'N6.9',
  'N7'
]);

const VALID_XML_ENTITIES = /^&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round3(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000;
}

function makeError({ code, governmentCode, path, line = 1, message, severity = 'FATAL' }) {
  return {
    code,
    govermentCode: governmentCode || code,
    governmentCode: governmentCode || code,
    path: path || '/',
    line: line || 1,
    message,
    severity
  };
}

function makeWarning({ code, governmentCode, path, line = 1, message }) {
  return {
    code,
    govermentCode: governmentCode || code,
    governmentCode: governmentCode || code,
    path: path || '/',
    line: line || 1,
    message,
    severity: 'WARNING'
  };
}

/**
 * Italian Partita IVA 11-digit Modulo 10 (Luhn variant) checksum validator
 */
function validateItalianPartitaIva(piva) {
  const clean = String(piva || '').trim();
  if (!/^\d{11}$/.test(clean)) return false;
  if (/^0{11}$/.test(clean)) return false;

  let sumOdd = 0;
  let sumEven = 0;
  for (let i = 0; i < 10; i++) {
    const digit = clean.charCodeAt(i) - 48;
    if (i % 2 === 0) {
      // 1st, 3rd, 5th, 7th, 9th (0-indexed even)
      sumOdd += digit;
    } else {
      // 2nd, 4th, 6th, 8th, 10th (0-indexed odd)
      const doubled = digit * 2;
      sumEven += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const expectedCheck = (10 - ((sumOdd + sumEven) % 10)) % 10;
  const actualCheck = clean.charCodeAt(10) - 48;
  return expectedCheck === actualCheck;
}

/**
 * Tunisian Matricule Fiscal validator: [0-9]{7}[A-Z]/[A-Z]/[A-Z]/[0-9]{3}
 */
function validateTunisianMatriculeFiscal(mf) {
  const clean = String(mf || '').trim();
  return /^[0-9]{7}[A-Z]\/[A-Z]\/[A-Z]\/[0-9]{3}$/.test(clean);
}

/**
 * Saudi ZATCA 15-digit VAT Tin validator: starts with 3, ends with 3, 15 digits
 */
function validateSaudiVatNumber(tin) {
  const clean = String(tin || '').trim();
  return /^3\d{13}3$/.test(clean);
}

/**
 * Encode ZATCA TLV Base64 QR Code from tag map { 1: sellerName, 2: vatNo, ... }
 */
function encodeZatcaTlvQr(tagMap) {
  const buffers = [];
  const tags = Object.keys(tagMap)
    .map(Number)
    .sort((a, b) => a - b);
  for (const tag of tags) {
    const rawVal = tagMap[tag];
    if (rawVal === undefined || rawVal === null) continue;
    const valBuf = Buffer.isBuffer(rawVal) ? rawVal : Buffer.from(String(rawVal), 'utf8');
    const header = Buffer.from([tag & 0xff, valBuf.length & 0xff]);
    buffers.push(header, valBuf);
  }
  return Buffer.concat(buffers).toString('base64');
}

/**
 * Decode ZATCA Base64 TLV QR Code
 */
function decodeZatcaTlvQr(base64Str) {
  const clean = String(base64Str || '').trim();
  if (!clean || !/^[A-Za-z0-9+/=]+$/.test(clean) || clean.length % 4 !== 0) {
    return { valid: false, error: 'Invalid Base64 encoding for QR TLV payload', tags: {} };
  }
  const buf = Buffer.from(clean, 'base64');
  if (buf.length < 10) {
    return { valid: false, error: 'TLV buffer too short', tags: {} };
  }
  const tags = {};
  let offset = 0;
  while (offset < buf.length) {
    if (offset + 2 > buf.length) {
      return { valid: false, error: `Truncated TLV header at byte offset ${offset}`, tags };
    }
    const tag = buf[offset];
    const len = buf[offset + 1];
    offset += 2;
    if (tag < 1 || tag > 20) {
      return { valid: false, error: `Invalid TLV tag number ${tag}`, tags };
    }
    if (offset + len > buf.length) {
      return { valid: false, error: `TLV tag ${tag} length ${len} exceeds buffer bounds (${buf.length - offset} bytes remaining)`, tags };
    }
    const valueBuf = buf.subarray(offset, offset + len);
    tags[tag] = tag <= 5 ? valueBuf.toString('utf8') : valueBuf;
    offset += len;
  }
  return { valid: true, tags };
}

/**
 * Lightweight, zero-dependency XML Parser with line/column tracking & well-formedness validation.
 */
function parseXmlWellFormed(xmlString) {
  const errors = [];
  if (typeof xmlString !== 'string' || !xmlString.trim()) {
    return {
      root: null,
      errors: [
        makeError({
          code: 'XML_EMPTY',
          governmentCode: '00200',
          path: '/',
          line: 1,
          message: 'XML document is empty or not a string'
        })
      ]
    };
  }

  // Line index lookup table
  const lineStarts = [0];
  for (let i = 0; i < xmlString.length; i++) {
    if (xmlString.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }

  function getLineCol(offset) {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (lineStarts[mid] <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const lineIdx = Math.max(0, low - 1);
    return { line: lineIdx + 1, col: offset - lineStarts[lineIdx] + 1 };
  }

  // Strip comments and CDATA while keeping length alignment for accurate line numbers
  const masked = xmlString
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<\?xml[\s\S]*?\?>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!DOCTYPE[\s\S]*?>/gi, (m) => m.replace(/[^\n]/g, ' '));

  // Check for unescaped ampersands outside CDATA/comments
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] === '&') {
      const slice = masked.slice(i, i + 16);
      if (!VALID_XML_ENTITIES.test(slice)) {
        const { line } = getLineCol(i);
        errors.push(
          makeError({
            code: 'XML_INVALID_ENTITY',
            governmentCode: '00200',
            path: '/',
            line,
            message: `Invalid or unescaped XML entity at line ${line}`
          })
        );
      }
    }
  }

  const stack = [];
  let root = null;
  const tagRegex = /<\/?([A-Za-z_][\w:.-]*)(\s[^<>]*?)?(\/?)>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(masked)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1];
    const attrStr = match[2] || '';
    const selfClosing = match[3] === '/';
    const isClosing = fullMatch.startsWith('</');
    const { line, col } = getLineCol(match.index);

    // Check stray '<' or '>' between tags
    const textBetween = xmlString.slice(lastIndex, match.index);
    const maskedBetween = masked.slice(lastIndex, match.index);
    if (maskedBetween.includes('<') || maskedBetween.includes('>')) {
      const badLoc = getLineCol(lastIndex + Math.max(maskedBetween.indexOf('<'), maskedBetween.indexOf('>')));
      errors.push(
        makeError({
          code: 'XML_MALFORMED_TAG',
          governmentCode: '00200',
          path: stack.length ? '/' + stack.map((s) => s.localName).join('/') : '/',
          line: badLoc.line,
          message: `Malformed angle bracket in text content at line ${badLoc.line}`
        })
      );
    }

    if (stack.length > 0 && textBetween) {
      const cleanedText = textBetween
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
      stack[stack.length - 1].text += cleanedText;
    }

    lastIndex = tagRegex.lastIndex;

    const parts = tagName.split(':');
    const prefix = parts.length > 1 ? parts[0] : '';
    const localName = parts.length > 1 ? parts.slice(1).join(':') : tagName;

    if (isClosing) {
      if (stack.length === 0) {
        errors.push(
          makeError({
            code: 'XML_UNEXPECTED_CLOSE_TAG',
            governmentCode: '00200',
            path: `/${localName}`,
            line,
            message: `Unexpected closing tag </${tagName}> with empty open stack at line ${line}`
          })
        );
      } else {
        const top = stack[stack.length - 1];
        if (top.name !== tagName) {
          errors.push(
            makeError({
              code: 'XML_TAG_MISMATCH',
              governmentCode: '00200',
              path: top.path,
              line,
              message: `Mismatched closing tag </${tagName}> at line ${line}; expected </${top.name}> (opened at line ${top.line})`
            })
          );
          // Attempt recovery if parent matches
          const matchIdx = stack.map((s) => s.name).lastIndexOf(tagName);
          if (matchIdx !== -1) {
            stack.splice(matchIdx);
          }
        } else {
          const closed = stack.pop();
          closed.text = closed.text.trim();
        }
      }
      continue;
    }

    // Parse attributes
    const attrs = {};
    const attrRegex = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrStr)) !== null) {
      const attrName = attrMatch[1];
      const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : attrMatch[3];
      attrs[attrName] = attrVal;
      const attrLocal = attrName.includes(':') ? attrName.split(':').pop() : attrName;
      if (!(attrLocal in attrs)) {
        attrs[attrLocal] = attrVal;
      }
    }

    const parent = stack.length > 0 ? stack[stack.length - 1] : null;
    const nodePath = parent ? `${parent.path}/${localName}` : `/${localName}`;

    const node = {
      name: tagName,
      localName,
      prefix,
      attrs,
      text: '',
      children: [],
      line,
      col,
      path: nodePath
    };

    if (!parent) {
      if (root) {
        errors.push(
          makeError({
            code: 'XML_MULTIPLE_ROOTS',
            governmentCode: '00200',
            path: nodePath,
            line,
            message: `Multiple root elements detected: <${tagName}> at line ${line}`
          })
        );
      } else {
        root = node;
      }
    } else {
      parent.children.push(node);
    }

    if (!selfClosing) {
      stack.push(node);
    }
  }

  if (stack.length > 0) {
    for (const unclosed of stack) {
      errors.push(
        makeError({
          code: 'XML_UNCLOSED_TAG',
          governmentCode: '00200',
          path: unclosed.path,
          line: unclosed.line,
          message: `Unclosed XML element <${unclosed.name}> opened at line ${unclosed.line}`
        })
      );
    }
  }

  if (!root && errors.length === 0) {
    errors.push(
      makeError({
        code: 'XML_NO_ROOT',
        governmentCode: '00200',
        path: '/',
        line: 1,
        message: 'No valid XML root element found'
      })
    );
  }

  return { root, errors };
}

// AST Query Helpers
function findChild(node, localName) {
  if (!node || !node.children) return null;
  return node.children.find((c) => c.localName === localName || c.name === localName) || null;
}

function findChildren(node, localName) {
  if (!node || !node.children) return [];
  return node.children.filter((c) => c.localName === localName || c.name === localName);
}

function findByPath(node, relPath) {
  if (!node) return null;
  const parts = relPath.split('/').filter(Boolean);
  let cur = node;
  for (const p of parts) {
    cur = findChild(cur, p);
    if (!cur) return null;
  }
  return cur;
}

function findText(node, relPath) {
  const target = findByPath(node, relPath);
  return target ? target.text : null;
}

function findAllDescendants(node, localName, out = []) {
  if (!node) return out;
  for (const child of node.children || []) {
    if (child.localName === localName || child.name === localName) {
      out.push(child);
    }
    findAllDescendants(child, localName, out);
  }
  return out;
}

/**
 * Auto-detect schema type from root element, namespaces, and country hint
 */
function detectSchemaType(root, { schemaType = 'auto', country = 'auto' } = {}) {
  const st = String(schemaType || 'auto').toUpperCase();
  const ct = String(country || 'auto').toUpperCase();

  if (st.includes('FATTURAPA') || ct === 'IT') return 'FatturaPA_v1.2.2';
  if (st.includes('TEIF') || ct === 'TN') return 'TEIF_v1.8.8';
  if (st.includes('ZATCA') || ct === 'SA') return 'ZATCA_UBL_2.1';
  if (st.includes('FACTURX') || st.includes('PEPPOL') || st.includes('BIS3') || ct === 'EU' || ct === 'FR') {
    return 'FacturX_UBL_BIS3';
  }

  if (!root) return 'UNKNOWN';
  const rl = root.localName;
  if (rl === 'FatturaElettronica') return 'FatturaPA_v1.2.2';
  if (rl === 'InvoiceTEIF' || rl === 'TEIF') return 'TEIF_v1.8.8';
  if (rl === 'CrossIndustryInvoice') return 'FacturX_UBL_BIS3';

  if (rl === 'Invoice') {
    const profileId = findText(root, 'ProfileID') || '';
    if (profileId.startsWith('reporting:') || profileId.startsWith('clearance:')) {
      return 'ZATCA_UBL_2.1';
    }
    const addRefs = findChildren(root, 'AdditionalDocumentReference');
    if (addRefs.some((r) => ['ICV', 'PIH', 'QR'].includes(findText(r, 'ID')))) {
      return 'ZATCA_UBL_2.1';
    }
    return 'FacturX_UBL_BIS3';
  }

  return 'UNKNOWN';
}

/**
 * 1. Italy FatturaPA v1.2.2 Validator
 */
function validateFatturaPA(root) {
  const errors = [];
  const warnings = [];
  const arithmeticDetails = {
    lineCount: 0,
    sumLinesImponibile: 0,
    sumRiepilogoImponibile: 0,
    sumRiepilogoImposta: 0,
    importoTotaleDocumento: null
  };

  if (root.localName !== 'FatturaElettronica') {
    errors.push(
      makeError({
        code: 'FPA_INVALID_ROOT',
        governmentCode: '00200',
        path: root.path,
        line: root.line,
        message: `Expected root <FatturaElettronica>, found <${root.name}>`
      })
    );
    return { version: '1.2.2', errors, warnings, arithmeticAudit: { passed: false, details: arithmeticDetails } };
  }

  const versione = root.attrs.versione || '';
  if (versione !== 'FPA12' && versione !== 'FPR12') {
    errors.push(
      makeError({
        code: 'FPA_INVALID_VERSIONE',
        governmentCode: '00200',
        path: `${root.path}/@versione`,
        line: root.line,
        message: `Attribute @versione on FatturaElettronica must be 'FPA12' or 'FPR12' (found '${versione}')`
      })
    );
  }

  const header = findChild(root, 'FatturaElettronicaHeader');
  const body = findChild(root, 'FatturaElettronicaBody');

  if (!header) {
    errors.push(
      makeError({
        code: 'FPA_MISSING_HEADER',
        governmentCode: '00200',
        path: `${root.path}/FatturaElettronicaHeader`,
        line: root.line,
        message: 'Mandatory element <FatturaElettronicaHeader> is missing'
      })
    );
  } else {
    const datiTrasmissione = findChild(header, 'DatiTrasmissione');
    const cedente = findChild(header, 'CedentePrestatore');
    const cessionario = findChild(header, 'CessionarioCommittente');

    if (!datiTrasmissione) {
      errors.push(
        makeError({
          code: 'FPA_MISSING_DATI_TRASMISSIONE',
          governmentCode: '00200',
          path: `${header.path}/DatiTrasmissione`,
          line: header.line,
          message: 'Mandatory element <DatiTrasmissione> is missing'
        })
      );
    } else {
      const codiceDestNode = findChild(datiTrasmissione, 'CodiceDestinatario');
      const codiceDest = codiceDestNode ? codiceDestNode.text : '';
      const expectedLen = versione === 'FPA12' ? 6 : 7;
      const validFormat =
        versione === 'FPA12' ? /^[A-Z0-9]{6}$/.test(codiceDest) : /^[A-Z0-9]{7}$/.test(codiceDest);
      if (!codiceDestNode || !validFormat) {
        errors.push(
          makeError({
            code: 'FPA_INVALID_CODICE_DESTINATARIO',
            governmentCode: '00200',
            path: codiceDestNode ? codiceDestNode.path : `${datiTrasmissione.path}/CodiceDestinatario`,
            line: codiceDestNode ? codiceDestNode.line : datiTrasmissione.line,
            message: `CodiceDestinatario '${codiceDest}' is invalid for versione '${versione || 'FPR12'}' (expected ${expectedLen} uppercase alphanumeric chars)`
          })
        );
      }
    }

    // Validate CedentePrestatore & Partita IVA
    if (!cedente) {
      errors.push(
        makeError({
          code: 'FPA_MISSING_CEDENTE',
          governmentCode: '00200',
          path: `${header.path}/CedentePrestatore`,
          line: header.line,
          message: 'Mandatory element <CedentePrestatore> is missing'
        })
      );
    } else {
      const idPaese = findText(cedente, 'DatiAnagrafici/IdFiscaleIVA/IdPaese') || findText(cedente, 'IdFiscaleIVA/IdPaese');
      const idCodiceNode =
        findByPath(cedente, 'DatiAnagrafici/IdFiscaleIVA/IdCodice') || findByPath(cedente, 'IdFiscaleIVA/IdCodice');
      if (!idCodiceNode) {
        errors.push(
          makeError({
            code: 'FPA_MISSING_CEDENTE_PIVA',
            governmentCode: '00311',
            path: `${cedente.path}/DatiAnagrafici/IdFiscaleIVA/IdCodice`,
            line: cedente.line,
            message: '00311 - Missing IdFiscaleIVA/IdCodice on CedentePrestatore'
          })
        );
      } else if ((!idPaese || idPaese === 'IT') && !validateItalianPartitaIva(idCodiceNode.text)) {
        errors.push(
          makeError({
            code: 'FPA_INVALID_PIVA',
            governmentCode: '00311',
            path: idCodiceNode.path,
            line: idCodiceNode.line,
            message: `00311 - IdFiscaleIVA '${idCodiceNode.text}' on CedentePrestatore failed 11-digit Italian Modulo 10 Luhn checksum`
          })
        );
      }
    }

    // Validate CessionarioCommittente
    if (!cessionario) {
      errors.push(
        makeError({
          code: 'FPA_MISSING_CESSIONARIO',
          governmentCode: '00200',
          path: `${header.path}/CessionarioCommittente`,
          line: header.line,
          message: 'Mandatory element <CessionarioCommittente> is missing'
        })
      );
    } else {
      const idPaese =
        findText(cessionario, 'DatiAnagrafici/IdFiscaleIVA/IdPaese') || findText(cessionario, 'IdFiscaleIVA/IdPaese');
      const idCodiceNode =
        findByPath(cessionario, 'DatiAnagrafici/IdFiscaleIVA/IdCodice') || findByPath(cessionario, 'IdFiscaleIVA/IdCodice');
      if (idCodiceNode && (!idPaese || idPaese === 'IT') && !validateItalianPartitaIva(idCodiceNode.text)) {
        errors.push(
          makeError({
            code: 'FPA_INVALID_PIVA',
            governmentCode: '00311',
            path: idCodiceNode.path,
            line: idCodiceNode.line,
            message: `00311 - IdFiscaleIVA '${idCodiceNode.text}' on CessionarioCommittente failed 11-digit Italian Modulo 10 Luhn checksum`
          })
        );
      }
    }
  }

  let arithmeticPassed = true;

  if (!body) {
    errors.push(
      makeError({
        code: 'FPA_MISSING_BODY',
        governmentCode: '00200',
        path: `${root.path}/FatturaElettronicaBody`,
        line: root.line,
        message: 'Mandatory element <FatturaElettronicaBody> is missing'
      })
    );
    arithmeticPassed = false;
  } else {
    const datiGenerali = findChild(body, 'DatiGenerali');
    const datiBeniServizi = findChild(body, 'DatiBeniServizi');

    if (!datiGenerali) {
      errors.push(
        makeError({
          code: 'FPA_MISSING_DATI_GENERALI',
          governmentCode: '00200',
          path: `${body.path}/DatiGenerali`,
          line: body.line,
          message: 'Mandatory element <DatiGenerali> is missing'
        })
      );
    } else {
      const importoTotStr =
        findText(datiGenerali, 'DatiGeneraliDocumento/ImportoTotaleDocumento') ||
        findText(datiGenerali, 'ImportoTotaleDocumento');
      if (importoTotStr !== null) {
        arithmeticDetails.importoTotaleDocumento = parseFloat(importoTotStr);
      }
    }

    if (!datiBeniServizi) {
      errors.push(
        makeError({
          code: 'FPA_MISSING_DATI_BENI_SERVIZI',
          governmentCode: '00200',
          path: `${body.path}/DatiBeniServizi`,
          line: body.line,
          message: 'Mandatory element <DatiBeniServizi> is missing'
        })
      );
      arithmeticPassed = false;
    } else {
      const linee = findChildren(datiBeniServizi, 'DettaglioLinee');
      const riepiloghi = findChildren(datiBeniServizi, 'DatiRiepilogo');

      arithmeticDetails.lineCount = linee.length;

      if (linee.length === 0) {
        errors.push(
          makeError({
            code: 'FPA_MISSING_DETTAGLIO_LINEE',
            governmentCode: '00200',
            path: `${datiBeniServizi.path}/DettaglioLinee`,
            line: datiBeniServizi.line,
            message: 'At least one <DettaglioLinee> element is required in <DatiBeniServizi>'
          })
        );
      }

      if (riepiloghi.length === 0) {
        errors.push(
          makeError({
            code: 'FPA_MISSING_DATI_RIEPILOGO',
            governmentCode: '00200',
            path: `${datiBeniServizi.path}/DatiRiepilogo`,
            line: datiBeniServizi.line,
            message: 'At least one <DatiRiepilogo> element is required in <DatiBeniServizi>'
          })
        );
      }

      for (const linea of linee) {
        const prezzoTotaleStr = findText(linea, 'PrezzoTotale');
        const prezzoUnitarioStr = findText(linea, 'PrezzoUnitario');
        const quantitaStr = findText(linea, 'Quantita');
        const aliquotaStr = findText(linea, 'AliquotaIVA');
        const naturaNode = findChild(linea, 'Natura');

        const prezzoTotale = parseFloat(prezzoTotaleStr || '0');
        arithmeticDetails.sumLinesImponibile = round2(arithmeticDetails.sumLinesImponibile + prezzoTotale);

        if (quantitaStr !== null && prezzoUnitarioStr !== null && prezzoTotaleStr !== null) {
          const expectedLine = round2(parseFloat(quantitaStr) * parseFloat(prezzoUnitarioStr));
          if (Math.abs(expectedLine - round2(prezzoTotale)) > 0.01) {
            arithmeticPassed = false;
            errors.push(
              makeError({
                code: 'FPA_LINE_ARITHMETIC_ERROR',
                governmentCode: '00423',
                path: `${linea.path}/PrezzoTotale`,
                line: linea.line,
                message: `00423 - PrezzoTotale (${prezzoTotale}) does not equal Quantita (${quantitaStr}) * PrezzoUnitario (${prezzoUnitarioStr}) = ${expectedLine}`
              })
            );
          }
        }

        const aliquota = parseFloat(aliquotaStr !== null ? aliquotaStr : 'NaN');
        if (aliquota === 0) {
          if (!naturaNode || !naturaNode.text) {
            errors.push(
              makeError({
                code: 'FPA_MISSING_NATURA_ZERO_IVA',
                governmentCode: '00427',
                path: `${linea.path}/Natura`,
                line: linea.line,
                message: '00427 - Natura non presente a fronte di AliquotaIVA pari a zero in DettaglioLinee'
              })
            );
          } else if (!VALID_FATTURAPA_NATURA.has(naturaNode.text.trim())) {
            errors.push(
              makeError({
                code: 'FPA_INVALID_NATURA',
                governmentCode: '00200',
                path: naturaNode.path,
                line: naturaNode.line,
                message: `Invalid Natura code '${naturaNode.text}' (must be N1..N7)`
              })
            );
          }
        }
      }

      for (const riep of riepiloghi) {
        const imponibileStr = findText(riep, 'ImponibileImporto');
        const aliquotaStr = findText(riep, 'AliquotaIVA');
        const impostaStr = findText(riep, 'Imposta');
        const naturaNode = findChild(riep, 'Natura');

        const imponibile = parseFloat(imponibileStr || '0');
        const aliquota = parseFloat(aliquotaStr || '0');
        const imposta = parseFloat(impostaStr || '0');

        arithmeticDetails.sumRiepilogoImponibile = round2(arithmeticDetails.sumRiepilogoImponibile + imponibile);
        arithmeticDetails.sumRiepilogoImposta = round2(arithmeticDetails.sumRiepilogoImposta + imposta);

        if (aliquota === 0) {
          if (!naturaNode || !naturaNode.text) {
            errors.push(
              makeError({
                code: 'FPA_MISSING_NATURA_ZERO_IVA',
                governmentCode: '00427',
                path: `${riep.path}/Natura`,
                line: riep.line,
                message: '00427 - Natura non presente a fronte di AliquotaIVA pari a zero in DatiRiepilogo'
              })
            );
          } else if (!VALID_FATTURAPA_NATURA.has(naturaNode.text.trim())) {
            errors.push(
              makeError({
                code: 'FPA_INVALID_NATURA',
                governmentCode: '00200',
                path: naturaNode.path,
                line: naturaNode.line,
                message: `Invalid Natura code '${naturaNode.text}' in DatiRiepilogo`
              })
            );
          }
        }

        const expectedImposta = round2((imponibile * aliquota) / 100);
        if (Math.abs(expectedImposta - round2(imposta)) > 0.01) {
          arithmeticPassed = false;
          errors.push(
            makeError({
              code: 'FPA_ARITHMETIC_IMPOSTA',
              governmentCode: '00423',
              path: `${riep.path}/Imposta`,
              line: riep.line,
              message: `00423 - Imposta (${imposta.toFixed(2)}) does not match ImponibileImporto (${imponibile.toFixed(2)}) * AliquotaIVA (${aliquota.toFixed(2)}%) / 100 = ${expectedImposta.toFixed(2)}`
            })
          );
        }
      }

      if (
        linee.length > 0 &&
        riepiloghi.length > 0 &&
        Math.abs(arithmeticDetails.sumLinesImponibile - arithmeticDetails.sumRiepilogoImponibile) > 0.02
      ) {
        arithmeticPassed = false;
        errors.push(
          makeError({
            code: 'FPA_IMPONIBILE_MISMATCH',
            governmentCode: '00423',
            path: `${datiBeniServizi.path}/DatiRiepilogo/ImponibileImporto`,
            line: datiBeniServizi.line,
            message: `00423 - Sum of DettaglioLinee PrezzoTotale (${arithmeticDetails.sumLinesImponibile}) != DatiRiepilogo ImponibileImporto (${arithmeticDetails.sumRiepilogoImponibile})`
          })
        );
      }

      if (arithmeticDetails.importoTotaleDocumento !== null) {
        const expectedTotal = round2(arithmeticDetails.sumRiepilogoImponibile + arithmeticDetails.sumRiepilogoImposta);
        if (Math.abs(expectedTotal - round2(arithmeticDetails.importoTotaleDocumento)) > 0.02) {
          arithmeticPassed = false;
          errors.push(
            makeError({
              code: 'FPA_TOTAL_DOCUMENTO_MISMATCH',
              governmentCode: '00423',
              path: `${body.path}/DatiGenerali/DatiGeneraliDocumento/ImportoTotaleDocumento`,
              line: body.line,
              message: `00423 - ImportoTotaleDocumento (${arithmeticDetails.importoTotaleDocumento}) != Imponibile (${arithmeticDetails.sumRiepilogoImponibile}) + Imposta (${arithmeticDetails.sumRiepilogoImposta})`
            })
          );
        }
      }
    }
  }

  return {
    version: '1.2.2',
    errors,
    warnings,
    arithmeticAudit: {
      passed: arithmeticPassed,
      details: arithmeticDetails
    }
  };
}

/**
 * 2. Tunisia TEIF v1.8.8 Validator (TTN El Fatoora)
 */
function validateTEIF(root) {
  const errors = [];
  const warnings = [];
  const arithmeticDetails = {
    totalHT: 0,
    totalTVA: 0,
    timbreFiscal: 0,
    totalTTC: 0,
    exportExempt: false
  };

  if (root.localName !== 'InvoiceTEIF' && root.localName !== 'TEIF') {
    errors.push(
      makeError({
        code: 'ERR_TEIF_01_SCHEMA',
        governmentCode: 'ERR_TEIF_01_SCHEMA',
        path: root.path,
        line: root.line,
        message: `Expected root <InvoiceTEIF> or <TEIF>, found <${root.name}>`
      })
    );
    return { version: '1.8.8', errors, warnings, arithmeticAudit: { passed: false, details: arithmeticDetails } };
  }

  const header = findChild(root, 'InvoiceHeader') || findChild(root, 'Bgm');
  const seller = findChild(root, 'SellerParty');
  const buyer = findChild(root, 'BuyerParty');
  const linesContainer = findChild(root, 'InvoiceLines');
  const taxSummary = findChild(root, 'TaxSummary');

  if (!header) {
    errors.push(
      makeError({
        code: 'ERR_TEIF_01_SCHEMA',
        governmentCode: 'ERR_TEIF_01_SCHEMA',
        path: `${root.path}/InvoiceHeader`,
        line: root.line,
        message: 'ERR_TEIF_01_SCHEMA - Mandatory <InvoiceHeader> or <Bgm> section is missing'
      })
    );
  }

  if (!seller) {
    errors.push(
      makeError({
        code: 'ERR_TEIF_01_SCHEMA',
        governmentCode: 'ERR_TEIF_01_SCHEMA',
        path: `${root.path}/SellerParty`,
        line: root.line,
        message: 'ERR_TEIF_01_SCHEMA - Mandatory <SellerParty> is missing'
      })
    );
  } else {
    const sellerMfNode =
      findChild(seller, 'MatriculeFiscal') ||
      findChild(seller, 'TaxIdentifier') ||
      findChild(seller, 'Identifier');
    if (!sellerMfNode || !validateTunisianMatriculeFiscal(sellerMfNode.text)) {
      errors.push(
        makeError({
          code: 'ERR_TEIF_02_MATRICULE_FISCAL',
          governmentCode: 'ERR_TEIF_02_MATRICULE_FISCAL',
          path: sellerMfNode ? sellerMfNode.path : `${seller.path}/MatriculeFiscal`,
          line: sellerMfNode ? sellerMfNode.line : seller.line,
          message: `ERR_TEIF_02_MATRICULE_FISCAL - Invalid Seller Tunisian Matricule Fiscal '${sellerMfNode ? sellerMfNode.text : ''}' (expected [0-9]{7}[A-Z]/[A-Z]/[A-Z]/[0-9]{3})`
        })
      );
    }
  }

  let isExportExempt =
    root.attrs.exportExempt === 'true' ||
    (header && (header.attrs.exportExempt === 'true' || /art\.?\s*11|export/i.test(findText(header, 'TaxRegime') || '')));

  if (!buyer) {
    errors.push(
      makeError({
        code: 'ERR_TEIF_01_SCHEMA',
        governmentCode: 'ERR_TEIF_01_SCHEMA',
        path: `${root.path}/BuyerParty`,
        line: root.line,
        message: 'ERR_TEIF_01_SCHEMA - Mandatory <BuyerParty> is missing'
      })
    );
  } else {
    const buyerCountry = findText(buyer, 'CountryCode') || 'TN';
    if (buyerCountry !== 'TN' && root.attrs.exportExempt !== 'false') {
      if (/art\.?\s*11|export/i.test(findText(buyer, 'ExemptionReason') || findText(taxSummary, 'ExemptionReason') || '')) {
        isExportExempt = true;
      }
    }
    const buyerMfNode =
      findChild(buyer, 'MatriculeFiscal') ||
      findChild(buyer, 'TaxIdentifier') ||
      findChild(buyer, 'Identifier');
    if (buyerCountry === 'TN') {
      if (!buyerMfNode || !validateTunisianMatriculeFiscal(buyerMfNode.text)) {
        errors.push(
          makeError({
            code: 'ERR_TEIF_02_MATRICULE_FISCAL',
            governmentCode: 'ERR_TEIF_02_MATRICULE_FISCAL',
            path: buyerMfNode ? buyerMfNode.path : `${buyer.path}/MatriculeFiscal`,
            line: buyerMfNode ? buyerMfNode.line : buyer.line,
            message: `ERR_TEIF_02_MATRICULE_FISCAL - Invalid Buyer Tunisian Matricule Fiscal '${buyerMfNode ? buyerMfNode.text : ''}' (expected [0-9]{7}[A-Z]/[A-Z]/[A-Z]/[0-9]{3})`
          })
        );
      }
    }
  }

  arithmeticDetails.exportExempt = Boolean(isExportExempt);

  let sumLinesHT = 0;
  if (!linesContainer) {
    errors.push(
      makeError({
        code: 'ERR_TEIF_01_SCHEMA',
        governmentCode: 'ERR_TEIF_01_SCHEMA',
        path: `${root.path}/InvoiceLines`,
        line: root.line,
        message: 'ERR_TEIF_01_SCHEMA - Mandatory <InvoiceLines> is missing'
      })
    );
  } else {
    const lines = findChildren(linesContainer, 'InvoiceLine').concat(findChildren(linesContainer, 'Lin'));
    if (lines.length === 0) {
      errors.push(
        makeError({
          code: 'ERR_TEIF_01_SCHEMA',
          governmentCode: 'ERR_TEIF_01_SCHEMA',
          path: `${linesContainer.path}/InvoiceLine`,
          line: linesContainer.line,
          message: 'ERR_TEIF_01_SCHEMA - At least one <InvoiceLine> is required'
        })
      );
    }
    for (const line of lines) {
      const amtStr =
        findText(line, 'LineExtensionAmount') ||
        findText(line, 'TotalHT') ||
        findText(line, 'LineAmount') ||
        '0';
      sumLinesHT = round3(sumLinesHT + parseFloat(amtStr));
    }
  }

  let arithmeticPassed = true;

  if (!taxSummary) {
    errors.push(
      makeError({
        code: 'ERR_TEIF_01_SCHEMA',
        governmentCode: 'ERR_TEIF_01_SCHEMA',
        path: `${root.path}/TaxSummary`,
        line: root.line,
        message: 'ERR_TEIF_01_SCHEMA - Mandatory <TaxSummary> is missing'
      })
    );
    arithmeticPassed = false;
  } else {
    const timbreNode = findChild(taxSummary, 'TimbreFiscal') || findChild(root, 'TimbreFiscal');
    const timbreVal = timbreNode ? parseFloat(timbreNode.text) : NaN;
    arithmeticDetails.timbreFiscal = Number.isNaN(timbreVal) ? 0 : timbreVal;

    if (!isExportExempt) {
      if (!timbreNode || Number.isNaN(timbreVal) || Math.abs(timbreVal - 1.0) > 0.0001) {
        errors.push(
          makeError({
            code: 'ERR_TEIF_03_TIMBRE_1000_MILLIMES',
            governmentCode: 'ERR_TEIF_03_TIMBRE_1000_MILLIMES',
            path: timbreNode ? timbreNode.path : `${taxSummary.path}/TimbreFiscal`,
            line: timbreNode ? timbreNode.line : taxSummary.line,
            message: `ERR_TEIF_03_TIMBRE_1000_MILLIMES - Mandatory TimbreFiscal of 1.000 TND (1000 millimes) is missing or invalid (found '${timbreNode ? timbreNode.text : 'missing'}')`
          })
        );
      }
    }

    const totalHTStr = findText(taxSummary, 'TotalHT') || findText(taxSummary, 'TaxableAmount');
    const totalTVAStr = findText(taxSummary, 'TotalTVA') || findText(taxSummary, 'TaxAmount');
    const taxRateStr = findText(taxSummary, 'TaxRate') || findText(taxSummary, 'TVARate');
    const totalTTCStr = findText(taxSummary, 'TotalTTC') || findText(taxSummary, 'PayableAmount');

    const totalHT = totalHTStr !== null ? parseFloat(totalHTStr) : sumLinesHT;
    const totalTVA = totalTVAStr !== null ? parseFloat(totalTVAStr) : 0;
    const totalTTC = totalTTCStr !== null ? parseFloat(totalTTCStr) : round3(totalHT + totalTVA + arithmeticDetails.timbreFiscal);

    arithmeticDetails.totalHT = totalHT;
    arithmeticDetails.totalTVA = totalTVA;
    arithmeticDetails.totalTTC = totalTTC;

    if (sumLinesHT > 0 && totalHTStr !== null && Math.abs(sumLinesHT - totalHT) > 0.005) {
      arithmeticPassed = false;
      errors.push(
        makeError({
          code: 'ERR_TEIF_04_ARITHMETIQUE_TVA',
          governmentCode: 'ERR_TEIF_04_ARITHMETIQUE_TVA',
          path: `${taxSummary.path}/TotalHT`,
          line: taxSummary.line,
          message: `ERR_TEIF_04_ARITHMETIQUE_TVA - Sum of InvoiceLines (${sumLinesHT.toFixed(3)}) != TotalHT (${totalHT.toFixed(3)})`
        })
      );
    }

    if (taxRateStr !== null && totalTVAStr !== null) {
      const expectedTVA = round3((totalHT * parseFloat(taxRateStr)) / 100);
      if (Math.abs(expectedTVA - totalTVA) > 0.005) {
        arithmeticPassed = false;
        errors.push(
          makeError({
            code: 'ERR_TEIF_04_ARITHMETIQUE_TVA',
            governmentCode: 'ERR_TEIF_04_ARITHMETIQUE_TVA',
            path: `${taxSummary.path}/TotalTVA`,
            line: taxSummary.line,
            message: `ERR_TEIF_04_ARITHMETIQUE_TVA - TotalTVA (${totalTVA.toFixed(3)}) != TotalHT (${totalHT.toFixed(3)}) * ${taxRateStr}% = ${expectedTVA.toFixed(3)}`
          })
        );
      }
    }

    if (totalTTCStr !== null) {
      const expectedTTC = round3(totalHT + totalTVA + arithmeticDetails.timbreFiscal);
      if (Math.abs(expectedTTC - totalTTC) > 0.005) {
        arithmeticPassed = false;
        errors.push(
          makeError({
            code: 'ERR_TEIF_04_ARITHMETIQUE_TVA',
            governmentCode: 'ERR_TEIF_04_ARITHMETIQUE_TVA',
            path: `${taxSummary.path}/TotalTTC`,
            line: taxSummary.line,
            message: `ERR_TEIF_04_ARITHMETIQUE_TVA - TotalTTC (${totalTTC.toFixed(3)}) != TotalHT (${totalHT.toFixed(3)}) + TotalTVA (${totalTVA.toFixed(3)}) + TimbreFiscal (${arithmeticDetails.timbreFiscal.toFixed(3)}) = ${expectedTTC.toFixed(3)}`
          })
        );
      }
    }
  }

  return {
    version: '1.8.8',
    errors,
    warnings,
    arithmeticAudit: {
      passed: arithmeticPassed,
      details: arithmeticDetails
    }
  };
}

/**
 * 3. Saudi Arabia ZATCA UBL 2.1 Phase 2 Validator
 */
function validateZatcaUbl(root) {
  const errors = [];
  const warnings = [];
  const arithmeticDetails = {
    taxExclusiveAmount: 0,
    taxAmount: 0,
    taxInclusiveAmount: 0,
    vatRate: 15
  };

  if (root.localName !== 'Invoice') {
    errors.push(
      makeError({
        code: 'ZATCA_INVALID_ROOT',
        governmentCode: 'BR-KSA-01',
        path: root.path,
        line: root.line,
        message: `Expected root <Invoice>, found <${root.name}>`
      })
    );
    return { version: '2.1', errors, warnings, arithmeticAudit: { passed: false, details: arithmeticDetails } };
  }

  // ProfileID
  const profileNode = findChild(root, 'ProfileID');
  if (!profileNode || !['reporting:1.0', 'clearance:1.0'].includes(profileNode.text)) {
    errors.push(
      makeError({
        code: 'ZATCA_INVALID_PROFILE_ID',
        governmentCode: 'BR-KSA-02',
        path: profileNode ? profileNode.path : `${root.path}/ProfileID`,
        line: profileNode ? profileNode.line : root.line,
        message: `cbc:ProfileID must be 'reporting:1.0' or 'clearance:1.0' (found '${profileNode ? profileNode.text : ''}')`
      })
    );
  }

  // UUID (RFC 4122)
  const uuidNode = findChild(root, 'UUID');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidNode || !uuidRegex.test(uuidNode.text)) {
    errors.push(
      makeError({
        code: 'ZATCA_INVALID_UUID',
        governmentCode: 'BR-KSA-03',
        path: uuidNode ? uuidNode.path : `${root.path}/UUID`,
        line: uuidNode ? uuidNode.line : root.line,
        message: `cbc:UUID must be a valid RFC 4122 UUID (found '${uuidNode ? uuidNode.text : ''}')`
      })
    );
  }

  // Supplier 15-digit VAT number starting and ending with 3
  const supplierCompanyIdNode =
    findByPath(root, 'AccountingSupplierParty/Party/PartyTaxScheme/CompanyID') ||
    findByPath(root, 'AccountingSupplierParty/PartyTaxScheme/CompanyID');
  if (!supplierCompanyIdNode || !validateSaudiVatNumber(supplierCompanyIdNode.text)) {
    errors.push(
      makeError({
        code: 'ZATCA_INVALID_SUPPLIER_VAT',
        governmentCode: 'BR-KSA-39',
        path: supplierCompanyIdNode
          ? supplierCompanyIdNode.path
          : `${root.path}/AccountingSupplierParty/Party/PartyTaxScheme/CompanyID`,
        line: supplierCompanyIdNode ? supplierCompanyIdNode.line : root.line,
        message: `BR-KSA-39 - Supplier VAT Registration Number must be 15 digits starting and ending with '3' (found '${supplierCompanyIdNode ? supplierCompanyIdNode.text : ''}')`
      })
    );
  }

  // Customer VAT number check if present or B2B clearance:1.0
  const customerCompanyIdNode =
    findByPath(root, 'AccountingCustomerParty/Party/PartyTaxScheme/CompanyID') ||
    findByPath(root, 'AccountingCustomerParty/PartyTaxScheme/CompanyID');
  if (customerCompanyIdNode && customerCompanyIdNode.text && !validateSaudiVatNumber(customerCompanyIdNode.text)) {
    errors.push(
      makeError({
        code: 'ZATCA_INVALID_CUSTOMER_VAT',
        governmentCode: 'BR-KSA-40',
        path: customerCompanyIdNode.path,
        line: customerCompanyIdNode.line,
        message: `BR-KSA-40 - Customer VAT Registration Number must be 15 digits starting and ending with '3' (found '${customerCompanyIdNode.text}')`
      })
    );
  }

  // AdditionalDocumentReference: ICV, PIH, QR
  const addDocs = findChildren(root, 'AdditionalDocumentReference');
  const icvDoc = addDocs.find((d) => findText(d, 'ID') === 'ICV');
  const pihDoc = addDocs.find((d) => findText(d, 'ID') === 'PIH');
  const qrDoc = addDocs.find((d) => findText(d, 'ID') === 'QR');

  if (!icvDoc || !/^\d+$/.test(findText(icvDoc, 'UUID') || '')) {
    errors.push(
      makeError({
        code: 'ZATCA_MISSING_ICV',
        governmentCode: 'BR-KSA-33',
        path: icvDoc ? icvDoc.path : `${root.path}/AdditionalDocumentReference[ICV]`,
        line: icvDoc ? icvDoc.line : root.line,
        message: 'BR-KSA-33 - Missing or non-numeric Invoice Counter Value (ICV) in AdditionalDocumentReference'
      })
    );
  }

  if (!pihDoc || !findText(pihDoc, 'Attachment/EmbeddedDocumentBinaryObject')) {
    errors.push(
      makeError({
        code: 'ZATCA_MISSING_PIH',
        governmentCode: 'BR-KSA-26',
        path: pihDoc ? pihDoc.path : `${root.path}/AdditionalDocumentReference[PIH]`,
        line: pihDoc ? pihDoc.line : root.line,
        message: 'BR-KSA-26 - Missing Previous Invoice Hash (PIH) in AdditionalDocumentReference'
      })
    );
  }

  if (!qrDoc) {
    errors.push(
      makeError({
        code: 'ZATCA_MISSING_QR',
        governmentCode: 'BR-KSA-27',
        path: `${root.path}/AdditionalDocumentReference[QR]`,
        line: root.line,
        message: 'BR-KSA-27 - Missing QR code AdditionalDocumentReference'
      })
    );
  } else {
    const qrBase64 = findText(qrDoc, 'Attachment/EmbeddedDocumentBinaryObject') || '';
    const decoded = decodeZatcaTlvQr(qrBase64);
    if (!decoded.valid) {
      errors.push(
        makeError({
          code: 'ZATCA_INVALID_QR_TLV',
          governmentCode: 'BR-KSA-27',
          path: `${qrDoc.path}/Attachment/EmbeddedDocumentBinaryObject`,
          line: qrDoc.line,
          message: `BR-KSA-27 - Invalid ZATCA TLV QR Code: ${decoded.error}`
        })
      );
    } else {
      // Check Tags 1..5 and Phase 2 Tags 6..9
      const requiredTags = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const missingTags = requiredTags.filter((t) => !decoded.tags[t] || decoded.tags[t].length === 0);
      if (missingTags.length > 0) {
        errors.push(
          makeError({
            code: 'ZATCA_QR_MISSING_PHASE2_TAGS',
            governmentCode: 'BR-KSA-27',
            path: `${qrDoc.path}/Attachment/EmbeddedDocumentBinaryObject`,
            line: qrDoc.line,
            message: `BR-KSA-27 - ZATCA Phase 2 TLV QR Code missing mandatory tags: ${missingTags.join(', ')}`
          })
        );
      } else if (!validateSaudiVatNumber(decoded.tags[2])) {
        errors.push(
          makeError({
            code: 'ZATCA_QR_INVALID_TAG2_VAT',
            governmentCode: 'BR-KSA-27',
            path: `${qrDoc.path}/Attachment/EmbeddedDocumentBinaryObject`,
            line: qrDoc.line,
            message: `BR-KSA-27 - ZATCA TLV QR Tag 2 VAT number '${decoded.tags[2]}' is invalid`
          })
        );
      }
    }
  }

  // 15% VAT Arithmetic Audit
  let arithmeticPassed = true;
  const taxTotalNode = findChild(root, 'TaxTotal');
  const legalMonetaryNode = findChild(root, 'LegalMonetaryTotal');

  if (!taxTotalNode || !legalMonetaryNode) {
    arithmeticPassed = false;
    errors.push(
      makeError({
        code: 'ZATCA_MISSING_TOTALS',
        governmentCode: 'BR-CO-15',
        path: root.path,
        line: root.line,
        message: 'Missing mandatory <cac:TaxTotal> or <cac:LegalMonetaryTotal>'
      })
    );
  } else {
    const taxAmount = parseFloat(findText(taxTotalNode, 'TaxAmount') || '0');
    const subTotal = findChild(taxTotalNode, 'TaxSubtotal');
    const taxableAmt = subTotal
      ? parseFloat(findText(subTotal, 'TaxableAmount') || '0')
      : parseFloat(findText(legalMonetaryNode, 'TaxExclusiveAmount') || '0');
    const percentStr = subTotal
      ? findText(subTotal, 'TaxCategory/Percent') || findText(subTotal, 'Percent') || '15'
      : '15';
    const vatRate = parseFloat(percentStr);
    const taxExcl = parseFloat(findText(legalMonetaryNode, 'TaxExclusiveAmount') || '0');
    const taxIncl = parseFloat(findText(legalMonetaryNode, 'TaxInclusiveAmount') || '0');

    arithmeticDetails.taxExclusiveAmount = taxExcl;
    arithmeticDetails.taxAmount = taxAmount;
    arithmeticDetails.taxInclusiveAmount = taxIncl;
    arithmeticDetails.vatRate = vatRate;

    const expectedVat = round2((taxableAmt * vatRate) / 100);
    if (Math.abs(expectedVat - round2(taxAmount)) > 0.01) {
      arithmeticPassed = false;
      errors.push(
        makeError({
          code: 'ZATCA_VAT_ARITHMETIC_ERROR',
          governmentCode: 'BR-CO-15',
          path: `${taxTotalNode.path}/TaxAmount`,
          line: taxTotalNode.line,
          message: `BR-CO-15 - VAT TaxAmount (${taxAmount.toFixed(2)}) does not match TaxableAmount (${taxableAmt.toFixed(2)}) * ${vatRate}% = ${expectedVat.toFixed(2)}`
        })
      );
    }

    const expectedIncl = round2(taxExcl + taxAmount);
    if (Math.abs(expectedIncl - round2(taxIncl)) > 0.01) {
      arithmeticPassed = false;
      errors.push(
        makeError({
          code: 'ZATCA_TOTAL_INCLUSIVE_MISMATCH',
          governmentCode: 'BR-CO-15',
          path: `${legalMonetaryNode.path}/TaxInclusiveAmount`,
          line: legalMonetaryNode.line,
          message: `BR-CO-15 - TaxInclusiveAmount (${taxIncl.toFixed(2)}) != TaxExclusiveAmount (${taxExcl.toFixed(2)}) + TaxAmount (${taxAmount.toFixed(2)}) = ${expectedIncl.toFixed(2)}`
        })
      );
    }
  }

  return {
    version: '2.1',
    errors,
    warnings,
    arithmeticAudit: {
      passed: arithmeticPassed,
      details: arithmeticDetails
    }
  };
}

/**
 * 4. EU / France Factur-X & PEPPOL BIS Billing 3.0 (EN 16931) Validator
 */
function validateFacturXOrPeppolBis3(root) {
  const errors = [];
  const warnings = [];
  const arithmeticDetails = {
    lineExtensionAmount: 0,
    taxExclusiveAmount: 0,
    taxAmount: 0,
    taxInclusiveAmount: 0,
    payableAmount: 0
  };

  if (root.localName !== 'Invoice' && root.localName !== 'CrossIndustryInvoice') {
    errors.push(
      makeError({
        code: 'PEPPOL_INVALID_ROOT',
        governmentCode: 'BR-01',
        path: root.path,
        line: root.line,
        message: `Expected <Invoice> or <CrossIndustryInvoice>, found <${root.name}>`
      })
    );
    return { version: '3.0', errors, warnings, arithmeticAudit: { passed: false, details: arithmeticDetails } };
  }

  // Support UBL Invoice (and basic CII mapping)
  const customizationId =
    findText(root, 'CustomizationID') ||
    findText(root, 'ExchangedDocumentContext/GuidelineSpecifiedDocumentContextParameter/ID');
  if (!customizationId) {
    errors.push(
      makeError({
        code: 'BR-01',
        governmentCode: 'BR-01',
        path: `${root.path}/CustomizationID`,
        line: root.line,
        message: 'BR-01 - An Invoice shall have a Specification identifier (cbc:CustomizationID)'
      })
    );
  }

  const invoiceId = findText(root, 'ID') || findText(root, 'ExchangedDocument/ID');
  if (!invoiceId) {
    errors.push(
      makeError({
        code: 'BR-02',
        governmentCode: 'BR-02',
        path: `${root.path}/ID`,
        line: root.line,
        message: 'BR-02 - An Invoice shall have an Invoice number (cbc:ID)'
      })
    );
  }

  const issueDate = findText(root, 'IssueDate') || findText(root, 'ExchangedDocument/IssueDateTime/DateTimeString');
  if (!issueDate) {
    errors.push(
      makeError({
        code: 'BR-03',
        governmentCode: 'BR-03',
        path: `${root.path}/IssueDate`,
        line: root.line,
        message: 'BR-03 - An Invoice shall have an Invoice issue date (cbc:IssueDate)'
      })
    );
  }

  const typeCode = findText(root, 'InvoiceTypeCode') || findText(root, 'ExchangedDocument/TypeCode');
  if (!typeCode) {
    errors.push(
      makeError({
        code: 'BR-04',
        governmentCode: 'BR-04',
        path: `${root.path}/InvoiceTypeCode`,
        line: root.line,
        message: 'BR-04 - An Invoice shall have an Invoice type code (cbc:InvoiceTypeCode)'
      })
    );
  }

  const currencyCode =
    findText(root, 'DocumentCurrencyCode') ||
    findText(root, 'SupplyChainTradeTransaction/ApplicableHeaderTradeSettlement/InvoiceCurrencyCode');
  if (!currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) {
    errors.push(
      makeError({
        code: 'BR-05',
        governmentCode: 'BR-05',
        path: `${root.path}/DocumentCurrencyCode`,
        line: root.line,
        message: 'BR-05 - An Invoice shall have a valid ISO 4217 Invoice currency code (cbc:DocumentCurrencyCode)'
      })
    );
  }

  // Supplier & Customer checks (BR-06, BR-07, EndpointID)
  const supplier = findByPath(root, 'AccountingSupplierParty/Party') || findChild(root, 'AccountingSupplierParty');
  const customer = findByPath(root, 'AccountingCustomerParty/Party') || findChild(root, 'AccountingCustomerParty');

  const supplierName =
    findText(supplier, 'PartyLegalEntity/RegistrationName') ||
    findText(supplier, 'PartyName/Name') ||
    findText(supplier, 'Name');
  if (!supplierName) {
    errors.push(
      makeError({
        code: 'BR-06',
        governmentCode: 'BR-06',
        path: `${root.path}/AccountingSupplierParty`,
        line: supplier ? supplier.line : root.line,
        message: 'BR-06 - An Invoice shall contain the Seller name'
      })
    );
  }

  const supplierEndpoint = findChild(supplier, 'EndpointID');
  if (!supplierEndpoint || !supplierEndpoint.text) {
    errors.push(
      makeError({
        code: 'PEPPOL-EN16931-R020',
        governmentCode: 'PEPPOL-EN16931-R020',
        path: `${root.path}/AccountingSupplierParty/Party/EndpointID`,
        line: supplier ? supplier.line : root.line,
        message: 'PEPPOL-EN16931-R020 - Seller electronic address (cbc:EndpointID) MUST be provided'
      })
    );
  }

  const customerName =
    findText(customer, 'PartyLegalEntity/RegistrationName') ||
    findText(customer, 'PartyName/Name') ||
    findText(customer, 'Name');
  if (!customerName) {
    errors.push(
      makeError({
        code: 'BR-07',
        governmentCode: 'BR-07',
        path: `${root.path}/AccountingCustomerParty`,
        line: customer ? customer.line : root.line,
        message: 'BR-07 - An Invoice shall contain the Buyer name'
      })
    );
  }

  const customerEndpoint = findChild(customer, 'EndpointID');
  if (!customerEndpoint || !customerEndpoint.text) {
    errors.push(
      makeError({
        code: 'PEPPOL-EN16931-R010',
        governmentCode: 'PEPPOL-EN16931-R010',
        path: `${root.path}/AccountingCustomerParty/Party/EndpointID`,
        line: customer ? customer.line : root.line,
        message: 'PEPPOL-EN16931-R010 - Buyer electronic address (cbc:EndpointID) MUST be provided'
      })
    );
  }

  // BR-16: At least one InvoiceLine
  const lines = findChildren(root, 'InvoiceLine');
  if (lines.length === 0) {
    errors.push(
      makeError({
        code: 'BR-16',
        governmentCode: 'BR-16',
        path: `${root.path}/InvoiceLine`,
        line: root.line,
        message: 'BR-16 - An Invoice shall have at least one Invoice line (cac:InvoiceLine)'
      })
    );
  }

  let sumLines = 0;
  for (const line of lines) {
    const extAmt = parseFloat(findText(line, 'LineExtensionAmount') || '0');
    sumLines = round2(sumLines + extAmt);
  }

  let arithmeticPassed = true;
  const legalMonetary = findChild(root, 'LegalMonetaryTotal');
  const taxTotal = findChild(root, 'TaxTotal');

  if (!legalMonetary) {
    arithmeticPassed = false;
    errors.push(
      makeError({
        code: 'BR-12',
        governmentCode: 'BR-12',
        path: `${root.path}/LegalMonetaryTotal`,
        line: root.line,
        message: 'BR-12 - Missing mandatory <cac:LegalMonetaryTotal>'
      })
    );
  } else {
    const lineExt = parseFloat(findText(legalMonetary, 'LineExtensionAmount') || '0');
    const taxExcl = parseFloat(findText(legalMonetary, 'TaxExclusiveAmount') || '0');
    const taxIncl = parseFloat(findText(legalMonetary, 'TaxInclusiveAmount') || '0');
    const payable = parseFloat(findText(legalMonetary, 'PayableAmount') || String(taxIncl));
    const taxAmt = taxTotal ? parseFloat(findText(taxTotal, 'TaxAmount') || '0') : 0;

    arithmeticDetails.lineExtensionAmount = lineExt;
    arithmeticDetails.taxExclusiveAmount = taxExcl;
    arithmeticDetails.taxAmount = taxAmt;
    arithmeticDetails.taxInclusiveAmount = taxIncl;
    arithmeticDetails.payableAmount = payable;

    if (lines.length > 0 && Math.abs(sumLines - lineExt) > 0.01) {
      arithmeticPassed = false;
      errors.push(
        makeError({
          code: 'BR-CO-10',
          governmentCode: 'BR-CO-10',
          path: `${legalMonetary.path}/LineExtensionAmount`,
          line: legalMonetary.line,
          message: `BR-CO-10 - Sum of InvoiceLine net amounts (${sumLines.toFixed(2)}) != LegalMonetaryTotal/LineExtensionAmount (${lineExt.toFixed(2)})`
        })
      );
    }

    const expectedIncl = round2(taxExcl + taxAmt);
    if (Math.abs(expectedIncl - round2(taxIncl)) > 0.01) {
      arithmeticPassed = false;
      errors.push(
        makeError({
          code: 'BR-CO-15',
          governmentCode: 'BR-CO-15',
          path: `${legalMonetary.path}/TaxInclusiveAmount`,
          line: legalMonetary.line,
          message: `BR-CO-15 - TaxInclusiveAmount (${taxIncl.toFixed(2)}) != TaxExclusiveAmount (${taxExcl.toFixed(2)}) + TaxAmount (${taxAmt.toFixed(2)}) = ${expectedIncl.toFixed(2)}`
        })
      );
    }
  }

  return {
    version: '3.0',
    errors,
    warnings,
    arithmeticAudit: {
      passed: arithmeticPassed,
      details: arithmeticDetails
    }
  };
}

/**
 * Main Entrypoint: Validate an XML document against statutory XSD & Schematron rules
 *
 * @param {string} xmlString
 * @param {object} [options]
 * @param {string} [options.schemaType='auto']
 * @param {string} [options.country='auto']
 */
function validateXmlDocument(xmlString, { schemaType = 'auto', country = 'auto' } = {}) {
  const parsed = parseXmlWellFormed(xmlString);
  if (parsed.errors.length > 0 || !parsed.root) {
    const fallbackSchema = detectSchemaType(parsed.root, { schemaType, country });
    return {
      valid: false,
      schema: fallbackSchema,
      version: 'unknown',
      errors: parsed.errors,
      warnings: [],
      arithmeticAudit: { passed: false, details: {} }
    };
  }

  const detectedSchema = detectSchemaType(parsed.root, { schemaType, country });
  let result;

  switch (detectedSchema) {
    case 'FatturaPA_v1.2.2':
      result = validateFatturaPA(parsed.root);
      break;
    case 'TEIF_v1.8.8':
      result = validateTEIF(parsed.root);
      break;
    case 'ZATCA_UBL_2.1':
      result = validateZatcaUbl(parsed.root);
      break;
    case 'FacturX_UBL_BIS3':
      result = validateFacturXOrPeppolBis3(parsed.root);
      break;
    default:
      return {
        valid: false,
        schema: detectedSchema,
        version: 'unknown',
        errors: [
          makeError({
            code: 'UNSUPPORTED_SCHEMA',
            governmentCode: '00200',
            path: parsed.root.path,
            line: parsed.root.line,
            message: `Unrecognized or unsupported statutory XML schema for root <${parsed.root.name}>`
          })
        ],
        warnings: [],
        arithmeticAudit: { passed: false, details: {} }
      };
  }

  return {
    valid: result.errors.length === 0,
    schema: detectedSchema,
    version: result.version,
    errors: result.errors,
    warnings: result.warnings,
    arithmeticAudit: result.arithmeticAudit
  };
}

module.exports = {
  validateXmlDocument,
  validateItalianPartitaIva,
  validateTunisianMatriculeFiscal,
  validateSaudiVatNumber,
  encodeZatcaTlvQr,
  decodeZatcaTlvQr,
  parseXmlWellFormed
};
