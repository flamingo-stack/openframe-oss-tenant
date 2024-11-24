FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY target/*.jar app.jar

# Add debugging tools
RUN apk add --no-cache iputils bind-tools netcat-openbsd

EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]