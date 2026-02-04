# Architecture Overview

OpenFrame is built as a distributed, microservices-based platform designed for scalability, maintainability, and extensibility. This document provides a comprehensive overview of the system architecture, core components, and design decisions.

## High-Level Architecture

```mermaid
flowchart TD
    subgraph "Client Layer"
        Browser[Web Browser]
        Desktop[Desktop Apps]
        Mobile[Mobile Apps]
        API_Client[API Clients]
    end
    
    subgraph "Gateway Layer"
        Gateway[API Gateway Service]
        LB[Load Balancer]
    end
    
    subgraph "Service Layer"
        API[API Service]
        Auth[Authorization Server]
        Client[Client Service]
        Management[Management Service]
        Stream[Stream Processing]
        External[External API Service]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Cassandra[(Cassandra)]
        Redis[(Redis)]
        Kafka[Apache Kafka]
        Pinot[(Apache Pinot)]
    end
    
    subgraph "Integration Layer"
        TacticalRMM[Tactical RMM]
        MeshCentral[MeshCentral]
        FleetDM[Fleet MDM]
        Authentik[Authentik SSO]
    end
    
    Browser --> LB
    Desktop --> LB
    Mobile --> LB
    API_Client --> LB
    
    LB --> Gateway
    Gateway --> API
    Gateway --> Auth
    Gateway --> Client
    Gateway --> External
    
    API --> MongoDB
    API --> Redis
    Client --> MongoDB
    Management --> MongoDB
    
    Stream --> Kafka
    Kafka --> Cassandra
    Kafka --> Pinot
    
    API --> TacticalRMM
    API --> MeshCentral
    API --> FleetDM
    Auth --> Authentik
```

## Core Components

### API Gateway Service

**Purpose**: Single entry point for all client communications

**Responsibilities**:
- Request routing and load balancing
- Authentication and authorization
- Rate limiting and throttling
- CORS policy enforcement
- WebSocket connection management
- API versioning and documentation

**Technology Stack**:
- Spring Cloud Gateway
- JWT token validation
- Redis for rate limiting
- WebSocket proxy support

### API Service Core

**Purpose**: Primary business logic and data access layer

**Key Features**:
- GraphQL API for flexible data querying
- REST endpoints for standard operations
- Multi-tenant data isolation
- Real-time subscriptions
- Batch data loading (N+1 prevention)

**Architecture Pattern**:
```mermaid
flowchart TD
    GraphQL[GraphQL Layer] --> DataFetcher[Data Fetchers]
    REST[REST Controllers] --> Service[Service Layer]
    DataFetcher --> Service
    Service --> Repository[Repository Layer]
    Repository --> MongoDB[(MongoDB)]
    Repository --> Cache[(Redis Cache)]
    
    DataFetcher --> DataLoader[Data Loaders]
    DataLoader --> BatchService[Batch Services]
```

### Authorization Server

**Purpose**: OAuth 2.1 / OpenID Connect identity provider

**Features**:
- Multi-tenant SSO support
- Google and Microsoft integration
- JWT token issuance and validation
- User invitation and onboarding
- Session management

**Security Model**:
- RSA key pairs per tenant
- HTTP-only cookies for web clients
- Bearer tokens for API clients
- Refresh token rotation

### Client Service

**Purpose**: Device agent management and coordination

**Capabilities**:
- Agent registration and authentication
- Heartbeat monitoring
- Tool agent lifecycle management
- Remote command execution
- File system operations

### Stream Processing Service

**Purpose**: Real-time event processing and data enrichment

**Data Flow**:
```mermaid
flowchart LR
    Sources[Data Sources] --> Kafka[Kafka Topics]
    Kafka --> Processors[Stream Processors]
    Processors --> Enrichment[Data Enrichment]
    Enrichment --> Cassandra[(Cassandra)]
    Enrichment --> Pinot[(Pinot)]
    Enrichment --> Alerts[Alert Engine]
```

**Processing Types**:
- Device telemetry aggregation
- Log event correlation
- Security event detection
- Performance metric calculation
- Compliance monitoring

## Data Architecture

### Database Selection Strategy

| Database | Use Case | Rationale |
|----------|----------|-----------|
| **MongoDB** | Transactional data | Document flexibility, ACID compliance |
| **Cassandra** | Time-series data | High write throughput, time-based partitioning |
| **Redis** | Caching & sessions | Low latency, pub/sub capabilities |
| **Apache Pinot** | Analytics queries | Real-time OLAP, sub-second query response |

### Data Flow Patterns

#### Transactional Operations

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant MongoDB
    participant Cache
    
    Client->>Gateway: GraphQL Mutation
    Gateway->>API: Authenticated Request
    API->>MongoDB: Write Transaction
    MongoDB-->>API: Success
    API->>Cache: Invalidate Cache
    API-->>Gateway: Response
    Gateway-->>Client: Result
```

#### Analytics Pipeline

```mermaid
sequenceDiagram
    participant Source
    participant Kafka
    participant Stream
    participant Cassandra
    participant Pinot
    participant API
    
    Source->>Kafka: Raw Events
    Stream->>Kafka: Consume Events
    Stream->>Stream: Enrich & Transform
    Stream->>Cassandra: Store Time-Series
    Stream->>Pinot: Real-time Indexing
    API->>Pinot: Analytics Query
    Pinot-->>API: Aggregated Results
```

## Security Architecture

### Authentication Flow

```mermaid
flowchart TD
    User[User Login] --> Auth[Authorization Server]
    Auth --> Provider{SSO Provider?}
    Provider -->|Yes| Google[Google OAuth]
    Provider -->|Yes| Microsoft[Microsoft OAuth]
    Provider -->|No| Local[Local Authentication]
    
    Google --> Validate[Validate Tokens]
    Microsoft --> Validate
    Local --> Validate
    
    Validate --> JWT[Generate JWT]
    JWT --> Cookie[Set HTTP-Only Cookie]
    Cookie --> Gateway[Gateway Validates]
    Gateway --> Services[Internal Services]
```

### Authorization Model

```mermaid
classDiagram
    class User {
        +id: String
        +email: String
        +roles: List~Role~
        +organizationId: String
    }
    
    class Role {
        +name: String
        +permissions: List~Permission~
    }
    
    class Permission {
        +resource: String
        +action: String
        +scope: String
    }
    
    class Organization {
        +id: String
        +name: String
        +users: List~User~
    }
    
    User ||--o{ Role : has
    Role ||--o{ Permission : contains
    Organization ||--o{ User : contains
```

### Multi-Tenant Isolation

- **Data Isolation**: Organization-based partitioning in MongoDB
- **Service Isolation**: Tenant context propagation via JWT claims
- **Cache Isolation**: Redis key prefixing by tenant ID
- **Stream Isolation**: Kafka topic partitioning by organization

## Component Integration Patterns

### Service-to-Service Communication

#### Synchronous Communication
```java
// REST Client with Circuit Breaker
@FeignClient(name = "management-service")
public interface ManagementClient {
    @GetMapping("/api/organizations/{id}")
    Organization getOrganization(@PathVariable String id);
}
```

#### Asynchronous Communication
```java
// Kafka Event Publishing
@EventListener
public void handleDeviceEvent(DeviceStatusChangedEvent event) {
    kafkaTemplate.send("device-events", event.getDeviceId(), event);
}
```

### Data Access Patterns

#### Repository Pattern with Caching

```java
@Service
public class DeviceService {
    
    @Autowired
    private DeviceRepository repository;
    
    @Autowired
    private RedisTemplate<String, Device> cache;
    
    @Cacheable(value = "devices", key = "#deviceId")
    public Device getDevice(String deviceId) {
        return repository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
    }
}
```

#### Event Sourcing for Audit Trail

```java
@EventHandler
public void on(DeviceRegisteredEvent event) {
    Device device = new Device(event.getDeviceId());
    device.setOrganizationId(event.getOrganizationId());
    device.setStatus(DeviceStatus.REGISTERED);
    deviceRepository.save(device);
}
```

## Key Design Decisions

### Microservices vs Modular Monolith

**Decision**: Microservices architecture with shared libraries

**Rationale**:
- Independent deployment and scaling
- Technology diversity (Java backend, Rust agents, Vue frontend)
- Team autonomy and ownership
- Fault isolation

**Trade-offs**:
- Increased operational complexity
- Network latency between services
- Distributed transaction challenges

### Database Per Service

**Decision**: Each service owns its data with selective sharing

**Implementation**:
- API Service: MongoDB for business entities
- Stream Service: Cassandra for time-series data
- Gateway: Redis for sessions and rate limiting
- Analytics: Pinot for real-time queries

### Event-Driven Architecture

**Decision**: Kafka-based event streaming for loose coupling

**Benefits**:
- Asynchronous processing
- Event replay capability
- Scalable data pipeline
- Real-time analytics

## Performance and Scalability

### Caching Strategy

```mermaid
flowchart TD
    Client[Client Request] --> CDN[CDN Cache]
    CDN --> Gateway[Gateway Cache]
    Gateway --> Redis[Redis Cache]
    Redis --> Service[Service Layer]
    Service --> DB[(Database)]
    
    CDN -.->|Cache Miss| Gateway
    Gateway -.->|Cache Miss| Redis
    Redis -.->|Cache Miss| Service
    Service -.->|Cache Miss| DB
```

### Horizontal Scaling

| Component | Scaling Strategy | Metrics |
|-----------|-----------------|---------|
| **Gateway** | Load balancer + instances | Request rate, response time |
| **API Service** | Stateless replicas | CPU, memory utilization |
| **Stream Processing** | Kafka partitions | Message throughput, lag |
| **Database** | Read replicas, sharding | Connection count, query time |

### Performance Optimization Techniques

1. **GraphQL DataLoaders**: Batch database queries to prevent N+1 problems
2. **Connection Pooling**: Optimized database connection management
3. **Lazy Loading**: Load data only when needed
4. **Pagination**: Cursor-based pagination for large datasets
5. **Compression**: Gzip compression for API responses

## Monitoring and Observability

### Metrics Collection

```mermaid
flowchart LR
    Services[OpenFrame Services] --> Prometheus[Prometheus]
    Prometheus --> Grafana[Grafana Dashboards]
    
    Services --> Logs[Application Logs]
    Logs --> Loki[Grafana Loki]
    Loki --> Grafana
    
    Services --> Traces[Distributed Traces]
    Traces --> Jaeger[Jaeger Tracing]
    Jaeger --> Grafana
```

### Health Checks

```java
@Component
@RestController
public class HealthController {
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("database", databaseHealth());
        status.put("cache", cacheHealth());
        return ResponseEntity.ok(status);
    }
}
```

## Extension Points

### Plugin Architecture

OpenFrame supports extensions through:

1. **Custom Processors**: Implement event processing logic
2. **Data Mappers**: Transform external data formats
3. **Authentication Providers**: Add new SSO integrations
4. **Tool Integrations**: Connect additional MSP tools

### Configuration Management

```yaml
# application.yml - Extension Configuration
openframe:
  extensions:
    processors:
      - name: "custom-alert-processor"
        class: "com.mycompany.CustomAlertProcessor"
        enabled: true
    integrations:
      - name: "my-rmm-tool"
        type: "rmm"
        config:
          apiUrl: "${MY_RMM_API_URL}"
          apiKey: "${MY_RMM_API_KEY}"
```

## Future Architecture Considerations

### Planned Enhancements

1. **Service Mesh**: Istio integration for advanced traffic management
2. **Event Store**: Dedicated event sourcing database
3. **CQRS Implementation**: Separate read/write models for better performance
4. **API Gateway Evolution**: Move to envoy-based gateway
5. **Multi-Region Support**: Geographic distribution for global MSPs

### Technology Evolution

| Current | Future | Timeline |
|---------|--------|----------|
| Spring Boot 3.3 | Spring Boot 4.x | 2025 |
| Vue 3 | Vue 4 | 2025 |
| Kafka | Event Store + Kafka | 2024 |
| MongoDB 7.x | MongoDB 8.x | 2024 |

---

This architecture enables OpenFrame to scale from single-tenant deployments to large multi-tenant SaaS platforms while maintaining performance, security, and maintainability.