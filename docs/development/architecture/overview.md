# Architecture Overview

OpenFrame follows a modern, microservices-based architecture designed for scalability, maintainability, and extensibility. This guide provides developers with a comprehensive understanding of the system design, key components, and architectural patterns.

## High-Level System Architecture

### Service-Oriented Design

OpenFrame is built as a distributed system with clear separation of concerns:

```mermaid
flowchart TB
    subgraph "Client Layer"
        Browser[Web Browser]
        ChatApp[Chat Desktop App]
        SystemAgent[System Agent]
        ExternalAPI[External API Clients]
    end
    
    subgraph "Gateway Layer"
        Gateway[Gateway Service]
    end
    
    subgraph "Service Layer"
        AuthzSvc[Authorization Server]
        ApiSvc[API Service]
        ExtApiSvc[External API Service]
        ClientSvc[Client Service]
        StreamSvc[Stream Service]
        MgmtSvc[Management Service]
        ConfigSvc[Config Service]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Redis[(Redis)]
        Kafka[(Kafka)]
        Cassandra[(Cassandra)]
        Pinot[(Apache Pinot)]
    end
    
    Browser --> Gateway
    ChatApp --> Gateway
    SystemAgent --> Gateway
    ExternalAPI --> Gateway
    
    Gateway --> AuthzSvc
    Gateway --> ApiSvc
    Gateway --> ExtApiSvc
    Gateway --> ClientSvc
    
    ApiSvc --> MongoDB
    ApiSvc --> Redis
    StreamSvc --> Kafka
    StreamSvc --> Cassandra
    StreamSvc --> Pinot
    MgmtSvc --> MongoDB
    
    style Gateway fill:#FFC008
    style Kafka fill:#ff7043
    style MongoDB fill:#4caf50
```

### Core Design Principles

| Principle | Implementation | Benefits |
|-----------|---------------|----------|
| **Microservices** | Each service has single responsibility | Independent scaling and deployment |
| **Event-Driven** | Kafka-based async communication | Loose coupling and resilience |
| **API-First** | GraphQL and REST APIs | Developer-friendly integration |
| **Cloud-Native** | Containerized with Kubernetes support | Portable and scalable deployment |
| **Security-First** | JWT, OAuth2, role-based access | Enterprise-grade security |

## Service Architecture Details

### Gateway Service (openframe-gateway)

**Purpose**: Entry point for all external traffic with routing, authentication, and proxying.

#### Key Responsibilities

- **Request Routing**: Intelligent routing based on paths and headers
- **Authentication**: JWT validation and API key verification
- **WebSocket Proxying**: Real-time communication support
- **Rate Limiting**: Protection against abuse
- **CORS Handling**: Cross-origin request management

#### Architecture Pattern

```mermaid
graph LR
    A[Client Request] --> B[Rate Limiting]
    B --> C[Authentication]
    C --> D[Route Resolution]
    D --> E[Service Proxy]
    E --> F[Target Service]
    
    G[WebSocket] --> H[WS Proxy]
    H --> I[Internal Services]
    
    style B fill:#ffeb3b
    style C fill:#FFC008
```

#### Configuration Example

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: api-route
          uri: http://localhost:8081
          predicates:
            - Path=/graphql/**,/api/**
        - id: auth-route
          uri: http://localhost:9000
          predicates:
            - Path=/oauth/**,/login/**
```

### API Service (openframe-api)

**Purpose**: Core business logic API using GraphQL for internal operations.

#### GraphQL Schema Design

```graphql
type Query {
    devices(filter: DeviceFilter, pagination: PaginationInput): DeviceConnection
    organizations(filter: OrgFilter): [Organization]
    logs(filter: LogFilter, pagination: PaginationInput): LogConnection
    users(pagination: PaginationInput): UserConnection
}

type Mutation {
    createOrganization(input: CreateOrgInput!): Organization
    updateDevice(id: ID!, input: UpdateDeviceInput!): Device
    inviteUser(input: InviteUserInput!): Invitation
}

type Subscription {
    deviceUpdates(organizationId: ID!): Device
    logEvents(filter: LogFilter): LogEvent
}
```

#### Data Fetcher Architecture

```mermaid
graph TD
    A[GraphQL Request] --> B[DataFetcher]
    B --> C[Service Layer]
    C --> D[Repository Layer]
    D --> E[Database]
    
    F[DataLoader] --> G[Batch Processing]
    G --> H[Cache Layer]
    H --> E
    
    style B fill:#4fc3f7
    style F fill:#66bb6a
```

### Authorization Server (openframe-authorization-server)

**Purpose**: OAuth2/OpenID Connect server for authentication and authorization.

#### Security Architecture

```mermaid
sequenceDiagram
    participant Client
    participant AuthServer
    participant ResourceServer
    participant Database
    
    Client->>AuthServer: Login Request
    AuthServer->>Database: Validate Credentials
    Database-->>AuthServer: User Data
    AuthServer->>AuthServer: Generate JWT
    AuthServer-->>Client: Access Token (HTTP-Only Cookie)
    
    Client->>ResourceServer: API Request (with Cookie)
    ResourceServer->>AuthServer: Validate Token
    AuthServer-->>ResourceServer: Token Claims
    ResourceServer-->>Client: API Response
```

#### Multi-Tenant Support

```java
@Component
public class TenantAwareAuthenticationProvider {
    public Authentication authenticate(Authentication auth) {
        String tenantId = extractTenantId(auth);
        // Tenant-specific authentication logic
        return createAuthentication(auth, tenantId);
    }
}
```

### Stream Service (openframe-stream)

**Purpose**: Real-time data processing and event streaming using Apache Kafka.

#### Stream Processing Architecture

```mermaid
graph LR
    A[Data Sources] --> B[Kafka Topics]
    B --> C[Stream Processors]
    C --> D[Enrichment]
    D --> E[Data Sinks]
    
    F[External Tools] --> G[Debezium CDC]
    G --> B
    
    C --> H[Real-time Analytics]
    C --> I[Alerting]
    
    style B fill:#ff7043
    style C fill:#42a5f5
```

#### Event Processing Pipeline

```java
@KafkaListener(topics = "device-events")
public void processDeviceEvent(DeviceEvent event) {
    // Enrich event data
    EnrichedDeviceEvent enriched = enrichmentService.enrich(event);
    
    // Store in time-series database
    cassandraRepository.save(enriched);
    
    // Update real-time analytics
    pinotProducer.send("analytics-events", enriched);
    
    // Trigger alerts if needed
    alertService.evaluateAlerts(enriched);
}
```

## Data Architecture

### Database Strategy

OpenFrame uses a polyglot persistence approach, choosing the right database for each use case:

| Database | Use Case | Data Types | Access Pattern |
|----------|----------|------------|----------------|
| **MongoDB** | Primary application data | Documents, references | CRUD operations |
| **Redis** | Caching and sessions | Key-value pairs | High-frequency reads |
| **Cassandra** | Time-series data | Device metrics, logs | Write-heavy, time-based queries |
| **Apache Pinot** | Real-time analytics | Aggregated metrics | OLAP queries |

### Data Flow Architecture

```mermaid
graph TD
    A[Application Data] --> B[MongoDB]
    C[User Sessions] --> D[Redis]
    E[Device Events] --> F[Kafka]
    F --> G[Cassandra]
    F --> H[Pinot]
    
    I[Real-time Queries] --> H
    J[Historical Analysis] --> G
    K[Application Queries] --> B
    L[Session Data] --> D
    
    style F fill:#ff7043
    style B fill:#4caf50
    style D fill:#f44336
    style G fill:#9c27b0
```

### Event Schema Design

```json
{
  "eventSchema": {
    "type": "object",
    "properties": {
      "eventId": {"type": "string"},
      "tenantId": {"type": "string"},
      "deviceId": {"type": "string"},
      "timestamp": {"type": "string", "format": "date-time"},
      "eventType": {"type": "string"},
      "severity": {"type": "string"},
      "data": {"type": "object"},
      "metadata": {"type": "object"}
    },
    "required": ["eventId", "tenantId", "timestamp", "eventType"]
  }
}
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Gateway
    participant AuthServer
    participant APIService
    participant Database
    
    Browser->>Gateway: Request with Cookie
    Gateway->>Gateway: Extract JWT from Cookie
    Gateway->>AuthServer: Validate JWT
    AuthServer-->>Gateway: JWT Claims
    Gateway->>Gateway: Add Authorization Header
    Gateway->>APIService: Proxied Request
    APIService->>Database: Query
    Database-->>APIService: Data
    APIService-->>Gateway: Response
    Gateway-->>Browser: Final Response
```

### Authorization Model

#### Role-Based Access Control (RBAC)

```java
public enum Role {
    ADMIN("admin", Set.of(Permission.ALL)),
    USER("user", Set.of(Permission.READ, Permission.WRITE_OWN)),
    VIEWER("viewer", Set.of(Permission.READ));
    
    private final String name;
    private final Set<Permission> permissions;
}

@PreAuthorize("hasRole('ADMIN') or @deviceService.isOwner(#deviceId, authentication.name)")
public Device updateDevice(String deviceId, UpdateDeviceInput input) {
    return deviceService.update(deviceId, input);
}
```

#### Multi-Tenant Isolation

```java
@Component
public class TenantContextFilter implements Filter {
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) {
        String tenantId = extractTenantId(request);
        TenantContext.setCurrentTenant(tenantId);
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
```

## Frontend Architecture

### Vue.js Application Structure

```mermaid
graph TD
    A[Vue 3 App] --> B[Router]
    A --> C[Pinia Stores]
    A --> D[Apollo Client]
    
    B --> E[Page Components]
    C --> F[State Management]
    D --> G[GraphQL Operations]
    
    E --> H[UI Components]
    E --> I[Business Logic]
    
    H --> J[PrimeVue Components]
    I --> K[Composables]
    
    style A fill:#4fc3f7
    style C fill:#66bb6a
    style D fill:#ff7043
```

### Component Architecture

```typescript
// Page Component
export default defineComponent({
  setup() {
    const devicesStore = useDevicesStore();
    const { devices, loading, error } = storeToRefs(devicesStore);
    
    const { result, loading: queryLoading } = useQuery(DEVICES_QUERY, {
      filter: computed(() => devicesStore.currentFilter)
    });
    
    return {
      devices,
      loading: computed(() => loading.value || queryLoading.value),
      error
    };
  }
});
```

### State Management Pattern

```typescript
// Pinia Store
export const useDevicesStore = defineStore('devices', () => {
  const devices = ref<Device[]>([]);
  const currentFilter = ref<DeviceFilter>({});
  const loading = ref(false);
  
  const fetchDevices = async (filter: DeviceFilter) => {
    loading.value = true;
    try {
      const result = await apolloClient.query({
        query: DEVICES_QUERY,
        variables: { filter }
      });
      devices.value = result.data.devices.edges.map(edge => edge.node);
    } finally {
      loading.value = false;
    }
  };
  
  return {
    devices: readonly(devices),
    currentFilter: readonly(currentFilter),
    loading: readonly(loading),
    fetchDevices
  };
});
```

## Integration Architecture

### External Tool Integration

OpenFrame integrates with external MSP tools through a standardized adapter pattern:

```mermaid
graph LR
    A[OpenFrame Core] --> B[Integration Layer]
    B --> C[Tool Adapters]
    
    C --> D[Tactical RMM]
    C --> E[FleetDM]
    C --> F[MeshCentral]
    C --> G[Custom Tools]
    
    H[Event Bus] --> I[Tool Events]
    I --> J[Unified Events]
    J --> K[Stream Processing]
    
    style B fill:#FFC008
    style H fill:#ff7043
```

### Tool Adapter Interface

```java
public interface ToolAdapter {
    String getToolType();
    boolean isHealthy();
    
    CompletableFuture<List<Device>> getDevices();
    CompletableFuture<List<Event>> getEvents(EventFilter filter);
    CompletableFuture<CommandResult> executeCommand(Command command);
    
    void registerEventHandler(EventHandler handler);
}

@Component
public class TacticalRmmAdapter implements ToolAdapter {
    private final TacticalRmmClient client;
    
    @Override
    public CompletableFuture<List<Device>> getDevices() {
        return client.getAgents()
            .thenApply(this::convertToDevices);
    }
}
```

## Performance Architecture

### Caching Strategy

```mermaid
graph TD
    A[Client Request] --> B[Gateway Cache]
    B --> C[Service Cache]
    C --> D[Database]
    
    E[Redis L1] --> F[Application L2]
    F --> G[Database L3]
    
    H[Cache Invalidation] --> I[Event Bus]
    I --> J[Cache Updates]
    
    style E fill:#f44336
    style I fill:#ff7043
```

### Performance Optimization Patterns

#### Database Query Optimization

```java
@Repository
public class DeviceRepository {
    // Use indexes for common queries
    @Query("{ 'organizationId': ?0, 'status': ?1 }")
    @Index(def = "{ 'organizationId': 1, 'status': 1 }")
    List<Device> findByOrganizationAndStatus(String orgId, DeviceStatus status);
    
    // Paginated queries
    Page<Device> findByOrganizationId(String orgId, Pageable pageable);
}
```

#### GraphQL N+1 Problem Solution

```java
@Component
public class OrganizationDataLoader implements BatchLoader<String, Organization> {
    @Override
    public CompletableFuture<List<Organization>> load(List<String> orgIds) {
        return CompletableFuture.supplyAsync(() -> 
            organizationService.findByIds(orgIds)
        );
    }
}
```

## Monitoring and Observability

### Monitoring Architecture

```mermaid
graph TD
    A[Application Metrics] --> B[Micrometer]
    B --> C[Prometheus]
    C --> D[Grafana]
    
    E[Application Logs] --> F[Logback]
    F --> G[Loki]
    G --> D
    
    H[Distributed Tracing] --> I[Jaeger]
    I --> D
    
    J[Custom Metrics] --> K[Business KPIs]
    K --> D
    
    style C fill:#ff9800
    style D fill:#4caf50
```

### Health Check Implementation

```java
@Component
public class CustomHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        try {
            // Check external dependencies
            boolean databaseUp = checkDatabase();
            boolean kafkaUp = checkKafka();
            
            if (databaseUp && kafkaUp) {
                return Health.up()
                    .withDetail("database", "OK")
                    .withDetail("kafka", "OK")
                    .build();
            } else {
                return Health.down()
                    .withDetail("database", databaseUp ? "OK" : "DOWN")
                    .withDetail("kafka", kafkaUp ? "OK" : "DOWN")
                    .build();
            }
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
```

## Key Design Decisions

### Technology Choices

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Spring Boot** | Mature ecosystem, enterprise features | Java verbosity vs rapid development |
| **GraphQL** | Flexible queries, strong typing | Learning curve vs REST familiarity |
| **Vue.js** | Progressive framework, great DX | Smaller ecosystem vs React |
| **Kafka** | High throughput, durability | Complexity vs simple messaging |
| **MongoDB** | Document model fits domain | Eventual consistency vs ACID |

### Architectural Patterns

#### Event Sourcing for Audit Trail

```java
@Entity
public class DeviceEvent {
    private String eventId;
    private String deviceId;
    private String eventType;
    private LocalDateTime timestamp;
    private String userId;
    private Map<String, Object> eventData;
    private Map<String, Object> previousState;
    
    // Event sourcing allows complete audit trail
}
```

#### CQRS for Read/Write Separation

```java
// Command side - write operations
@Component
public class DeviceCommandService {
    public void updateDevice(UpdateDeviceCommand command) {
        // Validate and execute command
        // Publish event for read side
    }
}

// Query side - optimized for reads
@Component  
public class DeviceQueryService {
    public DeviceProjection getDevice(String id) {
        // Return optimized read model
    }
}
```

## Next Steps for Developers

### Understanding the Codebase

1. **Start with Gateway**: Understand request routing and security
2. **Explore API Service**: Learn GraphQL schema and resolvers
3. **Study Data Layer**: Understand repository patterns and data modeling
4. **Review Frontend**: Learn Vue.js components and state management

### Contributing Guidelines

After understanding the architecture:

1. **[Testing Overview](../testing/overview.md)** - Learn testing patterns and requirements
2. **[Contributing Guidelines](../contributing/guidelines.md)** - Follow code standards and PR process

### Architecture Deep Dives

For specific components, refer to the detailed architecture documentation in the reference section of the repository.

---

**Architecture Overview Complete!** You now understand OpenFrame's system design and can contribute effectively to any component.