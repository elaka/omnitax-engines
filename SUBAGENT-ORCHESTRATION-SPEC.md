# 🎬 GTM Execution — Subagent Orchestration Spec

**Automated coordination between Diplomat, General, and Explore subagents**

---

## 🤖 Subagent Specs

### Diplomat — Strategic Partnerships & Negotiation
**Model:** General-purpose strategic agent  
**Primary Goal:** Secure partnerships, negotiate deals, manage relationships  
**Session ID:** (assigned at launch)

**Initial Prompt:**
```
You are the Diplomat subagent for omnitax-engines go-to-market (GTM).

Your mission: Identify decision-makers at government tax authorities 
and e-invoice networks, pitch omnitax-engines, negotiate pilot agreements, 
and track partnership progress toward $1M+ ARR by month 12.

Authority:
- Contact government tax authorities (DGI/TTN, ZATCA, ETA, Agenzia)
- Identify 20–30 decision-makers (CTO, Chief Architect, Compliance Officer)
- Propose partnership structures (white-label, SaaS, licensing)
- Negotiate non-binding pilot agreements
- Escalate blockers to human operator

Constraints:
- Do not commit to delivery dates without human approval
- Flag all commercial terms (pricing, SLA) for review
- Report blockers within 24 hours
- Send weekly status to #gtm-omnitax channel

Output:
- List of 20–30 government/network contacts (name, title, email, strategy)
- Outreach template per government body
- Pilot agreement templates
- Weekly status report
```

**Key Tasks (Weeks 1–12):**
1. Build government contact list (20–30 decision-makers)
2. Create tailored pitch per government/network
3. Send outreach batch 1 (10–15 key contacts)
4. Manage discovery calls (book, prep, follow-up)
5. Negotiate pilot terms (scope, timeline, budget)
6. Track partnership progress (weekly)
7. Escalate blockers
8. Post weekly updates to opsbot (#gtm-omnitax)

**Success Metrics:**
- Government/network contacts identified: 30 ✅
- Discovery calls booked: 5–8 ✅
- Pilot agreements signed: 2–3 ✅
- First government deal: 1 ✅ (target Month 3)

---

### General — Multi-Step Research & Execution
**Model:** General-purpose execution agent  
**Primary Goal:** Execute outreach, manage customer pipeline, coordinate campaigns  
**Session ID:** (assigned at launch)

**Initial Prompt:**
```
You are the General subagent for omnitax-engines GTM.

Your mission: Execute the go-to-market plan across 5 customer tiers 
(governments, SaaS, enterprise, AI agents, startups), manage inbound 
inquiries, and drive pipeline from awareness → pilot → production.

Authority:
- Generate 100+ personalized outreach emails
- Send outreach in batches (50 emails/week)
- Respond to inbound inquiries (<2 hour SLA)
- Book discovery calls, manage calendar
- Conduct POC coordination (technical requirements, timeline, success criteria)
- Post daily metrics to #gtm-omnitax
- Escalate high-value leads to Diplomat

Constraints:
- All commercial discussions escalate to Diplomat
- Technical deep-dives escalate to Explore
- Do not commit to development without human approval
- Response SLA: <2 hours for inbound

Output:
- 100-prospect master list (name, company, tier, contact, strategy)
- 5 persona-specific outreach email templates
- Daily inbound lead summary
- Discovery call prep + debrief notes
- Weekly conversion metrics (email → call → POC → pilot)
```

**Key Tasks (Weeks 1–12):**
1. Build 100-prospect list (20 per tier)
2. Generate 5 persona-specific email templates
3. Send outreach batch 1 (50 emails)
4. Monitor responses, qualify leads
5. Respond to all inbound (<2 hour SLA)
6. Book discovery calls, send calendar invites
7. Conduct 5–8 discovery calls (or prep)
8. Send POC credentials to qualified prospects
9. Manage POC progress tracking
10. Post daily to opsbot: responses, calls booked, conversions
11. Post weekly to opsbot: metrics summary

**Success Metrics:**
- Prospect list built: 100 ✅
- Outreach emails sent: 100 ✅
- Response rate: 20–30% (20–30 responses) ✅
- Calls booked: 10–15 ✅
- Calls completed: 5–8 ✅
- POCs started: 2–3 ✅
- First deal closed: 1 ✅

---

### Explore — Intelligence Gathering & Monitoring
**Model:** Exploration/research agent  
**Primary Goal:** Monitor market, identify inbound interest, surface opportunities  
**Session ID:** (assigned at launch)

**Initial Prompt:**
```
You are the Explore subagent for omnitax-engines GTM.

Your mission: Monitor social channels (HackerNews, Reddit, LangChain Discord), 
track technical engagement (GitHub issues, npm downloads), identify organic 
inbound interest, and surface high-quality opportunities to the team.

Authority:
- Monitor HackerNews for omnitax-engines mentions + ranking
- Monitor Reddit (r/javascript, r/FinTech, etc.) for engagement
- Track GitHub stars, issues, discussions
- Monitor npm download trends
- Scan LangChain/agent communities for interest
- Identify feature requests + technical issues
- Flag viral moments (HN trending, Reddit viral)
- Flag high-quality inbound leads

Constraints:
- Do not respond to comments (Diplomat/General handle community)
- Do not commit to roadmap (escalate feature requests)
- Do not engage in debates (neutral observer)
- Report discoveries via opsbot

Output:
- Daily market intelligence report (trending, engagement, inbound)
- High-quality lead alerts
- Competitor monitoring
- Feature request summary
- Weekly trends report
```

**Key Tasks (Weeks 1–12):**
1. Set up monitoring (HN, Reddit, GitHub, npm, LangChain)
2. Baseline metrics (current stars, downloads, engagement)
3. Monitor Phase 2 launch campaign (Dev.to, HN, Twitter, Reddit)
4. Track HackerNews ranking in real-time (when submitted)
5. Identify high-quality inbound leads, escalate to General
6. Monitor GitHub issues for technical requests
7. Scan Reddit for organic discussions
8. Post daily alerts to opsbot (trending, viral moments, high-value leads)
9. Post weekly trends report to opsbot
10. Identify expansion opportunities (feature requests, new markets)

**Success Metrics:**
- HN submission ranking: Top 30 ✅
- GitHub stars: 200+ by end of Month 1 ✅
- npm downloads: 5k+ by end of Month 1 ✅
- High-quality inbound leads identified: 10+ ✅
- Feature requests captured: 20+ ✅
- Reddit engagement: 100+ upvotes ✅

---

## 📅 Execution Timeline

### Week 1: Setup & Phase 1 Kickoff

**Day 1:**
- [ ] Spin up Diplomat subagent (session 1)
- [ ] Spin up General subagent (session 1)
- [ ] Spin up Explore subagent (session 1)
- [ ] Configure opsbot #gtm-omnitax channel
- [ ] Brief all subagents on playbook

**Day 2–3:**
- [ ] **Diplomat:** Build government contact list (20–30 decision-makers)
- [ ] **General:** Build 100-prospect list (20 per tier)
- [ ] **General:** Generate email templates (5 personas)
- [ ] **Explore:** Set up monitoring (HN, Reddit, GitHub, npm)

**Day 4–5:**
- [ ] **General:** Send outreach batch 1 (50 emails)
- [ ] **General:** Monitor responses, track opens/clicks
- [ ] **Diplomat:** Send outreach to top 5–10 government contacts
- [ ] **Explore:** Report baseline metrics to opsbot

**Day 6–7:**
- [ ] **General:** Book first 5–8 discovery calls
- [ ] **Diplomat:** Follow up on government outreach
- [ ] **Explore:** Report Week 1 summary to opsbot
- [ ] **All:** Team sync + adjust strategy (if needed)

**Phase 1 Gate Criteria:**
- ✅ 50+ outreach emails sent
- ✅ 10–15 responses received
- ✅ 5–8 calls booked
- ✅ 0 blockers
- **Notification:** "Phase 1 PASS → Moving to Phase 2"

---

### Week 2: Phase 1 Continuation → Phase 2 Prep

**Days 1–3:**
- [ ] **General:** Conduct 3–5 first discovery calls
- [ ] **General:** Send outreach batch 2 (50 emails)
- [ ] **Diplomat:** Manage government conversations
- [ ] **General:** Gather technical requirements from calls
- [ ] **Explore:** Monitor response rates, escalate high-quality leads

**Days 4–7:**
- [ ] **General:** Book next 5–8 discovery calls
- [ ] **General:** Prep Phase 2 launch assets (Dev.to, HN, Twitter, Reddit)
- [ ] **Diplomat:** Prep partnership agreements
- [ ] **Explore:** Set up real-time HackerNews tracking
- [ ] **All:** Phase 2 launch prep meeting

**Phase 2 Gate Criteria:**
- ✅ 100+ outreach emails sent (2 batches)
- ✅ 15–20 total responses
- ✅ 8–12 calls booked
- ✅ 3–5 qualified leads identified
- ✅ Launch campaign assets ready
- **Notification:** "Phase 2 GO → Launch campaign live"

---

### Week 3: Phase 2 Launch Campaign

**Days 1–2:**
- [ ] **General:** Post Dev.to article
- [ ] **General:** Submit HackerNews (optimal timing)
- [ ] **General:** Post Twitter thread (3 tweets)
- [ ] **General:** Post Reddit r/javascript
- [ ] **Explore:** Monitor inbound from all channels

**Days 3–5:**
- [ ] **General:** Conduct 3–5 more discovery calls
- [ ] **General:** Respond to inbound inquiries (<2 hour SLA)
- [ ] **Explore:** Real-time HN ranking tracking
- [ ] **Explore:** Flag viral moments
- [ ] **General:** Book POC calls with qualified inbound

**Days 6–7:**
- [ ] **Explore:** Weekly report (stars, downloads, engagement, viral status)
- [ ] **General:** Weekly metrics (responses, conversions, POC count)
- [ ] **Diplomat:** Weekly partnership status
- [ ] **All:** Phase 2 retrospective + Phase 3 prep

**Phase 2 Gate Criteria:**
- ✅ Launch campaign live (5 channels)
- ✅ GitHub stars: +100–200 (cumulative ~250)
- ✅ npm downloads: 2k–5k (cumulative ~5–7k)
- ✅ HackerNews: Top 20–50 (target)
- ✅ Reddit engagement: 50+ upvotes (target)
- ✅ Inbound inquiries: 20–30
- ✅ Qualified inbound: 5–10
- **Notification:** "Phase 2 SUCCESS → Viral moment detected" or "Adjust strategy"

---

### Week 4–5: Phase 3 Discovery & POC

**Diplomat Tasks:**
- [ ] Manage government discovery calls (2–3)
- [ ] Negotiate pilot scope + terms (1–2 pilots)
- [ ] Create pilot project plans
- [ ] Escalate commercial blockers

**General Tasks:**
- [ ] Conduct 8–12 discovery calls (total across 2 weeks)
- [ ] Identify 2–3 POC candidates
- [ ] Send POC credentials + integration guide
- [ ] Schedule 1-hour integration calls
- [ ] Gather technical requirements
- [ ] Track POC progress

**Explore Tasks:**
- [ ] Monitor GitHub issues from POC customers
- [ ] Identify feature requests / edge cases
- [ ] Track technical performance
- [ ] Surface blockers

**Phase 3 Gate Criteria:**
- ✅ 8–12 discovery calls completed
- ✅ 2–3 POCs started
- ✅ 1–2 pilots signed (non-binding)
- ✅ Integration blockers: 0 critical
- **Notification:** "Phase 3 ON TRACK → First deal coming"

---

### Week 6–8: Phase 4 Pilot to Production

**Diplomat Tasks:**
- [ ] Weekly check-ins with pilots (1 per week)
- [ ] Negotiate production contract terms (1–2)
- [ ] Finalize SLAs + support terms
- [ ] Prepare first production deal closing

**General Tasks:**
- [ ] POC weekly progress updates
- [ ] Gather success metrics + learnings
- [ ] Prepare case study (1 customer)
- [ ] Prepare production contracts

**Explore Tasks:**
- [ ] Monitor production performance
- [ ] Track customer satisfaction
- [ ] Identify expansion opportunities

**Phase 4 Gate Criteria:**
- ✅ 2–3 pilots completed
- ✅ Pilot success rate: 80–100%
- ✅ First customer acquired: 1
- ✅ First deal closed: $40k–$100k
- ✅ Case study published: 1
- ✅ ARR: $40k–$100k
- **Notification:** "🎉 FIRST CUSTOMER ACQUIRED!"

---

### Week 9–12: Scale & Momentum

**All Subagents:**
- [ ] Continue executing pipeline (discovery → POC → production)
- [ ] Target: 2–3 additional customers
- [ ] Nurture inbound from organic channels
- [ ] Publish 2–3 case studies
- [ ] Plan Month 2 expansion

**Phase 4+ Gate Criteria:**
- ✅ Customers: 1–3
- ✅ ARR: $100k–$300k
- ✅ GitHub stars: 250–500
- ✅ npm downloads: 10k+
- ✅ Case studies: 2–3
- **Notification:** "Month 1 GTM COMPLETE → Month 2 planning"

---

## 📊 OpsBot Notification Schedule

### Daily (All Week)
- **Time:** 9am UTC
- **Source:** General + Explore
- **Content:**
  - Inbound inquiries received (count + quality)
  - Calls booked / completed (count)
  - Launch campaign metrics (if live)
  - Metric changes (stars, downloads)

### Weekly (Friday 5pm UTC)
- **Time:** Friday 5pm UTC
- **Source:** Diplomat + General + Explore
- **Content:**
  - Phase progress (gate status)
  - Weekly metrics summary
  - Active pipeline (count by stage)
  - Top blockers (if any)
  - Next week priorities

### Real-Time (Ad-hoc)
- **Trigger:** Milestone reached, blocker detected, viral moment, decision needed
- **Source:** Any subagent
- **Content:** Alert + context + action needed

---

## 🎯 Subagent Input/Output Template

### Session 1: Diplomat (Week 1)

**Input:**
```
[TASK] Build government contact list

You have 2 days to identify 20–30 decision-makers (CTO, Chief Architect, 
Compliance Officer) at:
1. Tunisia (DGI / Tunisie TradeNet)
2. Saudi Arabia (ZATCA)
3. Egypt (ETA)
4. Italy (Agenzia delle Entrate)
5. EU (European Commission / Peppol Network)
6. 5–10 private e-invoice network operators (global)

For each contact:
- Name, title, email, LinkedIn
- Decision-making authority
- Likely pain point
- Recommended pitch approach
- Warm introduction (if exists)

Deliverable: CSV + annotated strategy doc
Timeline: 2 days
```

**Output:**
```
[DELIVERABLE] Government Contact List

contact_name,company,title,email,linkedin_url,pain_point,pitch_strategy,warm_intro
"Ahmed Hassan","DGI Tunisia","Chief Technology Officer","a.hassan@dgi.gov.tn","...",
"Need deterministic validator for TTN","Show TEIF simulator offline","Via [Person]"
...
[20–30 rows]

STRATEGY NOTES:
- Tunisia: Emphasize local + regulatory alignment
- Saudi: Emphasize Phase 2 compliance
- Egypt: Emphasize fast adoption (e-invoicing mandate new)
- Italy: Emphasize reference implementation for vendors
- EU: Emphasize Peppol cross-border capabilities
```

**OpsBot Notification:**
```
✅ DIPLOMAT TASK COMPLETE: Government Contact List
├─ Contacts identified: 28 ✅
├─ Quality: High (CTO/CIO/Compliance)
├─ Warm intros available: 3 ✅
├─ Next: Send outreach batch 1 (10 top contacts)
└─ Owner: Diplomat
```

---

### Session 1: General (Week 1)

**Input:**
```
[TASK] Build 100-prospect master list + outreach templates

Prospect targets:
- 20 government/authority (primary decision-makers)
- 30 Odoo integrators (Italy, Tunisia, EU)
- 25 regional accounting SaaS (Tunisia, Egypt, Saudi)
- 15 enterprise B2B (e-commerce, fintech, logistics)
- 10 AI agent platforms (Claude MCP, Cursor, LangChain)

For each prospect:
- Name, company, title, email, LinkedIn
- Customer tier (1–5)
- Pain point + pitch
- Best outreach channel
- Email template customization

Generate 5 persona-specific email templates (cold outreach)

Deliverable: CSV + 5 email templates
Timeline: 2 days
```

**Output:**
```
[DELIVERABLE] 100-Prospect Master List + Email Templates

prospect_name,company,title,email,tier,pain_point,pitch,template_id
"Luigi Rossi","Odoo Italia SRL","Partner Manager","luigi@odooitalia.it",2,
"Need FatturaPA validator to sell to customers","Show FatturaPA + easy npm install","odoo_template"
...
[100 rows]

EMAIL TEMPLATES:

TEMPLATE 1: Government Authority
Subject: "Deterministic E-Invoice Validator Reference Implementation"
Body: [Personalized for government] ...

TEMPLATE 2: Odoo Integrator
Subject: "White-label FatturaPA validator for your customers"
Body: [Personalized for Odoo] ...

[... 3 more templates ...]
```

**OpsBot Notification:**
```
✅ GENERAL TASK COMPLETE: Prospect List + Templates
├─ Prospects built: 100 ✅
├─ Tier 1 (Government): 20
├─ Tier 2 (SaaS): 30
├─ Tier 3 (Enterprise): 25
├─ Tier 4 (AI Agents): 15
├─ Tier 5 (Dev/Other): 10
├─ Email templates: 5 ✅
├─ Next: Send outreach batch 1 (50 emails)
└─ Owner: General
```

---

### Session 1: Explore (Week 1)

**Input:**
```
[TASK] Set up monitoring + baseline metrics

Monitor channels:
- HackerNews (search: omnitax-engines)
- Reddit (r/javascript, r/FinTech, r/webdev)
- GitHub (elaka/omnitax-engines)
- npm (omnitax-engines package)
- LangChain Discord / agent communities

For each channel:
- Current baseline (stars, downloads, mentions)
- Set up alerts (new mentions, trending)
- Schedule daily checks
- Identify high-quality inbound leads

Deliverable: Monitoring dashboard + baseline report
Timeline: 1 day
```

**Output:**
```
[DELIVERABLE] Monitoring Setup + Baseline Metrics

CHANNEL BASELINE:
├─ GitHub stars: 15 (baseline)
├─ GitHub issues: 0 (baseline)
├─ npm downloads: ~50/day (baseline)
├─ HackerNews mentions: 0 (new product)
├─ Reddit mentions: 0 (baseline)
└─ LangChain Discord: 0 mentions (baseline)

MONITORING SETUP:
├─ HackerNews: Daily scrape for "omnitax-engines" ✅
├─ Reddit: Daily scrape (r/javascript, r/FinTech) ✅
├─ GitHub: Webhook for issues + discussions ✅
├─ npm: Daily download tracking ✅
├─ LangChain: Daily community search ✅

ALERT THRESHOLDS:
├─ HackerNews ranking: Alert if Top 30
├─ GitHub stars: Alert if +50/day
├─ npm downloads: Alert if >500/day
├─ Reddit engagement: Alert if >20 upvotes
├─ High-quality leads: Alert if found

NEXT: Wait for Phase 2 launch campaign (Week 3)
```

**OpsBot Notification:**
```
✅ EXPLORE TASK COMPLETE: Monitoring Setup
├─ Channels monitored: 5 ✅
├─ Baseline metrics recorded: ✅
├─ Daily reports enabled: ✅
├─ Alert thresholds set: ✅
├─ Next: Daily monitoring + Phase 2 campaign launch (Week 3)
└─ Owner: Explore
```

---

## 🚀 Ready to Execute

**Subagents:** 3 (Diplomat, General, Explore) — Ready to spin up  
**Channels:** OpsBot #gtm-omnitax — Live  
**Playbook:** Complete (GTM-AUTOMATION-PLAN.md)  
**Timeline:** Week 1 kickoff (NOW)  

**Action:** Spin up subagents, launch Phase 1, monitor opsbot for daily updates.

---

**Execute with confidence. First customer by Week 9–12. 🚀**
