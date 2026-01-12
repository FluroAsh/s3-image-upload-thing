FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
RUN mkdir -p /temp/dev
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . . 

# Stage 3: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5101

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

USER bun
EXPOSE 5101/tcp

CMD ["bun", "run", "start"]