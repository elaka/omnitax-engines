/**
 * src/security/worm_merkle_ledger.js
 * Sovereign Cryptographic WORM (Write-Once-Read-Many) Merkle & Hash-Chain Ledger
 *
 * Implements a mathematically verifiable hash-chain and Merkle tree ledger for
 * cleared fiscal documents and statutory audit events.
 *
 * Storage Engine Resolution:
 *   1. SQLite (`data/worm_ledger.sqlite`) via `better-sqlite3` if installed
 *   2. SQLite (`data/worm_ledger.sqlite`) via Node.js native `node:sqlite` (`DatabaseSync`)
 *   3. Automatic deterministic append-only JSONL (`data/worm_ledger.jsonl`) + in-memory fallback
 *
 * Enforces AGENTS.md Rule 5:
 *   - Every ledger write, chain verification, and proof query is strictly scoped by `tenant_id`.
 *   - SQLite `worm_no_update` and `worm_no_delete` triggers block any mutation or deletion at the DB layer.
 * MIT License
 */

'use strict';

const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const {
  assertTenantContext,
  scopeQueryByTenant,
  verifyCrossTenantIsolation
} = require('./tenant-rls-guard');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// Storage home: configurable via OMNITAX_WORM_LEDGER_DIR; defaults to the OS temp
// directory so requiring this module never writes inside the package tree.
const DATA_DIR = process.env.OMNITAX_WORM_LEDGER_DIR
  || path.join(os.tmpdir(), 'omnitax-engines');
const SQLITE_DB_PATH = path.join(DATA_DIR, 'worm_ledger.sqlite');
const JSONL_FALLBACK_PATH = path.join(DATA_DIR, 'worm_ledger.jsonl');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Deterministic recursive key-sorted JSON serializer (RFC 8785 JCS style).
 * Ensures identical payloads always produce identical SHA-256 digests regardless of key insertion order.
 *
 * @param {any} value
 * @returns {string}
 */
function canonicalJson(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalJson(item)).join(',') + ']';
  }
  if (typeof value === 'object') {
    const sortedKeys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort();
    const entries = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`);
    return '{' + entries.join(',') + '}';
  }
  return JSON.stringify(String(value));
}

/**
 * Computes a lowercase hex SHA-256 digest of a string.
 * @param {string} input
 * @returns {string}
 */
function sha256Hex(input) {
  return crypto.createHash('sha256').update(String(input), 'utf8').digest('hex');
}

/**
 * Computes `payloadHash = SHA256(canonicalJson(payload))`.
 * @param {any} payload
 * @returns {string}
 */
function computePayloadHash(payload) {
  return sha256Hex(canonicalJson(payload));
}

/**
 * Computes `entryHash = SHA256(sequenceIndex + '|' + previousHash + '|' + tenantId + '|' + documentId + '|' + eventType + '|' + payloadHash + '|' + timestampIso)`.
 */
function computeEntryHash({
  sequenceIndex,
  previousHash,
  tenantId,
  documentId,
  eventType,
  payloadHash,
  timestampIso
}) {
  const preimage = [
    String(sequenceIndex),
    String(previousHash),
    String(tenantId),
    String(documentId),
    String(eventType),
    String(payloadHash),
    String(timestampIso)
  ].join('|');
  return sha256Hex(preimage);
}

/**
 * Computes the binary Merkle root across an ordered list of leaf entry hashes.
 * If the list is empty, returns `GENESIS_HASH`.
 * If a level has an odd number of nodes, the last node is duplicated prior to pairwise hashing.
 *
 * @param {string[]} leafHashes
 * @returns {string}
 */
function computeMerkleRoot(leafHashes) {
  if (!Array.isArray(leafHashes) || leafHashes.length === 0) {
    return GENESIS_HASH;
  }
  let level = leafHashes.slice();
  if (level.length === 1) {
    return sha256Hex(`${level[0]}|${level[0]}`);
  }
  while (level.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      nextLevel.push(sha256Hex(`${left}|${right}`));
    }
    level = nextLevel;
  }
  return level[0];
}

/**
 * Computes a cryptographic Merkle inclusion proof for the leaf at `targetIndex` within `leafHashes`.
 *
 * @param {string[]} leafHashes
 * @param {number} targetIndex
 * @returns {{ leafHash: string, root: string, siblings: Array<{ position: 'left'|'right', hash: string }> }}
 */
function computeMerkleProof(leafHashes, targetIndex) {
  if (!Array.isArray(leafHashes) || targetIndex < 0 || targetIndex >= leafHashes.length) {
    return { leafHash: null, root: GENESIS_HASH, siblings: [] };
  }

  const leafHash = leafHashes[targetIndex];
  if (leafHashes.length === 1) {
    return {
      leafHash,
      root: sha256Hex(`${leafHash}|${leafHash}`),
      siblings: [{ position: 'right', hash: leafHash }]
    };
  }

  const siblings = [];
  let level = leafHashes.slice();
  let idx = targetIndex;

  while (level.length > 1) {
    const isRightNode = idx % 2 === 1;
    const siblingIdx = isRightNode ? idx - 1 : (idx + 1 < level.length ? idx + 1 : idx);
    siblings.push({
      position: isRightNode ? 'left' : 'right',
      hash: level[siblingIdx]
    });

    const nextLevel = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      nextLevel.push(sha256Hex(`${left}|${right}`));
    }
    level = nextLevel;
    idx = Math.floor(idx / 2);
  }

  return {
    leafHash,
    root: level[0],
    siblings
  };
}

/**
 * Verifies a Merkle inclusion proof against a target Merkle root.
 *
 * @param {string} leafHash
 * @param {Array<{ position: 'left'|'right', hash: string }>} siblings
 * @param {string} expectedRoot
 * @returns {boolean}
 */
function verifyMerkleProof(leafHash, siblings, expectedRoot) {
  if (!leafHash || !Array.isArray(siblings) || !expectedRoot) return false;
  let current = leafHash;
  for (const step of siblings) {
    if (step.position === 'left') {
      current = sha256Hex(`${step.hash}|${current}`);
    } else {
      current = sha256Hex(`${current}|${step.hash}`);
    }
  }
  return current === expectedRoot;
}

// ============================================================================
// STORAGE ADAPTER (better-sqlite3 -> node:sqlite -> JSONL + Memory Fallback)
// ============================================================================

let storageAdapter = null;

const WORM_SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS worm_audit_chain (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_index INTEGER NOT NULL,
    tenant_id TEXT NOT NULL,
    document_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    jurisdiction TEXT NOT NULL DEFAULT 'GLOBAL',
    previous_hash TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    payload_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL UNIQUE,
    merkle_root TEXT NOT NULL,
    timestamp_iso TEXT NOT NULL,
    UNIQUE(tenant_id, sequence_index)
  );

  CREATE INDEX IF NOT EXISTS idx_worm_tenant_seq
    ON worm_audit_chain(tenant_id, sequence_index ASC);

  CREATE INDEX IF NOT EXISTS idx_worm_tenant_doc
    ON worm_audit_chain(tenant_id, document_id);

  CREATE TRIGGER IF NOT EXISTS worm_no_update
  BEFORE UPDATE ON worm_audit_chain
  BEGIN
    SELECT RAISE(ABORT, 'WORM_VIOLATION: Ledger records are immutable');
  END;

  CREATE TRIGGER IF NOT EXISTS worm_no_delete
  BEFORE DELETE ON worm_audit_chain
  BEGIN
    SELECT RAISE(ABORT, 'WORM_VIOLATION: Ledger records cannot be deleted');
  END;
`;

function initSqliteAdapter() {
  ensureDataDir();
  // 1. Try better-sqlite3 first if installed
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const db = new BetterSqlite3(SQLITE_DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');
    db.exec(WORM_SCHEMA_DDL);
    return {
      engine: 'better-sqlite3',
      db,
      exec(sql) {
        return db.exec(sql);
      },
      run(sql, params = []) {
        return db.prepare(sql).run(...params);
      },
      get(sql, params = []) {
        return db.prepare(sql).get(...params) || null;
      },
      all(sql, params = []) {
        return db.prepare(sql).all(...params);
      }
    };
  } catch (_) {
    // Fallback to native node:sqlite
  }

  // 2. Try Node.js built-in node:sqlite (DatabaseSync)
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(SQLITE_DB_PATH);
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
    `);
    db.exec(WORM_SCHEMA_DDL);
    return {
      engine: 'node:sqlite',
      db,
      exec(sql) {
        return db.exec(sql);
      },
      run(sql, params = []) {
        return db.prepare(sql).run(...params);
      },
      get(sql, params = []) {
        return db.prepare(sql).get(...params) || null;
      },
      all(sql, params = []) {
        return db.prepare(sql).all(...params);
      }
    };
  } catch (_) {
    // Fallback to deterministic append-only JSONL + memory store
  }

  // 3. Deterministic JSONL + Memory fallback
  const memoryChain = [];
  if (fs.existsSync(JSONL_FALLBACK_PATH)) {
    const lines = fs.readFileSync(JSONL_FALLBACK_PATH, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        memoryChain.push(JSON.parse(line));
      } catch (_) {}
    }
  }

  return {
    engine: 'jsonl-fallback',
    memoryChain,
    exec(sql) {
      if (/\bUPDATE\s+worm_audit_chain\b/i.test(sql)) {
        throw new Error('WORM_VIOLATION: Ledger records are immutable');
      }
      if (/\bDELETE\s+FROM\s+worm_audit_chain\b/i.test(sql)) {
        throw new Error('WORM_VIOLATION: Ledger records cannot be deleted');
      }
    },
    run(sql, params = []) {
      if (/\bUPDATE\s+worm_audit_chain\b/i.test(sql)) {
        throw new Error('WORM_VIOLATION: Ledger records are immutable');
      }
      if (/\bDELETE\s+FROM\s+worm_audit_chain\b/i.test(sql)) {
        throw new Error('WORM_VIOLATION: Ledger records cannot be deleted');
      }
      if (/^\s*INSERT\s+INTO\s+worm_audit_chain\b/i.test(sql)) {
        const [
          sequence_index,
          tenant_id,
          document_id,
          event_type,
          jurisdiction,
          previous_hash,
          payload_json,
          payload_hash,
          entry_hash,
          merkle_root,
          timestamp_iso
        ] = params;
        const row = {
          id: memoryChain.length + 1,
          sequence_index,
          tenant_id,
          document_id,
          event_type,
          jurisdiction,
          previous_hash,
          payload_json,
          payload_hash,
          entry_hash,
          merkle_root,
          timestamp_iso
        };
        memoryChain.push(row);
        fs.appendFileSync(JSONL_FALLBACK_PATH, JSON.stringify(row) + '\n', 'utf8');
        return { changes: 1, lastInsertRowid: row.id };
      }
      return { changes: 0 };
    },
    get(sql, params = []) {
      const rows = this.all(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    all(sql, params = []) {
      if (/WHERE\s+tenant_id\s*=\s*\?\s+AND\s+document_id\s*=\s*\?/i.test(sql)) {
        const [tId, docId] = params;
        return memoryChain
          .filter((r) => r.tenant_id === tId && r.document_id === docId)
          .sort((a, b) => a.sequence_index - b.sequence_index);
      }
      if (/WHERE\s+document_id\s*=\s*\?/i.test(sql)) {
        const [docId] = params;
        return memoryChain
          .filter((r) => r.document_id === docId)
          .sort((a, b) => a.sequence_index - b.sequence_index);
      }
      if (/WHERE\s+tenant_id\s*=\s*\?/i.test(sql)) {
        const [tId] = params;
        const filtered = memoryChain
          .filter((r) => r.tenant_id === tId)
          .sort((a, b) => a.sequence_index - b.sequence_index);
        if (/DESC\s+LIMIT\s+1/i.test(sql)) {
          return filtered.length > 0 ? [filtered[filtered.length - 1]] : [];
        }
        return filtered;
      }
      return memoryChain.slice().sort((a, b) => a.id - b.id);
    }
  };
}

function getAdapter() {
  if (!storageAdapter) {
    storageAdapter = initSqliteAdapter();
  }
  return storageAdapter;
}

/**
 * Appends a cryptographically chained and Merkle-rooted record to the WORM ledger.
 * Strictly requires a valid `tenantId` per AGENTS.md Rule 5.
 *
 * @param {Object} input
 * @param {string} input.tenantId - Mandatory tenant identifier
 * @param {string} input.documentId - Document or transaction identifier
 * @param {string} [input.eventType='DOCUMENT_CLEARED'] - Statutory audit event type
 * @param {Object} [input.payload={}] - Canonical fiscal document payload
 * @param {string} [input.jurisdiction='GLOBAL'] - ISO country / jurisdiction code
 * @param {string} [input.timestampIso] - Optional deterministic ISO-8601 timestamp
 * @returns {Object} Appended WORM block metadata
 */
function appendWormRecord(input = {}) {
  if (!input || typeof input !== 'object') {
    throw new Error('appendWormRecord requires a valid record object.');
  }

  const tenantId = assertTenantContext(input.tenantId || input.tenant_id);
  const documentId = String(input.documentId || input.document_id || '').trim();
  if (!documentId) {
    throw new Error('appendWormRecord requires a non-empty documentId.');
  }

  const eventType = String(input.eventType || input.event_type || 'DOCUMENT_CLEARED').trim();
  const jurisdiction = String(input.jurisdiction || 'GLOBAL').trim().toUpperCase();
  const payload = input.payload !== undefined ? input.payload : {};
  const timestampIso = input.timestampIso || new Date().toISOString();

  const adapter = getAdapter();

  // Fetch existing tenant chain to determine sequenceIndex, previousHash, and prior entryHashes
  const selectTenantChainSql =
    'SELECT sequence_index, entry_hash FROM worm_audit_chain WHERE tenant_id = ? ORDER BY sequence_index ASC';
  scopeQueryByTenant(selectTenantChainSql, [tenantId], tenantId);

  const priorRows = adapter.all(selectTenantChainSql, [tenantId]);
  const sequenceIndex = priorRows.length + 1;
  const previousHash =
    priorRows.length > 0 ? priorRows[priorRows.length - 1].entry_hash : GENESIS_HASH;

  const payloadJson = canonicalJson(payload);
  const payloadHash = sha256Hex(payloadJson);

  const entryHash = computeEntryHash({
    sequenceIndex,
    previousHash,
    tenantId,
    documentId,
    eventType,
    payloadHash,
    timestampIso
  });

  const leafHashes = priorRows.map((r) => r.entry_hash).concat([entryHash]);
  const merkleRoot = computeMerkleRoot(leafHashes);

  const insertSql = `
    INSERT INTO worm_audit_chain (
      sequence_index,
      tenant_id,
      document_id,
      event_type,
      jurisdiction,
      previous_hash,
      payload_json,
      payload_hash,
      entry_hash,
      merkle_root,
      timestamp_iso
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const insertParams = [
    sequenceIndex,
    tenantId,
    documentId,
    eventType,
    jurisdiction,
    previousHash,
    payloadJson,
    payloadHash,
    entryHash,
    merkleRoot,
    timestampIso
  ];
  scopeQueryByTenant(insertSql, insertParams, tenantId);
  adapter.run(insertSql, insertParams);

  return {
    sequenceIndex,
    tenantId,
    documentId,
    eventType,
    jurisdiction,
    previousHash,
    payloadHash,
    entryHash,
    merkleRoot,
    genesisHash: GENESIS_HASH,
    timestampIso,
    storageEngine: adapter.engine
  };
}

/**
 * Recomputes every cryptographic hash and Merkle root from Genesis (`0000...0000`)
 * through the head block for a specific `tenantId` (or across all tenants if `tenantId` is omitted).
 * Detects any bit-flip, payload mutation, previousHash mismatch, Merkle root tampering, or sequence gap.
 *
 * @param {string} [tenantId]
 * @returns {{
 *   intact: boolean,
 *   totalBlocks: number,
 *   genesisHash: string,
 *   headHash: string,
 *   merkleRoot: string,
 *   verifiedAt: string,
 *   brokenAtSequence: null | number,
 *   reason?: string
 * }}
 */
function verifyChainIntegrity(tenantId) {
  const adapter = getAdapter();
  const verifiedAt = new Date().toISOString();

  if (tenantId !== undefined && tenantId !== null) {
    const validatedTenantId = assertTenantContext(tenantId);
    const sql =
      'SELECT * FROM worm_audit_chain WHERE tenant_id = ? ORDER BY sequence_index ASC';
    scopeQueryByTenant(sql, [validatedTenantId], validatedTenantId);
    const rows = adapter.all(sql, [validatedTenantId]);
    return verifyTenantRows(rows, verifiedAt);
  }

  // Global verification across all tenants partitioned by tenant_id
  const allRows = adapter.all('SELECT * FROM worm_audit_chain ORDER BY id ASC', []);
  if (allRows.length === 0) {
    return {
      intact: true,
      totalBlocks: 0,
      genesisHash: GENESIS_HASH,
      headHash: GENESIS_HASH,
      merkleRoot: GENESIS_HASH,
      verifiedAt,
      brokenAtSequence: null
    };
  }

  const byTenant = new Map();
  for (const row of allRows) {
    if (!byTenant.has(row.tenant_id)) {
      byTenant.set(row.tenant_id, []);
    }
    byTenant.get(row.tenant_id).push(row);
  }

  let globalLeaves = [];
  for (const [, tenantRows] of byTenant.entries()) {
    tenantRows.sort((a, b) => a.sequence_index - b.sequence_index);
    const res = verifyTenantRows(tenantRows, verifiedAt);
    if (!res.intact) {
      return {
        ...res,
        totalBlocks: allRows.length
      };
    }
    globalLeaves = globalLeaves.concat(tenantRows.map((r) => r.entry_hash));
  }

  const headHash = allRows[allRows.length - 1].entry_hash;
  return {
    intact: true,
    totalBlocks: allRows.length,
    genesisHash: GENESIS_HASH,
    headHash,
    merkleRoot: computeMerkleRoot(globalLeaves),
    verifiedAt,
    brokenAtSequence: null
  };
}

function verifyTenantRows(rows, verifiedAt) {
  if (!rows || rows.length === 0) {
    return {
      intact: true,
      totalBlocks: 0,
      genesisHash: GENESIS_HASH,
      headHash: GENESIS_HASH,
      merkleRoot: GENESIS_HASH,
      verifiedAt,
      brokenAtSequence: null
    };
  }

  let expectedPreviousHash = GENESIS_HASH;
  const accumulatedLeafHashes = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const expectedSequence = i + 1;

    // 1. Check sequence continuity
    if (Number(row.sequence_index) !== expectedSequence) {
      return {
        intact: false,
        totalBlocks: rows.length,
        genesisHash: GENESIS_HASH,
        headHash: rows[rows.length - 1].entry_hash,
        merkleRoot: rows[rows.length - 1].merkle_root,
        verifiedAt,
        brokenAtSequence: Number(row.sequence_index) || expectedSequence,
        reason: `SEQUENCE_GAP_DETECTED: expected sequence ${expectedSequence}, found ${row.sequence_index}`
      };
    }

    // 2. Check previous_hash link
    if (row.previous_hash !== expectedPreviousHash) {
      return {
        intact: false,
        totalBlocks: rows.length,
        genesisHash: GENESIS_HASH,
        headHash: rows[rows.length - 1].entry_hash,
        merkleRoot: rows[rows.length - 1].merkle_root,
        verifiedAt,
        brokenAtSequence: expectedSequence,
        reason: `PREVIOUS_HASH_MISMATCH at sequence ${expectedSequence}`
      };
    }

    // 3. Recompute payloadHash from stored payload_json
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(row.payload_json);
    } catch (_) {
      return {
        intact: false,
        totalBlocks: rows.length,
        genesisHash: GENESIS_HASH,
        headHash: rows[rows.length - 1].entry_hash,
        merkleRoot: rows[rows.length - 1].merkle_root,
        verifiedAt,
        brokenAtSequence: expectedSequence,
        reason: `CORRUPTED_PAYLOAD_JSON at sequence ${expectedSequence}`
      };
    }

    const recomputedPayloadHash = computePayloadHash(parsedPayload);
    if (recomputedPayloadHash !== row.payload_hash) {
      return {
        intact: false,
        totalBlocks: rows.length,
        genesisHash: GENESIS_HASH,
        headHash: rows[rows.length - 1].entry_hash,
        merkleRoot: rows[rows.length - 1].merkle_root,
        verifiedAt,
        brokenAtSequence: expectedSequence,
        reason: `PAYLOAD_HASH_MISMATCH at sequence ${expectedSequence}`
      };
    }

    // 4. Recompute entryHash
    const recomputedEntryHash = computeEntryHash({
      sequenceIndex: row.sequence_index,
      previousHash: row.previous_hash,
      tenantId: row.tenant_id,
      documentId: row.document_id,
      eventType: row.event_type,
      payloadHash: recomputedPayloadHash,
      timestampIso: row.timestamp_iso
    });

    if (recomputedEntryHash !== row.entry_hash) {
      return {
        intact: false,
        totalBlocks: rows.length,
        genesisHash: GENESIS_HASH,
        headHash: rows[rows.length - 1].entry_hash,
        merkleRoot: rows[rows.length - 1].merkle_root,
        verifiedAt,
        brokenAtSequence: expectedSequence,
        reason: `ENTRY_HASH_MISMATCH at sequence ${expectedSequence}`
      };
    }

    // 5. Recompute cumulative Merkle root at this block
    accumulatedLeafHashes.push(recomputedEntryHash);
    const recomputedMerkleRoot = computeMerkleRoot(accumulatedLeafHashes);
    if (recomputedMerkleRoot !== row.merkle_root) {
      return {
        intact: false,
        totalBlocks: rows.length,
        genesisHash: GENESIS_HASH,
        headHash: rows[rows.length - 1].entry_hash,
        merkleRoot: rows[rows.length - 1].merkle_root,
        verifiedAt,
        brokenAtSequence: expectedSequence,
        reason: `MERKLE_ROOT_MISMATCH at sequence ${expectedSequence}`
      };
    }

    expectedPreviousHash = recomputedEntryHash;
  }

  const headRow = rows[rows.length - 1];
  return {
    intact: true,
    totalBlocks: rows.length,
    genesisHash: GENESIS_HASH,
    headHash: headRow.entry_hash,
    merkleRoot: headRow.merkle_root,
    verifiedAt,
    brokenAtSequence: null
  };
}

/**
 * Returns the cryptographic Merkle inclusion proof and hash-chain link for a specific document,
 * strictly scoped to `tenantId`.
 * If `documentId` belongs to another tenant, throws `403 FORBIDDEN_CROSS_TENANT_ACCESS` per AGENTS.md Rule 5.
 *
 * @param {string} tenantId
 * @param {string} documentId
 * @returns {Object|null}
 */
function getDocumentProof(tenantId, documentId) {
  const validatedTenantId = assertTenantContext(tenantId);
  if (!documentId || typeof documentId !== 'string' || !documentId.trim()) {
    throw new Error('getDocumentProof requires a non-empty documentId.');
  }
  const cleanDocId = documentId.trim();
  const adapter = getAdapter();

  // Check if document exists under a different tenant (ID-guessing detection -> 403 FORBIDDEN_CROSS_TENANT_ACCESS)
  const docLookupRows = adapter.all(
    'SELECT * FROM worm_audit_chain WHERE document_id = ? ORDER BY sequence_index ASC',
    [cleanDocId]
  );

  const matchingTenantRows = docLookupRows.filter((r) => r.tenant_id === validatedTenantId);
  if (matchingTenantRows.length === 0 && docLookupRows.length > 0) {
    // Document exists in ledger, but belongs to another tenant -> enforce cross-tenant RLS rejection
    verifyCrossTenantIsolation(docLookupRows[0], validatedTenantId);
  }

  // Execute tenant-scoped query
  const scopedSql =
    'SELECT * FROM worm_audit_chain WHERE tenant_id = ? AND document_id = ? ORDER BY sequence_index DESC';
  scopeQueryByTenant(scopedSql, [validatedTenantId, cleanDocId], validatedTenantId);
  const targetRows = adapter.all(scopedSql, [validatedTenantId, cleanDocId]);

  if (!targetRows || targetRows.length === 0) {
    return null;
  }

  const targetRow = targetRows[0];
  verifyCrossTenantIsolation(targetRow, validatedTenantId);

  // Load full tenant chain to construct the Merkle inclusion path
  const chainSql =
    'SELECT * FROM worm_audit_chain WHERE tenant_id = ? ORDER BY sequence_index ASC';
  scopeQueryByTenant(chainSql, [validatedTenantId], validatedTenantId);
  const tenantChain = adapter.all(chainSql, [validatedTenantId]);

  const leafHashes = tenantChain.map((r) => r.entry_hash);
  const leafIndex = tenantChain.findIndex((r) => r.sequence_index === targetRow.sequence_index);
  const merkleProof = computeMerkleProof(leafHashes, leafIndex);
  const proofVerified = verifyMerkleProof(
    targetRow.entry_hash,
    merkleProof.siblings,
    merkleProof.root
  );

  return {
    tenantId: targetRow.tenant_id,
    documentId: targetRow.document_id,
    sequenceIndex: Number(targetRow.sequence_index),
    eventType: targetRow.event_type,
    jurisdiction: targetRow.jurisdiction,
    previousHash: targetRow.previous_hash,
    payloadHash: targetRow.payload_hash,
    entryHash: targetRow.entry_hash,
    blockMerkleRoot: targetRow.merkle_root,
    currentChainMerkleRoot: merkleProof.root,
    genesisHash: GENESIS_HASH,
    timestampIso: targetRow.timestamp_iso,
    merkleProof: merkleProof.siblings,
    proofVerified,
    verified: proofVerified
  };
}

/**
 * Test helper: resets the WORM ledger for isolated unit test runs.
 */
function resetLedgerForTesting() {
  const adapter = getAdapter();
  if (adapter.engine === 'better-sqlite3' || adapter.engine === 'node:sqlite') {
    adapter.exec(`
      DROP TRIGGER IF EXISTS worm_no_delete;
      DELETE FROM worm_audit_chain;
      DELETE FROM sqlite_sequence WHERE name = 'worm_audit_chain';
      CREATE TRIGGER IF NOT EXISTS worm_no_delete
      BEFORE DELETE ON worm_audit_chain
      BEGIN
        SELECT RAISE(ABORT, 'WORM_VIOLATION: Ledger records cannot be deleted');
      END;
    `);
  } else if (adapter.memoryChain) {
    adapter.memoryChain.length = 0;
    if (fs.existsSync(JSONL_FALLBACK_PATH)) {
      fs.writeFileSync(JSONL_FALLBACK_PATH, '', 'utf8');
    }
  }
}

/**
 * Test helper: simulates a disk-level bit-flip / tamper on a specific block
 * (bypassing the SQLite trigger momentarily to simulate raw file corruption)
 * so `verifyChainIntegrity` can be tested against compromised storage.
 *
 * @param {string} tenantId
 * @param {number} sequenceIndex
 * @param {Object} mutatedFields - e.g. `{ payload_json: '{"tampered":true}' }` or `{ entry_hash: '...' }`
 */
function _simulateDiskTamperForTesting(tenantId, sequenceIndex, mutatedFields = {}) {
  const adapter = getAdapter();
  if (adapter.engine === 'better-sqlite3' || adapter.engine === 'node:sqlite') {
    adapter.exec('DROP TRIGGER IF EXISTS worm_no_update;');
    try {
      const cols = Object.keys(mutatedFields);
      const setClause = cols.map((c) => `${c} = ?`).join(', ');
      const values = cols.map((c) => mutatedFields[c]);
      adapter.run(
        `UPDATE worm_audit_chain SET ${setClause} WHERE tenant_id = ? AND sequence_index = ?`,
        [...values, tenantId, sequenceIndex]
      );
    } finally {
      adapter.exec(`
        CREATE TRIGGER IF NOT EXISTS worm_no_update
        BEFORE UPDATE ON worm_audit_chain
        BEGIN
          SELECT RAISE(ABORT, 'WORM_VIOLATION: Ledger records are immutable');
        END;
      `);
    }
  } else if (adapter.memoryChain) {
    const row = adapter.memoryChain.find(
      (r) => r.tenant_id === tenantId && Number(r.sequence_index) === Number(sequenceIndex)
    );
    if (row) {
      Object.assign(row, mutatedFields);
    }
  }
}

module.exports = {
  GENESIS_HASH,
  canonicalJson,
  computePayloadHash,
  computeEntryHash,
  computeMerkleRoot,
  computeMerkleProof,
  verifyMerkleProof,
  appendWormRecord,
  verifyChainIntegrity,
  getDocumentProof,
  getAdapter,
  resetLedgerForTesting,
  _simulateDiskTamperForTesting
};
