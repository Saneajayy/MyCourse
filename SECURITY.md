# Security Policy & Threat Model

This document outlines the security architecture, threat model, boundaries, and incident response procedures for the Hydraulic Engineering Course platform.

---

## 1. Threat Model & Architectural Boundaries

### What IS Protected

1. **Authentication & Session Security**:
   - Passwords hashed with RFC 9106 recommended **Argon2id** (64MB memory, 3 iterations, 4 threads).
   - Refresh token rotation with immediate reuse detection (revoking entire session tree upon token reuse).
   - Strict `httpOnly`, `Secure`, `SameSite=Lax`, and isolated `Domain` cookies for refresh tokens; access tokens maintained purely in memory/headers and never persisted in `localStorage` or `sessionStorage`.
   - Algorithm pinning: all JWT operations are pinned strictly to `HS256`.
   - Progressive account lockout and rate limiting preventing brute-force password guessing.
   - Admin routes require role verification, active sessions, and mandatory TOTP 2FA.

2. **Authorization & IDOR Prevention**:
   - Enrolled student courses, orders, invoices, and progress are verified strictly against authenticated user IDs.
   - Comprehensive authorization matrix ensuring cross-user access (IDOR) attempts return HTTP 403 Forbidden.
   - Admin course management, refund dispatch, and manual entitlement operations require active 2FA verification.

3. **Payment Integrity**:
   - Razorpay orders and webhook payloads are validated using constant-time HMAC-SHA256 comparison (`crypto.timingSafeEqual`) on the raw request body.
   - Webhook idempotency table (`WebhookEvent`) preventing duplicate fulfillment and replay attacks.
   - Production startup checks reject test gateway keys, fake payment providers, or development checkout routes.
   - Double-purchase prevention and renewal window enforcement prevent accidental or malicious multi-purchasing.

4. **Input Handling & Data Hygiene**:
   - All API endpoints validate request bodies, query strings, and route parameters against strict Zod schemas that reject unknown parameters (`.strict()`).
   - Global body size caps (2MB for JSON payloads; 5MB for thumbnail file uploads).
   - Content-based file validation (magic byte inspection for JPEG, PNG, WebP) on uploaded images.
   - CSV export formulas are sanitized against formula injection (`=`, `+`, `-`, `@` escaped).
   - Parameterized database queries exclusively via Prisma ORM and tagged template literals (`$queryRaw\`...\``).

5. **Secrets & PII Logging**:
   - Production logger redacts all passwords, tokens, API keys, cards, webhook secrets, and email bodies.
   - `.env` files are strictly excluded from git tracking; automated Gitleaks secret scanning runs on CI.

---

### What is NOT Protected (Explicit Boundaries)

1. **Client-Side Screen Recording & DevTools DOM Tampering**:
   - Watermarking (dynamic student email & ID overlays) deters casual account sharing and unauthorized re-distribution.
   - However, client-side watermarks and DOM overlays can be inspected or hidden by a determined user using browser Developer Tools.
   - Similarly, operating system-level screen capture, external HDMI recording devices, or screen recording software cannot be completely blocked by any standard browser-based web application without native OS-level DRM software.
2. **Hardware-Level DRM**:
   - Videos are streamed via Bunny Stream using token-authenticated signed HLS playlists and iframe embedding with domain restrictions.
   - Hardware DRM (Widevine / FairPlay) is **not** implemented in this phase.

---

## 2. Access Revocation Mechanics

When an entitlement is revoked (via admin action, dispute, or payment refund):

1. **Database Revocation**: The entitlement status is set to `REVOKED` or deleted.
2. **Session Termination**: The user's active session records are invalidated, and `tokenVersion` is incremented.
3. **Active Video Streams Purged**: Active video playback sessions in Redis (`stream:sessions:<userId>`) are deleted immediately. Any in-flight player heartbeats will immediately fail with HTTP 403/503 and abort video playback within 20 seconds.

---

## 3. Incident Response Runbook

### Scenario A: Suspected API Key or Secret Leak

1. **Identify the compromised key**:
   - `JWT_ACCESS_SECRET` / `TOTP_ENCRYPTION_KEY`: Requires rotating the secret in environment variables and restarting the API container. All active sessions and TOTP secrets will be invalidated.
   - `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`: Generate new keys in the Razorpay Dashboard, update `.env`, and update the webhook secret endpoint.
   - `BUNNY_STREAM_API_KEY` / `BUNNY_STREAM_TOKEN_AUTH_KEY`: Regenerate API keys in Bunny CDN dashboard, update `.env`, restart API service.
   - `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET`: Rotate API key in Resend dashboard, update `.env`.
2. **Deploy updated secrets**:
   ```bash
   # Update production environment configuration
   docker compose restart api
   ```

### Scenario B: How to Revoke All Sessions Globally or for a Specific User

- **For a single user**:
  Admin Dashboard -> Students -> Select Student -> Click **"Revoke All Sessions"** (or invoke `POST /api/v1/admin/users/:id/revoke-sessions`).
- **Emergency global session purge**:
  Update `JWT_ACCESS_SECRET` in environment variables and restart API servers; or flush active session tokens in Redis.

### Scenario C: How to Disable / Ban a Suspicious User

- Admin Dashboard -> Students -> Select Student -> Change status to `BANNED`.
- All ongoing video playback sessions are dropped immediately, and login is blocked.

### Scenario D: How to Pause Sales Instantly (Emergency Circuit Breaker)

- Update `Product` status in the database or admin panel from `PUBLISHED` to `DRAFT` or `ARCHIVED`.
- Checkout attempts will immediately receive HTTP 404/403 ("Course product not found or not published").

### Scenario E: Bulk Refunds

- Execute administrative refund script or trigger `POST /api/v1/admin/payments/:id/refund` for target payments.
- All refunds automatically revoke course entitlements and issue durable refund receipts.

---

## 4. Reporting Security Vulnerabilities

If you discover a security vulnerability within this project, please notify the engineering team immediately at:
**security@hydrauliccourse.com**

Please do not disclose vulnerabilities publicly until an official patch has been deployed.
