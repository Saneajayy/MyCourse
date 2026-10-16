# ADR 009: Exemption of Razorpay Webhook Endpoints from CSRF and CORS Origin Checks

## Status

Accepted

## Context

Cross-Site Request Forgery (CSRF) defenses in the API rely on strict Origin and Referer header checking against allowed front-end domains (`CORS_ORIGIN`), rejecting requests with unrecognized or missing Origin headers on state-changing HTTP methods (POST, PUT, PATCH, DELETE).

Payment gateways such as Razorpay communicate server-to-server asynchronously using HTTP webhooks to deliver authoritative event notifications (e.g. `payment.captured`, `order.paid`, `refund.processed`). Because these HTTP requests originate from backend edge servers managed by Razorpay rather than a browser client navigating from our web domain:

1. Razorpay webhook requests do not contain browser `Origin` headers matching our web application domain.
2. Gateway webhook payloads cannot be validated via session cookies or JWT tokens.
3. If CSRF/CORS origin verification were applied to `/api/v1/webhooks/razorpay`, gateway events would be rejected with 403 Forbidden.

## Decision

We exempt `/api/v1/webhooks/razorpay` from browser CSRF Origin/Referer verification and browser CORS preflight enforcement.

Instead, security and authenticity for the webhook endpoint are enforced strictly using cryptographic message authentication:

1. **Raw Body Integrity:** Express preserves the exact raw UTF-8 request buffer before JSON parsing (`verify: (req, _res, buf) => req.rawBody = buf`).
2. **HMAC-SHA256 Signature Verification:** Every incoming webhook must supply the `x-razorpay-signature` header. The server computes `crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex')`.
3. **Constant-Time Comparison:** The computed signature and provided signature are compared using `crypto.timingSafeEqual()` to guard against timing attacks. Any missing or non-matching signature immediately returns HTTP 401 Unauthorized.
4. **Idempotency & Deduplication:** Webhook event IDs (`x-razorpay-event-id` or payload event ID) are recorded in the `WebhookEvent` table with a unique constraint. Replayed or duplicate webhooks are logged and acknowledged immediately with HTTP 200 without executing duplicate business actions.
5. **Fast Return & Async Processing:** The webhook endpoint responds with HTTP 200 in sub-second time, dispatching long-running jobs (reconciliation, notifications) to BullMQ.

## Consequences

- Legitimate Razorpay notifications are processed reliably without false-positive CSRF rejections.
- Attackers cannot forge webhook notifications without possession of the private `RAZORPAY_WEBHOOK_SECRET`.
- The webhook endpoint does not rely on or accept browser credentials, cookies, or user sessions.
