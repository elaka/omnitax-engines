'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);
// Storage home: configurable via OMNITAX_IDEMPOTENCY_STORE; defaults to the OS
// temp directory so requiring this module never writes inside the package tree.
const DB_PATH = process.env.OMNITAX_IDEMPOTENCY_STORE
  || path.join(os.tmpdir(), 'omnitax-engines', 'idempotency_store.sqlite');

/**
 * Storage engine wrapper: attempts better-sqlite3 on data/idempotency_store.sqlite,
 * and falls back cleanly to a deterministic in-memory Map store if native bindings are absent.
 */
class IdempotencyStorageEngine {
  constructor() {
    this.backend = 'memory';
    this.memoryStore = new Map();
    this.db = null;
    this._initSqlite();
  }

  _initSqlite() {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Attempt optional native better-sqlite3 binding
      // eslint-disable-next-line global-require, import/no-extraneous-dependencies
      const BetterSqlite3 = require('better-sqlite3');
      this.db = new BetterSqlite3(DB_PATH);
      this.db.pragma('journal_mode = WAL');
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          scoped_key TEXT PRIMARY KEY,
          idempotency_key TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          payload_hash TEXT NOT NULL,
          status TEXT NOT NULL,
          status_code INTEGER,
          response_body TEXT,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);
      `);
      this.backend = 'better-sqlite3';
    } catch (_err) {
      this.backend = 'memory';
      this.db = null;
    }
  }

  get(scopedKey) {
    const now = Date.now();
    if (this.backend === 'better-sqlite3' && this.db) {
      const row = this.db
        .prepare('SELECT * FROM idempotency_keys WHERE scoped_key = ?')
        .get(scopedKey);
      if (!row) return null;
      if (row.expires_at <= now) {
        this.db.prepare('DELETE FROM idempotency_keys WHERE scoped_key = ?').run(scopedKey);
        return null;
      }
      let parsedBody = row.response_body;
      try {
        parsedBody = JSON.parse(row.response_body);
      } catch (_e) {
        // leave as string
      }
      return {
        scopedKey: row.scoped_key,
        key: row.idempotency_key,
        tenantId: row.tenant_id,
        payloadHash: row.payload_hash,
        status: row.status,
        statusCode: row.status_code,
        body: parsedBody,
        rawBodyString: row.response_body,
        createdAt: row.created_at,
        expiresAt: row.expires_at
      };
    }

    const entry = this.memoryStore.get(scopedKey);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.memoryStore.delete(scopedKey);
      return null;
    }
    return entry;
  }

  set(record) {
    if (this.backend === 'better-sqlite3' && this.db) {
      const bodyStr =
        typeof record.body === 'string'
          ? record.body
          : JSON.stringify(record.body !== undefined ? record.body : null);
      this.db
        .prepare(
          `INSERT OR REPLACE INTO idempotency_keys
           (scoped_key, idempotency_key, tenant_id, payload_hash, status, status_code, response_body, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          record.scopedKey,
          record.key,
          record.tenantId,
          record.payloadHash,
          record.status,
          record.statusCode !== undefined ? record.statusCode : null,
          bodyStr,
          record.createdAt,
          record.expiresAt
        );
      return;
    }

    const bodyStr =
      typeof record.body === 'string'
        ? record.body
        : JSON.stringify(record.body !== undefined ? record.body : null);
    this.memoryStore.set(record.scopedKey, {
      ...record,
      rawBodyString: bodyStr
    });
  }

  delete(scopedKey) {
    if (this.backend === 'better-sqlite3' && this.db) {
      this.db.prepare('DELETE FROM idempotency_keys WHERE scoped_key = ?').run(scopedKey);
      return;
    }
    this.memoryStore.delete(scopedKey);
  }

  clearExpired(now = Date.now()) {
    if (this.backend === 'better-sqlite3' && this.db) {
      const info = this.db
        .prepare('DELETE FROM idempotency_keys WHERE expires_at <= ?')
        .run(now);
      return info.changes || 0;
    }
    let removed = 0;
    for (const [k, v] of this.memoryStore.entries()) {
      if (v.expiresAt <= now) {
        this.memoryStore.delete(k);
        removed += 1;
      }
    }
    return removed;
  }

  clearAll() {
    if (this.backend === 'better-sqlite3' && this.db) {
      this.db.prepare('DELETE FROM idempotency_keys').run();
      return;
    }
    this.memoryStore.clear();
  }
}

const storeEngine = new IdempotencyStorageEngine();

/**
 * Computes deterministic SHA-256 payload hash:
 * SHA256(tenantId + ':' + method + ':' + path + ':' + rawBody)
 * @param {string} tenantId
 * @param {string} method
 * @param {string} reqPath
 * @param {string|object|Buffer} rawBody
 * @returns {string}
 */
function computePayloadHash(tenantId = 'default', method = 'POST', reqPath = '/', rawBody = '') {
  const normTenant = String(tenantId || 'default').trim();
  const normMethod = String(method || 'POST').trim().toUpperCase();
  const normPath = String(reqPath || '/').trim();
  let normBody = '';
  if (Buffer.isBuffer(rawBody)) {
    normBody = rawBody.toString('utf8');
  } else if (typeof rawBody === 'string') {
    normBody = rawBody;
  } else if (rawBody !== null && rawBody !== undefined) {
    normBody = JSON.stringify(rawBody);
  }

  const canonical = `${normTenant}:${normMethod}:${normPath}:${normBody}`;
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

function makeScopedKey(tenantId, key) {
  return `${String(tenantId || 'default').trim()}::${String(key).trim()}`;
}

/**
 * Checks an Idempotency-Key in the store and optionally acquires an IN_PROGRESS lock on miss.
 * Supports both object and positional arguments.
 *
 * @param {string|object} keyOrOptions
 * @param {string|object} [payloadHashOrOpts]
 * @param {string} [tenantIdArg]
 * @param {object} [extraOpts]
 * @returns {{
 *   status: 'NEW'|'IN_PROGRESS'|'MISMATCH'|'REPLAY',
 *   httpStatus?: number,
 *   body?: any,
 *   headers?: object,
 *   payloadHash: string,
 *   key: string,
 *   tenantId: string
 * }}
 */
function checkIdempotencyKey(keyOrOptions, payloadHashOrOpts, tenantIdArg, extraOpts = {}) {
  let key;
  let tenantId = 'default';
  let method = 'POST';
  let reqPath = '/';
  let rawBody = '';
  let payloadHash;
  let ttlMs = DEFAULT_TTL_MS;
  let acquireLock = true;

  if (typeof keyOrOptions === 'object' && keyOrOptions !== null) {
    key = keyOrOptions.key || keyOrOptions.idempotencyKey;
    tenantId = keyOrOptions.tenantId || 'default';
    method = keyOrOptions.method || 'POST';
    reqPath = keyOrOptions.path || keyOrOptions.url || '/';
    rawBody = keyOrOptions.rawBody !== undefined ? keyOrOptions.rawBody : '';
    payloadHash = keyOrOptions.payloadHash;
    if (typeof keyOrOptions.ttlMs === 'number') ttlMs = keyOrOptions.ttlMs;
    if (typeof keyOrOptions.acquireLock === 'boolean') acquireLock = keyOrOptions.acquireLock;
  } else {
    key = keyOrOptions;
    if (typeof payloadHashOrOpts === 'object' && payloadHashOrOpts !== null) {
      tenantId = payloadHashOrOpts.tenantId || 'default';
      method = payloadHashOrOpts.method || 'POST';
      reqPath = payloadHashOrOpts.path || payloadHashOrOpts.url || '/';
      rawBody = payloadHashOrOpts.rawBody !== undefined ? payloadHashOrOpts.rawBody : '';
      payloadHash = payloadHashOrOpts.payloadHash;
      if (typeof payloadHashOrOpts.ttlMs === 'number') ttlMs = payloadHashOrOpts.ttlMs;
      if (typeof payloadHashOrOpts.acquireLock === 'boolean') acquireLock = payloadHashOrOpts.acquireLock;
    } else {
      payloadHash = payloadHashOrOpts;
      tenantId = tenantIdArg || extraOpts.tenantId || 'default';
      if (typeof extraOpts.ttlMs === 'number') ttlMs = extraOpts.ttlMs;
      if (typeof extraOpts.acquireLock === 'boolean') acquireLock = extraOpts.acquireLock;
    }
  }

  if (!key || String(key).trim() === '') {
    return { status: 'PASS_THROUGH', key: null, tenantId, payloadHash: null };
  }

  const normalizedKey = String(key).trim();
  const normalizedTenant = String(tenantId || 'default').trim();
  const computedHash =
    payloadHash || computePayloadHash(normalizedTenant, method, reqPath, rawBody);
  const scopedKey = makeScopedKey(normalizedTenant, normalizedKey);

  const existing = storeEngine.get(scopedKey);
  if (existing) {
    // Check payload mismatch first or in-progress conflict
    if (existing.payloadHash !== computedHash) {
      return {
        status: 'MISMATCH',
        httpStatus: 422,
        body: {
          error: 'IDEMPOTENCY_KEY_MISMATCH',
          message: 'Idempotency-Key cannot be reused with a different request payload.'
        },
        payloadHash: computedHash,
        key: normalizedKey,
        tenantId: normalizedTenant
      };
    }

    if (existing.status === 'IN_PROGRESS') {
      return {
        status: 'IN_PROGRESS',
        httpStatus: 409,
        body: {
          error: 'IDEMPOTENCY_CONFLICT',
          message: 'A request with this Idempotency-Key is currently in progress.'
        },
        payloadHash: computedHash,
        key: normalizedKey,
        tenantId: normalizedTenant
      };
    }

    return {
      status: 'REPLAY',
      httpStatus: existing.statusCode || 200,
      body: existing.body,
      rawBodyString: existing.rawBodyString,
      headers: { 'X-Idempotent-Replay': 'true' },
      payloadHash: computedHash,
      key: normalizedKey,
      tenantId: normalizedTenant
    };
  }

  if (acquireLock) {
    const now = Date.now();
    storeEngine.set({
      scopedKey,
      key: normalizedKey,
      tenantId: normalizedTenant,
      payloadHash: computedHash,
      status: 'IN_PROGRESS',
      statusCode: null,
      body: null,
      createdAt: now,
      expiresAt: now + ttlMs
    });
  }

  return {
    status: 'NEW',
    payloadHash: computedHash,
    key: normalizedKey,
    tenantId: normalizedTenant
  };
}

/**
 * Saves a completed response for an Idempotency-Key.
 * Supports object or positional arguments.
 */
function saveIdempotencyResult(arg1, arg2, arg3, arg4, arg5) {
  let key;
  let tenantId = 'default';
  let payloadHash;
  let statusCode = 200;
  let body = {};
  let ttlMs = DEFAULT_TTL_MS;

  if (typeof arg1 === 'object' && arg1 !== null) {
    key = arg1.key || arg1.idempotencyKey;
    tenantId = arg1.tenantId || 'default';
    payloadHash = arg1.payloadHash;
    statusCode = arg1.statusCode !== undefined ? arg1.statusCode : 200;
    body = arg1.body !== undefined ? arg1.body : arg1.responseBody;
    if (typeof arg1.ttlMs === 'number') ttlMs = arg1.ttlMs;
  } else {
    key = arg1;
    if (typeof arg2 === 'object' && arg2 !== null && ('statusCode' in arg2 || 'body' in arg2 || 'responseBody' in arg2)) {
      tenantId = arg2.tenantId || 'default';
      payloadHash = arg2.payloadHash;
      statusCode = arg2.statusCode !== undefined ? arg2.statusCode : 200;
      body = arg2.body !== undefined ? arg2.body : arg2.responseBody;
      if (typeof arg2.ttlMs === 'number') ttlMs = arg2.ttlMs;
    } else if (typeof arg2 === 'number') {
      statusCode = arg2;
      body = arg3;
      payloadHash = arg4;
      tenantId = arg5 || 'default';
    } else {
      payloadHash = arg2;
      statusCode = typeof arg3 === 'number' ? arg3 : 200;
      body = arg4;
      tenantId = arg5 || 'default';
    }
  }

  if (!key) return null;
  const normalizedKey = String(key).trim();
  const normalizedTenant = String(tenantId || 'default').trim();
  const scopedKey = makeScopedKey(normalizedTenant, normalizedKey);
  const existing = storeEngine.get(scopedKey);
  const finalHash = payloadHash || (existing ? existing.payloadHash : computePayloadHash(normalizedTenant));
  const now = Date.now();

  let parsedBody = body;
  if (typeof body === 'string') {
    try {
      parsedBody = JSON.parse(body);
    } catch (_e) {
      parsedBody = body;
    }
  }

  const record = {
    scopedKey,
    key: normalizedKey,
    tenantId: normalizedTenant,
    payloadHash: finalHash,
    status: 'COMPLETED',
    statusCode: Number(statusCode) || 200,
    body: parsedBody,
    createdAt: existing ? existing.createdAt : now,
    expiresAt: existing ? existing.expiresAt : now + ttlMs
  };
  storeEngine.set(record);
  return record;
}

/**
 * Purges expired keys from the idempotency store.
 * @param {number} [now=Date.now()]
 * @returns {number} Number of expired records removed
 */
function clearExpiredKeys(now = Date.now()) {
  return storeEngine.clearExpired(now);
}

/**
 * Helper to send a JSON HTTP response across both raw Node http.ServerResponse and Express res.
 */
function sendJsonResponse(res, statusCode, payload, extraHeaders = {}) {
  if (!res) return;
  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (typeof res.setHeader === 'function') {
    for (const [hKey, hVal] of Object.entries(headers)) {
      res.setHeader(hKey, hVal);
    }
  }

  if (typeof res.writeHead === 'function') {
    res.writeHead(statusCode, headers);
  } else {
    res.statusCode = statusCode;
  }

  if (typeof res.end === 'function') {
    res.end(bodyStr);
  }
}

/**
 * HTTP / Express middleware wrapper for Idempotency-Key handling.
 *
 * Behavior:
 * - If method is not POST/PUT/PATCH or no `Idempotency-Key` / `x-idempotency-key` header is present:
 *   passes through (`{ intercepted: false, action: 'PASS_THROUGH' }`).
 * - If key is `IN_PROGRESS`: sends 409 Conflict and returns `{ intercepted: true, statusCode: 409 }`.
 * - If key `payloadHash` mismatches: sends 422 Unprocessable Entity and returns `{ intercepted: true, statusCode: 422 }`.
 * - If key is `COMPLETED` and matches: sends stored response with `X-Idempotent-Replay: true`
 *   and returns `{ intercepted: true, replayed: true, statusCode, body }`.
 * - If key is new: locks as `IN_PROGRESS` and hooks `res.writeHead` / `res.end` to automatically save
 *   the response once completed.
 *
 * @param {object} req
 * @param {object} res
 * @param {string|Buffer|object|Function} [rawBodyOrNext='']
 * @param {string} [tenantIdArg='default']
 */
function handleIdempotency(req, res, rawBodyOrNext = '', tenantIdArg = 'default') {
  const nextFn = typeof rawBodyOrNext === 'function' ? rawBodyOrNext : null;
  const rawBody =
    typeof rawBodyOrNext === 'function'
      ? (req.rawBody !== undefined ? req.rawBody : (req.body || ''))
      : rawBodyOrNext;

  const method = String((req && req.method) || 'GET').toUpperCase();
  const headers = (req && req.headers) || {};
  const idempotencyKey =
    headers['idempotency-key'] ||
    headers['Idempotency-Key'] ||
    headers['x-idempotency-key'] ||
    headers['X-Idempotency-Key'] ||
    null;

  if (!MUTATING_METHODS.has(method) || !idempotencyKey || String(idempotencyKey).trim() === '') {
    if (nextFn) nextFn();
    return {
      intercepted: false,
      handled: false,
      action: 'PASS_THROUGH',
      key: null
    };
  }

  const tenantId =
    tenantIdArg && tenantIdArg !== 'default'
      ? tenantIdArg
      : (req.tenantId ||
         (req.user && req.user.tenantId) ||
         headers['x-tenant-id'] ||
         headers['X-Tenant-Id'] ||
         'default');
  const reqPath = (req && (req.originalUrl || req.url || req.path)) || '/';
  const payloadHash = computePayloadHash(tenantId, method, reqPath, rawBody);

  const checkResult = checkIdempotencyKey({
    key: idempotencyKey,
    tenantId,
    method,
    path: reqPath,
    rawBody,
    payloadHash,
    acquireLock: true
  });

  if (checkResult.status === 'IN_PROGRESS') {
    sendJsonResponse(res, 409, checkResult.body);
    return {
      intercepted: true,
      handled: true,
      action: 'CONFLICT',
      statusCode: 409,
      body: checkResult.body,
      key: checkResult.key,
      payloadHash
    };
  }

  if (checkResult.status === 'MISMATCH') {
    sendJsonResponse(res, 422, checkResult.body);
    return {
      intercepted: true,
      handled: true,
      action: 'MISMATCH',
      statusCode: 422,
      body: checkResult.body,
      key: checkResult.key,
      payloadHash
    };
  }

  if (checkResult.status === 'REPLAY') {
    sendJsonResponse(res, checkResult.httpStatus, checkResult.body, {
      'X-Idempotent-Replay': 'true'
    });
    return {
      intercepted: true,
      handled: true,
      replayed: true,
      action: 'REPLAY',
      statusCode: checkResult.httpStatus,
      body: checkResult.body,
      headers: { 'X-Idempotent-Replay': 'true' },
      key: checkResult.key,
      payloadHash
    };
  }

  // Status is NEW (lock acquired as IN_PROGRESS). Hook res.writeHead and res.end to auto-persist on completion.
  if (res && typeof res.end === 'function' && !res.__idempotencyHooked) {
    res.__idempotencyHooked = true;
    let capturedStatus = res.statusCode || 200;
    const chunks = [];

    if (typeof res.writeHead === 'function') {
      const origWriteHead = res.writeHead.bind(res);
      res.writeHead = function hookedWriteHead(statusCode, ...rest) {
        capturedStatus = statusCode;
        return origWriteHead(statusCode, ...rest);
      };
    }

    if (typeof res.write === 'function') {
      const origWrite = res.write.bind(res);
      res.write = function hookedWrite(chunk, ...rest) {
        if (chunk) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        }
        return origWrite(chunk, ...rest);
      };
    }

    const origEnd = res.end.bind(res);
    res.end = function hookedEnd(chunk, ...rest) {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const finalStatus = res.statusCode || capturedStatus || 200;
      const fullBodyStr = Buffer.concat(chunks).toString('utf8');
      saveIdempotencyResult({
        key: checkResult.key,
        tenantId: checkResult.tenantId,
        payloadHash,
        statusCode: finalStatus,
        body: fullBodyStr
      });
      return origEnd(chunk, ...rest);
    };
  }

  const commit = (statusCode = 200, responseBody = {}) =>
    saveIdempotencyResult({
      key: checkResult.key,
      tenantId: checkResult.tenantId,
      payloadHash,
      statusCode,
      body: responseBody
    });

  if (nextFn) nextFn();

  return {
    intercepted: false,
    handled: false,
    action: 'ACQUIRED',
    key: checkResult.key,
    tenantId: checkResult.tenantId,
    payloadHash,
    commit
  };
}

module.exports = {
  handleIdempotency,
  checkIdempotencyKey,
  saveIdempotencyResult,
  clearExpiredKeys,
  computePayloadHash,
  storeEngine
};
