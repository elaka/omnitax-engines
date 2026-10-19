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

## The engines

| Engine | What it does | Honesty notes |
|---|---|---|
| `decimal-math.js` | BigInt minor-unit money arithmetic for 2-decimal (EUR/USD/MAD/SAR/AED/EGP) and 3-decimal (TND/KWD/OMR/BHD) currencies. Enforces `HT + VAT + stamp === gross` with zero floating-point drift in the core arithmetic. | Convenience `*Numeric`/`.value` outputs pass through JS `Number` — use the string/BigInt outputs when exactness matters. |
| `statutory-xml-validator.js` | **Rule-based** structural validation (implemented subset) for FatturaPA v1.2.2 (IT), TEIF v1.8.8 (TN), ZATCA UBL 2.1 (SA), and Factur-X/Peppol BIS 3.0 (EU) invoice XML: mandatory element hierarchy, tax-ID checksums/regexes (Luhn P.IVA, Matricule Fiscal, 15-digit TIN), TLV QR tag structure, line-item balance. | It is **not** a full XSD/Schematron engine — it implements a curated subset of statutory rules. Always validate against official tooling before filing. |
| `gateway-simulator.js` | Deterministic, offline simulators of official gateway behaviors — SdI collaudo-style acceptance/rejection (`RC`/`NS`, codes `00200`/`00311`/`00404`/`00423`/`00427`), TTN sandbox (`ACCEPTE`/`REJETE`), ZATCA Phase 2, ETA pre-prod — with `SIMULATED_`-prefixed messages. | Simulated outcomes carry no real-world clearance value. No network calls, ever. |
| `worm-merkle-ledger.js` | Append-only SHA-256 hash-chain audit ledger (`entryHash = SHA256(seq \| prevHash \| tenant \| doc \| event \| payloadHash \| timestamp)`) with Merkle inclusion proofs and DB-level `BEFORE UPDATE`/`BEFORE DELETE` abort triggers. | WORM is enforced at the storage layer, not the OS: someone with raw disk write access can still tamper — which is exactly what `verifyChainIntegrity()` detects. |
| `tenant-rls-guard.js` | Tenant-scoped query guard: every statement is checked for `tenant_id` scoping; cross-tenant access throws. | A defense-in-depth heuristic, **not** a substitute for database row-level security or authorization middleware. |
| `idempotency.js` | `Idempotency-Key` middleware: SHA-256 request fingerprinting, 24h replay with `X-Idempotent-Replay`, `409` for concurrent duplicates, `422` for key reuse with a mutated payload. | Memory store by default; optional SQLite tiers. |

## Status

**v0.1.0 — first public release.** Six self-contained engines, 24 invariant tests,
zero required dependencies. The engines are extracted from a production platform and
audit-reviewed; the release gate (naming scrub, path hygiene, test suite hardening)
is complete. Jurisdiction rule coverage grows per-release — the executable tests in
`tests/` are the coverage contract for the implemented rules.
No accreditation is claimed, implied, or possible from a piece of software.

## Requirements

- Node ≥ 18 (JSONL/memory fallbacks)
- Node ≥ 22.5 unlocks the built-in `node:sqlite` storage tier
- `better-sqlite3` is **optional** (only for the SQLite storage tiers) — zero required dependencies

## License

MIT — see [LICENSE](./LICENSE). Copyright (c) 2026 Kais (VATMesh project; to be assigned
to the incorporating entity upon formation).

## Contributing

Rule additions must cite the statutory source (gazette, authority circular, official
spec version) in the rule's definition — every rule carries its provenance. Synthetic
fixtures only; no real business documents. Claims discipline: PRs that overclaim
(capability, accreditation, completeness) will be closed with a smile and a pointer to
this README.
