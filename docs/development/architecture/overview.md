# Architecture Overview

This document outlines the architecture of OpenFrame's Java Spring Boot backend and Vue.js frontend.

## System Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[Vue.js UI]
        Store[Vuex Store]
        Router[Vue Router]
    end

    subgraph Backend
        Gateway[Spring Cloud Gateway]
        Auth[Spring Security]
        API[Spring Boot API]
        Stream[Spring Kafka]
        Data[Spring Data]
    end

    subgraph Data Layer
        MongoDB[(MongoDB)]
        Cassandra[(Cassandra)]
        Redis[(Redis)]
    end

    UI --> Gateway
    Gateway --> Auth
    Auth --> API
    API --> Stream
    API --> Data
    Data --> MongoDB
    Data --> Cassandra
    Stream --> Redis
```

## Component Architecture

### Frontend Architecture

```mermaid
graph TD
    A[Vue.js Application] --> B[Vue Router]
    A --> C[Vuex Store]
    A --> D[UI Components]
    
    B --> E[Route Components]
    C --> F[State Management]
    D --> G[Reusable Components]
    
    E --> H[Views]
    F --> I[Modules]
    G --> J[Base Components]
```

Key Components:
- **Vue.js**: Core frontend framework
- **Vuex**: State management
- **Vue Router**: Navigation and routing
- **Vue Test Utils**: Component testing
- **Playwright**: E2E testing

### Backend Architecture

```mermaid
graph TD
    A[Spring Boot Application] --> B[Controllers]
    A --> C[Services]
    A --> D[Repositories]
    A --> E[Models]
    
    B --> F[REST Endpoints]
    C --> G[Business Logic]
    D --> H[Data Access]
    E --> I[Domain Models]
    
    F --> J[API Layer]
    G --> K[Service Layer]
    H --> L[Data Layer]
```

Key Components:
- **Spring Boot**: Core application framework
- **Spring Security**: Authentication and authorization
- **Spring Data**: Data access layer
- **Spring Kafka**: Event streaming
- **Spring Cloud Gateway**: API gateway

## Development Patterns

### 1. Clean Architecture

```java
// Domain Layer
public class Device {
    private final String id;
    private final String name;
    private final DeviceStatus status;
    
    // Constructor, getters, etc.
}

// Application Layer
@Service
@RequiredArgsConstructor
public class DeviceService {
    private final DeviceRepository deviceRepository;
    
    public Device createDevice(CreateDeviceCommand command) {
        Device device = new Device(command.getName(), command.getType());
        return deviceRepository.save(device);
    }
}

// Infrastructure Layer
@Repository
public interface DeviceRepository extends MongoRepository<Device, String> {
    Optional<Device> findByDeviceId(String deviceId);
}
```

### 2. Repository Pattern

```java
// Repository Interface
public interface DeviceRepository {
    Optional<Device> findById(String id);
    List<Device> findByStatus(DeviceStatus status);
    Device save(Device device);
}

// Implementation
@Repository
public class MongoDeviceRepository implements DeviceRepository {
    private final MongoTemplate mongoTemplate;
    
    @Override
    public Optional<Device> findById(String id) {
        return Optional.ofNullable(
            mongoTemplate.findById(id, Device.class)
        );
    }
}
```

## Project Structure

```
openframe/
├── services/
│   ├── openframe-api/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   └── java/
│   │   │   │       └── com/openframe/
│   │   │   │           ├── controller/
│   │   │   │           ├── service/
│   │   │   │           ├── repository/
│   │   │   │           └── model/
│   │   │   └── test/
│   │   └── pom.xml
│   └── openframe-ui/
│       ├── src/
│       │   ├── components/
│       │   ├── views/
│       │   ├── store/
│       │   └── router/
│       └── package.json
└── libraries/
    ├── openframe-data/
    └── openframe-security/
```

## Technology Stack

### Backend
- **Framework**: Spring Boot 3.2.x
- **Language**: Java 21
- **Build Tool**: Maven 3.9.6+
- **Database**: MongoDB, Cassandra
- **Cache**: Redis
- **Message Broker**: Apache Kafka
- **API Gateway**: Spring Cloud Gateway
- **Security**: Spring Security with OAuth 2.0
- **Testing**: JUnit 5, Mockito, TestContainers

### Frontend
- **Framework**: Vue.js 3
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Vuex
- **Routing**: Vue Router
- **UI Framework**: Vuetify
- **Testing**: Vue Test Utils, Playwright
- **Package Manager**: npm

### Infrastructure
- **Container Orchestration**: Kubernetes
- **Service Mesh**: Istio
- **Monitoring**: Prometheus, Grafana
- **Logging**: Loki
- **CI/CD**: GitHub Actions

## Next Steps

- [Development Setup](setup.md) - Set up your environment
- [API Documentation](../api/overview.md) - Learn about the API
- [Contributing](contributing.md) - Learn how to contribute
- [Testing](testing.md) - Learn about testing
- [Code Style](code-style.md) - Follow coding standards 