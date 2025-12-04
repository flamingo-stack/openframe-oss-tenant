# syntax=docker/dockerfile:1.4
##### Stage 0: Clone UI-Kit repository #####
FROM alpine:3 AS ui-kit
WORKDIR /tmp
RUN apk add --no-cache git
ARG UI_KIT_REF="main"
RUN git clone --depth 1 --branch "$UI_KIT_REF" https://github.com/flamingo-stack/ui-kit.git ui-kit


##### Stage 1: Builder (runs on TARGETPLATFORM for correct native modules) #####
FROM --platform=$TARGETPLATFORM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
COPY --from=ui-kit /tmp/ui-kit ./ui-kit

ENV NODE_ENV=development
RUN --mount=type=cache,id=nextjs-npm-cache-${TARGETPLATFORM},target=/root/.npm \
    npm install

COPY . .
RUN npm run build


##### Stage 2: Runtime #####
FROM --platform=$TARGETPLATFORM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone build with platform-correct dependencies
COPY --from=builder /app/dist/standalone ./
COPY --from=builder /app/dist/static ./dist/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
