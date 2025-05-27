
# OpenFrame Client Service

This microservice is responsible for handling all client and machine (agent) related operations in the OpenFrame platform. It manages:

- Machine/agent registration and authentication
- Client management (CRUD)
- WebSocket endpoints for real-time agent/metrics data
- Any endpoints related to device or client management

## Structure

- `src/main/java/com/openframe/client/` — Main Java source code
  - `config/` — Configuration classes
  - `controller/` — REST controllers
  - `service/` — Business logic
  - `repository/` — Data access
  - `model/` — Domain models
  - `exception/` — Custom exceptions
  - `ClientApplication.java` — Main Spring Boot application class
- `src/main/resources/` — Service configuration (e.g., `application.yml`)
- `pom.xml` — Maven configuration

## Dependencies
- openframe-core
- openframe-data
- openframe-security
- Spring Boot, Spring Cloud, Micrometer

## Getting Started

```bash
cd services/openframe-client
mvn spring-boot:run
```

## Deployment
See the main OpenFrame deployment documentation for details on deploying this service as part of the platform. 