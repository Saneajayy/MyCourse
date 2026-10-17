# Email Infrastructure & System Notifications Specification

This document details the production email architecture, provider selection, DNS configuration, delivery pipeline, suppression management, and spam prevention implemented for the Hydraulic Engineering course platform.

---

## 1. Provider Recommendation & Evaluation (Step 0)

### Comparison: Resend vs. Amazon Simple Email Service (SES)

| Criterion                       | Resend (Recommended & Implemented)                                                                                              | Amazon SES                                                                                                                                                         |
| :------------------------------ | :------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Account Approval (India)**    | **Instant access**. Production API keys ready immediately upon account creation.                                                | **Manual human review bottleneck**. AWS India accounts routinely face multi-day delays or sandbox exit denials for educational/e-commerce platforms.               |
| **Developer Experience (DX)**   | First-class modern TypeScript SDK, clean REST API, intuitive dashboard with instant payload/header inspection.                  | Legacy AWS SDK with verbose XML-style error structures and cumbersome configuration set workflows.                                                                 |
| **Bounce & Complaint Webhooks** | **Native Svix webhooks** out-of-the-box with cryptographic HMAC signature verification and automatic retry.                     | Requires setting up Amazon SNS Topics, SNS Subscriptions, IAM policies, and custom webhook parsers just to capture bounces.                                        |
| **Sandbox Testing**             | Provides default verified sender `onboarding@resend.dev` allowing immediate end-to-end testing before domain verification.      | Requires manual email verification for every single test recipient address while in sandbox.                                                                       |
| **Pricing**                     | Generous free tier (3,000 emails/month, 100 emails/day), followed by predictable flat monthly tiers ($20/mo for 50,000 emails). | Pay-as-you-go ($0.10 per 1,000 emails) + SNS data egress fees. Cheaper at massive scale (>100k/mo), but overhead in setup and maintenance is significantly higher. |
| **Deliverability & Reputation** | Managed dedicated IPs, automated feedback loops, and pre-warmed shared pools with strict anti-spam enforcement.                 | Shared pools frequently have lower baseline reputation; requires purchasing dedicated IPs ($24.95/mo each) for consistent inboxing.                                |

### Final Recommendation

**Resend** is selected as the primary transactional email provider. For local development and CI testing, the application falls back safely to `ConsoleEmailProvider` when `RESEND_API_KEY` is omitted or unconfigured.

---

## 2. Production DNS Configuration Step-by-Step

To achieve 10/10 deliverability scores, pass SPF/DKIM/DMARC checks across Gmail, Outlook, Yahoo, and corporate firewalls, and prevent phishing or domain spoofing, the following DNS records must be configured on your DNS provider (e.g. Cloudflare, Route53, Namecheap).

### 2.1 Sending Domain Recommendation

Use a dedicated sending subdomain to protect the reputation of your root apex domain:

- **Sending Domain:** `mail.hydrauliccourse.com` (or root `hydrauliccourse.com`)
- **Sender From Address:** `Hydraulic Academy <support@hydrauliccourse.com>` or `noreply@mail.hydrauliccourse.com`

### 2.2 DNS Records Specification

| Type      | Host / Name                              | Value / Target                                                                                      | Priority / TTL | Purpose                                                                                                       |
| :-------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------- | :------------- | :------------------------------------------------------------------------------------------------------------ |
| **TXT**   | `mail.hydrauliccourse.com`               | `v=spf1 include:resend.com ~all`                                                                    | Auto / 3600    | **SPF (Sender Policy Framework)**: Authorizes Resend IP addresses to deliver emails on behalf of this domain. |
| **MX**    | `feedback.mail.hydrauliccourse.com`      | `feedback-smtp.resend.com`                                                                          | 10             | **Custom Return-Path**: Directs bounce notifications back to Resend infrastructure for processing.            |
| **CNAME** | `resend._domainkey.hydrauliccourse.com`  | `dkim.resend.com.`                                                                                  | Auto / 3600    | **DKIM Record 1**: Cryptographic public key for authenticating outbound message headers.                      |
| **CNAME** | `resend2._domainkey.hydrauliccourse.com` | `dkim2.resend.com.`                                                                                 | Auto / 3600    | **DKIM Record 2**: Secondary DKIM key for automated key rotation without delivery interruptions.              |
| **TXT**   | `_dmarc.hydrauliccourse.com`             | `v=DMARC1; p=none; rua=mailto:dmarc-reports@hydrauliccourse.com; pct=100; sp=none; aspf=r; adkim=r` | Auto / 3600    | **DMARC Record**: Establishes domain alignment policies and reporting mailboxes.                              |

### 2.3 DMARC Policy Ramp-Up Roadmap

1. **Phase 1: Monitoring (`p=none`)**
   Deploy with `p=none` for 14–30 days. Inbound mail is delivered normally while aggregate XML reports are sent to `dmarc-reports@hydrauliccourse.com` to identify legitimate sending sources.
2. **Phase 2: Quarantine (`p=quarantine; pct=25` to `pct=100`)**
   Move unauthenticated messages that fail both SPF and DKIM alignment to the recipient's Spam/Junk folder.
3. **Phase 3: Strict Rejection (`p=reject; pct=100`)**
   Instruct recipient servers to outright discard unauthorized messages claiming to originate from `@hydrauliccourse.com`.

---

## 3. Webhook Integration, Bounces & Suppression Management

### 3.1 Resend Webhook Endpoint

- **URL:** `POST https://api.hydrauliccourse.com/api/v1/webhooks/resend`
- **Security:** Verified using **Svix HMAC-SHA256 signatures**. Headers verified:
  - `svix-id`: Unique message ID
  - `svix-timestamp`: Unix timestamp (verified within 300 seconds to eliminate replay attacks)
  - `svix-signature`: Versioned HMAC signature (`v1,...`) computed against `${id}.${timestamp}.${rawBody}`
  - Signature secret configured via `RESEND_WEBHOOK_SECRET` (`whsec_...`).

### 3.2 Deduplication

All webhook deliveries are tracked in the PostgreSQL `WebhookEvent` table with compound unique constraint `(provider, providerEventId)`. Duplicate webhook deliveries return an immediate `200 OK { received: true, duplicate: true }` without redundant database writes.

### 3.3 Suppression Table (`EmailSuppression`)

When an email bounces or a recipient files a spam complaint:

1. Resend issues an `email.bounced` or `email.complained` webhook event.
2. The server records the email in `EmailSuppression` table with `reason: 'BOUNCE' | 'COMPLAINT'` and `source: 'resend_webhook'`.
3. The corresponding `EmailLog` record is marked with `status: 'BOUNCED' | 'COMPLAINED'` and the gateway error reason is saved.
4. **Dispatch Barrier:** Every outbound transactional email passes through `emailService.dispatchEmail`. If the recipient address is present in `EmailSuppression`, dispatch is aborted immediately, an `EmailLog` record is written with status `FAILED` ("Recipient suppressed"), and no API call is made.
5. **Information Leakage Prevention:** Public routes like `/api/v1/auth/forgot-password` and `/api/v1/auth/resend-verification` always return generic 200 responses regardless of whether the recipient is suppressed.

---

## 4. BullMQ Queue Architecture & Retry Policy

### 4.1 Queue Structure

Transactional emails are dispatched asynchronously via BullMQ on Redis:

- **Queue Name:** `email-queue`
- **Worker Concurrency:** Configured with isolated Redis connection client.
- **Job Payload:**
  ```typescript
  interface EmailJobData {
    logId: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    template: string;
    idempotencyKey?: string;
    attachments?: Array<{ filename: string; content: string; contentType?: string }>;
    metadata?: Record<string, any>;
  }
  ```

### 4.2 Retry Policy & Exponential Backoff

- **Attempts:** 4 attempts total.
- **Backoff:** Exponential backoff ($1000 \text{ ms} \times 2^{\text{attempt}-1}$):
  - Attempt 1: Immediate dispatch
  - Attempt 2: After 2 seconds
  - Attempt 3: After 4 seconds
  - Attempt 4: After 8 seconds
- **Dead-Letter Handling:**
  If all 4 attempts fail, the BullMQ worker updates `EmailLog` with:
  - `status: EmailLogStatus.FAILED`
  - `failedAt: new Date()`
  - `errorMessage: err.message`
    Sensitive data (tokens, passwords, recovery codes) is strictly sanitized and omitted from logs.

### 4.3 Database Idempotency

- `EmailLog.idempotencyKey` has a unique database constraint (`@unique`).
- Re-triggering payment webhooks, invoice generation, or duplicate checkout completions will never result in multiple emails being queued or sent.

---

## 5. Contact Form Architecture & Bot Defense

The public contact form (`POST /api/v1/contact`) incorporates 4-layer defense:

1. **Zod Input Validation:** Strict constraints on name (1–100 chars), email (valid RFC format, max 255 chars), subject (1–200 chars), and message (10–5000 chars).
2. **Hidden Honeypot Field:** The form includes a `website` input visually hidden (`opacity: 0; position: absolute; left: -9999px;`). Real human users never populate this field; automated bots filling all inputs are immediately caught, logged, and returned a silent `200 OK` without triggering database writes or notifications.
3. **Cloudflare Turnstile Verification:** If `TURNSTILE_SECRET_KEY` is configured, verifies CAPTCHA token against `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
4. **Redis Per-IP Rate Limiting:** Enforces a strict limit of 5 contact submissions per hour per client IP (`rl_contact_form:<ip>`).

---

## 6. Email Design Standards & Accessibility

All transactional emails follow strict engineering guidelines:

- **Layout:** Standard XHTML 1.0 Transitional table-based structure for universal compatibility across Outlook 2016+, Apple Mail, Gmail iOS/Android, and web clients.
- **Color Palette:**
  - Background: Off-white `#F1F5F9`
  - Card Body: Clean White `#FFFFFF`
  - Primary Structural Fill: Dark Blue `#0A192F`
  - Accent / Action Button Fill: Course Orange `#E05305`
  - Text on Buttons: Dark Blue `#0A192F` (ensures >7:1 AAA contrast)
  - Text on White: Dark Blue `#0A192F` or Slate `#64748B` (Orange is **never** used as thin text on white)
- **Zero Remote Image Blockers:** Header uses a bold CSS-styled text wordmark (`HYDRAULIC ENGINEERING ACADEMY`) instead of remote images. The email is 100% readable even with images disabled by default.
- **Touch Target Size:** Action buttons are rendered in full table cells with minimum height of 44px and generous horizontal padding (28px).
- **Placeholder Leak Prevention:** The build and template generators execute `assertNoTodoMarkers()`, throwing a fatal error if any `[TODO_REPLACE` or unpopulated variable remains.

---

## 7. Testing & Verification Runbook

### 7.1 Offline Previews

Generate standalone HTML files for all 7 templates:

```bash
pnpm --filter @course/api run generate:email-previews
```

Outputs:

- `docs/email-previews/01-email-verification.html`
- `docs/email-previews/02-password-reset.html`
- `docs/email-previews/03-password-changed.html`
- `docs/email-previews/04-order-receipt.html`
- `docs/email-previews/05-refund-confirmation.html`
- `docs/email-previews/06-admin-access-granted.html`
- `docs/email-previews/07-account-exists.html`
- `docs/email-previews/index.html` (Interactive Gallery)

### 7.2 Interactive Browser Previews (Dev Server)

When `ENABLE_DEV_ROUTES=true` and `NODE_ENV !== 'production'`:

- Navigate to: `http://localhost:4000/dev/email-previews`
- Allows switching between HTML render, Plain Text render, and raw HTML inspect.

### 7.3 Automated Integration Tests

Run the comprehensive test suite against live PostgreSQL and Redis:

```bash
pnpm --filter @course/api test src/tests/email.test.ts
```
