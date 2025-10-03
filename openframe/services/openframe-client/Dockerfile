# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

# Set working directory
WORKDIR /build

# Copy Maven wrapper and pom files first for better caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY openframe/pom.xml openframe/pom.xml
COPY openframe/services/openframe-client/pom.xml openframe/services/openframe-client/pom.xml

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY openframe/services/openframe-client/src openframe/services/openframe-client/src

# Build the application
RUN ./mvnw clean install \
    -pl openframe/services/openframe-client \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

# Metadata
LABEL org.opencontainers.image.description="OpenFrame Client Microservice"

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/openframe/services/openframe-client/target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8097

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8097/management/v1/health || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]