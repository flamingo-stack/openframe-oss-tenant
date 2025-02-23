FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=app target/*.jar app.jar

EXPOSE 8100
ENTRYPOINT ["java", "-jar", "app.jar"] 