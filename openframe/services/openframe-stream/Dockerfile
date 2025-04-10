FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre-alpine

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

WORKDIR /app

COPY target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache iputils bind-tools netcat-openbsd curl && rm -rf /var/cache/apk/*

EXPOSE 8082

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8082/actuator/health || exit 1

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]
