# 🎯 omnitax-engines v0.2.0 — Customer Segments at a Glance

## The 5 Customer Tiers

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 1: E-Invoice Clearance Networks                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ WHO:        TTN (Tunisia), SdI (Italy), ZATCA (Saudi), ETA (Egypt)     │
│ WHAT:       Validate vendor e-invoices, sandbox testing, audit trail   │
│ SIZE:       Government bodies + licensed private hubs                  │
│ DEAL:       $100k–$500k/year                                           │
│ TIMELINE:   2–6 months (government procurement)                        │
│ CONTACT:    CTO, Technical Director, Compliance Officer               │
│                                                                         │
│ 🏆 EASIEST CLOSE: Tunisia (VATmesh home market, 30–60 days)          │
│ 💰 HIGHEST VALUE: EU (500M+ invoices/year, €200k+)                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 2: Tax & Accounting Software Vendors                              │
├─────────────────────────────────────────────────────────────────────────┤
│ WHO:        Odoo, Freshbooks, Wave, SAP, Oracle, regional SaaS        │
│ WHAT:       Embed tax math, multi-country invoice generation          │
│ SIZE:       50–500 people (SaaS) or 500+ (enterprise)                 │
│ DEAL:       $50k–$1M/year (per region or per feature tier)            │
│ TIMELINE:   4–8 weeks (typical SaaS sales cycle)                      │
│ CONTACT:    VP Product, VP Engineering, Compliance Officer            │
│                                                                         │
│ 🏆 EASIEST CLOSE: Odoo integrators (community-driven, low friction)   │
│ 💰 HIGHEST VALUE: SAP, Oracle integrations (enterprise deals)         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 3: Enterprise B2B SaaS (Embedded Library)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ WHO:        E-commerce, fintech, logistics, accounting aggregators    │
│ WHAT:       Multi-currency, multi-country invoice calculations        │
│ SIZE:       $10M–$10B ARR                                             │
│ DEAL:       $25k–$250k/year (npm license + support)                   │
│ TIMELINE:   2–4 weeks (engineering-driven)                            │
│ CONTACT:    Engineering lead, Product manager                         │
│                                                                         │
│ 🏆 EASIEST CLOSE: Indie/startup SaaS ($25k–$50k tier)                 │
│ 💰 HIGHEST VALUE: Fortune 500 partnerships (enterprise terms)         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 4: AI Agents & Developer Tools (MCP Integration)                  │
├─────────────────────────────────────────────────────────────────────────┤
│ WHO:        Claude, Cursor, AgentCore, OpenAI Agents, LangChain       │
│ WHAT:       MCP tool server for autonomous invoice generation         │
│ SIZE:       100k–1M users per platform                                │
│ DEAL:       $5k–$500k/year (MCP licensing + agent integration)        │
│ TIMELINE:   2–4 weeks (developer-driven, viral potential)             │
│ CONTACT:    AI engineers, agent architects                            │
│                                                                         │
│ 🏆 EASIEST CLOSE: Individual developers ($0 initially, freemium)      │
│ 💰 HIGHEST VALUE: Bedrock/AgentCore enterprise agreements             │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 5: Government & Tax Authority (Strategic)                         │
├─────────────────────────────────────────────────────────────────────────┤
│ WHO:        DGI (Tunisia), Agenzia (Italy), ZATCA, ETA, EC            │
│ WHAT:       Reference validator, vendor compliance testing            │
│ SIZE:       Government bodies (procurement budget: €1M–€100M)         │
│ DEAL:       €50k–€500k one-time, or €10k–€50k/year SLA               │
│ TIMELINE:   2–6 months (procurement bureaucracy)                      │
│ CONTACT:    CTO, Chief Architect, Compliance Director                 │
│                                                                         │
│ 🏆 EASIEST CLOSE: Tunisia (local advantage, fast-track)               │
│ 💰 HIGHEST VALUE: EU Commission (500k€+ with SLA)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ Geographic Adoption Map

```
REGION              KEY MARKETS      FIRST CONTACT         TIMELINE
────────────────────────────────────────────────────────────────
MENA (Focus)        Tunisia          DGI / TTN operators   30–60 days
                    Saudi Arabia     ZATCA technical team  60–90 days
                    Egypt            ETA e-invoice dept    90–120 days

EU (Large)          Italy            Agenzia + Odoo        60–90 days
                    France           Chorus Pro            60–90 days
                    Multi-country    Peppol network        90–120 days

Asia-Pacific        Not yet supported
Africa              Egypt, Nigeria   (v0.3.0+ roadmap)
Americas            Not yet supported
```

---

## 💰 Deal Size Distribution (Year 1)

```
TIER 1 (E-Invoice Networks):       20% of customers = 60% of ARR
  │ 2–3 government deals @ $200k–$500k = $400k–$1.5M

TIER 2 (Tax/Accounting SaaS):      30% of customers = 25% of ARR
  │ 5–8 vendors @ $50k–$150k = $250k–$1.2M

TIER 3 (Enterprise B2B):            40% of customers = 10% of ARR
  │ 20–30 customers @ $10k–$50k = $200k–$1.5M

TIER 4 (AI Agents):                 5% of customers = 4% of ARR
  │ 10–20 organic adopters + 1–2 enterprise = $50k–$200k

TIER 5 (Government):                5% of customers = 1% of ARR
  │ Strategic pilots, limited upside = $25k–$100k
```

**Expected Year 1 ARR: $1M–$1.5M**

---

## 🎯 Your First 3 Customers (Likely Profile)

```
CUSTOMER 1: Tunisian Accounting Firm or TTN Operator
├─ Deal size: $40k–$80k/year
├─ Timeline: 30–60 days
├─ Product: npm library + optional API
├─ Why first: Home market, personal network, regulatory tailwind
└─ Outcome: Case study, reference, GTM validation

CUSTOMER 2: Italian Odoo Integrator or Accounting SaaS
├─ Deal size: $50k–$150k/year
├─ Timeline: 60–90 days
├─ Product: npm library embed + technical support
├─ Why second: Large market, established ecosystem, high ACV
└─ Outcome: Logo placement, regional expansion

CUSTOMER 3: Saudi ZATCA-Licensed Vendor or FinTech
├─ Deal size: $75k–$200k/year
├─ Timeline: 60–120 days
├─ Product: API white-label + sandbox + SLA
├─ Why third: MENA expansion, wealth of region, compliance-first market
└─ Outcome: Regional play, pathway to UAE/Egypt/Kuwait
```

---

## 📞 Warm Outreach (Do This Week)

```
SEND EMAILS TO:

1. DGI/TTN (Tunisia) — "TEIF validator"
2. Agenzia delle Entrate (Italy) — "FatturaPA reference implementation"
3. ZATCA (Saudi Arabia) — "Fatoora Phase 2 simulator"
4. Top 5 Odoo integrators (Italy + Tunisia)
5. Regional FinTech accelerators (Astrolabs, Flat6Labs)

EXPECTED RESPONSES: 20–30% (4–8 conversations)
EXPECTED PILOTS: 2–3 within 30 days
EXPECTED FIRST DEAL: 60–90 days
```

---

## ✅ Success Milestones (Next 12 Months)

| Milestone | Month | Indicator | Revenue |
|-----------|-------|-----------|---------|
| Warm outreach complete | 1 | 50+ emails sent, 5+ calls booked | $0 |
| First pilot signed | 2 | 1 non-binding pilot agreement | $0 (POC) |
| First customer pays | 3 | Customer 1 goes production | $40k–$100k ARR |
| Second customer | 4 | Customer 2 signs contract | $100k–$200k ARR |
| Launch campaign live | 3 | Dev.to, HN, Twitter, Reddit | 50+ stars |
| Third customer | 6 | Customer 3 (MENA expansion) | $300k–$500k ARR |
| Referral pipeline | 6 | 3–5 inbound leads from customers | +$100k projected |
| Government deal | 9 | DGI/ZATCA/Agenzia contract | $500k–$1M+ ARR |
| 5M-star positioning | 12 | 250+ GitHub stars, 10k+ npm DL/mo | $1M–$1.5M ARR |

---

## 🚀 Your Next 30 Days

```
WEEK 1: RESEARCH & WARM OUTREACH
  └─ Identify 50 targets (government, SaaS, networks)
  └─ Send 50 personalized emails
  └─ Add LinkedIn connections

WEEK 2: CALL PREP & FIRST MEETINGS
  └─ Receive first 10–15 responses
  └─ Book 5–8 discovery calls
  └─ Prepare demo + one-pager

WEEK 3: ACTIVE SELLING
  └─ 5–8 discovery calls
  └─ Demo omnitax-engines (API + library)
  └─ Send pilot agreements to 2–3 qualified leads

WEEK 4: LAUNCH & NURTURE
  └─ Post Dev.to article
  └─ Submit HackerNews
  └─ Twitter thread + Reddit
  └─ First pilot signed (non-binding)
  └─ Follow up with inbound inquiries
```

---

**Bottom line:**

**omnitax-engines serves 5 tiers, but your first 3 customers will likely be:**
1. **Tunisian accounting firm / TTN operator** ($40k–$80k)
2. **Italian SaaS / Odoo integrator** ($50k–$150k)
3. **Saudi ZATCA vendor or FinTech** ($75k–$200k)

**Total Year 1 ARR target: $1M–$1.5M**

**Easiest path to revenue: Tunisia (30–60 days), then EU (60–90 days), then MENA (90–120 days)**

**Ready to execute? Pick one email to send first.** 🎯
