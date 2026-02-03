# Architecture Overview

OpenFrame is built as a modern, cloud-native platform using microservices architecture, event-driven design, and multi-tenant isolation. This guide provides developers with a comprehensive understanding of the system's architecture, design patterns, and component relationships.

## High-Level System Architecture

```mermaid
flowchart TB
    subgraph "Client Layer"
        Browser[Browser UI]
        ChatApp[Chat Desktop App]
        Agent[OpenFrame Agent]
    end

    subgraph "API Gateway Layer"
        Gateway[Gateway Service<br/>8080]
    end

    subgraph "Application Services"
        API[API Service<br/>GraphQL + REST<br/>8081]
        Auth[Authorization Server<br/>OAuth2 + OIDC<br/>8082]
        Management[Management Service<br/>8083]
        Stream[Stream Service<br/>Kafka Processing<br/>8084]
        Config[Config Service<br/>8085]
        Client[Client Service<br/>8086]
    end

    subgraph "Data Layer"
        Mongo[(MongoDB<br/>Configuration)]
        Cassandra[(Cassandra<br/>Time-series)]
        Pinot[(Pinot<br/>Analytics)]
        Redis[(Redis<br/>Cache)]
        Kafka[Apache Kafka<br/>Events]
    end

    subgraph "External Integrations"
        Fleet[Fleet MDM]
        Tactical[Tactical RMM]
        Mesh[MeshCentral]
        NATS[NATS Messaging]
    end

    Browser --> Gateway
    ChatApp --> Gateway
    Agent --> Gateway

    Gateway --> API
    Gateway --> Auth
    Gateway --> Management
    Gateway --> Stream
    Gateway --> Config
    Gateway --> Client

    API --> Mongo
    API --> Redis
    Auth --> Mongo
    Management --> Mongo
    Management --> Kafka
    Stream --> Cassandra
    Stream --> Pinot
    Stream --> Kafka
    Client --> NATS

    API --> Fleet
    API --> Tactical
    API --> Mesh
```

## Core Components

### Service Layer Architecture

| Service | Port | Purpose | Technology Stack |
|---------|------|---------|------------------|
| **Gateway** | 8080 | Routing, Auth, WebSockets | Spring WebFlux, Reactive |
| **API** | 8081 | GraphQL API, Business Logic | Spring Boot, Netflix DGS |
| **Authorization** | 8082 | OAuth2, OIDC, Multi-tenant Auth | Spring Authorization Server |
| **Management** | 8083 | Platform Control, Schedulers | Spring Boot, ShedLock |
| **Stream** | 8084 | Event Processing, Enrichment | Kafka Streams |
| **Config** | 8085 | Centralized Configuration | Spring Cloud Config |
| **Client** | 8086 | Agent Communication | Spring Boot, NATS |

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client as OpenFrame Agent
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant API as API Service
    participant Stream as Stream Service
    participant DB as Data Stores

    Client->>Gateway: Device heartbeat
    Gateway->>Auth: Validate JWT token
    Auth-->>Gateway: Token valid
    Gateway->>API: Forward request
    API->>Stream: Publish event to Kafka
    Stream->>DB: Store enriched data
    API->>DB: Query processed data
    DB-->>API: Return results
    API-->>Gateway: GraphQL response
    Gateway-->>Client: HTTP response
```

## Design Patterns and Principles

### 1. Event-Driven Architecture

OpenFrame uses Apache Kafka for asynchronous communication between services:

```mermaid
flowchart LR
    A[Service A] -->|Publish Event| K[Kafka Topic]
    K -->|Consume Event| B[Service B]
    K -->|Consume Event| C[Service C]
    
    subgraph "Event Types"
        E1[Device Events]
        E2[User Events]
        E3[System Events]
        E4[Integration Events]
    end
```

**Key Kafka Topics:**
- `device.heartbeats` - Agent status updates
- `user.activities` - User action events
- `system.alerts` - Platform alerts
- `integration.events` - External tool events

### 2. Multi-Tenant Isolation

Tenant isolation is enforced at multiple layers:

```yaml
Database Level:
  - MongoDB collections prefixed with tenant ID
  - Cassandra keyspaces per tenant
  - Redis key namespacing

Application Level:
  - JWT tokens contain tenant claims
  - GraphQL context includes tenant information
  - Service methods validate tenant access

Infrastructure Level:
  - Kubernetes namespaces per tenant (production)
  - Network policies for isolation
  - Resource quotas and limits
```

### 3. Domain-Driven Design (DDD)

Services are organized around business domains:

```mermaid
graph TB
    subgraph "Device Management Domain"
        DeviceService[Device Service]
        AgentService[Agent Service]
        MonitoringService[Monitoring Service]
    end
    
    subgraph "User Management Domain"
        UserService[User Service]
        AuthService[Auth Service]
        OrgService[Organization Service]
    end
    
    subgraph "Integration Domain"
        ToolService[Tool Service]
        ConnectorService[Connector Service]
        SDKService[SDK Service]
    end
```

## Core Design Decisions

### API Design

#### GraphQL-First Approach

OpenFrame uses GraphQL as the primary API technology:

```graphql
# Example GraphQL Schema
type Organization {
  id: ID!
  name: String!
  devices: [Device!]!
  users: [User!]!
  createdAt: DateTime!
}

type Device {
  id: ID!
  hostname: String!
  platform: Platform!
  status: DeviceStatus!
  lastSeen: DateTime
  organization: Organization!
}

type Query {
  organizations(filter: OrganizationFilter): [Organization!]!
  devices(filter: DeviceFilter): DeviceConnection!
  logs(filter: LogFilter): LogConnection!
}

type Mutation {
  createOrganization(input: CreateOrganizationInput!): Organization!
  updateDevice(id: ID!, input: UpdateDeviceInput!): Device!
}

type Subscription {
  deviceStatusUpdated(organizationId: ID!): Device!
  newLogEntry(deviceId: ID!): LogEntry!
}
```

**Benefits:**
- ✅ Type-safe API contracts
- ✅ Efficient data fetching
- ✅ Real-time subscriptions via WebSockets
- ✅ Auto-generated documentation

#### REST for External Integrations

External API for third-party integrations uses REST:

```yaml
# External API Routes
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/devices
PATCH  /api/v1/devices/{id}/status
GET    /api/v1/logs
POST   /api/v1/events
```

### Security Architecture

#### JWT-Based Authentication

```mermaid
sequenceDiagram
    participant User as User/Agent
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant API as API Service

    User->>Auth: Login credentials
    Auth->>Auth: Validate credentials
    Auth-->>User: JWT token (HTTP-only cookie)
    User->>Gateway: Request with cookie
    Gateway->>Gateway: Extract JWT from cookie
    Gateway->>Auth: Validate token
    Auth-->>Gateway: Token claims
    Gateway->>API: Forward with Authorization header
    API->>API: Process with tenant context
    API-->>Gateway: Response
    Gateway-->>User: Response
```

**Key Security Features:**
- JWT tokens stored in HTTP-only cookies (not localStorage)
- Automatic token refresh
- Tenant-scoped permissions
- API rate limiting
- CORS configuration

### Data Architecture

#### Database Selection by Use Case

| Data Type | Database | Reasoning |
|-----------|----------|-----------|
| **Configuration** | MongoDB | Flexible schema, complex queries |
| **Time-series** | Cassandra | High write throughput, time-based partitioning |
| **Analytics** | Apache Pinot | Real-time OLAP, SQL queries |
| **Cache/Sessions** | Redis | Fast in-memory access |
| **Events** | Apache Kafka | Durable, scalable messaging |

#### Data Consistency Strategy

OpenFrame implements **eventual consistency** with careful design:

```mermaid
graph LR
    A[Write to Primary DB] --> B[Publish Event to Kafka]
    B --> C[Update Secondary DBs]
    B --> D[Update Cache]
    B --> E[Trigger Notifications]
    
    C --> F[Eventual Consistency Achieved]
    D --> F
    E --> F
```

## Component Relationships

### Service Dependencies

```mermaid
graph TD
    Config[Config Service] --> API[API Service]
    Config --> Gateway[Gateway Service]
    Config --> Auth[Auth Service]
    Config --> Management[Management Service]
    Config --> Stream[Stream Service]
    
    Auth --> API
    Auth --> Gateway
    
    Gateway --> API
    Gateway --> Auth
    Gateway --> Management
    
    API --> Stream
    Management --> Stream
```

**Dependency Rules:**
1. **Config Service** starts first (provides configuration)
2. **Auth Service** starts second (provides authentication)
3. **API Service** depends on Config + Auth
4. **Gateway** orchestrates all service communication
5. **Stream** and **Management** can start independently

### Inter-Service Communication

#### Synchronous Communication

```java
// Example: Service-to-service REST call
@Service
public class DeviceService {
    
    @Autowired
    private WebClient webClient;
    
    public DeviceStatus getDeviceStatus(String deviceId) {
        return webClient.get()
            .uri("http://client-service/api/devices/{id}/status", deviceId)
            .retrieve()
            .bodyToMono(DeviceStatus.class)
            .block();
    }
}
```

#### Asynchronous Communication

```java
// Example: Kafka event publishing
@Service
public class DeviceEventPublisher {
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    public void publishDeviceUpdate(Device device) {
        DeviceUpdateEvent event = new DeviceUpdateEvent(
            device.getId(),
            device.getStatus(),
            Instant.now()
        );
        
        kafkaTemplate.send("device.updates", device.getId(), event);
    }
}
```

## Extension Points

### 1. Custom Tool Integrations

Add new MSP tools by implementing SDK interfaces:

```java
public interface ToolSdk {
    String getToolType();
    CompletableFuture<ConnectionStatus> testConnection(ToolCredentials credentials);
    CompletableFuture<List<Device>> fetchDevices(ToolCredentials credentials);
    CompletableFuture<List<LogEntry>> fetchLogs(ToolCredentials credentials, LogFilter filter);
}

@Component
public class CustomToolSdk implements ToolSdk {
    
    @Override
    public String getToolType() {
        return "CUSTOM_TOOL";
    }
    
    @Override
    public CompletableFuture<ConnectionStatus> testConnection(ToolCredentials credentials) {
        // Implementation specific to your tool
        return CompletableFuture.supplyAsync(() -> {
            // Test connection logic
            return ConnectionStatus.CONNECTED;
        });
    }
}
```

### 2. Custom Event Processors

Extend stream processing with custom event enrichment:

```java
@Component
public class CustomEventProcessor implements EventProcessor<DeviceEvent> {
    
    @Override
    public boolean canProcess(Object event) {
        return event instanceof DeviceEvent;
    }
    
    @Override
    public CompletableFuture<ProcessedEvent> process(DeviceEvent event) {
        return CompletableFuture.supplyAsync(() -> {
            // Custom enrichment logic
            return ProcessedEvent.builder()
                .originalEvent(event)
                .enrichedData(customEnrichmentLogic(event))
                .build();
        });
    }
}
```

### 3. Custom GraphQL Resolvers

Add custom data fetchers for new domains:

```java
@DgsComponent
public class CustomDataFetcher {
    
    @DgsQuery
    public List<CustomEntity> customEntities(
            @InputArgument CustomFilter filter,
            DgsDataFetchingEnvironment dfe) {
        
        TenantContext tenant = dfe.getContext();
        return customService.findEntities(tenant.getTenantId(), filter);
    }
    
    @DgsSubscription
    public Publisher<CustomEntity> customEntityUpdated(
            @InputArgument String entityId) {
        
        return customEventPublisher.subscribe(entityId);
    }
}
```

## Performance Considerations

### Caching Strategy

```yaml
Cache Layers:
  - Application Cache: Caffeine (in-memory)
  - Distributed Cache: Redis (cross-service)
  - Database Cache: MongoDB/Cassandra built-in
  - CDN Cache: CloudFlare (static assets)

Cache Patterns:
  - Read-through: Cache-aside pattern
  - Write-through: Update cache on write
  - TTL: Time-based expiration
  - Invalidation: Event-driven cache clearing
```

### Scalability Patterns

```mermaid
graph TB
    subgraph "Horizontal Scaling"
        LB[Load Balancer] --> S1[Service Instance 1]
        LB --> S2[Service Instance 2]
        LB --> S3[Service Instance 3]
    end
    
    subgraph "Database Scaling"
        MongoDB[MongoDB Replica Set]
        Cassandra[Cassandra Cluster]
        Redis[Redis Cluster]
    end
    
    subgraph "Message Scaling"
        Kafka[Kafka Cluster<br/>Multiple Partitions]
    end
```

### Monitoring and Observability

OpenFrame includes comprehensive monitoring:

```yaml
Metrics: 
  - Micrometer + Prometheus (application metrics)
  - Custom business metrics
  - JVM and system metrics

Logging:
  - Structured JSON logging
  - Centralized log aggregation
  - Log correlation via trace IDs

Tracing:
  - Distributed tracing with Spring Cloud Sleuth
  - Request correlation across services
  - Performance bottleneck identification

Health Checks:
  - Actuator health endpoints
  - Database connectivity checks
  - External service dependency checks
```

## Key Design Decisions Summary

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **API Style** | GraphQL primary, REST secondary | Flexibility, type safety, real-time |
| **Architecture** | Microservices | Scalability, maintainability |
| **Communication** | Event-driven + Sync calls | Loose coupling, resilience |
| **Database** | Polyglot persistence | Right tool for each use case |
| **Authentication** | JWT + OAuth2 | Standard, scalable, secure |
| **Frontend** | Vue.js + TypeScript | Modern, reactive, type-safe |
| **Deployment** | Containerized + Kubernetes | Cloud-native, scalable |

---

This architecture provides a solid foundation for building a scalable, maintainable, and extensible MSP platform. The design emphasizes developer productivity while maintaining production-grade reliability and security.