# Multi-stage Dockerfile for Next.js (Node 22)
# - Builds app with Next (distDir set to "dist")
# - Optimized for fast, repeatable builds on amd64/arm64 using BuildKit cache mounts

##########
# deps
##########
FROM --platform=$BUILDPLATFORM node:22-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ARG GITHUB_TOKEN

# Copy dependency manifests first for best layer caching
COPY package.json package-lock.json ./

# Install dependencies deterministically from lockfile + cache npm download artifacts
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=GITHUB_TOKEN,required=false \
    export GITHUB_TOKEN="${GITHUB_TOKEN:-$(cat /run/secrets/GITHUB_TOKEN 2>/dev/null)}" && \
    npm ci --no-audit --no-fund

##########
# build
##########
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

# Reuse installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Now copy the rest of the source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app (distDir is configured as "dist")
# Use BuildKit cache mounts for faster incremental builds (works across amd64/arm64)
RUN --mount=type=cache,target=/app/.next/cache \
    --mount=type=cache,target=/app/dist/cache \
    npm run build

##########
# runtime
##########
FROM --platform=$TARGETPLATFORM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/dist/standalone ./
COPY --from=builder /app/dist/static ./dist/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
