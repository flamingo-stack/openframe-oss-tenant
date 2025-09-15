FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre-alpine

# Metadata
LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

WORKDIR /app

COPY target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache postfix libstdc++ iputils bind-tools netcat-openbsd curl

EXPOSE 8090

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8090/management/v1/health || exit 1

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Change ownership of the application files
RUN chown -R appuser:appgroup /app

# Switch to the new user
# USER appuser

ENTRYPOINT ["/bin/sh", "-c", "postfix start && export CONTAINER_IP=$(hostname -i) && exec java -jar /app/app.jar"]