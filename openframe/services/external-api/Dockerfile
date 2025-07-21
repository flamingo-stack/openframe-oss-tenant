# --- Builder stage ---
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app
COPY . .

RUN mvn clean install -pl openframe/services/external-api -am -Dcompress -DskipTests
RUN pwd
RUN ls -l
RUN find . -name "*.jar" -type f


# --- Runtime image ---
FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."
WORKDIR /app

COPY --from=builder /app/openframe/services/external-api/target/*.jar app.jar

RUN apk add --no-cache iputils bind-tools netcat-openbsd curl && rm -rf /var/cache/apk/*
EXPOSE 8092

HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8092/management/v1/health || exit 1

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]
