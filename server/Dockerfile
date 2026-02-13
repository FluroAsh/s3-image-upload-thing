FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Dependencies (context: repo root)
FROM base AS deps
RUN mkdir -p /temp/dev
COPY server/package.json server/package-lock.json* server/bun.lockb* server/yarn.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY shared ./shared
COPY server ./server
COPY --from=deps /app/node_modules ./server/node_modules

WORKDIR /app/server

# Stage 3: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5101

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/tsconfig.json ./tsconfig.json
COPY --from=builder /app/server/src ./src
COPY --from=builder /app/shared /shared

USER bun
EXPOSE 5101/tcp

CMD ["bun", "run", "start"]