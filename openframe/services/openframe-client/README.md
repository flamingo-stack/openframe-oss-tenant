# OpenFrame Client Service

The OpenFrame Client Service manages agent connections, registrations, and communications for the OpenFrame platform. It handles machine lifecycle, tool integrations, and real-time agent interactions.

## Architecture

This service follows the **Shared Library Pattern** where business logic is extracted into `openframe-client-core` library:

```
openframe-client (service) → openframe-client-core (lib) → openframe-data-*, openframe-security-core
```

### Key Components

- **Application Entry Point**: `ClientApplication.java` (this service)
- **Business Logic**: `openframe-client-core` library in `openframe-oss-lib`
- **Configuration**: Environment-specific settings in this service

## Features

- **Agent Registration**: Handles agent onboarding and authentication
- **Machine Management**: Tracks machine lifecycle and status
- **Tool Integration**: Connects with Tactical RMM, Fleet MDM, and MeshCentral
- **WebSocket Support**: Real-time agent communications
- **Heartbeat Monitoring**: Tracks agent health and connectivity
- **Tag Management**: Organizes machines with tags
- **File Distribution**: Manages agent installer files

## Dependencies

### Core Library Dependency

```xml
<dependency>
    <groupId>com.openframe.oss</groupId>
    <artifactId>openframe-client-core</artifactId>
    <version>${openframe.libs.version}</version>
</dependency>
```

The `openframe-client-core` library provides:
- Controllers (Agent, Auth, FileController)
- Services (Registration, Authentication, Connection Management)
- DTOs and Mappers
- Exception Handlers
- Listeners (Connection, Heartbeat)
- Aspects (Event Publishing)

## Configuration

### Environment Profiles

- **local**: Local development
- **docker**: Docker deployment
- **k8s**: Kubernetes deployment

### Key Configuration Properties

```yaml
spring:
  application:
    name: openframe-client
  config:
    url: http://openframe-config.microservices.svc.cluster.local:8888
    activate:
      on-profile: dev
    import: "optional:configserver:http://openframe-config.microservices.svc.cluster.local:8888"
```

Configuration is loaded from Spring Cloud Config Server.

## API Endpoints

### Agent Registration
- `POST /agent/register` - Register new agent
- `POST /agent/auth` - Authenticate agent

### Agent Management
- `GET /agent/{machineId}` - Get agent details
- `PUT /agent/{machineId}` - Update agent information
- `DELETE /agent/{machineId}` - Deactivate agent

### File Distribution
- `GET /agent/files/{toolType}/{platform}` - Download agent installer

## Building

### Build with Maven

```bash
mvn clean package
```

### Build Docker Image

```bash
docker build -t openframe/client:latest .
```

## Running

### Local Development

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Docker

```bash
docker run -p 8082:8082 openframe/client:latest
```

### Kubernetes

```bash
kubectl apply -f skaffold.yaml
```

## Agent Files

Agent installer files are now part of `openframe-client-core` library and are automatically included when the library is used. The files are served via the `/tool-agent/{assetId}?os={platform}` endpoint implemented in the core library.

## Development

### Component Scanning

The application scans the following packages:
- `com.openframe.client` - Core client logic (from openframe-client-core)
- `com.openframe.data` - Data access components
- `com.openframe.core` - Core utilities
- `com.openframe.security` - Security components
- `com.openframe.kafka.producer` - Kafka producers

### Excluded Components

- `CassandraHealthIndicator` - Not used in this service

## Testing

Tests are located in `openframe-client-core` module.

```bash
# Run tests from the library
cd /path/to/openframe-oss-lib/openframe-client-core
mvn test
```

## Integration

### Tool SDKs
- **Tactical RMM SDK**: Agent ID transformation and API integration
- **Fleet MDM SDK**: osquery integration
- **MeshCentral**: Remote access capabilities

### Event Publishing
- Publishes machine tag events to Kafka
- Listens for connection and heartbeat events
- Tracks machine status changes

## Deployment

### Port Configuration
- Default: `8082`
- Health Check: `/actuator/health`
- Metrics: `/actuator/metrics`

### Health Checks

The service provides Spring Boot Actuator endpoints for monitoring:
- Liveness: `/actuator/health/liveness`
- Readiness: `/actuator/health/readiness`

## References

- **Core Library**: [openframe-client-core](https://github.com/flamingo-stack/openframe-oss-lib/tree/main/openframe-client-core)
- **Architecture Docs**: [Shared Library Pattern](/.cursor/rules/api-library-architecture.mdc)
- **Data Access**: [Database Patterns](/.cursor/rules/database-patterns.mdc)

## License

Copyright © 2024 OpenFrame

