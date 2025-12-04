
# syntax=docker/dockerfile:1.6

############################
# deps + build (BUILDPLATFORM)
############################
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

ARG UI_KIT_REF=main
ARG CACHE_BUST=2025-10-12-v3

# Install deps for building
COPY package.json ./

RUN echo "Cache bust: ${CACHE_BUST}" \
 && rm -rf ui-kit \
 && git clone --depth=1 --branch ${UI_KIT_REF} https://github.com/flamingo-stack/ui-kit.git ui-kit

RUN --mount=type=cache,target=/root/.npm npm install

# Copy the app source (ui-kit is ignored by .dockerignore)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app to dist/
RUN npm run build


############################
# runtime (TARGETPLATFORM-specific)
############################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Only package.json, we’ll install prod deps per-arch
COPY package.json ./

# Copy ui-kit (pure TS/JS assets) and build output
COPY --from=builder /app/ui-kit ./ui-kit
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Install only production deps per architecture
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

EXPOSE 3000
CMD ["npm", "run", "start"]
