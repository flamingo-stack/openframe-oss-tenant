# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

# Build arguments for GitHub authentication
ARG GITHUB_ACTOR

# Install Maven
RUN apk add --no-cache maven

WORKDIR /build

# Copy Maven settings
COPY .mvn/settings.xml /root/.m2/settings.xml

# Copy entire project structure
COPY pom.xml ./
COPY openframe/ openframe/
COPY integrated-tools/ integrated-tools/

# Build the application using BuildKit secret
RUN --mount=type=secret,id=github_token \
    export GITHUB_TOKEN=$(cat /run/secrets/github_token) && \
    mvn clean install \
    -U \
    -pl openframe/services/openframe-external-api \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true



# Stage 2: Runtime image
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre-alpine

# Metadata
LABEL org.opencontainers.image.description="OpenFrame External API Microservice"

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/openframe/services/openframe-external-api/target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8092

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8092/management/v1/health || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]