# Changelog

All notable changes to this package are documented here.

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
