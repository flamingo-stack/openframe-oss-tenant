# Stage 1: Dependencies
FROM node:21-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Build
FROM node:21-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application (if using a production build step)
# Uncomment if you have a build script
# RUN npm run build

# Stage 3: Runtime
FROM node:21-alpine AS runner

# Metadata
LABEL org.opencontainers.image.description="OpenFrame UI Service"

WORKDIR /app

ARG PORT
ENV PORT=${PORT:-3000}
ENV NODE_ENV=development

# Copy package files and dependencies
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Add curl for healthcheck
RUN apk add --no-cache curl

# Expose the port the app runs on
EXPOSE ${PORT}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:${PORT}/ || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

# Start the application in development mode
CMD npm run dev -- --port $PORT
