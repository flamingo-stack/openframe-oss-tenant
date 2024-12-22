FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache iputils bind-tools netcat-openbsd curl

EXPOSE 8082
ENTRYPOINT ["/bin/sh", "-c", "export CONTAINER_IP=$(hostname -i) && java -jar app.jar --spring.profiles.active=docker"]