# Changelog

All notable changes to this package are documented here.

## 0.2.0 — 2026-10-24

**HTTP API Release — Licensible & SaaS-Ready**

- Added `engineering_invariants.routes.js` — production-grade HTTP router mounting all six engines 
  with tenant resolution, idempotency, and environment gating.
- Added OpenAPI 3.1.0 machine-readable contract auto-generated from routes.
- Added tenant identity resolution: `X-API-Key` header, `Bearer` token, or implicit `anonymous` for 
  stateless endpoints.
- Added Idempotency-Key middleware: SHA-256 request fingerprinting, 24-hour replay window, `409` on 
  concurrent duplicates, `422` on key reuse with mutated payload.
- Added environment mode detection: `SANDBOX` vs `PRODUCTION` gate on clearance outcomes.
- Added `examples/api-server.js` — Express server reference, Docker-ready.
- Engine arithmetic: unchanged from v0.1.1. All 24 invariant tests pass.
- Positioned for licensing: SaaS deployment, MCP integration, embedded library use.

## 0.1.1 — 2026-10-22

- First npm publication: `npm install omnitax-engines`.
- Added the root `index.js` namespace export (`decimalMath`, `statutoryXml`,
  `gateways`, `wormLedger`, `tenantGuard`, `idempotency`). Deep imports remain
  available at `omnitax-engines/engines/<engine>`.
- Added `examples/quickstart.js` — a deterministic, offline run through all six
  engines — plus install and quickstart documentation.
- Added package metadata (`repository`, `homepage`, `bugs`, `author`, `files`,
  `publishConfig`) and an `npm test` script for the 24 invariant tests.
- Engine code is unchanged from v0.1.0. The v0.1.0 GitHub tag remains immutable;
  this release is the packaging and distribution layer.

## 0.1.0 — 2026-10-18

- First public release: six deterministic engines, 24 invariant tests, MIT.
