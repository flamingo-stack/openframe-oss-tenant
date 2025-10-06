# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine AS builder

ARG GITHUB_ACTOR
ARG GITHUB_TOKEN

RUN apk add --no-cache maven

WORKDIR /build

COPY .mvn/settings.xml /root/.m2/settings.xml

ENV GITHUB_ACTOR=${GITHUB_ACTOR}
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Copy root POM
COPY pom.xml ./

# Copy complete openframe module structure (including parent POMs)
COPY openframe/pom.xml openframe/
COPY openframe/core/ openframe/core/
COPY openframe/services/pom.xml openframe/services/

# Copy all service POMs
COPY openframe/services/openframe-api/pom.xml openframe/services/openframe-api/
COPY openframe/services/openframe-config/pom.xml openframe/services/openframe-config/
COPY openframe/services/openframe-client/pom.xml openframe/services/openframe-client/
COPY openframe/services/openframe-stream/pom.xml openframe/services/openframe-stream/
COPY openframe/services/openframe-management/pom.xml openframe/services/openframe-management/
COPY openframe/services/openframe-gateway/pom.xml openframe/services/openframe-gateway/
COPY openframe/services/openframe-external-api/pom.xml openframe/services/openframe-external-api/
COPY openframe/services/openframe-authorization-server/pom.xml openframe/services/openframe-authorization-server/

# Copy integrated-tools structure
COPY integrated-tools/pom.xml integrated-tools/
COPY integrated-tools/tacticalrmm/ integrated-tools/tacticalrmm/
COPY integrated-tools/fleetmdm/ integrated-tools/fleetmdm/

# Download dependencies
RUN mvn dependency:go-offline -B -pl openframe/services/openframe-api -am || true

# Copy all source code
COPY openframe/services/ openframe/services/

# Build with reactor (all dependencies)
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

COPY --from=builder /build/openframe/services/openframe-api/target/*.jar app.jar

RUN apk add --no-cache postfix libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8090/management/v1/health || exit 1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

ENTRYPOINT ["/bin/sh", "-c", "postfix start && export CONTAINER_IP=$(hostname -i) && exec java -jar /app/app.jar"]
