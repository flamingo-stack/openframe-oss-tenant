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

RUN --mount=type=secret,id=GITHUB_TOKEN \
    export GITHUB_TOKEN=$(cat /run/secrets/GITHUB_TOKEN) && \
    for attempt in 1 2 3; do \
        mvn clean install \
        -U \
        -pl openframe/services/openframe-config \
        -am \
        -Dcompress \
        --batch-mode \
        --no-transfer-progress \
        -Dmaven.javadoc.skip=true \
        -Dmaven.test.skip=true \
        && exit 0; \
        echo "Maven build attempt ${attempt}/3 failed (GitHub Packages resolve may be flaky); retrying in 15s..." >&2; \
        sleep 15; \
    done; \
    echo "Maven build failed after 3 attempts" >&2; exit 1



# Stage 2: Runtime image
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /build/openframe/services/openframe-config/target/*.jar app.jar

RUN apk add --no-cache libstdc++ iputils bind-tools netcat-openbsd curl && \
    addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]

