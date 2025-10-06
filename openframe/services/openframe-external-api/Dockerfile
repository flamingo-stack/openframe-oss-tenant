# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

# Set working directory
WORKDIR /build

# Copy Maven wrapper and pom files first for better caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY openframe/pom.xml openframe/pom.xml
COPY openframe/services/openframe-external-api/pom.xml openframe/services/openframe-external-api/pom.xml

# Download dependencies (cached layer)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY openframe/services/openframe-external-api/src openframe/services/openframe-external-api/src

# Build the application
RUN ./mvnw clean install \
    -pl openframe/services/openframe-external-api \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

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

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

# Build arguments for GitHub authentication
ARG GITHUB_ACTOR
ARG GITHUB_TOKEN

# Install Maven
RUN apk add --no-cache maven

WORKDIR /build

# Copy Maven settings
COPY .mvn/settings.xml /root/.m2/settings.xml

# Set environment variables for Maven to use
ENV GITHUB_ACTOR=${GITHUB_ACTOR}
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Copy root POM
COPY pom.xml ./

# Copy Service POM
COPY openframe/services/openframe-external-api/pom.xml openframe/services/openframe-external-api/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B -pl openframe/services/openframe-external-api -am || true

# Copy source code
COPY openframe/services/ openframe/services/

# Build the application
RUN mvn clean install \
    -U \
    -pl openframe/services/openframe-external-api \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.description="OpenFrame External API Microservice"

WORKDIR /app

COPY --from=builder /build/openframe/services/openframe-external-api/target/*.jar app.jar

RUN apk add --no-cache libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8092

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8092/management/v1/health || exit 1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]