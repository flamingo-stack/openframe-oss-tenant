# syntax=docker/dockerfile:1.7
# Next.js 16 standalone (distDir=dist), multi-arch via BuildKit

FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Declared (unused) to silence buildx warning — CI passes --build-arg GITHUB_ACTOR uniformly.
ARG GITHUB_ACTOR

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN --mount=type=cache,target=/app/dist/cache \
    npm run build

FROM --platform=$TARGETPLATFORM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && \
    adduser  -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/dist/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/dist/static      ./dist/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
