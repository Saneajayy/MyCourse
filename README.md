# Industrial Hydraulic Engineering Course Platform

A secure, production-grade video learning platform designed for delivering specialized industrial hydraulic engineering training. Built with an Express.js API, Next.js 15 App Router, PostgreSQL with Prisma ORM, Redis for queues and rate-limiting, Razorpay payments, and Bunny Stream signed HLS delivery.

---

## 1. Prerequisites

- **Node.js**: v20 LTS or v22 LTS (v24 supported)
- **pnpm**: v9.15+ (`npm install -g pnpm` or `corepack enable`)
- **Docker & Docker Compose**: v24+ for local containerized development

---

## 2. Quickstart with Docker Compose (Recommended)

1. **Clone the repository and enter the directory**:

   ```bash
   git clone <repo-url>
   cd MyCourse
   ```

2. **Configure Environment Variables**:

   ```bash
   cp .env.example .env
   ```

   _(Review `.env` to customize admin credentials or leave defaults for local development)._

3. **Start All Services**:

   ```bash
   docker compose up --build
   ```

   This spins up:
   - **PostgreSQL 16** on `localhost:5432`
   - **Redis 7** on `localhost:6379`
   - **Express API** on `http://localhost:4000`
   - **Next.js Web App** on `http://localhost:3000`

4. **Verify Health Probes**:
   - Liveness probe:
     ```bash
     curl -i http://localhost:4000/healthz
     ```
   - Readiness probe (checks PostgreSQL and Redis):
     ```bash
     curl -i http://localhost:4000/readyz
     ```

---

## 3. Local Development (Native / Hybrid)

If you prefer running PostgreSQL & Redis in Docker while running the Node apps natively:

1. **Start Database and Cache**:

   ```bash
   docker compose up -d postgres redis
   ```

2. **Install Workspace Dependencies**:

   ```bash
   pnpm install
   ```

3. **Run Prisma Migrations and Seed**:

   ```bash
   pnpm db:migrate:dev
   pnpm db:seed
   ```

4. **Start Development Servers (Parallel)**:
   ```bash
   pnpm dev
   ```
   - Web Frontend: `http://localhost:3000`
   - API Backend: `http://localhost:4000`

---

## 4. Key Workspace Scripts

| Command                  | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `pnpm dev`               | Starts API and Web concurrently in development mode         |
| `pnpm build`             | Compiles `@course/shared`, `@course/api`, and `@course/web` |
| `pnpm test`              | Runs all Vitest unit and integration test suites            |
| `pnpm typecheck`         | Runs TypeScript strict check across all packages            |
| `pnpm format:check`      | Checks formatting with Prettier                             |
| `pnpm db:migrate:dev`    | Runs Prisma development migrations using root `.env`        |
| `pnpm db:migrate:deploy` | Applies production migrations                               |
| `pnpm db:seed`           | Seeds initial Admin user and development sample course      |
| `pnpm db:studio`         | Opens Prisma Studio GUI                                     |

---

## 5. Security & Design Guidelines

- **Theme**: Strict White + Industrial Orange + Dark Blue/Navy theme. Zero gradients, zero box-shadows, with thin 1px black borders on buttons and interactive tabs.
- **Fail-Closed Rate Limiter**: In production (`NODE_ENV=production`), rate limiting strictly requires Redis and refuses to boot or silently degrade to in-memory store.
- **Monetary Storage**: All prices and currency values are stored as 64-bit integer paise (never floating-point).
- **UUIDv7**: Primary keys use sequential, time-ordered UUIDv7 generated at the application layer to maintain dense B-tree indexes.
