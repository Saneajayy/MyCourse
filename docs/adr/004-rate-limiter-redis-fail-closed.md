# ADR 004: Redis Rate Limiter Failure Policy (Fail-Closed in Production)

## Status

Accepted

## Context

Rate limiting protects critical endpoints (authentication, payment verification, coupon redemption, signed playback token generation) against brute-force attacks, credential stuffing, race conditions, and denial-of-service.

A common anti-pattern in Node.js applications is silently falling back to a per-process in-memory rate limiter when Redis is unreachable. In multi-instance or containerized production deployments, in-memory rate limiting allows attackers to bypass limits by rotating connections across instances, and fails to persist lockout state across restarts.

## Decision

1. **Production Mode (`NODE_ENV === 'production'`)**:
   - The application **refuses to boot** if Redis cannot be reached during startup.
   - If Redis connection drops during runtime:
     - Sensitive routes (auth, login, password reset, checkout, webhook, playback) **fail closed** (HTTP 503 Service Unavailable with structured error response and alerts) rather than silently bypassing protection.
     - The health check `/readyz` immediately returns HTTP 503 (`ready: false`, `redis: down`) to allow reverse proxies / Kubernetes / load balancers to divert traffic or alert on-call.
2. **Testing Mode (`NODE_ENV === 'test'`)**:
   - An isolated in-memory store or mocked store is permitted exclusively for lightweight unit and integration tests where an external Redis daemon is deliberately omitted.
3. **Development Mode (`NODE_ENV === 'development'`)**:
   - Local Docker Compose brings up Redis alongside PostgreSQL. The rate-limiter connects to Redis and warns visibly if Redis is disconnected.

## Consequences

- High-security posture: brute-force and double-spending attacks cannot exploit Redis outages to bypass rate limits.
- Zero silent degradation into insecure state in production.
- Clear operational alerts via `/readyz` when Redis requires attention.
