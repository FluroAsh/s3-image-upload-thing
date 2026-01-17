
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

# Set environment variables for the builder
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_S3_REGION

# Set environment variables, so they are available during the Next.js build process
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_S3_REGION=${NEXT_PUBLIC_S3_REGION}
ENV NODE_ENV=production
ENV PORT=5100

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