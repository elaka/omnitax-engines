# v0.2.0 — Growth Release (Draft Plan)

**From:** v0.1.1 (packaging layer, Oct 22)  
**To:** v0.2.0 (engineering invariants + growth kit + adoption package)

---

## What's in `_unreleased/`: `engineering_invariants.routes.js`

A production-grade REST router exposing all six engines via HTTP:

- `GET /api/v1/openapi.json` — Machine-readable contract
- `GET /api/v1/environment/status` — Sandbox vs Production + billing gate
- `POST /api/v1/math/calculate-breakdown` — Multi-line reconciliation
- `POST /api/v1/validate/xml` — Statutory XML validator
- `POST /api/v1/sandbox/clear` — Gateway simulator
- `POST /api/v1/audit/seal` / `verify-chain` — WORM chain

**Why this is v0.2.0, not 0.1.2:** New capabilities (HTTP API layer, auth, idempotency middleware, tenant resolution) — that's a feature release, not a patch.

---

## Proposed v0.2.0 Changes

### Package
- `version`: `0.2.0`
- `main`: keep `index.js`; add `routes/engineering_invariants.routes.js` to `files`
- `scripts`: add `start` (if serving) or document the API mount

### CHANGELOG entry
```
## 0.2.0 — 2026-10-24 (or when approved)

- Added `engineering_invariants.routes.js` — HTTP router mounting all six engines
  with idempotency, tenant resolution, and environment-gate checks.
- Added `GROWTH-LAUNCH-KIT.md` — adoption playbook (SEO, Dev.to, HackerNews).
- Added growth metrics tracking (GitHub stars, npm downloads, demo usage).
- No engine arithmetic changes — all 24 invariant tests still pass.
```

### README addition
- Add "API / HTTP" section showing `engineering_invariants.routes.js` mount
- Note: `vm_test_` keys for sandbox; `ANONYMOUS_TENANT` rejected on seal
- Reference `GROWTH-LAUNCH-KIT.md`

---

## Growth Kit Reference (`GROWTH-LAUNCH-KIT.md`)

Read `omnitax-engines/GROWTH-LAUNCH-KIT.md` — it covers:
- GitHub star growth tactics
- npm download strategies
- Demo apps (quickstart already exists)
- Documentation SEO
- Community engagement

---

## Approval Needed (From You)

A) **Bump to 0.2.0** — include `_unreleased/engineering_invariants.routes.js` in release?
B) **Keep at 0.1.1** — hold routes for separate package or private repo?
C) **Patch 0.1.2** — only update README/docs, no new code?

**My recommendation:** A — the routes represent real value (HTTP interface to all engines), and the growth kit needs a version milestone to signal maturity. 🟢

What's your call?
