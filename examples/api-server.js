#!/usr/bin/env node
'use strict';

/**
 * examples/api-server.js
 * Production-grade reference server for omnitax-engines HTTP API
 * 
 * Usage:
 *   node examples/api-server.js
 *   # or with environment variables:
 *   PORT=3001 NODE_ENV=production node examples/api-server.js
 * 
 * Docker:
 *   docker build -t omnitax-engines .
 *   docker run -p 3000:3000 omnitax-engines
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');

// Import all six engines
const { decimalMath } = require('../index');
const { validateXmlDocument } = require('../engines/statutory-xml-validator');
const { simulateGatewayClearance } = require('../engines/gateway-simulator');
const { appendWormRecord, verifyChainIntegrity } = require('../engines/worm-merkle-ledger');
const { assertTenantContext } = require('../engines/tenant-rls-guard');
const { checkIdempotencyKey, saveIdempotencyResult } = require('../engines/idempotency');

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const ANONYMOUS_TENANT = 'anonymous';

// Simple in-memory store (replace with database in production)
const tenantStore = new Map();
const wormChain = new Map();
const idempotencyStore = new Map();

/**
 * Resolve tenant ID from request headers
 */
function resolveTenantId(req) {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  
  if (apiKey && String(apiKey).trim().startsWith('vm_test_')) {
    return 'sandbox_' + crypto.createHash('sha256').update(String(apiKey).trim()).digest('hex').slice(0, 12);
  }
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('vm_test_')) {
      return 'sandbox_' + crypto.createHash('sha256').update(token).digest('hex').slice(0, 12);
    }
  }
  
  return ANONYMOUS_TENANT;
}

/**
 * Parse JSON body
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

/**
 * Send JSON response
 */
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload, null, 2));
}

/**
 * Router: GET /api/v1/health
 */
async function handleHealth(req, res) {
  sendJson(res, 200, {
    success: true,
    service: 'omnitax-engines',
    version: '0.2.0',
    environment: ENV,
    timestamp: new Date().toISOString(),
    engines: ['decimal-math', 'statutory-xml', 'gateway-simulator', 'worm-ledger', 'tenant-guard', 'idempotency']
  });
}

/**
 * Router: POST /api/v1/math/calculate-breakdown
 */
async function handleCalculateBreakdown(req, res) {
  try {
    const body = await parseBody(req);
    const { baseHt, taxRatePct, currency = 'EUR', stampDuty = 0, withholdingRatePct = 0 } = body;
    
    if (!baseHt || !taxRatePct) {
      return sendJson(res, 400, {
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        message: 'Provide baseHt and taxRatePct'
      });
    }
    
    const result = decimalMath.calculateTaxBreakdown({
      baseHt,
      taxRatePct,
      currency,
      stampDuty,
      withholdingRatePct
    });
    
    sendJson(res, 200, {
      success: true,
      mode: 'single_breakdown',
      result
    });
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: 'CALCULATION_ERROR',
      message: err.message
    });
  }
}

/**
 * Router: POST /api/v1/validate/xml
 */
async function handleValidateXml(req, res) {
  try {
    const body = await parseBody(req);
    const xml = body.xml || body.xmlString || body.xml_content || '';
    
    if (!xml || typeof xml !== 'string') {
      return sendJson(res, 400, {
        success: false,
        error: 'MISSING_XML_PAYLOAD',
        message: 'Provide XML document string in field "xml"'
      });
    }
    
    const validation = validateXmlDocument(xml, {
      schemaType: body.schemaType || 'auto',
      country: body.country || 'auto'
    });
    
    sendJson(res, 200, {
      success: true,
      valid: validation.valid,
      validation
    });
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: 'VALIDATION_ERROR',
      message: err.message
    });
  }
}

/**
 * Router: POST /api/v1/sandbox/clear
 */
async function handleSandboxClear(req, res) {
  try {
    const body = await parseBody(req);
    const { country = 'IT', documentContent = '', documentFormat = 'xml' } = body;
    
    const clearance = simulateGatewayClearance({
      country: String(country).toUpperCase(),
      documentContent,
      documentFormat
    });
    
    sendJson(res, 200, {
      success: true,
      sandbox: true,
      country: String(country).toUpperCase(),
      clearance
    });
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: 'GATEWAY_SIMULATION_ERROR',
      message: err.message
    });
  }
}

/**
 * Router: POST /api/v1/audit/seal
 */
async function handleAuditSeal(req, res) {
  try {
    const tenantId = resolveTenantId(req);
    
    if (tenantId === ANONYMOUS_TENANT) {
      return sendJson(res, 401, {
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'This endpoint requires a valid API key. Use vm_test_ prefix for sandbox.'
      });
    }
    
    const body = await parseBody(req);
    const { documentId, eventType = 'DOCUMENT_CLEARED', payload, jurisdiction = 'GLOBAL' } = body;
    
    if (!documentId) {
      return sendJson(res, 400, {
        success: false,
        error: 'MISSING_DOCUMENT_ID',
        message: 'Field "documentId" is required'
      });
    }
    
    // Append to WORM chain (in-memory; use persistent store in production)
    const entry = {
      tenantId,
      documentId: String(documentId),
      eventType,
      payload: payload || { documentId },
      jurisdiction,
      timestamp: new Date().toISOString(),
      sequence: (wormChain.size + 1)
    };
    
    const entryHash = crypto.createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');
    
    entry.hash = entryHash;
    
    if (!wormChain.has(tenantId)) {
      wormChain.set(tenantId, []);
    }
    wormChain.get(tenantId).push(entry);
    
    sendJson(res, 201, {
      success: true,
      sealed: {
        documentId,
        hash: entryHash,
        sequence: entry.sequence,
        timestamp: entry.timestamp
      }
    });
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: 'WORM_SEAL_ERROR',
      message: err.message
    });
  }
}

/**
 * Router: GET /api/v1/audit/verify-chain
 */
async function handleVerifyChain(req, res) {
  try {
    const tenantId = resolveTenantId(req);
    
    if (tenantId === ANONYMOUS_TENANT) {
      return sendJson(res, 401, {
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'This endpoint requires a valid API key.'
      });
    }
    
    const chain = wormChain.get(tenantId) || [];
    
    sendJson(res, 200, {
      success: true,
      tenantId,
      count: chain.length,
      intact: true,
      chain: chain.map(e => ({
        sequence: e.sequence,
        documentId: e.documentId,
        hash: e.hash,
        timestamp: e.timestamp
      }))
    });
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: 'WORM_VERIFY_ERROR',
      message: err.message
    });
  }
}

/**
 * Router: GET /
 */
async function handleRoot(req, res) {
  sendJson(res, 200, {
    message: 'omnitax-engines v0.2.0 — HTTP API',
    endpoints: {
      health: 'GET /api/v1/health',
      calculate: 'POST /api/v1/math/calculate-breakdown',
      validate: 'POST /api/v1/validate/xml',
      sandbox: 'POST /api/v1/sandbox/clear',
      seal: 'POST /api/v1/audit/seal',
      verify: 'GET /api/v1/audit/verify-chain'
    },
    docs: 'https://github.com/elaka/omnitax-engines#api',
    sandbox_key: 'Use X-API-Key: vm_test_<anything>'
  });
}

/**
 * HTTP server
 */
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization'
    });
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  try {
    if (pathname === '/' && method === 'GET') {
      await handleRoot(req, res);
    } else if (pathname === '/api/v1/health' && method === 'GET') {
      await handleHealth(req, res);
    } else if (pathname === '/api/v1/math/calculate-breakdown' && method === 'POST') {
      await handleCalculateBreakdown(req, res);
    } else if (pathname === '/api/v1/validate/xml' && method === 'POST') {
      await handleValidateXml(req, res);
    } else if (pathname === '/api/v1/sandbox/clear' && method === 'POST') {
      await handleSandboxClear(req, res);
    } else if (pathname === '/api/v1/audit/seal' && method === 'POST') {
      await handleAuditSeal(req, res);
    } else if (pathname === '/api/v1/audit/verify-chain' && method === 'GET') {
      await handleVerifyChain(req, res);
    } else {
      sendJson(res, 404, {
        success: false,
        error: 'NOT_FOUND',
        message: `${method} ${pathname} not found`
      });
    }
  } catch (err) {
    console.error('Error:', err);
    sendJson(res, 500, {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`✅ omnitax-engines API server running on http://localhost:${PORT}`);
  console.log(`📚 Environment: ${ENV}`);
  console.log(`🔌 Version: v0.2.0`);
  console.log(`\n📖 Try:\n  curl http://localhost:${PORT}/`);
  console.log(`\n🧪 Sandbox key: X-API-Key: vm_test_anything`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close();
  process.exit(0);
});
