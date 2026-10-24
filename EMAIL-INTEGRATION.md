# 📧 Email Integration — VATmesh SMTP for GTM Automation

**SMTP configuration for automated outreach via sales@vatmesh.com and support@vatmesh.com**

---

## 🔧 SMTP Configuration

### VATmesh Credentials Location
```
VPS Location: /vatmesh.com/
Contains:     SMTP credentials (env vars)
├─ SMTP_HOST
├─ SMTP_PORT
├─ SMTP_USER
├─ SMTP_PASS
├─ SMTP_FROM_SALES (sales@vatmesh.com)
└─ SMTP_FROM_SUPPORT (support@vatmesh.com)
```

### Load Environment Variables
```bash
# On VPS, load credentials:
source /vatmesh.com/.env

# Verify:
echo $SMTP_HOST
echo $SMTP_USER
echo $SMTP_FROM_SALES
```

---

## 📧 Email Sender Module

**Create: `omnitax-engines/lib/email-sender.js`**

```javascript
'use strict';

/**
 * Email Sender Module
 * Sends outreach emails via VATmesh SMTP (sales@ or support@)
 * 
 * Usage:
 *   const emailSender = require('./lib/email-sender');
 *   await emailSender.send({
 *     to: 'contact@company.com',
 *     subject: 'omnitax-engines Partnership',
 *     body: 'Hi [Name]...',
 *     fromType: 'sales' // or 'support'
 *   });
 */

const nodemailer = require('nodemailer');
const assert = require('assert');

// Load SMTP config from environment
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_SALES = process.env.SMTP_FROM_SALES || 'sales@vatmesh.com';
const SMTP_FROM_SUPPORT = process.env.SMTP_FROM_SUPPORT || 'support@vatmesh.com';

// Initialize transporter (lazy-loaded)
let transporter = null;

function initTransporter() {
  if (transporter) return transporter;
  
  assert(SMTP_HOST, 'SMTP_HOST env var required');
  assert(SMTP_USER, 'SMTP_USER env var required');
  assert(SMTP_PASS, 'SMTP_PASS env var required');
  
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    pool: {
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000, // 1 email per second rate limit
      rateLimit: true
    }
  });
  
  return transporter;
}

/**
 * Send an email
 * @param {Object} options
 *   - to: recipient email
 *   - subject: email subject
 *   - body: email body (HTML or plain text)
 *   - fromType: 'sales' or 'support'
 *   - cc: optional CC recipients
 *   - bcc: optional BCC (for tracking)
 *   - tags: optional array of tags (for segmentation)
 *   - trackingId: optional ID for tracking responses
 * @returns {Promise} nodemailer response
 */
async function send(options = {}) {
  const {
    to,
    subject,
    body,
    fromType = 'sales',
    cc,
    bcc,
    tags = [],
    trackingId
  } = options;
  
  assert(to, 'Email "to" is required');
  assert(subject, 'Email "subject" is required');
  assert(body, 'Email "body" is required');
  assert(['sales', 'support'].includes(fromType), 'fromType must be "sales" or "support"');
  
  const from = fromType === 'sales' ? SMTP_FROM_SALES : SMTP_FROM_SUPPORT;
  
  // Add tracking info to BCC if trackingId provided
  const finalBcc = bcc ? [bcc] : [];
  if (trackingId) {
    finalBcc.push(`tracking+${trackingId}@vatmesh.com`);
  }
  
  // Add tags as email headers
  const headers = {};
  if (tags.length > 0) {
    headers['X-Tags'] = tags.join(', ');
    headers['X-Campaign'] = 'omnitax-engines-gtm';
  }
  if (trackingId) {
    headers['X-Tracking-ID'] = trackingId;
  }
  
  const transporter = initTransporter();
  
  try {
    const info = await transporter.sendMail({
      from,
      to,
      cc,
      bcc: finalBcc.length > 0 ? finalBcc : undefined,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // strip HTML for plain text fallback
      headers
    });
    
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      timestamp: new Date().toISOString(),
      trackingId
    };
  } catch (err) {
    console.error('Email send error:', err.message);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      trackingId,
      to
    };
  }
}

/**
 * Send batch emails with rate limiting
 * @param {Array} emails - Array of email objects
 * @param {Number} delayMs - Delay between emails (default: 1000ms)
 * @returns {Promise} Array of send results
 */
async function sendBatch(emails = [], delayMs = 1000) {
  assert(Array.isArray(emails), 'emails must be an array');
  assert(delayMs > 0, 'delayMs must be > 0');
  
  const results = [];
  
  for (let i = 0; i < emails.length; i++) {
    const emailOptions = emails[i];
    
    try {
      const result = await send(emailOptions);
      results.push(result);
      
      // Rate limiting: wait before sending next email
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err) {
      results.push({
        success: false,
        error: err.message,
        email: emailOptions.to,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

/**
 * Verify SMTP connection
 * @returns {Promise} connection status
 */
async function verify() {
  try {
    const transporter = initTransporter();
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection verified',
      host: SMTP_HOST,
      user: SMTP_USER,
      from_sales: SMTP_FROM_SALES,
      from_support: SMTP_FROM_SUPPORT
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      host: SMTP_HOST,
      user: SMTP_USER
    };
  }
}

module.exports = {
  send,
  sendBatch,
  verify,
  
  // Config getters (for testing)
  getConfig: () => ({
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
    fromSales: SMTP_FROM_SALES,
    fromSupport: SMTP_FROM_SUPPORT
  })
};
```

---

## 🚀 Subagent Email Sending

### General Subagent — Email Sending Implementation

**Update SUBAGENT-ORCHESTRATION-SPEC.md Phase 1 for General:**

```javascript
// Within General subagent Phase 1:

const emailSender = require('./lib/email-sender');

// Verify SMTP first
const smtpStatus = await emailSender.verify();
if (!smtpStatus.success) {
  throw new Error(`SMTP verification failed: ${smtpStatus.error}`);
}
console.log('✅ SMTP verified:', smtpStatus);

// Prepare outreach batch 1 (50 emails)
const outreachBatch1 = [
  {
    to: 'ahmed.hassan@dgi.gov.tn',
    subject: 'omnitax-engines TEIF v1.8.8 Reference Validator',
    body: `Hi Ahmed,\n\n[Personalized message]`,
    fromType: 'sales',
    tags: ['outreach', 'tier-1', 'government', 'tunisia'],
    trackingId: 'dgi-tunisia-001'
  },
  // ... 49 more emails
];

// Send batch with 1 email/second rate limit
const results = await emailSender.sendBatch(outreachBatch1, 1000);

// Report to opsbot
const successCount = results.filter(r => r.success).length;
const failureCount = results.filter(r => !r.success).length;

console.log(`\n✅ OUTREACH BATCH 1 COMPLETE`);
console.log(`├─ Sent: ${successCount}/${results.length}`);
console.log(`├─ Failed: ${failureCount}`);
console.log(`├─ Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
console.log(`└─ Tracking IDs: [See logs for details]`);
```

---

## 📧 Email Templates

### Template 1: Government Authority (sales@vatmesh.com)

```html
<p>Hi [CONTACT_NAME],</p>

<p>We just released <strong>omnitax-engines v0.2.0</strong>, 
a deterministic e-invoicing engine with offline TEIF v1.8.8 validation 
for the Tunisian market.</p>

<p><strong>Why we're reaching out:</strong></p>
<ul>
  <li>TTN mandate requires reliable XML validation</li>
  <li>omnitax-engines validates TEIF offline, deterministically</li>
  <li>Zero SaaS dependency, zero vendor lock-in</li>
  <li>MIT licensed (free forever)</li>
</ul>

<p><strong>What we can offer [COUNTRY]:</strong></p>
<ul>
  <li>Reference implementation for vendor compliance testing</li>
  <li>White-label validator for your clearinghouse</li>
  <li>Sandbox simulator for testing (TTN/ZATCA/SdI)</li>
  <li>WORM audit chain (SHA-256 proof of sequence)</li>
</ul>

<p><strong>Quick demo:</strong></p>
<pre>
npm install omnitax-engines
node examples/api-server.js
curl http://localhost:3000/
</pre>

<p>Happy to show you a 15-min demo. Would next week work?</p>

<p>Best,<br>
[YOUR_NAME]<br>
VATmesh GTM Team<br>
sales@vatmesh.com</p>

<p><small>This is an automated outreach. 
<a href="https://github.com/elaka/omnitax-engines">View project</a></small></p>
```

### Template 2: Odoo Integrator (sales@vatmesh.com)

```html
<p>Hi [CONTACT_NAME],</p>

<p>I saw you're an Odoo integrator in [COUNTRY]. 
We built something that might save your customers hours: 
<strong>omnitax-engines</strong> — deterministic FatturaPA/TEIF/ZATCA validation.</p>

<p><strong>The problem:</strong></p>
<p>Most e-invoicing validators are black-box APIs. 
Yours don't work offline. Ours do.</p>

<p><strong>The solution:</strong></p>
<p>Instead of building validation from scratch, 
<code>npm install omnitax-engines</code> and embed it. 
White-label it as your own.</p>

<p><strong>Benefits for you:</strong></p>
<ul>
  <li>⏱️ 80% faster integration time</li>
  <li>💰 Higher margins (no vendor API fees)</li>
  <li>🔐 Offline-first (works without internet)</li>
  <li>📜 MIT licensed (no royalties)</li>
</ul>

<p><strong>Integration:</strong></p>
<pre>
npm install omnitax-engines
const { decimalMath, statutoryXml } = require('omnitax-engines');
// Done. Now you have validators for 4 countries.
</pre>

<p>Want to pilot this with 1–2 of your customers? 
Let's talk.</p>

<p>Best,<br>
[YOUR_NAME]<br>
VATmesh<br>
sales@vatmesh.com</p>
```

### Template 3: Regional SaaS (sales@vatmesh.com)

```html
<p>Hi [CONTACT_NAME],</p>

<p>Building multi-country invoicing compliance? 
We have a library for that: <strong>omnitax-engines</strong>.</p>

<p><strong>What it does:</strong></p>
<ul>
  <li>Exact BigInt money math (TND millime, EUR cents, etc.)</li>
  <li>XML validation (FatturaPA, TEIF, ZATCA, Peppol)</li>
  <li>Offline gateway simulation (SdI, TTN, ZATCA, ETA)</li>
  <li>WORM audit chain (tamper-proof ledger)</li>
</ul>

<p><strong>For your customers:</strong></p>
<ul>
  <li>Reduced compliance risk</li>
  <li>Faster invoicing (no gateway latency)</li>
  <li>Full audit trail (regulatory ready)</li>
</ul>

<p><strong>Cost:</strong> $[PRICE]/year (based on country + tier)</p>

<p><strong>Setup:</strong> 30 min integration</p>

<p>Interested in a POC? Let's set up a call.</p>

<p>Best,<br>
[YOUR_NAME]<br>
VATmesh<br>
sales@vatmesh.com</p>
```

---

## 🔍 Email Tracking & Response Handling

### Tracking Email Responses

**Each email includes:**
- `X-Tracking-ID` header (unique per prospect)
- BCC to `tracking+[ID]@vatmesh.com` (for logging)
- `X-Tags` header (for segmentation)

**Responses flow to:**
- `sales@vatmesh.com` (primary inbox)
- Auto-forward to CRM or issue tracker (configure in email filter)

### Response SLA (General Subagent)

```javascript
// Monitor responses (async, continuous)
async function monitorResponses() {
  // Check sales@vatmesh.com for inbound
  // Track: Who responded? Within how long? Quality of response?
  
  const response = {
    fromEmail: 'contact@company.com',
    subject: 'RE: omnitax-engines Partnership',
    timestamp: new Date(),
    quality: 'high', // auto-score based on keywords
    trackingId: 'dgi-tunisia-001', // matched to original email
    action: 'Book discovery call'
  };
  
  // Escalate to Diplomat if high-quality (gov/Tier 1)
  if (response.quality === 'high' && tier <= 2) {
    diplomat.escalate(response);
  }
  
  // Reply automatically to all (with personalization)
  await reply(response, {
    template: 'quick-response',
    cta: 'Book a 15-min demo'
  });
}
```

---

## 📊 Monitoring & Reporting

### Daily Email Metrics (to opsbot #gtm-omnitax)

```
📧 EMAIL METRICS — Day 3
├─ Emails sent today: 15
├─ Delivery rate: 100% (no bounces)
├─ Open rate: 22% (3/15)
├─ Response rate: 13% (2/15)
├─ Responses:
│  ├─ [Company 1] — Interested (Tier 1)
│  ├─ [Company 2] — "Tell me more" (Tier 2)
│  └─ [Bounce] — Invalid email (removed from list)
├─ Next action: Reply to all responses
└─ Discovery calls booked: 1 (from [Company 1])
```

### Weekly Email Summary (to opsbot)

```
📧 WEEKLY EMAIL REPORT — Week 1
├─ Total sent: 50
├─ Delivery: 49/50 (98%)
├─ Opens: 11 (22%)
├─ Responses: 8 (16%)
├─ Discovery calls booked: 6 / 8 target
├─ Response quality:
│  ├─ 🔴 Low: 2 (generic "thanks")
│  ├─ 🟡 Medium: 3 ("tell me more")
│  └─ 🟢 High: 3 (gov/Tier 1 interest)
├─ Bounces: 1 (invalid email)
├─ Spam complaints: 0
└─ Next batch: 50 emails ready (Week 2)
```

---

## ✅ Setup Checklist

**Before GTM Launch:**

- [ ] Verify SMTP creds in `/vatmesh.com/.env`
- [ ] Load env vars: `source /vatmesh.com/.env`
- [ ] Install nodemailer: `npm install nodemailer`
- [ ] Create `lib/email-sender.js` in omnitax-engines
- [ ] Run SMTP verification: `node -e "require('./lib/email-sender').verify()"`
- [ ] Set up email forwarding (sales@ → CRM)
- [ ] Set up auto-reply (for tracking bounces)
- [ ] Brief General subagent on email sending
- [ ] Test with 1–2 emails before batch send
- [ ] Prepare email templates (Tier 1–5)

---

## 🚀 Integration with GTM Automation

### Phase 1 Week 1 (Updated)

**General Subagent:**
1. Load SMTP config from env
2. Verify connection (✅ must pass)
3. Build 100-prospect list
4. Generate 5 email templates (personalizable)
5. **Send outreach batch 1 (50 emails via sales@vatmesh.com)**
6. Track metrics (delivery, opens, responses)
7. Post daily to opsbot
8. Reply to all responses (<2 hr SLA)
9. Escalate high-quality leads to Diplomat

**Diplomat Subagent:**
1. Receive hot leads from General (gov/Tier 1)
2. Reply with custom pitch (from sales@vatmesh.com)
3. Schedule discovery calls
4. Negotiate terms

---

## 📝 Email Sending Best Practices

```
✅ DO:
├─ Personalize each email (use [CONTACT_NAME], [COMPANY], [PAIN_POINT])
├─ Include trackingId (for follow-up)
├─ Rate limit: 1 email/second (avoid spam filters)
├─ Use sales@ for business pitches
├─ Use support@ for technical support/follow-ups
├─ Include clear CTA ("Book a 15-min demo")
├─ Keep subject line <50 chars
├─ Keep body <500 words
└─ Always include unsubscribe (legal requirement)

❌ DON'T:
├─ Send >100 emails in 1 hour (spam trigger)
├─ Use generic templates (no [COMPANY] personalization)
├─ Forget tracking IDs (can't follow up)
├─ Send from unknown sender
├─ Send duplicate emails to same contact
├─ Use clickbait subject lines
├─ Over-sell (be professional)
└─ Forget BCC for internal logging
```

---

**Ready to send. Subagents can now execute email-based GTM. 🚀**
