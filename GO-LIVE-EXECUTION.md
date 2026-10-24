# 🚀 omnitax-engines v0.2.0 — Automated GTM Go-Live

**Complete automated execution plan with subagent coordination**

---

## ✅ Pre-Flight Checklist

**omnitax-engines v0.2.0 Status:**
- ✅ Published to npm (v0.2.0 live)
- ✅ Tagged on GitHub (v0.2.0 release tag)
- ✅ HTTP API ready (examples/api-server.js)
- ✅ Docker deployed (Dockerfile + docker-compose.yml)
- ✅ Documentation complete (DEPLOY.md, LICENSING.md, README)
- ✅ Launch campaign ready (LAUNCH-CAMPAIGN.md)
- ✅ Customer analysis complete (CUSTOMER-ANALYSIS.md, SALES-PLAYBOOK.md)
- ✅ GTM automation plan (GTM-AUTOMATION-PLAN.md)
- ✅ Subagent orchestration spec (SUBAGENT-ORCHESTRATION-SPEC.md)

**OpsBot Setup:**
- [ ] Create #gtm-omnitax channel (notifications only)
- [ ] Configure opsbot webhook for GitHub
- [ ] Test notification pipeline

**Subagent Setup:**
- [ ] Diplomat subagent session ready (gov partnerships)
- [ ] General subagent session ready (customer acquisition)
- [ ] Explore subagent session ready (market intelligence)

---

## 🎯 The Plan (In 30 Seconds)

```
WEEK 1: Build lists + send first outreach
├─ Diplomat: Identify 20–30 government contacts
├─ General: Build 100-prospect list + send 50 emails
├─ Explore: Set up monitoring (baseline metrics)
└─ Target: 5–8 calls booked

WEEK 2–3: Phase 2 launch campaign
├─ General: Post Dev.to, HackerNews, Twitter, Reddit
├─ Explore: Monitor viral moments
├─ General: Respond to all inbound (<2 hour SLA)
└─ Target: 200+ GitHub stars, 5k+ npm downloads, 20–30 inbound leads

WEEK 4–5: Discovery calls + POC starts
├─ General: Conduct 8–12 discovery calls
├─ General: Send POC credentials to 2–3 qualified prospects
├─ Diplomat: Negotiate pilot terms
└─ Target: 2–3 POCs started, 1–2 pilots signed

WEEK 6–12: Pilots to production
├─ Diplomat: Close first production contracts
├─ General: Weekly check-ins, case studies
├─ Explore: Monitor performance + identify expansion
└─ Target: First customer acquired ($40k–$100k), then 2–3 more

RESULT: Month 1 ARR $40k–$100k → Month 3 ARR $300k–$500k → Month 12 ARR $1M–$1.5M
```

---

## 🤖 Subagent Execution Script

### Step 1: Spin Up Diplomat (Strategic Partnerships)

```
SUBAGENT: diplomat
DESCRIPTION: Government partnerships & tactical negotiations
PROMPT:

You are the Diplomat subagent for omnitax-engines go-to-market.

Mission: Identify 20–30 decision-makers at government tax authorities 
and e-invoice networks, build relationships, pitch omnitax-engines, 
and drive toward first government partnership ($50k–$500k deal).

Phase 1 (Days 1–7):
1. Identify decision-makers (CTO/Chief Architect/Compliance Officer) at:
   - Tunisia: DGI + Tunisie TradeNet (TTN) operators
   - Saudi Arabia: ZATCA (Technical Compliance Division)
   - Egypt: ETA (E-Invoicing Department)
   - Italy: Agenzia delle Entrate (Technical Infrastructure)
   - EU: European Commission, Peppol Network, national clearinghouses
   - Private: 5–10 e-invoice network operators globally

2. For each contact: Name, title, email, LinkedIn, pain point, pitch approach

3. Deliverable: CSV list (28–30 contacts) + annotated strategy doc

Output Format:
- CSV: contact_name, company, title, email, pain_point, pitch, warm_intro_contact
- Markdown: "DIPLOMAT-PHASE-1-CONTACTS-[DATE].md" with strategy notes per government

Constraints:
- Verify all contacts are verified (no guessing emails)
- Prioritize warm intros (find internal contacts first)
- Flag all commercial terms for human review
- Report blockers within 24 hours

Escalation:
- Commercial terms → Human operator
- Legal/compliance questions → Human operator
- Decision delays → Human operator

Next: "Diplomat Phase 1 COMPLETE" → Hand off to General for outreach

Timeline: 2 days (by EOD Day 3)
```

**Expected Output:**
- CSV of 28–30 government/network contacts
- Strategy guide per government (pitch, pain point, warm intro)
- Top 5–10 priority contacts (immediate outreach)

**OpsBot Notification (Auto):**
```
✅ DIPLOMAT PHASE 1 COMPLETE
├─ Contacts identified: 28 ✅
├─ Quality: CTO/CIO/Compliance level ✅
├─ Warm intros: 3–5 available ✅
├─ Ready for Phase 2 outreach
└─ Next: General sends first batch
```

---

### Step 2: Spin Up General (Customer Acquisition)

```
SUBAGENT: general
DESCRIPTION: Multi-channel customer acquisition execution
PROMPT:

You are the General subagent for omnitax-engines GTM.

Mission: Execute customer acquisition across 5 tiers (gov, SaaS, enterprise, 
AI agents, startups), manage inbound, and drive pipeline toward first 
production customer ($40k–$100k deal) by Week 9–12.

Phase 1 (Days 1–7):
1. Build 100-prospect master list (20 per tier):
   - Tier 1 (20): Government/TTN operators (Diplomat will provide)
   - Tier 2 (30): Odoo integrators (Italy, Tunisia, EU)
   - Tier 3 (25): Regional accounting SaaS (Tunisia, Egypt, Saudi, EU)
   - Tier 4 (15): Enterprise B2B (fintech, e-commerce, logistics)
   - Tier 5 (10): AI agent platforms + developer communities

2. For each prospect: name, company, title, email, tier, pain point, pitch approach

3. Generate 5 persona-specific cold outreach email templates:
   - Template 1: Government authority (regulatory angle)
   - Template 2: Odoo integrator (business angle)
   - Template 3: Regional SaaS (compliance angle)
   - Template 4: Enterprise B2B (technical angle)
   - Template 5: AI agent / developer (innovation angle)

4. Deliverable: CSV + 5 email templates (.md files)

Output Format:
- CSV: prospect_name, company, tier, title, email, pain_point, template_id
- Emails: OUTREACH-TEMPLATE-[TIER].md (personalization guide included)

Phase 2 (Days 3–7):
1. Send outreach batch 1: 50 emails (mix of tiers, prioritize Tier 1 + Tier 2)
2. Track metrics: sends, opens, clicks, bounces
3. Deliver daily metrics to opsbot #gtm-omnitax
4. Escalate high-quality responses to Diplomat (gov contacts)

Constraints:
- All emails personalized (no mass mail templates)
- Commercial discussions escalate to Diplomat
- Response SLA: <2 hours for inbound (Phase 2 onwards)
- Do not commit to features/pricing

Deliverables:
- Day 3: 100-prospect CSV + 5 email templates
- Day 7: Outreach batch 1 complete (50 emails) + send summary

Escalation:
- Government contacts → Diplomat (for negotiation)
- High-quality leads (Tier 1–2) → Diplomat for handoff
- Technical questions → Escalate to Explore
- Commercial terms → Human operator

Next: "General Phase 1 COMPLETE" → Week 2 discovery call prep

Timeline: 7 days (by EOD Week 1)
```

**Expected Output:**
- CSV of 100 prospects (20 per tier)
- 5 email templates (persona-specific)
- Outreach batch 1 sent (50 emails)
- Daily metrics to opsbot

**OpsBot Notification (Auto):**
```
✅ GENERAL PHASE 1 COMPLETE
├─ Prospect list: 100 built ✅
├─ Email templates: 5 ✅
├─ Outreach batch 1: 50 sent ✅
├─ Expected responses: 10–15 (20–30% rate)
└─ Next: Monitor responses, book discovery calls
```

---

### Step 3: Spin Up Explore (Market Intelligence)

```
SUBAGENT: explore
DESCRIPTION: Market monitoring & organic lead generation
PROMPT:

You are the Explore subagent for omnitax-engines GTM.

Mission: Monitor social/technical channels, identify organic inbound interest, 
track metrics, and surface high-quality opportunities to the team.

Phase 1 (Days 1–7):
1. Set up monitoring across 5 channels:
   - HackerNews: Search "omnitax-engines" (daily check)
   - Reddit: r/javascript, r/FinTech, r/webdev (daily check)
   - GitHub: elaka/omnitax-engines (webhook: issues, discussions, stars)
   - npm: omnitax-engines package (daily downloads check)
   - LangChain: Discord / agent communities (daily mention search)

2. Record baseline metrics (Week 1):
   - GitHub stars: ___ (current)
   - GitHub issues: ___ (current)
   - npm downloads/day: ___ (current)
   - HackerNews mentions: ___ (baseline)
   - Reddit mentions: ___ (baseline)

3. Set up alert thresholds:
   - HN ranking: Alert if Top 30
   - GitHub stars: Alert if +50/day (spike detection)
   - npm downloads: Alert if >500/day (spike detection)
   - Reddit engagement: Alert if >20 upvotes
   - High-quality leads: Alert if "use case" mentioned

4. Deliverable: Monitoring setup doc + baseline metrics + alert thresholds

Output Format:
- Markdown: "EXPLORE-MONITORING-SETUP-[DATE].md" with all monitoring details
- Daily metrics report (template)
- Alert thresholds doc

Phase 2 (Weeks 3–4): Launch Campaign Monitoring
1. Monitor Phase 2 launch (Dev.to, HN, Twitter, Reddit submissions)
2. Track real-time HackerNews ranking
3. Alert on viral moments (HN #1–#10, Reddit >100 upvotes)
4. Identify high-quality inbound leads
5. Post daily alerts to opsbot #gtm-omnitax

Constraints:
- Do not respond to comments (General handles)
- Do not engage in debates
- Report discoveries via opsbot only
- Flag viral moments immediately

Deliverables:
- Day 3: Monitoring setup + baseline metrics
- Week 3+: Daily alerts + weekly trends report

Escalation:
- High-quality leads → General (for response)
- Technical issues / feature requests → Explore analysis, then escalate
- Viral moments (HN Top 10) → Human operator + General

Next: "Explore Phase 1 COMPLETE" → Wait for Phase 2 launch (Week 3)

Timeline: 3 days (by EOD Day 5)
```

**Expected Output:**
- Monitoring setup documentation
- Baseline metrics recorded
- Alert thresholds configured
- Daily monitoring activated

**OpsBot Notification (Auto):**
```
✅ EXPLORE PHASE 1 COMPLETE
├─ Monitoring channels: 5 ✅
├─ Baseline metrics: Recorded ✅
├─ Alert thresholds: Set ✅
├─ Daily reports: Enabled ✅
└─ Next: Phase 2 campaign launch (Week 3) monitoring
```

---

## 📊 Weekly Metrics Dashboard

**Week 1 Targets:**
```
OUTREACH:
├─ Emails sent: 50 ✅
├─ Response rate: 20–30% (10–15 responses) 
├─ Calls booked: 5–8 ✅

ORGANIC:
├─ GitHub stars: +15–20 (baseline growth)
├─ npm downloads: +100–150 (baseline)
├─ HN mentions: 0–1 (pre-campaign)
├─ Reddit mentions: 0–2 (pre-campaign)

PIPELINE:
├─ Discovery calls: 5–8 scheduled ✅
├─ POCs: 0 active
├─ Pilots: 0 signed
├─ Revenue: $0 (Phase 1)

GATE: ✅ PASS → Phase 2 GO
```

**Week 3 Targets (Post-Launch Campaign):**
```
LAUNCH CAMPAIGN:
├─ Dev.to: Published ✅
├─ HN: Submitted ✅ (target Top 20–50)
├─ Twitter: Threads posted ✅
├─ Reddit: Posted ✅ (target 50–100 upvotes)
├─ Email: Sent to newsletters ✅

METRICS:
├─ GitHub stars: +100–150 (cumulative ~200)
├─ npm downloads: +2k–5k (cumulative ~5–7k)
├─ HN ranking: TBD (day of submission)
├─ Reddit engagement: 50–100 upvotes (target)
├─ Inbound inquiries: 20–30

PIPELINE:
├─ Total contacts: 100+ (outreach + inbound)
├─ Calls scheduled: 10–15
├─ Calls completed: 3–5
├─ POC candidates: 2–3
├─ Revenue: $0 (still Phase 2)

GATE: ✅ PASS → Phase 3 GO (if metrics hit)
```

---

## 🚀 Execution Checklist

**This Week (Weeks 1–2):**

- [ ] Set up OpsBot #gtm-omnitax channel
- [ ] Spin up Diplomat subagent (Phase 1)
  - Delivers: 28–30 government contacts CSV + strategy
  - Timeline: 2 days
  - OpsBot notification: When COMPLETE
  
- [ ] Spin up General subagent (Phase 1)
  - Delivers: 100-prospect CSV + 5 email templates + 50 outreach emails sent
  - Timeline: 7 days
  - OpsBot notification: Daily (responses, metrics)
  
- [ ] Spin up Explore subagent (Phase 1)
  - Delivers: Monitoring setup + baseline metrics + alert thresholds
  - Timeline: 3 days
  - OpsBot notification: When COMPLETE

**Week 1 Milestones:**
- [ ] Day 2: Diplomat delivers contacts list
- [ ] Day 3: General starts building prospect list
- [ ] Day 5: Explore monitoring live
- [ ] Day 7: General sends 50 outreach emails
- [ ] Day 7: Team sync + review Week 1 metrics

**Week 2 Milestones:**
- [ ] General sends 50 more outreach emails (batch 2)
- [ ] General books 8–12 discovery calls
- [ ] General prepares Phase 2 launch assets (Dev.to, HN, Twitter, Reddit)
- [ ] Diplomat follows up with top government contacts
- [ ] Team sync + Phase 2 launch prep

**Week 3 (Phase 2 Launch):**
- [ ] General posts Dev.to article
- [ ] General submits HackerNews
- [ ] General posts Twitter + Reddit
- [ ] Explore monitors real-time
- [ ] General responds to all inbound (<2 hour SLA)

---

## 📞 OpsBot Notification Examples

### Daily (General's Response Metrics)

```
📈 DAILY GTM METRICS — Day 3 of Week 1
├─ Outreach emails sent today: 15
├─ Responses received: 3 (20% rate)
├─ Calls booked today: 1
├─ Total calls booked: 6/8 target
├─ High-quality leads: 2
└─ Next action: Send batch 2 (50 emails) by EOD Week 1
```

### Weekly (Diplomat's Partnership Status)

```
📊 WEEKLY PARTNERSHIP STATUS — Week 1
├─ Government contacts identified: 28 ✅
├─ Top 5 contacts: Ready for outreach
├─ Warm intros available: 3
├─ Next: Outreach to top 10 (General handle)
└─ Strategic note: TTN (Tunisia) is hottest lead
```

### Weekly (Explore's Metrics Report)

```
📊 WEEKLY METRICS REPORT — Week 1
├─ GitHub stars: +18 (baseline: 15)
├─ npm downloads: 850 (baseline: 50/day)
├─ HN mentions: 0 (pre-campaign baseline)
├─ Reddit mentions: 1 (generic mention)
└─ Status: Normal baseline growth (no viral yet)
```

### Real-Time (Viral Moment Alert)

```
🔥 VIRAL MOMENT DETECTED!
├─ Channel: HackerNews
├─ Ranking: #8 (peak)
├─ Upvotes: 432
├─ Comments: 87 (mostly positive)
├─ Momentum: ↑ Still rising
├─ Action: General respond to all HN comments (real-time)
├─ Duration: ~6 hours peak (typically)
└─ Owner: Explore (monitor) + General (respond)
```

### Milestone (First Customer)

```
🎉 MILESTONE REACHED: FIRST CUSTOMER ACQUIRED!
├─ Customer: [Company Name] (Tier 1 / Gov)
├─ Deal value: $[Amount]
├─ Signed date: [Date]
├─ Start date: [Date]
├─ Pilot duration: [X days]
├─ Success rate: 100% ✅
├─ Case study: In progress
├─ Impact: $[Amount] ARR added
├─ Next: Case study publish + add to GitHub README
└─ Owner: General (case study) + Diplomat (customer relationship)
```

---

## 🎯 Success Criteria (Month 1)

**Phase 1–4 Completion:**
- ✅ Week 1: 50+ outreach emails sent, 5–8 calls booked
- ✅ Week 3: Launch campaign live, 200+ GitHub stars, 5k+ npm downloads
- ✅ Week 5–8: 8–12 discovery calls, 2–3 POCs started
- ✅ Week 9–12: First customer acquired, $40k–$100k ARR

**OpsBot Notification on Success:**
```
✅ MONTH 1 GTM COMPLETE
├─ Outreach: 100+ emails sent ✅
├─ Calls booked: 10–15 ✅
├─ Discovery completed: 8–12 ✅
├─ POCs: 2–3 active ✅
├─ First customer: 1 acquired ✅
├─ Month 1 ARR: $40k–$100k ✅
└─ Status: ON TRACK for $1M/year target
```

---

## 🚀 Ready to Launch

**All pieces in place:**
- ✅ omnitax-engines v0.2.0 live on npm + GitHub
- ✅ Customer analysis + sales playbook
- ✅ GTM automation plan
- ✅ Subagent orchestration spec
- ✅ OpsBot notifications ready

**Next action:** Spin up subagents + launch Phase 1

**Timeline:** Week 1 start (NOW)

**Expected outcome:** First customer by Week 9–12, $1M ARR by Month 12

---

**Execute with confidence. Ship the future. 🚀**
