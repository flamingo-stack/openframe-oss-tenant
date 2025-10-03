# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copy Maven wrapper and configuration (mvnw.cmd is optional)
COPY mvnw ./
COPY --chown=root:root .mvn .mvn

# Make mvnw executable
RUN chmod +x mvnw

# Copy all POM files for dependency resolution
COPY pom.xml ./
COPY openframe/services/openframe-api/pom.xml openframe/services/openframe-api/

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline -B -pl openframe/services/openframe-api -am || true

# Copy source code
COPY openframe/services/openframe-api/src openframe/services/openframe-api/src

# Build the application
RUN ./mvnw clean install \
    -pl openframe/services/openframe-api \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/openframe/services/openframe-api/target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache postfix libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8090/management/v1/health || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# USER appuser

ENTRYPOINT ["/bin/sh", "-c", "postfix start && export CONTAINER_IP=$(hostname -i) && exec java -jar /app/app.jar"]
