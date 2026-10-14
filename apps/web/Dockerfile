FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @course/shared build
RUN pnpm --filter @course/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --chown=nextjs:nodejs --from=builder /app/apps/web/public ./apps/web/public
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/standalone ./
COPY --chown=nextjs:nodejs --from=builder /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
