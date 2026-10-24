# 🚀 omnitax-engines v0.2.0 — Launch Campaign

**Adoption Accelerator: Dev.to, HackerNews, Twitter, Reddit**

---

## 📝 Dev.to Article (3000 words)

**Title:** "We Built the Tax Math That Platforms Embed — Here's What We Learned"

**Subtitle:** Deterministic e-invoicing for the 5M-star journey

```markdown
# We Built the Tax Math That Platforms Embed — Here's What We Learned

Three years ago, we extracted a deterministic tax engine from production and decided to 
open source it. Today, omnitax-engines v0.2.0 launches with an HTTP API, proving that 
rule-based tax compliance doesn't need AI to get it right.

## The Problem We Solve

Most e-invoicing failures are silent: a float rounding error, an XML validation miss, 
a retried request that double-books a document. These are deterministic problems—they 
deserve deterministic code, not probabilistic text generation.

Avalara, Fonoa, Stripe Tax all hide their tax engines behind proprietary APIs. We said: 
what if developers *owned* the math?

## What We Shipped

Six deterministic engines, zero npm dependencies, 24 invariant tests:

1. **Decimal Math** — BigInt minor-unit arithmetic for TND, EUR, USD, SAR, AED, EGP, etc.
2. **Statutory XML** — FatturaPA, TEIF (Tunisia), ZATCA (Saudi), Peppol (EU)
3. **Gateway Simulation** — SdI, TTN, ZATCA, ETA rejection codes (offline)
4. **WORM Merkle Chain** — SHA-256 proof of invoice sequence (tamper-detect)
5. **Tenant RLS** — Row-level security guard (multi-tenant safe)
6. **Idempotency** — Replay protection (24h, SHA-256 fingerprinting)

## v0.2.0: We Added HTTP

```bash
npm install omnitax-engines
node examples/api-server.js
curl http://localhost:3000/api/v1/math/calculate-breakdown \
  -X POST -H "Content-Type: application/json" \
  -d '{"baseHt": "1000", "taxRatePct": 22, "currency": "EUR"}'
```

Now you can:
- Run as a microservice (Docker, Lambda, self-hosted)
- Deploy behind a load balancer
- White-label for e-invoicing networks
- Wrap as an MCP agent tool
- Embed in accounting software

## Our Competitive Moat

| Feature | Avalara | Fonoa | Stripe | **omnitax-engines** |
|---------|---------|-------|--------|------------------|
| Offline XML validation | ❌ | ❌ | ❌ | ✅ (4 standards) |
| Gateway simulation | ❌ | ❌ | ❌ | ✅ (SdI, TTN, ZATCA, ETA) |
| WORM audit chain | ❌ | ❌ | ❌ | ✅ (SHA-256 Merkle) |
| Zero npm deps | ❌ | ❌ | ❌ | ✅ (pure Node.js) |
| Exposed math | ❌ | ❌ | ❌ | ✅ (BigInt, auditable) |
| Open source | ❌ | ❌ | ❌ | ✅ (MIT, forever) |
| HTTP API | ✅ | ✅ | ✅ | ✅ (v0.2.0) |

## Where We're Going

**License paths:**
1. **E-Invoice Clearance Networks** — White-label XML validator + gateway sim
2. **Tax Software Vendors** — Embed engine, keep UI
3. **AI Agents** — MCP server (Claude, Cursor, agents)
4. **Accounting Software** — npm library, SaaS-compatible

**Adoption target:** 5,000+ GitHub stars by Q2 2027 via partnerships + organic growth

## Code is the Truth

Our three standing laws live in the Modelfile at inference time, not in the weights:
1. No live clock (dates are never guessed)
2. Never quote live rates (FX, interest, tax)
3. Never invent products (entities must exist)

Because tax compliance is not a language model problem. It's a math problem.

## Try It

```bash
git clone https://github.com/elaka/omnitax-engines
cd omnitax-engines
npm test                    # 24/24 invariant tests
npm install && npm start    # API on :3000

# Sandbox API key
curl http://localhost:3000/api/v1/health \
  -H "X-API-Key: vm_test_anything"
```

## What's Next?

v0.2.1 (Nov): MCP server for agents  
v0.3.0 (Jan): Multi-currency enhancements, Egypt + Nigeria  
v1.0.0 (Jun 2027): Production audit, Tier 1 financial compliance  

## We're Hiring

Looking for:
- Tax compliance experts (Tunisia, Egypt, MENA)
- TypeScript engineers (HTTP, streaming, performance)
- Open source advocates (community + adoption)

Email: hello@vatmesh.io

---

**omnitax-engines: deterministic tax math, licensed for freedom.**

GitHub: https://github.com/elaka/omnitax-engines  
npm: https://npmjs.com/package/omnitax-engines  
Docs: `npm install omnitax-engines && node examples/api-server.js`
```

---

## 🔥 HackerNews Comment

**Title:** "omnitax-engines v0.2.0 – Deterministic Tax Math Engines (HTTP API + 0 Dependencies)"

**URL:** https://github.com/elaka/omnitax-engines

**Comment to post:**

```
We extracted six deterministic tax engines from production and open sourced them. 
Today v0.2.0 adds HTTP API, OpenAPI 3.1, and MCP readiness.

Unique positioning:
- Offline XML validation (FatturaPA, TEIF, ZATCA, Peppol)
- Gateway simulation (SdI, TTN, ZATCA, ETA) — no API calls
- WORM Merkle audit chain (SHA-256 proof of sequence)
- Zero npm dependencies (pure Node.js, 15 files)
- Exposed BigInt math (you own the calculation)

24/24 invariant tests pass. MIT licensed. 

Quick start:
  npm install omnitax-engines
  node examples/api-server.js
  curl http://localhost:3000/

This is the engine E-invoice platforms embed. If you're building tax software, 
accounting SaaS, or compliance networks, this is a 5M-star candidate.

We're targeting licensing + adoption partnerships. First pilots (EU, MENA networks) 
coming Q1 2027.

GitHub: https://github.com/elaka/omnitax-engines
```

---

## 🐦 Twitter Thread (3 Tweets)

**Tweet 1:**
```
🚀 omnitax-engines v0.2.0 is live.

We open-sourced six deterministic tax engines and today added HTTP API 
(no dependencies, 24/24 tests pass).

This is the math that E-invoice clearance platforms embed. MIT licensed, 
ready to ship.

https://github.com/elaka/omnitax-engines
```

**Tweet 2:**
```
What makes omnitax-engines different?

1️⃣ Offline XML validation (FatturaPA, TEIF, ZATCA, Peppol)
2️⃣ Gateway simulation (SdI, TTN, ZATCA, ETA) — zero API calls
3️⃣ WORM Merkle audit chain (SHA-256 proof of invoice sequence)
4️⃣ Zero npm deps (pure Node.js, auditable)
5️⃣ Exposed BigInt math (you own the calculation)

No LLM. Just math.
```

**Tweet 3:**
```
Adoption paths:

→ E-invoice clearance networks (white-label)
→ Tax software vendors (embed + customize)  
→ AI agents (MCP server)
→ Accounting SaaS (npm library)

Target: 5,000 GitHub stars by Q2 2027. First licensing pilots Q1.

Deploy now:
  npm install omnitax-engines
  docker-compose up
  
https://github.com/elaka/omnitax-engines
```

---

## 👾 Reddit r/javascript

**Title:** "omnitax-engines v0.2.0 – Deterministic E-Invoicing + Tax Compliance (HTTP API, 0 Dependencies, MIT)"

**Body:**

```
Released v0.2.0 today. Six deterministic tax engines, now with HTTP API and OpenAPI 3.1.

**What it does:**
- Exact BigInt money math (no float drift ever)
- Statutory XML validation (FatturaPA, TEIF, ZATCA, Peppol)
- Offline government gateway simulation (SdI, TTN, ZATCA, ETA)
- WORM Merkle audit chain (SHA-256 proof of sequence)
- Multi-tenant row-level security
- Idempotency middleware (24h replay protection)

**Why it matters:**
E-invoice clearance is now mandatory in 100+ countries. Most platforms hide the 
tax logic inside proprietary APIs. We said: what if developers owned the math?

24/24 invariant tests pass. Zero npm dependencies. MIT licensed forever.

**Try it:**
```bash
npm install omnitax-engines
node examples/api-server.js
curl http://localhost:3000/
```

**Quick demo:**
```bash
curl -X POST http://localhost:3000/api/v1/math/calculate-breakdown \
  -H "Content-Type: application/json" \
  -d '{"baseHt": "1000", "taxRatePct": 22, "currency": "EUR"}'
```

**Licensing:**
- Free forever (MIT)
- Commercial licensing available (white-label, non-open-source)
- Enterprise SLA (coming Q1 2027)

**Looking for:**
- Tax compliance experts (Tunisia, Egypt, MENA)
- TypeScript engineers
- E-invoice network operators
- SaaS accounting vendors

GitHub: https://github.com/elaka/omnitax-engines

Questions? Open an issue or email hello@vatmesh.io
```

---

## 📋 Adoption Checklist

- [ ] Publish v0.2.0 to npm
- [ ] Tag GitHub v0.2.0 (release notes)
- [ ] Post Dev.to article (1000+ audience)
- [ ] Submit HackerNews (morning, US East Coast)
- [ ] Post 3-tweet thread (Twitter @omnitaxcode)
- [ ] Post Reddit r/javascript
- [ ] Email to omnitax-engines watchers (GitHub)
- [ ] Slack communities (WebDev, FinTech, Africa-tech)
- [ ] Indiehackers (launch thread)
- [ ] Product Hunt (optional, post if account exists)

---

## 🎯 Success Metrics (Week 1)

- [ ] 200+ GitHub stars
- [ ] 1k+ npm downloads
- [ ] 50+ HackerNews upvotes
- [ ] 100+ Reddit upvotes
- [ ] 3+ licensing inquiries
- [ ] 10+ fork/watch notifications

---

**Launch campaign ready. Execute with confidence. 🚀**
