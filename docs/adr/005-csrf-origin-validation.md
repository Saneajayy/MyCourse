# ADR 005: CSRF Defense via Origin & Host Validation for Cookie-Authenticated Endpoints

## Status

Accepted

## Context

The platform issues `HttpOnly`, `SameSite=Lax`, `Secure` cookies for refresh tokens. While `SameSite=Lax` prevents cookies from being sent on cross-origin `POST` requests in modern browsers, defense-in-depth is required to protect state-changing cookie-authenticated endpoints (`/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/logout-all`) against:

1. Legacy browsers or client webviews that do not strictly adhere to `SameSite=Lax`.
2. Cross-site request forgery attempts initiated from untrusted web origins.
3. Top-level window navigation tricks or subdomain hijacking.

## Decision

We enforce server-side **Origin and Host Header Verification** via `validateCookieCsrf` middleware on all cookie-dependent state-changing endpoints (`POST /refresh`, `POST /logout`, `POST /logout-all`).

### Verification Mechanism:

1. When a browser initiates a cross-origin or same-origin `POST` request, it automatically includes an `Origin` (or `Referer`) header that cannot be modified by JavaScript (`Sec-Fetch-*` / forbidden header).
2. The middleware extracts the origin's hostname and validates it against:
   - The configured `CORS_ORIGINS` environment variable allow-list (e.g., `http://localhost:3000`, `https://app.hydrauliccourse.com`).
   - The server's own `Host` header (same-host origin).
3. If an `Origin` header is present and does not match an authorized origin or same-host, the request is immediately rejected with `403 Forbidden: Cross-origin request rejected`.
4. Requests with no `Origin` header (such as native mobile applications or server-to-server calls) are permitted to proceed only if they do not exhibit browser cross-origin signatures.
5. **Webhook Routes Exemption (Phase 4 & Phase 3 Webhooks)**:
   - External server-to-server webhook endpoints (e.g. `/api/v1/webhooks/razorpay`, `/api/v1/webhooks/bunny`) are triggered by third-party payment gateways and CDN video servers without browser `Origin` headers, CORS contexts, or session cookies.
   - These routes are strictly exempt from CORS allow-list restrictions and CSRF Origin validation. They are secured exclusively through cryptographic payload signature verification (HMAC-SHA256) over the raw request body.

## Consequences

- **Positive**: Eliminates CSRF vectors on sensitive session rotation and revocation routes without requiring complex synchronizer token patterns for session bootstrap.
- **Positive**: Complies with OWASP Top 10 guidelines for defense-in-depth cookie protection.
- **Negative**: Any new client origin or micro-frontend must be explicitly registered in `CORS_ORIGINS`.
