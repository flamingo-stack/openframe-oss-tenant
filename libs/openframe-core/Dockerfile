# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
COPY target/*.jar app.jar

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/app.jar app.jar

# Add debugging tools
RUN apk add --no-cache iputils bind-tools netcat-openbsd

ENTRYPOINT ["java", "-jar", "app.jar"]
