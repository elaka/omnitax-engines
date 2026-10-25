# omnitax-engines

**Deterministic e-invoicing and tax-compliance engines for JavaScript/Node.**  
Exact integer money math, rule-based statutory XML validation, offline government-gateway
simulators, an append-only WORM Merkle audit ledger, multi-tenant query isolation, and
idempotency middleware — as self-contained modules you can run anywhere.

> **No LLM ever touches statutory arithmetic.** Money is counted, not guessed.

---

> **Important — read before adopting.**
> This is an **independent open-source project.** It is **not affiliated with, accredited
> by, or integrated into** the Agenzia delle Entrate (SdI), Tunisie TradeNet (TTN/DGI),
> ZATCA, the Egyptian Tax Authority (ETA), Peppol, DGFiP/Chorus Pro, or any other tax
> authority. The gateway simulator is **fully offline and deterministic** — it never
> contacts any government system. Nothing here is **legal or tax advice**; validate
> against official tooling and qualified professionals before any production filing.

## Why

Most e-invoicing failures are silent arithmetic and structure problems: a float rounding
error that breaks `HT + VAT + stamp === gross`, an XML that fails clearance for a missing
code, a retried request that double-books a document. These are deterministic problems —
they deserve deterministic code, not probabilistic text generation. omnitax-engines is
that code, extracted from a production platform and hardened by invariant tests.

## Install

```bash
npm install omnitax-engines
```

Node.js ≥ 18. Zero required dependencies.

## Quickstart (Library)

```js
const { decimalMath } = require('omnitax-engines');

const totals = decimalMath.calculateTaxBreakdown({
  baseHt: '1000.00',
  taxRatePct: 22,
  currency: 'EUR'
});

console.log(totals.ht, totals.tva, totals.ttc);
// 1000.00 220.00 1220.00
```

The full six-engine example — statutory XML validation, the offline SdI
simulator, the WORM ledger, the tenant guard, and idempotency — is runnable:

```bash
node node_modules/omnitax-engines/examples/quickstart.js
```

Every engine is also available as a direct deep import:

```js
const { calculateTaxBreakdown } = require('omnitax-engines/engines/decimal-math');
```

## Quickstart (HTTP API)

### Run Locally

```bash
node examples/api-server.js
```

**Output:**
```
✅ omnitax-engines API server running on http://localhost:3000
```

### Test the API

```bash
curl http://localhost:3000/api/v1/health

curl -X POST http://localhost:3000/api/v1/math/calculate-breakdown \
  -H "Content-Type: application/json" \
  -d '{"baseHt": "1000", "taxRatePct": 22, "currency": "EUR"}'

# With sandbox authentication
curl http://localhost:3000/api/v1/audit/verify-chain \
  -H "X-API-Key: vm_test_anything"
```

### Run in Docker

```bash
docker-compose up
# API on http://localhost:3000
```

### Deploy to AWS Lambda

See `docs/DEPLOY.md` for AWS Lambda, Heroku, and self-hosted options.

## The engines

| Engine | What it does | Honesty notes |
|---|---|---|
| `decimal-math.js` | BigInt minor-unit money arithmetic for 2-decimal (EUR/USD/MAD/SAR/AED/EGP) and 3-decimal (TND/KWD/OMR/BHD) currencies. Enforces `HT + VAT + stamp === gross` with zero floating-point drift in the core arithmetic. | Convenience `*Numeric`/`.value` outputs pass through JS `Number` — use the string/BigInt outputs when exactness matters. |
| `statutory-xml-validator.js` | **Rule-based** structural validation (implemented subset) for FatturaPA v1.2.2 (IT), TEIF v1.8.8 (TN), ZATCA UBL 2.1 (SA), and Factur-X/Peppol BIS 3.0 (EU) invoice XML: mandatory element hierarchy, tax-ID checksums/regexes (Luhn P.IVA, Matricule Fiscal, 15-digit TIN), TLV QR tag structure, line-item balance. | It is **not** a full XSD/Schematron engine — it implements a curated subset of statutory rules. Always validate against official tooling before filing. |
| `gateway-simulator.js` | Deterministic, offline simulators of official gateway behaviors — SdI collaudo-style acceptance/rejection (`RC`/`NS`, codes `00200`/`00311`/`00404`/`00423`/`00427`), TTN sandbox (`ACCEPTE`/`REJETE`), ZATCA Phase 2, ETA pre-prod — with `SIMULATED_`-prefixed messages. | Simulated outcomes carry no real-world clearance value. No network calls, ever. |
| `worm-merkle-ledger.js` | Append-only SHA-256 hash-chain audit ledger (`entryHash = SHA256(seq \| prevHash \| tenant \| doc \| event \| payloadHash \| timestamp)`) with Merkle inclusion proofs and DB-level `BEFORE UPDATE`/`BEFORE DELETE` abort triggers. | WORM is enforced at the storage layer, not the OS: someone with raw disk write access can still tamper — which is exactly what `verifyChainIntegrity()` detects. |
| `tenant-rls-guard.js` | Tenant-scoped query guard: every statement is checked for `tenant_id` scoping; cross-tenant access throws. | A defense-in-depth heuristic, **not** a substitute for database row-level security or authorization middleware. |
| `idempotency.js` | `Idempotency-Key` middleware: SHA-256 request fingerprinting, 24h replay with `X-Idempotent-Replay`, `409` for concurrent duplicates, `422` for key reuse with a mutated payload. | Memory store by default; optional SQLite tiers. |

## HTTP API Endpoints

### Health Check
```
GET /api/v1/health
```
Returns service status and engine list.

### Calculate Tax Breakdown
```
POST /api/v1/math/calculate-breakdown
```
**Body:**
```json
{
  "baseHt": "1000.00",
  "taxRatePct": 22,
  "currency": "EUR",
  "stampDuty": 0,
  "withholdingRatePct": 0
}
```

### Validate XML
```
POST /api/v1/validate/xml
```
**Body:**
```json
{
  "xml": "<FatturaElettronica>...</FatturaElettronica>",
  "schemaType": "auto",
  "country": "auto"
}
```

### Sandbox Gateway Simulation
```
POST /api/v1/sandbox/clear
```
**Body:**
```json
{
  "country": "IT",
  "documentContent": "<FatturaElettronica>...</FatturaElettronica>",
  "documentFormat": "xml"
}
```

### Audit: Seal Document
```
POST /api/v1/audit/seal
```
**Auth Required:** `X-API-Key: vm_test_anything`  
**Body:**
```json
{
  "documentId": "INV-2026-001",
  "eventType": "DOCUMENT_CLEARED",
  "payload": { "amount": 1000 },
  "jurisdiction": "IT"
}
```

### Audit: Verify Chain
```
GET /api/v1/audit/verify-chain
```
**Auth Required:** `X-API-Key: vm_test_anything`

---

## Status

**v0.2.0 — API Release.** HTTP router, OpenAPI 3.1, tenant resolution, idempotency, 
sandbox gating, Docker ready. Six self-contained engines, 24 invariant tests, zero required 
dependencies. Positioned for licensing: SaaS deployment, MCP integration, embedded library use.

Engine code is unchanged from v0.1.0. The v0.1.0 GitHub tag remains immutable.

## Licensing

**MIT — free to use, modify, distribute forever.**

Commercial licensing available for non-open-source deployment. See `LICENSING.md`.

## Requirements

- Node ≥ 18 (JSONL/memory fallbacks)
- Node ≥ 22.5 unlocks the built-in `node:sqlite` storage tier
- `better-sqlite3` is **optional** (only for SQLite storage tiers) — zero required dependencies

## Development

```bash
npm test          # 24 invariant tests
npm run pack:check
```

## Contributing

Rule additions must cite the statutory source (gazette, authority circular, official
spec version) in the rule's definition — every rule carries its provenance. Synthetic
fixtures only; no real business documents. Claims discipline: PRs that overclaim
(capability, accreditation, completeness) will be closed with a smile and a pointer to
this README.

## Adoption & Licensing

Interested in:
- Embedding as a library?
- White-labeling the XML validator?
- Building an e-invoice network?
- Integrating with AI agents (MCP)?

**Email:** `admin@vatmesh.com`  
**GitHub:** Open an issue with "[LICENSING]"

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Kais.

---

## Deployment

Quick start:
```bash
npm install
npm test
node examples/api-server.js
```

Docker:
```bash
docker-compose up
```

Full guide: `docs/DEPLOY.md`
