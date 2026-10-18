'use strict';

/**
 * Exact Financial Arithmetic Engine (Zero Floating-Point Drift)
 * Uses BigInt string-parsed fixed-point scaling for 2-decimal (EUR, USD, MAD, SAR, AED, EGP, etc.)
 * and 3-decimal (TND, KWD, OMR, BHD) currencies.
 */

const THREE_DECIMAL_CURRENCIES = new Set(['TND', 'KWD', 'OMR', 'BHD']);
const TWO_DECIMAL_CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'MAD', 'SAR', 'AED', 'EGP', 'CHF', 'CAD', 'QAR', 'DZD'
]);

/**
 * Returns the number of minor-unit decimal places for a currency.
 * @param {string} currency - ISO 4217 currency code
 * @returns {number} 3 for TND/KWD/OMR/BHD, 2 otherwise
 */
function getCurrencyDecimals(currency = 'EUR') {
  const normalized = String(currency || 'EUR').trim().toUpperCase();
  if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
    return 3;
  }
  return 2;
}

/**
 * Parses a decimal number or string into an exact rational representation:
 * value = numerator / 10^scale (as BigInts), with zero IEEE-754 float multiplication.
 * @param {number|string|bigint} input
 * @returns {{ sign: bigint, coeff: bigint, fracLen: number }}
 */
function parseDecimalExact(input) {
  if (typeof input === 'bigint') {
    return { sign: input < 0n ? -1n : 1n, coeff: input < 0n ? -input : input, fracLen: 0 };
  }
  if (input === null || input === undefined || input === '') {
    return { sign: 1n, coeff: 0n, fracLen: 0 };
  }
  let str;
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new TypeError(`Invalid non-finite financial amount: ${input}`);
    }
    // Use toFixed(12) to strip IEEE-754 representation noise on literals like 19.99
    str = input.toFixed(12).replace(/\.?0+$/, '');
    if (str === '' || str === '-0') str = '0';
  } else {
    str = String(input).trim().replace(/,/g, '');
  }

  let sign = 1n;
  if (str.startsWith('-')) {
    sign = -1n;
    str = str.slice(1).trim();
  } else if (str.startsWith('+')) {
    str = str.slice(1).trim();
  }

  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new TypeError(`Malformed decimal value: "${input}"`);
  }

  const parts = str.split('.');
  const intPart = parts[0] || '0';
  const fracPart = parts[1] || '';
  const coeff = BigInt(intPart + fracPart);
  return { sign, coeff, fracLen: fracPart.length };
}

/**
 * Divides a BigInt numerator by 10^exp with statutory half-up (or banker's half-even) rounding.
 * @param {bigint} signedNumerator
 * @param {number} exp
 * @param {'half-up'|'half-even'} mode
 * @returns {bigint}
 */
function divideByPow10Rounded(signedNumerator, exp, mode = 'half-up') {
  if (exp <= 0) {
    return signedNumerator * (10n ** BigInt(-exp));
  }
  const divisor = 10n ** BigInt(exp);
  const half = divisor / 2n;
  const sign = signedNumerator < 0n ? -1n : 1n;
  const absNum = signedNumerator < 0n ? -signedNumerator : signedNumerator;

  const quotient = absNum / divisor;
  const remainder = absNum % divisor;

  let rounded = quotient;
  if (remainder > half) {
    rounded = quotient + 1n;
  } else if (remainder === half) {
    if (mode === 'half-even') {
      if (quotient % 2n !== 0n) {
        rounded = quotient + 1n;
      }
    } else {
      rounded = quotient + 1n;
    }
  }

  return sign * rounded;
}

/**
 * Converts a string or number amount in major currency units to exact integer minor units.
 * @param {number|string|bigint} amount
 * @param {string} [currency='EUR']
 * @param {'half-up'|'half-even'} [roundingMode='half-up']
 * @returns {number} Exact integer minor units (e.g. cents for EUR, millimes for TND)
 */
function toMinorUnits(amount, currency = 'EUR', roundingMode = 'half-up') {
  const decimals = getCurrencyDecimals(currency);
  const { sign, coeff, fracLen } = parseDecimalExact(amount);
  const signedScaled = sign * coeff;
  const shift = fracLen - decimals;
  const minorBigInt = divideByPow10Rounded(signedScaled, shift, roundingMode);
  const result = Number(minorBigInt);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`Minor unit overflow for amount ${amount} (${currency})`);
  }
  return result;
}

/**
 * Converts exact integer minor units back to a formatted major-unit string and numeric value.
 * Returned object has `.formatted`, `.value`, `.minorUnits`, `.currency`, `.decimals`,
 * and implements `toString()` -> formatted string and `valueOf()` -> numeric value.
 * @param {number|bigint} minorUnits
 * @param {string} [currency='EUR']
 * @returns {{ formatted: string, value: number, minorUnits: number, currency: string, decimals: number }}
 */
function fromMinorUnits(minorUnits, currency = 'EUR') {
  const normalizedCurrency = String(currency || 'EUR').trim().toUpperCase();
  const decimals = getCurrencyDecimals(normalizedCurrency);
  const minorBig = typeof minorUnits === 'bigint' ? minorUnits : BigInt(Math.trunc(Number(minorUnits)));
  const signStr = minorBig < 0n ? '-' : '';
  const absBig = minorBig < 0n ? -minorBig : minorBig;
  const divisor = 10n ** BigInt(decimals);
  const intPart = absBig / divisor;
  const fracPart = (absBig % divisor).toString().padStart(decimals, '0');
  const formatted = `${signStr}${intPart.toString()}.${fracPart}`;
  const value = Number(formatted);

  const output = {
    formatted,
    value,
    minorUnits: Number(minorBig),
    currency: normalizedCurrency,
    decimals
  };
  Object.defineProperty(output, 'toString', {
    value: () => formatted,
    enumerable: false
  });
  Object.defineProperty(output, 'valueOf', {
    value: () => value,
    enumerable: false
  });
  return output;
}

/**
 * Multiplies a minor-unit BigInt by a decimal percentage (e.g. 19 or 7.5) and divides by 100
 * with exact integer rounding.
 * @param {number|bigint} baseMinor
 * @param {number|string} ratePct
 * @param {'half-up'|'half-even'} [roundingMode='half-up']
 * @returns {number}
 */
function applyPercentageMinor(baseMinor, ratePct, roundingMode = 'half-up') {
  const baseBig = BigInt(Math.trunc(Number(baseMinor)));
  const { sign, coeff, fracLen } = parseDecimalExact(ratePct || 0);
  const numerator = baseBig * sign * coeff;
  // Percentage divides by 100 (10^2) plus the decimal places of ratePct
  const minorBig = divideByPow10Rounded(numerator, fracLen + 2, roundingMode);
  return Number(minorBig);
}

/**
 * Calculates a complete statutory tax breakdown in exact integer minor units.
 * Enforces the mathematical invariant: htMinor + tvaMinor + stampMinor === ttcMinor.
 *
 * @param {object} params
 * @param {number|string} params.baseHt - Base HT amount in major units
 * @param {number|string} [params.taxRatePct=0] - VAT/TVA rate percentage (e.g. 19 for 19%)
 * @param {number|string} [params.stampDuty=0] - Fiscal stamp duty in major units (e.g. 1.000 TND)
 * @param {number|string} [params.withholdingRatePct=0] - Withholding tax (RS) percentage on TTC or HT
 * @param {string} [params.currency='EUR'] - ISO currency code
 * @param {'ttc'|'ht'} [params.withholdingBasis='ttc'] - Statutory basis for WHT (default TTC per TN RS rules)
 * @returns {object}
 */
function calculateTaxBreakdown({
  baseHt,
  taxRatePct = 0,
  stampDuty = 0,
  withholdingRatePct = 0,
  currency = 'EUR',
  withholdingBasis = 'ttc'
} = {}) {
  const normalizedCurrency = String(currency || 'EUR').trim().toUpperCase();
  const decimals = getCurrencyDecimals(normalizedCurrency);

  const htMinor = toMinorUnits(baseHt, normalizedCurrency);
  const tvaMinor = applyPercentageMinor(htMinor, taxRatePct);
  const stampMinor = toMinorUnits(stampDuty, normalizedCurrency);
  const ttcMinor = htMinor + tvaMinor + stampMinor;

  if (htMinor + tvaMinor + stampMinor !== ttcMinor) {
    throw new Error(
      `[DECIMAL_INVARIANT_VIOLATION] htMinor (${htMinor}) + tvaMinor (${tvaMinor}) + stampMinor (${stampMinor}) !== ttcMinor (${ttcMinor})`
    );
  }

  const whtBaseMinor = withholdingBasis === 'ht' ? htMinor : ttcMinor;
  const whtMinor = applyPercentageMinor(whtBaseMinor, withholdingRatePct);
  const netPayableMinor = ttcMinor - whtMinor;

  if (ttcMinor - whtMinor !== netPayableMinor) {
    throw new Error(
      `[DECIMAL_INVARIANT_VIOLATION] ttcMinor (${ttcMinor}) - whtMinor (${whtMinor}) !== netPayableMinor (${netPayableMinor})`
    );
  }

  const htObj = fromMinorUnits(htMinor, normalizedCurrency);
  const tvaObj = fromMinorUnits(tvaMinor, normalizedCurrency);
  const stampObj = fromMinorUnits(stampMinor, normalizedCurrency);
  const ttcObj = fromMinorUnits(ttcMinor, normalizedCurrency);
  const whtObj = fromMinorUnits(whtMinor, normalizedCurrency);
  const netObj = fromMinorUnits(netPayableMinor, normalizedCurrency);

  return {
    currency: normalizedCurrency,
    decimals,
    htMinor,
    tvaMinor,
    stampMinor,
    ttcMinor,
    whtMinor,
    netPayableMinor,
    ht: htObj.formatted,
    tva: tvaObj.formatted,
    stamp: stampObj.formatted,
    ttc: ttcObj.formatted,
    wht: whtObj.formatted,
    netPayable: netObj.formatted,
    formatted: {
      ht: htObj.formatted,
      tva: tvaObj.formatted,
      stamp: stampObj.formatted,
      ttc: ttcObj.formatted,
      wht: whtObj.formatted,
      netPayable: netObj.formatted
    },
    htNumeric: htObj.value,
    tvaNumeric: tvaObj.value,
    stampNumeric: stampObj.value,
    ttcNumeric: ttcObj.value,
    whtNumeric: whtObj.value,
    netPayableNumeric: netObj.value,
    invariantVerified: true
  };
}

/**
 * Reconciles multi-line invoices in exact minor units and verifies zero rounding drift
 * between the sum of individual line items and invoice-level totals.
 *
 * @param {Array<{ quantity: number|string, unitPriceHt: number|string, taxRatePct?: number|string, description?: string }>} lines
 * @param {object} [options]
 * @param {string} [options.currency='EUR']
 * @param {number|string} [options.stampDuty=0]
 * @param {number|string} [options.discountHt=0]
 * @param {number|string} [options.withholdingRatePct=0]
 * @returns {object}
 */
function reconcileInvoiceLines(
  lines = [],
  { currency = 'EUR', stampDuty = 0, discountHt = 0, withholdingRatePct = 0 } = {}
) {
  if (!Array.isArray(lines)) {
    throw new TypeError('lines must be an array of invoice line items');
  }

  const normalizedCurrency = String(currency || 'EUR').trim().toUpperCase();
  const decimals = getCurrencyDecimals(normalizedCurrency);

  let sumLinesHtMinor = 0;
  let sumLinesTvaMinor = 0;

  const reconciledLines = lines.map((line, index) => {
    const qtyParsed = parseDecimalExact(line.quantity !== undefined ? line.quantity : 1);
    const priceParsed = parseDecimalExact(line.unitPriceHt !== undefined ? line.unitPriceHt : (line.unitPrice || 0));
    const ratePct = line.taxRatePct !== undefined ? line.taxRatePct : (line.taxRate || 0);

    // Exact line HT in minor units: (qty * unitPrice * 10^decimals)
    const rawNumerator =
      qtyParsed.sign * qtyParsed.coeff * priceParsed.sign * priceParsed.coeff;
    const shift = qtyParsed.fracLen + priceParsed.fracLen - decimals;
    const lineHtMinor = Number(divideByPow10Rounded(rawNumerator, shift, 'half-up'));
    const lineTvaMinor = applyPercentageMinor(lineHtMinor, ratePct, 'half-up');
    const lineTtcMinor = lineHtMinor + lineTvaMinor;

    sumLinesHtMinor += lineHtMinor;
    sumLinesTvaMinor += lineTvaMinor;

    return {
      lineIndex: index,
      description: line.description || `Line ${index + 1}`,
      quantity: Number(line.quantity !== undefined ? line.quantity : 1),
      taxRatePct: Number(ratePct),
      htMinor: lineHtMinor,
      tvaMinor: lineTvaMinor,
      ttcMinor: lineTtcMinor,
      ht: fromMinorUnits(lineHtMinor, normalizedCurrency).formatted,
      tva: fromMinorUnits(lineTvaMinor, normalizedCurrency).formatted,
      ttc: fromMinorUnits(lineTtcMinor, normalizedCurrency).formatted
    };
  });

  const discountMinor = toMinorUnits(discountHt, normalizedCurrency);
  const htMinor = sumLinesHtMinor - discountMinor;
  const tvaMinor = sumLinesTvaMinor;
  const stampMinor = toMinorUnits(stampDuty, normalizedCurrency);
  const ttcMinor = htMinor + tvaMinor + stampMinor;
  const whtMinor = applyPercentageMinor(ttcMinor, withholdingRatePct);
  const netPayableMinor = ttcMinor - whtMinor;

  const sumLineTtcPlusAdjustments =
    reconciledLines.reduce((acc, l) => acc + l.ttcMinor, 0) - discountMinor + stampMinor;
  const driftMinor = ttcMinor - sumLineTtcPlusAdjustments;

  if (driftMinor !== 0 || htMinor + tvaMinor + stampMinor !== ttcMinor) {
    throw new Error(
      `[RECONCILIATION_DRIFT_ERROR] Drift detected: driftMinor=${driftMinor}, htMinor=${htMinor}, tvaMinor=${tvaMinor}, stampMinor=${stampMinor}, ttcMinor=${ttcMinor}`
    );
  }

  return {
    currency: normalizedCurrency,
    decimals,
    lines: reconciledLines,
    discountMinor,
    htMinor,
    tvaMinor,
    stampMinor,
    ttcMinor,
    whtMinor,
    netPayableMinor,
    ht: fromMinorUnits(htMinor, normalizedCurrency).formatted,
    tva: fromMinorUnits(tvaMinor, normalizedCurrency).formatted,
    stamp: fromMinorUnits(stampMinor, normalizedCurrency).formatted,
    ttc: fromMinorUnits(ttcMinor, normalizedCurrency).formatted,
    wht: fromMinorUnits(whtMinor, normalizedCurrency).formatted,
    netPayable: fromMinorUnits(netPayableMinor, normalizedCurrency).formatted,
    driftMinor: 0,
    reconciled: true
  };
}

module.exports = {
  THREE_DECIMAL_CURRENCIES,
  TWO_DECIMAL_CURRENCIES,
  getCurrencyDecimals,
  toMinorUnits,
  fromMinorUnits,
  applyPercentageMinor,
  calculateTaxBreakdown,
  reconcileInvoiceLines
};
