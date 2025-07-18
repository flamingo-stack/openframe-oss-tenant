######################################
# Build Stage
######################################
FROM golang:1.21-alpine AS builder

# Install build-time dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Set working directory
WORKDIR /app

# Copy go module files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build binary with version metadata
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -a -installsuffix cgo \
  -ldflags="\
    -w -s \
    -X main.version=$(git describe --tags --always --dirty 2>/dev/null || echo dev) \
    -X main.commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown) \
    -X main.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o openframe .

######################################
# Runtime Stage
######################################
FROM alpine:latest

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN addgroup -S openframe && adduser -S openframe -G openframe

# Set working directory
WORKDIR /app

# Copy built binary from the builder stage
COPY --from=builder /app/openframe .

# Set ownership to non-root user
RUN chown openframe:openframe openframe

# Use non-root user for security
USER openframe

# Expose application port
EXPOSE 8080

# Define health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ./openframe --version || exit 1

# Define default entrypoint and command
ENTRYPOINT ["./openframe"]
CMD ["--help"]
