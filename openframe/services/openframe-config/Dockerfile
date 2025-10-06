# Stage 1: Build Java application
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
COPY openframe/services/openframe-config/pom.xml openframe/services/openframe-config/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B -pl openframe/services/openframe-config -am || true

# Copy source code
COPY openframe/services/openframe-config/src openframe/services/openframe-config/src

# Build the application
RUN mvn clean install \
    -U \
    -pl openframe/services/openframe-config \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.description="OpenFrame Config Server Microservice"

WORKDIR /app

COPY --from=builder /build/openframe/services/openframe-config/target/*.jar app.jar

RUN apk add --no-cache libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8888

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8888/management/v1/health || exit 1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]