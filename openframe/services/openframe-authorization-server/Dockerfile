# Multi-stage build for Spring Boot Authorization Server
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy pom files first for better layer caching
COPY pom.xml .
COPY ../../../libs/openframe-core/pom.xml ../../../libs/openframe-core/pom.xml
COPY ../../../libs/openframe-jwt/pom.xml ../../../libs/openframe-jwt/pom.xml

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src
COPY ../../../libs/openframe-core/src ../../../libs/openframe-core/src
COPY ../../../libs/openframe-jwt/src ../../../libs/openframe-jwt/src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

# Add labels
LABEL maintainer="OpenFrame Team <team@openframe.com>"
LABEL description="OpenFrame Authorization Server - OAuth2/OIDC Provider"
LABEL version="1.0.0"

# Install additional packages
RUN apk add --no-cache \
    curl \
    ca-certificates \
    fontconfig \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -S openframe && adduser -S openframe -G openframe

# Set working directory
WORKDIR /app

# Copy the built JAR file
COPY --from=build --chown=openframe:openframe /app/target/openframe-authorization-server-*.jar app.jar

# Create directories for logs and config
RUN mkdir -p /app/logs /app/config && \
    chown -R openframe:openframe /app

# Switch to non-root user
USER openframe

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:9000/actuator/health || exit 1

# Set JVM options
ENV JAVA_OPTS="-Xms512m -Xmx1024m -XX:+UseG1GC -XX:+UseContainerSupport"
ENV SPRING_PROFILES_ACTIVE="docker"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"] 