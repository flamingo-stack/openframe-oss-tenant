# syntax=docker/dockerfile:1.4  (Use Dockerfile BuildKit syntax for caching features)
##### Stage 0: Clone UI-Kit repository (isolated stage) #####
FROM alpine:3 AS ui-kit
WORKDIR /tmp
RUN apk add --no-cache git
ARG UI_KIT_REF="main"
RUN git clone --depth 1 --branch "$UI_KIT_REF" https://github.com/flamingo-stack/ui-kit.git ui-kit


##### Stage 1: Builder (runs on native BUILDPLATFORM, e.g. amd64) #####
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies (for Next.js build on Alpine):contentReference[oaicite:12]{index=12}
RUN apk add --no-cache libc6-compat python3 make g++

# Copy app package files and lockfile first for caching
COPY package*.json ./  
# adjust if using yarn/pnpm
# Copy cloned ui-kit into the build context
COPY --from=ui-kit /tmp/ui-kit ./ui-kit

# Install all dependencies (including devDeps) with caching
ENV NODE_ENV=development
RUN --mount=type=cache,id=nextjs-npm-cache,target=/root/.npm \
    npm install

# Build the Next.js app (output to ./dist as per next.config.js)
RUN npm run build  
# Assumes "build" script runs `next build`


##### Stage 2: Final runtime image (for each TARGET platform) #####
FROM --platform=$TARGETPLATFORM node:22-alpine AS runner
WORKDIR /app

# Copy necessary files from builder:
COPY --from=builder /app/dist ./dist               
# Next.js build output
COPY --from=builder /app/package*.json ./          
# Package files for prod deps
# (Copy any other runtime files if needed, e.g. public/ or Next config)
# COPY --from=builder /app/public ./public         # (if your app serves public assets)

# Install production dependencies for this architecture:contentReference[oaicite:13]{index=13}
ENV NODE_ENV=production
RUN --mount=type=cache,id=nextjs-npm-cache,target=/root/.npm \
    npm ci --only=production

# Optional: drop privileges (Node official image has a 'node' user)
# RUN adduser -D -H -u 1001 appuser && chown -R appuser:appuser /app
# USER appuser

EXPOSE 3000  
# default Next.js port
CMD ["npm", "start"]  # assuming "start" script starts Next.js (e.g. next start)
