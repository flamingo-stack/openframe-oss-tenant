# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

# Build arguments for GitHub authentication
ARG GITHUB_ACTOR
ARG GITHUB_TOKEN

# Install Maven
RUN apk add --no-cache maven

# Set working directory
WORKDIR /build

# Copy Maven settings
COPY .mvn/settings.xml /root/.m2/settings.xml

# Set environment variables for Maven to use
ENV GITHUB_ACTOR=${GITHUB_ACTOR}
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Copy root POM
COPY pom.xml ./

# Copy Service POM
COPY openframe/services/openframe-gateway/pom.xml openframe/services/openframe-gateway/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B -pl openframe/services/openframe-gateway -am || true

# Copy source code
COPY openframe/services/openframe-gateway/src openframe/services/openframe-gateway/src

# Build the application
RUN ./mvnw clean install \
    -pl openframe/services/openframe-gateway \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

# Metadata
LABEL org.opencontainers.image.description="OpenFrame Gateway Microservice"

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /build/openframe/services/openframe-gateway/target/*.jar app.jar

# Add debugging tools (added curl for healthcheck)
RUN apk add --no-cache curl

EXPOSE 8100

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8100/management/v1/health || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

ENTRYPOINT ["java", "-jar", "app.jar"]