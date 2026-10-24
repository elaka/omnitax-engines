# 🎯 omnitax-engines — Sales Playbook

**Month 1–12 customer acquisition & pipeline strategy**

---

## 🎬 Phase 1: Warm Outreach (Weeks 1–2)

### Target List (Priority Order)

#### Tier 1A: Existing Contacts
- [ ] Your own network (VATmesh users, partners)
- [ ] TTN operators you know (Tunisia)
- [ ] Odoo integrators you've met

**Action:** Send personal emails. "We just released omnitax-engines v0.2.0. Thought you might find the TEIF validator useful. Free trial inside."

---

#### Tier 1B: Government Tax Authorities
1. **Tunisia (DGI / Tunisie TradeNet)**
   - **Contact:** Head of Technical Development, TTN
   - **Email:** Find via ttn.tn or dgi.gov.tn contact form
   - **Subject:** "omnitax-engines TEIF v1.8.8 Reference Validator — Available for TTN Integration"
   - **Value Prop:** "Offline, deterministic validation for TEIF compliance. Zero SaaS dependency. Open source MIT."
   - **CTA:** "30-min call to show the TTN simulator?"

2. **Saudi Arabia (ZATCA)**
   - **Contact:** Technical Compliance Division
   - **Email:** Find via zatca.gov.sa
   - **Subject:** "Fatoora Phase 2 Reference Validator — omnitax-engines v0.2.0"
   - **Value Prop:** "UBL 2.1 validator, QR tag validator, offline gateway simulation"
   - **CTA:** "Can we demonstrate the sandbox?"

3. **Egypt (ETA)**
   - **Contact:** E-Invoicing Department
   - **Email:** Find via eta.gov.eg or contact through Egypt MENA networks
   - **Subject:** "E-Invoice XML Validator — omnitax-engines"
   - **Value Prop:** "Immediate support for ETA e-receipt/e-invoice mandate"
   - **CTA:** "Beta program: give us feedback, we'll prioritize Egypt enhancements"

4. **Italy (Agenzia delle Entrate, SdI)**
   - **Contact:** Technical Infrastructure Division
   - **Email:** Find via agenziaentrate.gov.it
   - **Subject:** "FatturaPA v1.2.2 Reference Validator — Open Source"
   - **Value Prop:** "Deterministic offline validation, Luhn checksum, zero dependencies"
   - **CTA:** "Use as test harness for vendor compliance?"

---

#### Tier 1C: E-Invoice Network Operators (Private)

**Search:** LinkedIn for "e-invoicing," "digital transformation," "compliance officer" + country

**Tunisia:**
- Fintech accelerators (Astrolabs, Flat6Labs Tunisia)
- Accounting firms (Big 4 offices in Tunis)
- Regional payment networks

**Saudi Arabia:**
- ZATCA-certified vendors
- Regional fintech hubs

**Italy:**
- Odoo community (integrators@odoo.com for Italy group)
- Nexo.it, other SdI operators
- Accountant associations (Ordine Dottori Commercialisti)

**EU:**
- Peppol service providers
- Chorus Pro integrators

---

### Email Template (Warm Outreach)

**Subject:** "omnitax-engines v0.2.0 — Deterministic Tax Math Your Platform Needs"

**Body:**
```
Hi [Name],

We just published v0.2.0 of omnitax-engines, a deterministic e-invoicing
engine that validates FatturaPA, TEIF (Tunisia), ZATCA (Saudi), and Peppol
invoices — all offline, zero dependencies.

Given your work with [TTN / SdI / ZATCA / EU clearance], I thought you might
want to kick the tires.

Key features:
✓ Exact BigInt math (TND millime, EUR, USD precision)
✓ Statutory XML validation (4 standards)
✓ Offline gateway simulation (SdI, TTN, ZATCA, ETA rejection codes)
✓ WORM audit chain (SHA-256)
✓ MIT licensed (free forever, commercial licensing available)

GitHub: https://github.com/elaka/omnitax-engines
npm: https://npmjs.com/package/omnitax-engines
Quick demo: node_modules/omnitax-engines/examples/api-server.js

Happy to hop on a call if you see an angle. We're actively looking for
early adopters and pilot partners.

Cheers,
[Your Name]
```

---

### Email Template (Cold Outreach — Vendors)

**Subject:** "White-label XML validator for your e-invoicing platform"

**Body:**
```
Hi [Name],

Saw that [Company] is expanding into [Italy / Tunisia / Saudi / EU] e-invoicing.

We built omnitax-engines — a deterministic tax engine used in production for
Tunisian invoicing. It validates FatturaPA, TEIF, ZATCA, and Peppol.

Instead of building validation in-house, you can:
• npm install omnitax-engines (30 sec integration)
• White-label our HTTP API (deploy in your VPC)
• White-label the reference implementation (we have Docker + Lambda ready)

Happy to show you a POC. No strings attached.

GitHub: https://github.com/elaka/omnitax-engines
Licensing: https://github.com/elaka/omnitax-engines/LICENSING.md

Interested in 15 min next week?

Cheers,
[Your Name]
```

---

## 🔥 Phase 2: Inbound & Momentum (Weeks 3–4)

### Launch Campaign Activation

- [ ] Post Dev.to article (LAUNCH-CAMPAIGN.md ready)
- [ ] Submit to HackerNews (Tue morning, US time)
- [ ] Post Twitter thread (3 tweets)
- [ ] Post Reddit r/javascript
- [ ] Post to LangChain + agent communities
- [ ] Email to tech newsletter subscribers (if you have a list)

**Expected inbound:** 20–50 GitHub issues, DMs, emails within 2 weeks

---

### Response Playbook (Inbound)

**If someone asks:** "Can you validate my [country] invoices?"

**Response:**
```
Absolutely! omnitax-engines already supports:
✓ FatturaPA (Italy)
✓ TEIF (Tunisia)
✓ ZATCA (Saudi Arabia)
✓ ETA (Egypt)
✓ Peppol (EU 27)
✓ Factur-X (France, cross-border)

What country/standard are you targeting? Happy to:
1. Show a demo (30 min)
2. Offer npm library access
3. Run a white-label pilot (your brand, our engine)

DM me or open an issue: https://github.com/elaka/omnitax-engines/issues
```

**If someone asks:** "How much?"

**Response:**
```
Pricing depends on use case:

→ Open-source library (npm): FREE (MIT license)
→ White-label validator (API): $[50k–300k]/year (depends on volume/jurisdiction)
→ Embedded license: $[25k–200k]/year (SaaS deployment)
→ Government/authority licensing: Custom quote

Let's hop on a call to figure out which fits you best.

calendly.com/[your-link]
```

---

## 📊 Phase 3: Pipeline Development (Weeks 5–12)

### Qualifying Inbound

**When someone reaches out, ask:**

1. **Use case:** "Are you validating, simulating, or building software?"
2. **Volume:** "How many invoices/month?"
3. **Geography:** "Which countries/standards?"
4. **Timeline:** "When do you need this live?"
5. **Budget:** "Is this a $50k/year initiative or $500k/year?"

**Scoring:**
- ✅ High quality: Government/BigCorp, multi-country, $100k+ budget, <6 month timeline
- 🟡 Medium quality: Mid-market SaaS, single country, $25k–100k budget, 2–6 month timeline
- 🟢 Low quality: Developer/indie, POC-only, <$25k budget, "exploring"

**Action:**
- High quality → Schedule call within 2 days
- Medium quality → Schedule call within 1 week
- Low quality → Ask to open GitHub issue, offer npm library, nurture for 3–6 months

---

### Sales Cycle Template

**Week 1: Discovery**
- 30-min call to understand pain
- Demo omnitax-engines (API + library)
- Ask: "What's your go/no-go timeline?"

**Week 2: POC**
- Send sandbox credentials
- Offer 1 integration call (1 hour)
- Ask: "What success looks like?"

**Week 3–4: Pilot Agreement**
- Non-binding pilot contract (30–60 days)
- Clear scope: 1 country, 1 standard, X invoices/month
- Deliverable: "We'll validate 1,000 invoices with <1% error rate"

**Week 5–6: Execution**
- Integration support (available for calls)
- Weekly progress updates
- Early wins celebrated

**Week 7–8: Go/No-Go Decision**
- Retrospective
- Production contract (if success)
- Upsell roadmap (if successful)

---

## 💰 Deal Structure

### Small Deal (Developer / Indie SaaS)
- **Price:** $5k–$25k/year (npm library license)
- **Contract:** 12-month, auto-renew
- **Support:** Community (GitHub) + optional Slack ($100/mo)
- **Onboarding:** Self-serve + 1 integration call

### Mid-Market Deal (SaaS / Accounting Firm)
- **Price:** $50k–$150k/year (white-label API or embedded license)
- **Contract:** 12–24 month
- **Support:** 24/5 email + 1 call/week during integration
- **Onboarding:** Dedicated onboarding call + tech POC

### Enterprise Deal (Government / BigCorp / E-Invoice Network)
- **Price:** $150k–$500k+/year (custom deployment + SLA)
- **Contract:** 24–36 months
- **Support:** 24/7 SLA, dedicated Slack channel, monthly business review
- **Onboarding:** Full technical team + legal review

---

## 📈 Month 1–12 Pipeline Targets

| Month | Outreach | Discovery Calls | Pilots | Production | ARR |
|-------|----------|-----------------|--------|------------|-----|
| 1 | 50 emails | 2–3 | 0 | 0 | $0 |
| 2 | +30 inbound | 5–8 | 1–2 | 0 | $0 |
| 3 | +20 inbound | 8–12 | 2–3 | 1 | $50k–100k |
| 4 | +15 inbound | 10–15 | 3–5 | 1–2 | $100k–150k |
| 6 | Steady state | 15–20/mo | 5–8 | 2–4 | $300k–500k |
| 9 | Momentum | 20–30/mo | 8–12 | 4–8 | $600k–900k |
| 12 | Viral + inbound | 30–50/mo | 10–15 | 5–10 | $1M–1.5M |

---

## 🎁 Pilot Program (First 5 Customers)

**Special offer for first 5 production customers:**

- 50% discount Year 1 (then standard rates Year 2+)
- Free integration support (normally $10k)
- Logo on GitHub README + case study
- 30-min monthly business review (normally upsell)

**Goal:** Get reference customers fast, build momentum

---

## 🚀 Quick Wins (Month 1)

1. **Get 1 government inquiry** (TTN, ZATCA, ETA, or Agenzia)
   - Action: Personal outreach to technical leadership
   - Timeline: 2 weeks
   - Outcome: Exploratory call, not necessarily a deal, but validation

2. **Land 1 accounting firm / SaaS customer**
   - Action: Odoo integrators + regional accounting SaaS
   - Timeline: 3–4 weeks
   - Outcome: $25k–$75k/year pilot

3. **Get 50 GitHub stars + 1k npm downloads**
   - Action: Launch campaign (already drafted)
   - Timeline: 2 weeks
   - Outcome: Inbound momentum, social proof

4. **Build 1 case study**
   - Action: Interview first customer
   - Timeline: Week 5–6
   - Outcome: "Tunisian E-Invoicing Network Cuts Validation Time 80% with omnitax-engines"

---

## 📞 First Calls (What to Say)

### Opening
```
"Hey [Name], thanks for taking 30 min. I built omnitax-engines to solve
the exact problem you're facing: deterministic tax compliance that you own.

Before I show you a demo, can you tell me about your current workflow?
Where do you validate invoices today?"
```

### If they ask about competition
```
"Avalara and Fonoa are black-box APIs. You don't own the logic. We're
the opposite: deterministic, open-source, offline, you own the math.

Think of us as the 'Stripe tax' for developers and fintech — you don't
need to call a cloud API, you just embed the library."
```

### If they ask about roadmap
```
"We're focused on 4 standards: FatturaPA, TEIF, ZATCA, Peppol. After that,
we'll add Egypt (ETA), Nigeria, Morocco based on customer demand.

What standard do you care about most?"
```

### Closing
```
"I'd love to get you a sandbox API key and walk through a POC. Can we
schedule 1 hour next week for integration?"
```

---

## 🏁 Success Metrics (Month 1)

- [ ] 50+ warm outreach emails sent
- [ ] 5–10 discovery calls booked
- [ ] 1–2 pilots signed (non-binding)
- [ ] 50+ GitHub stars
- [ ] 1k+ npm downloads
- [ ] 20+ inbound inquiries (from launch campaign)
- [ ] 1 case study/testimonial in progress

---

**Ready to execute. Ship the sales playbook. 🚀**
