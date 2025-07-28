FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

WORKDIR /app

COPY target/*.jar app.jar

# Add debugging tools
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends iputils-ping dnsutils netcat-openbsd curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 8082

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8082/actuator/health || exit 1

# Create a non-root user (Debian syntax)
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Change ownership of the application files
RUN chown -R appuser:appgroup /app

# Switch to the new user
USER appuser

ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar"]
