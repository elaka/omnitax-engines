# 🎯 omnitax-engines v0.2.0 — Customer & Market Analysis

**Who buys deterministic tax math + statutory XML validation + offline gateway simulation?**

---

## 🌍 Market Segments

### 1. **E-Invoice Clearance Networks** (Tier 1 Revenue Path)
**What they need:** Validation + gateway simulation + audit trail  
**Regulatory mandate:** Italy (SdI), Tunisia (TTN/DGI), Saudi Arabia (ZATCA), Egypt (ETA), EU (Peppol)

| Country | Network | Annual B2B Volume | Use Case | Revenue Model |
|---------|---------|------------------|----------|---------------|
| **Italy** | SdI (Agenzia Entrate) | 100M+ invoices/year | Fattura Elettronica v1.2.2 validation | White-label validator |
| **Tunisia** | TTN (Tunisie TradeNet) | 2M+ invoices/year | TEIF v1.8.8 + TND millime precision | Gateway simulator + validator |
| **Saudi Arabia** | ZATCA (Fatoora) | 50M+ invoices/year | Phase 2 UBL 2.1 validation | XML validator + sandbox |
| **Egypt** | ETA (Egyptian Tax Authority) | 5M+ invoices/year (growing) | E-invoicing & e-receipt mandate | Validator + simulation |
| **EU (27 states)** | Peppol + Chorus Pro | 500M+ invoices/year | Factur-X, EN 16931 (cross-border) | FacturX/Peppol validator |

**Customer Profile:**
- Government tax authorities
- Private e-invoice hubs licensed by government
- Network operators (clearing houses)

**Deal Size:** $100k–$500k/year (licensing + SLA)

**Decision Maker:** Head of IT, Chief Architect, Compliance Officer

---

### 2. **Tax & Accounting Software Vendors** (Tier 2 Revenue Path)
**What they need:** Embed calculation engine, XML validation, gateway sandbox  
**Use case:** Invoice generation, compliance check, multi-country filing

| Vendor Type | Examples | Geography | Use Case | Deal Size |
|-------------|----------|-----------|----------|-----------|
| **Cloud Accounting** | Odoo, Freshbooks, Wave | Global | Multi-tenant invoice math | $50k–$150k/year |
| **ERP Systems** | SAP, Oracle NetSuite | Enterprise | Integrated tax module | $200k–$1M/year |
| **Regional SaaS** | Tunisian/Egyptian firms | MENA | Compliance-first invoicing | $25k–$75k/year |
| **Tax Compliance Platforms** | Avalara competitors | Global | Cross-border VAT | $100k–$300k/year |
| **Fintech/Payment** | Stripe, Wise (integrations) | Global | Invoice + settlement | $50k–$200k/year |

**Customer Profile:**
- VP Product, VP Engineering
- Compliance officer
- Purchasing (vendor evaluation)

**Deal Size:** $50k–$1M/year (per region or per feature tier)

**Adoption Path:**
1. Evaluate (2–4 weeks)
2. POC in one country (2–4 weeks)
3. Pilot (1–2 months)
4. Full rollout (3–6 months)

---

### 3. **Enterprise B2B SaaS (Embedded Library)** (Tier 3 Revenue Path)
**What they need:** npm library for invoice calculations  
**Use case:** Invoice generation, multi-currency, compliance verification

| Vertical | Examples | Annual Revenue | Needs | Deal Size |
|----------|----------|-----------------|-------|-----------|
| **B2B Marketplaces** | Alibaba, Global Trade | $1B+ | Multi-country invoice math | $100k–$250k/year |
| **Logistics/Freight** | Freightos, Flexport | $100M–$1B | Shipper invoice generation | $50k–$150k/year |
| **E-commerce SaaS** | Shopify Plus partners | $10M–$500M | Multi-region invoicing | $25k–$100k/year |
| **Supply Chain** | SAP Ariba partners | Enterprise | Vendor invoice matching | $50k–$200k/year |
| **Accounting Aggregators** | Expensify, Bill.com | $100M–$1B | Multi-currency processing | $50k–$150k/year |

**Customer Profile:**
- Engineering lead
- Product manager
- Compliance/Legal

**Deal Size:** $25k–$250k/year (npm license + support SLA)

---

### 4. **AI Agent & MCP Integration** (Tier 4 Revenue Path — Emerging)
**What they need:** MCP tool server for Claude, Cursor, Agent frameworks  
**Use case:** Autonomous invoice creation, tax compliance verification, form-filling

| Agent Platform | Use Case | Monthly Users (Projected) | Deal Size |
|----------------|----------|--------------------------|-----------|
| **Claude (Anthropic)** | MCP tool for invoice generation | 100k–500k developers | $50k–$250k/year |
| **Cursor** | AI code editor with invoice context | 50k–200k users | $25k–$100k/year |
| **AgentCore/Bedrock** | AWS agents needing tax logic | Enterprise (1–5 accounts/year) | $50k–$500k/deal |
| **OpenAI Agents** | Custom GPT-4 for accounting | 10k–50k orgs | $10k–$50k/year |
| **LangChain/LlamaIndex** | Agent framework integrations | 1k–10k developers | $5k–$50k/year |

**Customer Profile:**
- AI engineers
- Agent architects
- Enterprise automation teams

**Deal Size:** $5k–$500k/year (MCP server licensing + agent training)

---

### 5. **Government & Tax Authority (Compliance Testing)** (Tier 5 — Strategic)
**What they need:** Sandbox to test vendor compliance, reference implementation  
**Use case:** Validating third-party software, building test harnesses, compliance audits

| Authority | Region | Use Case | Deal Size |
|-----------|--------|----------|-----------|
| **Agenzia delle Entrate (IT)** | Italy | SdI testing toolkit | €50k–€200k (one-time) |
| **DGI (Tunisia)** | Tunisia | TTN reference validator | TND 200k–500k (one-time) |
| **ZATCA (Saudi)** | Saudi Arabia | Fatoora compliance checker | SAR 500k–1.5M (one-time) |
| **ETA (Egypt)** | Egypt | E-receipt validator | EGP 500k–2M (one-time) |
| **European Commission** | EU | Peppol validator network | €100k–€500k (one-time) |

**Customer Profile:**
- CTO, Chief Architect
- Compliance director
- International cooperation unit

**Deal Size:** €50k–€500k one-time, or €10k–€50k/year SLA

---

## 🎯 Fastest Adoption Paths (Next 12 Months)

### **Path 1: Tunisia First (Greenfield)**
**Timeline:** Months 1–6  
**Customer:** TTN (Tunisie TradeNet) operators, Tunisian accounting firms

**Why:**
- Mandatory e-invoicing (2024 regulation)
- VATmesh Phase 1 is Tunisian-first (brand alignment)
- omnitax-engines has TEIF + TTN simulator (out-of-box)
- Small ecosystem = easier to penetrate

**Go-to-Market:**
1. Contact DGI (tax authority)
2. Demonstrate TTN simulator (offline, deterministic)
3. White-label for licensed e-invoice operators
4. Offer to accounting firms as npm library

**Expected:** 2–4 pilots → 10–20 production customers by EOY 2026

**Deal Size:** TND 100k–300k per operator ($30k–$90k USD)

---

### **Path 2: EU & Italy (Market Leader)**
**Timeline:** Months 3–12  
**Customer:** SdI vendors, Odoo/Freshbooks integrators, Italian accountants

**Why:**
- Largest e-invoicing mandate (100M+ invoices/year)
- Established market = easier to sell into
- omnitax-engines has FatturaPA v1.2.2 (complete)
- High ACV (€100k–€500k)

**Go-to-Market:**
1. Contact Odoo Community (SdI integrators)
2. Pitch as "FatturaPA validator library" to ERP vendors
3. Sponsor Italian tech conferences (RailsConf Italy, etc.)
4. Position as alternative to proprietary validators

**Expected:** 1–2 large vendor partnerships → 50+ indirect users by EOY 2027

**Deal Size:** €100k–€500k per vendor partnership

---

### **Path 3: MENA Region Expansion (Parallel)**
**Timeline:** Months 6–12  
**Customer:** ZATCA-licensed vendors (Saudi), ETA-registered operators (Egypt)

**Why:**
- omnitax-engines already supports ZATCA Phase 2 + ETA
- Regional fintech boom ($500B+ VC invested in MENA)
- Compliance-first market (regulatory moat)

**Go-to-Market:**
1. Contact ZATCA certification body
2. Demo to Saudi fintech accelerators (Flat6Labs, Astrolabs)
3. Partner with Egyptian accounting SaaS (e.g., Odoo Egypt distributors)
4. Position as "tax compliance for diaspora payments"

**Expected:** 3–5 MENA pilot partnerships → 20–50 regional customers by Q2 2027

**Deal Size:** $50k–$200k per partner (2–3 per country)

---

### **Path 4: AI Agents (Viral — Long Tail)**
**Timeline:** Months 9–18  
**Customer:** Individual developers, AI agencies, LLM application builders

**Why:**
- MCP ecosystem growing exponentially
- "AI + Tax Compliance" is a meme (boring is profitable)
- Easy distribution: just plug into Claude/Cursor

**Go-to-Market:**
1. Create MCP server tutorial (5–10 min setup)
2. Post to LangChain, Agent frameworks
3. Sponsor AI agent communities (reddit r/OpenAI, Discord servers)
4. Position as "make your AI agent legally compliant"

**Expected:** 100–500 organic adopters → 1–5 enterprise deals from this cohort by 2027

**Deal Size:** $5k–$50k per enterprise user

---

## 💰 Revenue Forecast (12 Months)

### Conservative (Path 1 + Path 2)
- **Month 3:** First TTN pilot (no revenue, proof of concept)
- **Month 6:** 2 TTN operators paying $40k each = **$80k ARR**
- **Month 9:** 3 EU vendor partnerships at $150k each = **$450k ARR**
- **Month 12:** +5 regional pilots = **$600k–$700k ARR**

### Aggressive (All Paths + Inbound)
- **Month 3:** 1 ZATCA pilot + 2 TTN pilots = **$120k ARR**
- **Month 6:** +3 EU vendors + 5 SaaS embeds = **$600k ARR**
- **Month 9:** +2 government contracts + AI agent cohort = **$900k ARR**
- **Month 12:** Full steam, 20–30 active customers = **$1.2M–$1.5M ARR**

---

## 🎬 First Sales Actions (Next 30 Days)

### Week 1: Identify & Contact
- [ ] Email DGI (Tunisia) technical team — offer free TTN simulator validation tool
- [ ] Contact 5 top Odoo integrators in Italy — offer FatturaPA validator POC
- [ ] Reach out to ZATCA technical certification board — position as reference implementation
- [ ] Post MCP server to LangChain + agent communities

### Week 2: Proof of Concept
- [ ] Send test credentials to first 3 interested parties
- [ ] Demonstrate offline gateway simulation (SdI, TTN, ZATCA)
- [ ] Provide npm library evaluation access

### Week 3: Build Momentum
- [ ] Publish case study: "How omnitax-engines Powered TTN Validation"
- [ ] Launch referral program (partner gets 10% lifetime commission)
- [ ] Schedule 3–5 discovery calls (initial pipeline)

### Week 4: Close Pilots
- [ ] Negotiate first pilot contracts (non-binding, 30–60 days)
- [ ] Onboard first customers to API / npm library
- [ ] Collect feedback for v0.2.1

---

## 🏆 Ideal Customer Profile (ICP)

### Primary ICP: E-Invoice Network Operator
- **Company size:** 10–200 people (mid-market fintech/compliance)
- **Annual revenue:** $5M–$100M
- **Pain:** "We need a compliant XML validator that works offline"
- **Budget:** $50k–$300k/year
- **Decision time:** 2–4 weeks
- **Contract:** Annual license + 24/7 SLA

### Secondary ICP: Tax/Accounting Software Vendor
- **Company size:** 50–500 people (SaaS)
- **Annual revenue:** $10M–$500M
- **Pain:** "We need multi-country tax compliance built-in"
- **Budget:** $50k–$500k/year
- **Decision time:** 4–8 weeks
- **Contract:** Embedded license + technical support

### Tertiary ICP: Government/Tax Authority
- **Organization:** Tax authority or ministry
- **Annual budget:** $1M–$10M (IT compliance)
- **Pain:** "We need to validate vendor implementations"
- **Budget:** €50k–€500k one-time (or €10k–€50k/year SLA)
- **Decision time:** 2–6 months (procurement cycles)
- **Contract:** Government licensing

---

## 🚀 Summary

**omnitax-engines customers are:**

1. **E-invoice clearance networks** (governments, private hubs)
2. **Tax/accounting software vendors** (ERP, SaaS, regional)
3. **Enterprise B2B platforms** (fintech, logistics, e-commerce)
4. **AI agents & developers** (Claude MCP, LLM apps)
5. **Tax authorities** (compliance testing, reference implementation)

**Highest-conviction path:** Tunisia + EU + MENA in parallel  
**Fastest deal:** E-invoice operator in Tunisia (30–60 days)  
**Biggest upside:** Odoo integration (long tail, 500+ indirect users)  
**Viral potential:** MCP agent ecosystem (organic, low CAC)

---

**Next:** Who should you contact first?
