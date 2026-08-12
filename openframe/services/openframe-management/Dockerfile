# Stage 1: Build Java application
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk-alpine-3.23 AS builder

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
    mvn clean package \
    -U \
    -pl openframe/services/openframe-management \
    -am \
    -Dcompress \
    --batch-mode \
    --no-transfer-progress \
    -Dmaven.javadoc.skip=true \
    -Dmaven.test.skip=true

# Stage 2: Runtime image
FROM eclipse-temurin:21-jre-alpine-3.23

RUN apk upgrade --no-cache && \
    apk add --no-cache libstdc++ iputils netcat-openbsd curl && \
    for pkg in gnupg libgcrypt sqlite-libs coreutils; do \
        apk info -e "$pkg" >/dev/null 2>&1 && apk del --purge "$pkg" || true; \
    done && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S -G appgroup appuser && \
    install -d -o appuser -g appgroup /app

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup \
     /build/openframe/services/openframe-management/target/*.jar app.jar

USER appuser

ENTRYPOINT ["java", "-jar", "app.jar"]
