
FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
RUN mkdir -p /temp/dev
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Stage 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . . 

ENV NODE_ENV=production
RUN bun run build

# Stage 3: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5100

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

USER bun
EXPOSE 5100/tcp

CMD ["bun", "run", "start"]