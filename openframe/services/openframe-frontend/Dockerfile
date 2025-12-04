# syntax=docker/dockerfile:1.4
##### Stage 0: Clone UI-Kit repository #####
FROM alpine:3 AS ui-kit
WORKDIR /tmp
RUN apk add --no-cache git
ARG UI_KIT_REF="main"
ARG CACHE_BUST=2025-10-12-v3
RUN git clone --depth 1 --branch "$UI_KIT_REF" https://github.com/flamingo-stack/ui-kit.git ui-kit


##### Stage 1: Builder (native platform for fast build) #####
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY --from=ui-kit /tmp/ui-kit ./ui-kit

ENV NODE_ENV=development
RUN --mount=type=cache,id=nextjs-npm-cache,target=/root/.npm \
    npm install

COPY . .
RUN npm run build


##### Stage 2: Runtime (target platform - only npm ci runs under emulation) #####
FROM --platform=$TARGETPLATFORM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy package files for prod install
COPY package*.json ./
COPY --from=ui-kit /tmp/ui-kit ./ui-kit

# Install prod deps on target platform (this is the slow part under emulation)
ENV NODE_ENV=production
RUN --mount=type=cache,id=nextjs-npm-cache-${TARGETPLATFORM},target=/root/.npm \
    npm install --omit=dev

# Copy pre-built dist from builder (JS is platform-independent)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
