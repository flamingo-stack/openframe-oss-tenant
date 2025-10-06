# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

# Build arguments for GitHub authentication
ARG GITHUB_ACTOR
ARG GITHUB_TOKEN


# Install Maven
RUN apk add --no-cache maven

WORKDIR /build

# Copy Maven settings (important for private repository access)
COPY .mvn/settings.xml /root/.m2/settings.xml

# Set environment variables for Maven to use
ENV GITHUB_ACTOR=${GITHUB_ACTOR}
ENV GITHUB_TOKEN=${GITHUB_TOKEN}


# Copy root POM
COPY pom.xml ./

# Copy service POM
COPY openframe/services/openframe-api/pom.xml openframe/services/openframe-api/

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B -pl openframe/services/openframe-api -am || true

# Copy source code for openframe-api and all its dependencies
COPY openframe/services/openframe-api/src openframe/services/openframe-api/src

# Build only the openframe-api module and its dependencies
RUN mvn clean install \
    -U \
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