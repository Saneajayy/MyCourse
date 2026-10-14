# ADR 002: Primary Key Generation Using UUIDv7

## Status

Accepted

## Context

Traditional random UUIDv4 identifiers cause severe B-tree index fragmentation in PostgreSQL as datasets grow. Because UUIDv4 values are completely random, new inserts hit random index pages, leading to cache churn, bloated indexes, and degraded write performance.

UUIDv7 provides time-ordered, 128-bit identifiers with millisecond precision in the most significant bits and cryptographic randomness in the least significant bits. This guarantees monotonic sequential clustering in PostgreSQL B-tree indexes while preserving global uniqueness across distributed systems without coordination.

## Decision

We generate UUIDv7 identifiers **at the application layer** in TypeScript before inserting records into PostgreSQL:

1. Use a fast, standards-compliant UUIDv7 library (`uuidv7`).
2. Primary keys in Prisma schema are typed as `String @id @db.Uuid`.
3. Repositories and models assign `id = uuidv7()` upon record creation.

## Consequences

- B-tree indexes in PostgreSQL remain dense, sequentially appended, and cache-friendly.
- Primary keys are naturally sortable by creation time.
- Zero database extension dependency (works identically across standard PostgreSQL 15, 16, Supabase, Neon, or RDS without custom extensions).
- Guarantees compatibility across Prisma versions and database drivers.
