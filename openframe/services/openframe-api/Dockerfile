FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY target/*.jar app.jar
COPY ../scripts/debug-network.sh /debug-network.sh

# Add debugging tools
RUN apk add --no-cache iputils bind-tools netcat-openbsd

RUN chmod +x /debug-network.sh

EXPOSE 8090
ENTRYPOINT ["java", "-jar", "app.jar"]