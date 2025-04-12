FROM node:21-alpine

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

ARG PORT
ENV PORT=${PORT:-3000}

# Expose the port the app runs on
EXPOSE ${PORT}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:${PORT}/ || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Change ownership of the application files
RUN chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

# Start the application in development mode
CMD npm run dev -- --port $PORT
