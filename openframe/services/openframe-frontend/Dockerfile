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
COPY package.json ./
COPY .npmrc ./.npmrc

# Install dependencies (no lockfile in repo) + cache npm download artifacts
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=secret,id=GITHUB_TOKEN,required=false \
    export GITHUB_TOKEN="${GITHUB_TOKEN:-$(cat /run/secrets/GITHUB_TOKEN 2>/dev/null)}" && \
    npm install --no-audit --no-fund

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

# Install production dependencies (lockfile is not committed in this repo)
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm install --no-audit --no-fund --omit=dev

# Copy build output and public assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

# Default command uses package.json start script (next start -p 3000)
CMD ["npm", "start"]
