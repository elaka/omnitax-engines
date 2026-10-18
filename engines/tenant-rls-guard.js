/**
 * src/security/tenant_rls_guard.js
 * Multi-Tenant Row-Level Security (RLS) Guard & SQL Query Scoping Interceptor
 * Enforces AGENTS.md Rule 5:
 *   - Every data query scoped by `tenant_id` — no cross-tenant reads by ID guessing.
 *   - Validates tenant context before any query or storage operation.
 *   - Provides PostgreSQL transaction-scoped RLS (`set_config('app.current_tenant_id', $1, true)`)
 *     and canonical DDL policies for all tenant-sensitive tables.
 * MIT License
 */

'use strict';

const TENANT_SENSITIVE_TABLES = Object.freeze([
  'documents',
  'invoices',
  'worm_audit_chain',
  'erp_connections',
  'api_keys',
  'leads',
  'subscriptions'
]);

const VALID_TENANT_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{1,127}$/;

const FORBIDDEN_TENANT_LITERALS = new Set([
  'undefined',
  'null',
  'none',
  'nan',
  'true',
  'false',
  '*',
  '%'
]);

/**
 * Creates a standardized 403 Cross-Tenant / Tenant Isolation error.
 * @param {string} detail
 * @returns {Error}
 */
function createTenantIsolationError(detail) {
  const err = new Error(`403 FORBIDDEN_CROSS_TENANT_ACCESS: ${detail}`);
  err.code = 'FORBIDDEN_CROSS_TENANT_ACCESS';
  err.status = 403;
  err.statusCode = 403;
  return err;
}

/**
 * Validates that `tenantId` is a non-empty, safe identifier with no SQL injection,
 * wildcard (`*`, `%`), or coerced `'undefined'` / `'null'` values.
 *
 * @param {string} tenantId
 * @returns {string} normalized tenantId
 */
function assertTenantContext(tenantId) {
  if (typeof tenantId !== 'string') {
    throw createTenantIsolationError('Missing or non-string tenantId in execution context.');
  }

  const trimmed = tenantId.trim();
  if (!trimmed) {
    throw createTenantIsolationError('Empty tenantId is prohibited.');
  }

  if (FORBIDDEN_TENANT_LITERALS.has(trimmed.toLowerCase())) {
    throw createTenantIsolationError(`Invalid literal tenantId '${trimmed}' is prohibited.`);
  }

  if (
    trimmed.includes('*') ||
    trimmed.includes('%') ||
    trimmed.includes(';') ||
    trimmed.includes('--') ||
    trimmed.includes("'") ||
    trimmed.includes('"') ||
    trimmed.includes('/*') ||
    trimmed.includes('*/') ||
    /\b(OR|UNION|SELECT|DROP|DELETE|UPDATE|INSERT)\b/i.test(trimmed)
  ) {
    throw createTenantIsolationError(`Malicious or wildcard characters detected in tenantId '${trimmed}'.`);
  }

  if (!VALID_TENANT_ID_REGEX.test(trimmed)) {
    throw createTenantIsolationError(
      `Malformed tenantId '${trimmed}'. Must match ${VALID_TENANT_ID_REGEX.toString()}.`
    );
  }

  return trimmed;
}

/**
 * Inspects SQL queries against tenant-sensitive tables to verify a strict `tenant_id`
 * equality predicate exists and that `tenantId` is bound in `params`.
 *
 * @param {string} sql
 * @param {Array|Object} [params=[]]
 * @param {string} tenantId
 * @returns {{ sql: string, params: Array|Object, tenantId: string, scoped: boolean }}
 */
function scopeQueryByTenant(sql, params = [], tenantId) {
  const validatedTenantId = assertTenantContext(tenantId);

  if (typeof sql !== 'string' || !sql.trim()) {
    throw createTenantIsolationError('SQL query string must be non-empty.');
  }

  const normalizedSql = sql.replace(/\s+/g, ' ').trim();

  // Detect SQL injection / tautology bypass patterns
  if (/\bOR\s+1\s*=\s*1\b/i.test(normalizedSql) || /\bOR\s+'1'\s*=\s*'1'/i.test(normalizedSql)) {
    throw createTenantIsolationError('SQL tautology bypass detected in tenant-scoped query.');
  }

  // Check if query touches any tenant-sensitive table
  const touchedTables = TENANT_SENSITIVE_TABLES.filter((table) => {
    const tablePattern = new RegExp(`\\b${table}\\b`, 'i');
    return tablePattern.test(normalizedSql);
  });

  if (touchedTables.length > 0) {
    // Must contain a WHERE or ON/VALUES clause referencing tenant_id
    const isInsert = /^\s*INSERT\s+INTO\b/i.test(normalizedSql);
    const hasTenantColumnInInsert = isInsert && /\(\s*[^)]*\btenant_id\b[^)]*\)/i.test(normalizedSql);

    // Equality predicate check: tenant_id = ? or tenant_id = $1 or tenant_id = :tenant_id
    const hasTenantEqualityPredicate =
      /\bWHERE\b[\s\S]*\b(?:[a-zA-Z0-9_]+\.)?tenant_id\s*=\s*(?:\?|\$\d+|:[a-zA-Z0-9_]+)/i.test(normalizedSql);

    if (!hasTenantColumnInInsert && !hasTenantEqualityPredicate) {
      throw createTenantIsolationError(
        `Unscoped query on tenant-sensitive table(s) [${touchedTables.join(', ')}] rejected: missing mandatory 'tenant_id =' predicate.`
      );
    }

    // Verify params actually bind the validated tenantId
    if (Array.isArray(params)) {
      if (!params.includes(validatedTenantId)) {
        throw createTenantIsolationError(
          `Query parameter array does not bind the authenticated tenantId '${validatedTenantId}'.`
        );
      }
    } else if (params && typeof params === 'object') {
      const paramValues = Object.values(params);
      if (!paramValues.includes(validatedTenantId)) {
        throw createTenantIsolationError(
          `Query parameter object does not bind the authenticated tenantId '${validatedTenantId}'.`
        );
      }
    } else {
      throw createTenantIsolationError('Query parameters must be provided as an Array or Object binding tenantId.');
    }
  }

  return {
    sql,
    params,
    tenantId: validatedTenantId,
    scoped: true
  };
}

/**
 * Verifies that a loaded database/ledger record belongs strictly to `requestingTenantId`.
 * Throws `403 FORBIDDEN_CROSS_TENANT_ACCESS` if the record belongs to another tenant or lacks tenant attribution.
 *
 * @param {Object} record
 * @param {string} requestingTenantId
 * @returns {boolean}
 */
function verifyCrossTenantIsolation(record, requestingTenantId) {
  const validatedRequestingTenant = assertTenantContext(requestingTenantId);

  if (!record || typeof record !== 'object') {
    throw createTenantIsolationError('Target record is missing or invalid for tenant isolation verification.');
  }

  const recordTenantId = record.tenant_id !== undefined ? record.tenant_id : record.tenantId;
  if (!recordTenantId || typeof recordTenantId !== 'string') {
    throw createTenantIsolationError('Record is missing mandatory tenant_id attribution.');
  }

  if (recordTenantId !== validatedRequestingTenant) {
    throw createTenantIsolationError(
      `Cross-tenant access denied: tenant '${validatedRequestingTenant}' attempted to access resource owned by '${recordTenantId}'.`
    );
  }

  return true;
}

/**
 * Executes a callback inside a PostgreSQL transaction with `app.current_tenant_id`
 * scoped strictly to the current transaction (`is_local = true`).
 *
 * @param {Object} pgClient - PostgreSQL client (`query(sql, params)`)
 * @param {string} tenantId - Validated tenant identifier
 * @param {Function} callback - Async function `(client, tenantId) => Promise<any>`
 * @returns {Promise<any>}
 */
async function withPostgresTenantRLS(pgClient, tenantId, callback) {
  const validatedTenantId = assertTenantContext(tenantId);

  if (!pgClient || typeof pgClient.query !== 'function') {
    throw new Error('withPostgresTenantRLS requires a valid pgClient with a .query() method.');
  }
  if (typeof callback !== 'function') {
    throw new Error('withPostgresTenantRLS requires a callback function.');
  }

  await pgClient.query('BEGIN');
  try {
    await pgClient.query("SELECT set_config('app.current_tenant_id', $1, true)", [validatedTenantId]);
    const result = await callback(pgClient, validatedTenantId);
    await pgClient.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await pgClient.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback secondary error to preserve primary exception
    }
    throw err;
  }
}

/**
 * Generates the canonical PostgreSQL DDL migration script to enable Row-Level Security (RLS)
 * and enforce `tenant_isolation_policy` across all tenant-sensitive tables.
 *
 * @returns {string} SQL DDL migration
 */
function getPostgresRLSMigrationSQL() {
  const statements = [
    '-- VATMesh Sovereign Multi-Tenant Row-Level Security (RLS) Migration',
    '-- Enforces AGENTS.md Rule 5 at the PostgreSQL storage engine layer'
  ];

  for (const table of TENANT_SENSITIVE_TABLES) {
    statements.push(
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS tenant_isolation_policy ON ${table};`,
      `CREATE POLICY tenant_isolation_policy ON ${table}`,
      `  USING (tenant_id = current_setting('app.current_tenant_id', true))`,
      `  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));`
    );
  }

  return statements.join('\n');
}

module.exports = {
  TENANT_SENSITIVE_TABLES,
  assertTenantContext,
  scopeQueryByTenant,
  verifyCrossTenantIsolation,
  withPostgresTenantRLS,
  getPostgresRLSMigrationSQL
};
