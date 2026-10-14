# ADR 001: Authentication Cookie and CORS Architecture

## Status

Accepted

## Context

The platform consists of a decoupled architecture: an Express.js REST API (`apps/api`) and a Next.js App Router frontend (`apps/web`). Authentication uses short-lived JWT access tokens and long-lived rotating refresh tokens stored in `httpOnly` secure cookies.

Cross-domain cookies between completely disparate apex domains (e.g. `domain-web.com` and `domain-api.com`) face severe third-party cookie restrictions in modern browsers (Safari ITP, Chrome Privacy Sandbox).

## Decision

We adopt a **shared registrable domain** strategy for production, supplemented by explicit Next.js API route proxying / rewrites for client-side fetches:

1. **Production Domain Structure**:
   - Web Frontend: `https://app.hydrauliccourse.com` (or `https://hydrauliccourse.com`)
   - API Backend: `https://api.hydrauliccourse.com`
   - Cookie Scoping: `Domain=.hydrauliccourse.com`, `SameSite=Lax`, `Secure=true`, `HttpOnly=true`. This allows the cookie to be sent seamlessly to `api.hydrauliccourse.com` without being considered a third-party cookie.
2. **Localhost Development**:
   - Web: `http://localhost:3000`
   - API: `http://localhost:4000`
   - Cookie Scoping: omit domain or set `Domain=localhost`, `SameSite=Lax`, `Secure=false` (only on plain HTTP localhost).
3. **CORS Allow-List**:
   - Configured via `CORS_ORIGINS` environment variable.
   - `credentials: true` strictly enforced.
   - Wildcards (`*`) are disallowed when `credentials: true`.
4. **Next.js Proxying for SSR**:
   - For server-side rendering (SSR) data fetching inside Next.js Server Components, Next.js forwards the incoming request cookies directly to the internal Express API URL (`http://api:4000` in Docker or `API_URL`).

## Consequences

- No third-party cookie blocking issues.
- Refresh tokens remain immune to XSS (`httpOnly`).
- Clear separation of concerns between Next.js SSR/UI and Express API.
