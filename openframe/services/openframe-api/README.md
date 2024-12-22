# OpenFrame API

OpenFrame API is the core backend service responsible for:

• Implementing GraphQL or REST endpoints to handle main application logic.  
• Interacting with data sources such as MongoDB, Cassandra, or Pinot.  
• Handling security and business logic for user requests.  

## Key Files
- pom.xml: Maven configuration for building the Java/Spring project.  
- ApiApplication.java: Spring Boot entry point.  

## Running Locally
1. Ensure MongoDB, Cassandra, and Kafka are running if your API depends on them.  
2. Edit openframe/config/openframe-api-local.yml (if needed) with local service endpoints.  
3. Use Maven to build and start:  
   » mvn clean install  
   » mvn spring-boot:run  

## Building in Docker
1. Review openframe-api-docker.yml or the Dockerfile if present.  
2. Build and run containers:  
   » docker-compose -f docker-compose.openframe-infrastructure.yml up -d  
   » docker-compose -f openframe-api-docker.yml up -d  

## Endpoints
• GraphQL endpoint typically hosted at /graphql.  
• Health checks often at /actuator/health.  
• Swagger or compiled GraphQL schema may be available if configured.

## Additional Notes
• Observability: Exposes Prometheus metrics at /actuator/prometheus (if enabled).  
• Logging: Configurable via application.yml or environment variables. 