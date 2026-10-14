# ADR 003: Prisma ORM Version Selection

## Status

Accepted

## Context

When checking the npm registry for `prisma` and `@prisma/client`:

- `npm view @prisma/client dist-tags`:
  - `latest`: `7.10.0`
  - `prev`: `6.19.3`
  - `dev`: `8.1.0-dev.9`
- `npm view prisma dist-tags`:
  - `latest`: `8.0.0-rc.22` (Release Candidate)
  - `prev`: `7.10.0`
  - `next`: `8.0.0-rc.10`

Version 8.0 is currently a Release Candidate (`8.0.0-rc.22`). Operating rule 0 mandates:

> "You are building a real, production system that handles real money and about 5,000 real users. This is not a prototype or demo. When there is a tradeoff between 'fast' and 'correct and safe,' choose correct and safe."

## Decision

We pin Prisma CLI and `@prisma/client` to the latest stable production release: **`7.10.0`**. We intentionally avoid `8.0.0-rc.22` until version 8 achieves official General Availability (GA) and stability verification.

Furthermore, we configure Prisma 7 with its required modern architecture:

1. `prisma.config.ts` handles datasource connection URLs (`url: env("DATABASE_URL")`) while `schema.prisma` declares the database provider cleanly.
2. Direct PostgreSQL connectivity is provided via `@prisma/adapter-pg` and the standard `pg` driver, removing the legacy heavyweight Rust query engine binary and delegating connection pooling and socket management directly to Node.js.

## Consequences

- Stable, battle-tested database driver for PostgreSQL 15/16.
- Full compatibility with Node.js 20, 22, and 24 LTS.
- Lighter container footprint and faster cold-starts with direct JS/Node `pg` driver.
- No risk of unannounced breaking changes or RC regressions affecting financial or authentication transactions.
