FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Dependencies (context: repo root)
FROM base AS deps
RUN mkdir -p /temp/dev
COPY client/package.json client/package-lock.json* client/bun.lockb* client/yarn.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
WORKDIR /app
COPY shared ./shared
COPY client ./client
COPY --from=deps /app/node_modules ./client/node_modules

WORKDIR /app/client

ARG API_URL
ARG NEXT_PUBLIC_S3_REGION
ENV NODE_ENV=production
ENV PORT=5100
ENV API_URL=${API_URL}
ENV NEXT_PUBLIC_S3_REGION=${NEXT_PUBLIC_S3_REGION}

RUN bun run build

# Stage 3: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5100
ENV HOSTNAME=0.0.0.0

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/client/.next ./.next
COPY --from=builder /app/client/public ./public
COPY --from=builder /app/client/package.json ./package.json

USER bun
EXPOSE 5100/tcp

CMD ["bun", "run", "start"]