# ADR 008: Cloudflare and Reverse-Proxy IP Trust Architecture

## Status
Accepted

## Context
The production environment sits behind Cloudflare's global edge network followed by an ingress reverse proxy (e.g., Caddy, Nginx, or AWS ALB) before reaching the Express.js API service:
$$\text{Client Browser} \longrightarrow \text{Cloudflare Edge} \longrightarrow \text{Ingress Reverse Proxy} \longrightarrow \text{Node.js / Express}$$

If Express is configured with `app.set('trust proxy', 1)` or `true`, several security issues emerge:
1. `trust proxy: 1`: Express only trusts the single immediate reverse proxy, so `req.ip` resolves to Cloudflare's edge IP rather than the true end-user client IP. This causes IP-based rate limiting and lockout to block all users across Cloudflare edge IPs.
2. `trust proxy: true`: Express unconditionally trusts all IP entries in the `X-Forwarded-For` header. An attacker can inject a fabricated `X-Forwarded-For: 1.1.1.1` header from the outside to bypass rate limiters, poison audit logs, and evade composite lockout defenses.

## Decision
1. **Hop-Count Trust Configuration:** Express `trust proxy` is configured to `2` in production (`app.set('trust proxy', 2)`). This instructs Express to trust exactly 2 upstream hops (the ingress reverse proxy and Cloudflare), stripping those two trusted IP hops from the right of `X-Forwarded-For` to isolate the real client IP.
2. **Cloudflare Header Precedence:** Cloudflare attaches the verified client IP to the `CF-Connecting-IP` header. In production, when the incoming TCP connection originates from a trusted proxy subnet, the API normalizes `req.ip` from `CF-Connecting-IP`.
3. **Local/Test Environment:** In non-production environments, `trust proxy` is set to `'loopback, linklocal, uniquelocal'` to allow testing proxy forwarding safely on localhost without opening external header spoofing vulnerabilities.
4. **Per-Account Global Lockout Defense:** In addition to composite `(email, IP)` lockout, a per-account global limiter (`lockout:acc_global:${email}`) restricts failed attempts to 20 per hour across all IPs. Even if an attacker uses a distributed botnet with rotating IPs, the account is protected against credential stuffing without locking out individual innocent IPs.

## Consequences
- IP spoofing via arbitrary client-supplied `X-Forwarded-For` headers is blocked.
- Accurate client IP tracking is preserved for audit logs, rate limiters, and composite brute-force lockouts.
- Distributed credential-stuffing attacks across multiple IPs trigger the per-account cooldown threshold.
