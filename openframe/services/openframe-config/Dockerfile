FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jre-alpine

LABEL org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents."

WORKDIR /app

# Copy the built JAR file
COPY target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache iputils bind-tools netcat-openbsd curl \
  && rm -rf /var/cache/apk/*

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8888

# Healthcheck  
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD curl -f http://localhost:8888/management/v1/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java -Dcontainer.ip=$(hostname -i) -jar app.jar"]
