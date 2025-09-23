# Multi-stage Dockerfile for Next.js (Node 22)
# - Clones flamingo-stack/ui-kit into project root prior to install/build
# - Builds app with Next 15 (distDir set to "dist")
# - Runs with `next start` on port 4000

##########
# deps
##########
FROM node:22-alpine AS deps
WORKDIR /app

# git is required to clone ui-kit
RUN apk add --no-cache git

# Copy only package manifests first for better layer caching
COPY package*.json ./

# Always use a fresh clone of the ui-kit into /app/ui-kit
RUN rm -rf ui-kit \
 && git clone --depth=1 https://github.com/flamingo-stack/ui-kit.git ui-kit

# Install dependencies (includes local file dependency to ./ui-kit)
RUN npm ci

##########
# build
##########
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

# Reuse installed node_modules and cloned ui-kit from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/ui-kit ./ui-kit

# Now copy the rest of the source (ui-kit is ignored by .dockerignore)
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app (distDir is configured as "dist")
RUN npm run build

##########
# runtime
##########
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Ensure local file dependency exists, then install only production deps for `next start`
COPY package*.json ./
COPY --from=deps /app/ui-kit ./ui-kit
RUN npm ci --omit=dev

# Copy build output and public assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 4000

# Default command uses package.json start script (next start -p 4000)
CMD ["npm", "run", "start"]
