# System Architecture Overview

This guide provides a comprehensive view of OpenFrame's architecture, focusing on the key design decisions, component relationships, and data flow patterns that developers need to understand.

## High-Level Architecture

OpenFrame follows a distributed microservices architecture with event-driven communication and multi-tenant security isolation:

```mermaid
graph TB
    subgraph "Client Layer"
        WebUI[Web UI - Vue 3]
        ChatApp[Chat Client - Tauri]
        MobileApp[Mobile Apps]
        APIs[External APIs]
    end
    
    subgraph "Edge Layer"
        Gateway[API Gateway<br/>Spring WebFlux]
        LB[Load Balancer]
    end
    
    subgraph "Service Layer"
        Auth[Authorization Server<br/>OAuth2/OIDC]
        API[API Service<br/>GraphQL + REST]
        Management[Management Service<br/>System Admin]
        Stream[Stream Processing<br/>Kafka Streams]
        Client[Client Agent Service<br/>Agent Lifecycle]
        External[External API<br/>3rd Party Integrations]
        Config[Config Server<br/>Spring Cloud Config]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Primary Store)]
        Kafka[(Apache Kafka<br/>Event Streaming)]
        Redis[(Redis<br/>Cache + Sessions)]
        Pinot[(Apache Pinot<br/>Analytics)]
        Cassandra[(Cassandra<br/>Time Series)]
    end
    
    subgraph "Infrastructure"
        K8s[Kubernetes]
        Istio[Service Mesh]
        Monitoring[Prometheus + Grafana]
    end
    
    WebUI --> Gateway
    ChatApp --> Gateway
    MobileApp --> Gateway
    APIs --> Gateway
    
    Gateway --> Auth
    Gateway --> API
    Gateway --> External
    
    API --> MongoDB
    API --> Redis
    API --> Pinot
    
    Stream --> Kafka
    Stream --> MongoDB
    Stream --> Cassandra
    
    Management --> MongoDB
    Management --> Kafka
    
    Client --> MongoDB
    Client --> Kafka
    
    Auth --> MongoDB
    Auth --> Redis
```

## Core Components

### 1. API Gateway (Spring WebFlux)

**Purpose**: Single entry point for all client requests with routing, security, and cross-cutting concerns.

**Key Responsibilities**:
- **JWT Authentication** - Multi-tenant token validation
- **API Key Management** - Rate limiting and access control  
- **Request Routing** - Intelligent routing to backend services
- **CORS Management** - Cross-origin request handling
- **WebSocket Proxying** - Real-time connection management

**Technology Stack**:
- Spring WebFlux (Reactive)
- Spring Security
- Spring Cloud Gateway
- Redis (for rate limiting)

**Data Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Service
    participant Database
    
    Client->>Gateway: Request + JWT/API Key
    Gateway->>Gateway: Extract & Validate Token
    Gateway->>Auth: Verify Token Signature
    Auth-->>Gateway: Token Valid + Claims
    Gateway->>Service: Forward Request + User Context
    Service->>Database: Query/Mutation
    Database-->>Service: Result
    Service-->>Gateway: Response
    Gateway-->>Client: Final Response
```

### 2. API Service (GraphQL + REST)

**Purpose**: Main business logic service providing unified data access via GraphQL and REST endpoints.

**Key Responsibilities**:
- **GraphQL Schema** - Type-safe API with introspection
- **REST Endpoints** - RESTful APIs for external integrations
- **Business Logic** - Core MSP operations and workflows
- **Data Orchestration** - Coordinate queries across data sources
- **Real-time Subscriptions** - WebSocket-based live updates

**Architecture Pattern**:
```mermaid
graph TB
    subgraph "API Service Architecture"
        Controllers[REST Controllers]
        DataFetchers[GraphQL DataFetchers]
        Services[Domain Services]
        Repositories[Repository Layer]
        DataLoaders[DataLoader Cache]
        
        Controllers --> Services
        DataFetchers --> Services
        Services --> Repositories
        DataFetchers --> DataLoaders
        DataLoaders --> Repositories
    end
    
    subgraph "Data Sources"
        MongoDB[(MongoDB)]
        Pinot[(Pinot)]
        Redis[(Redis)]
    end
    
    Repositories --> MongoDB
    Repositories --> Pinot
    Repositories --> Redis
```

**GraphQL Schema Design**:
```graphql
# Core entity types
type Organization {
  id: ID!
  name: String!
  domain: String!
  devices(filter: DeviceFilter): DeviceConnection
  users(filter: UserFilter): UserConnection
}

type Device {
  id: ID!
  name: String!
  status: DeviceStatus!
  organization: Organization!
  installedAgents: [InstalledAgent!]!
  lastHeartbeat: DateTime
}

# Connection-based pagination
type DeviceConnection {
  edges: [DeviceEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# Subscription for real-time updates
type Subscription {
  deviceStatusUpdated(organizationId: ID!): Device!
  newLogEntry(filter: LogFilter): LogEvent!
}
```

### 3. Authorization Server (OAuth2/OIDC)

**Purpose**: Multi-tenant identity provider with per-tenant signing keys and comprehensive OAuth2 flows.

**Key Responsibilities**:
- **Multi-Tenant Security** - Isolated signing keys per tenant
- **OAuth2 Flows** - Authorization code, client credentials, refresh token
- **SSO Integration** - Google, Microsoft, and custom OIDC providers  
- **User Registration** - Invitation-based onboarding
- **Token Management** - JWT issuance and validation

**Security Architecture**:
```mermaid
graph TB
    subgraph "Tenant Isolation"
        T1[Tenant A<br/>RSA Key Pair]
        T2[Tenant B<br/>RSA Key Pair]  
        T3[Tenant C<br/>RSA Key Pair]
    end
    
    subgraph "OAuth2 Flows"
        AuthCode[Authorization Code Flow]
        ClientCred[Client Credentials Flow]
        RefreshToken[Refresh Token Flow]
        PKCE[PKCE Enhancement]
    end
    
    subgraph "External Providers"
        Google[Google OAuth2]
        Microsoft[Microsoft OAuth2] 
        Custom[Custom OIDC]
    end
    
    T1 --> AuthCode
    T2 --> AuthCode
    T3 --> AuthCode
    
    AuthCode --> Google
    AuthCode --> Microsoft
    AuthCode --> Custom
```

**JWT Token Structure**:
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "tenant-a-key-id"
  },
  "payload": {
    "iss": "https://auth.openframe.ai/tenant-a",
    "sub": "user-12345",
    "aud": ["openframe-api", "openframe-external-api"],
    "exp": 1640995200,
    "iat": 1640908800,
    "tenant": "tenant-a",
    "org": "org-67890",
    "roles": ["USER", "DEVICE_MANAGER"],
    "permissions": ["device:read", "device:write"]
  }
}
```

### 4. Stream Processing Service (Kafka Streams)

**Purpose**: Real-time event processing and data enrichment using Kafka Streams topology.

**Key Responsibilities**:
- **CDC Processing** - Debezium change data capture transformation
- **Event Enrichment** - Add organization and device context
- **Stream Joins** - Correlate events across multiple data sources
- **Analytics Pipeline** - Feed enriched data to Pinot for real-time analytics

**Processing Topology**:
```mermaid
graph LR
    subgraph "Input Streams"
        CDC[Debezium CDC Events]
        Agent[Agent Heartbeats]  
        Tool[Tool Events]
        User[User Activities]
    end
    
    subgraph "Stream Processing"
        Parse[Parse & Validate]
        Enrich[Enrich with Context]
        Transform[Transform & Normalize]
        Filter[Filter & Route]
    end
    
    subgraph "Output Streams"
        Unified[Unified Events]
        Analytics[Analytics Events]
        Alerts[Alert Events]
        Audit[Audit Events]
    end
    
    CDC --> Parse
    Agent --> Parse
    Tool --> Parse
    User --> Parse
    
    Parse --> Enrich
    Enrich --> Transform
    Transform --> Filter
    
    Filter --> Unified
    Filter --> Analytics
    Filter --> Alerts
    Filter --> Audit
```

**Stream Processing Logic**:
```java
@Component
public class EventEnrichmentTopology {
    
    @Autowired
    public void buildTopology(StreamsBuilder builder) {
        // Input stream from Debezium
        KStream<String, DebeziumEvent> sourceEvents = builder
            .stream("debezium.openframe.events");
            
        // Enrich with organization context
        KTable<String, Organization> organizations = builder
            .table("openframe.organizations");
            
        // Join and enrich
        KStream<String, EnrichedEvent> enrichedEvents = sourceEvents
            .selectKey((key, event) -> event.getOrganizationId())
            .join(organizations, this::enrichWithOrganization)
            .mapValues(this::transformToUnifiedFormat)
            .filter((key, event) -> isValidEvent(event));
            
        // Output to multiple topics
        enrichedEvents.to("openframe.unified-events");
        enrichedEvents
            .filter((key, event) -> event.isAnalyticsEvent())
            .to("openframe.analytics-events");
    }
}
```

### 5. Management Service (System Administration)

**Purpose**: Operational control plane for system administration and maintenance tasks.

**Key Responsibilities**:
- **Service Initialization** - Bootstrap services and configurations
- **Schema Management** - Database and Pinot schema deployment
- **Connector Management** - Debezium and external tool connectors
- **Scheduled Tasks** - Maintenance operations with distributed locking
- **Health Monitoring** - System health checks and alerting

**Scheduled Operations**:
```mermaid
gantt
    title Management Service Scheduled Tasks
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Daily Tasks
    Schema Sync          :done, daily1, 02:00, 2h
    Connector Health     :done, daily2, 04:00, 1h
    Data Cleanup         :active, daily3, 06:00, 2h
    
    section Hourly Tasks
    Health Checks        :hourly1, 00:00, 15m
    Metrics Collection   :hourly2, 00:15, 15m
    Alert Processing     :hourly3, 00:30, 15m
    
    section Real-time
    Event Monitoring     :crit, realtime, 00:00, 24h
```

## Data Architecture

### Data Storage Strategy

OpenFrame uses a polyglot persistence approach optimized for different data patterns:

```mermaid
graph TB
    subgraph "Application Data"
        Users[Users & Organizations]
        Devices[Device Inventory]
        Config[System Configuration]
        Sessions[User Sessions]
    end
    
    subgraph "Event Data"
        RealTime[Real-time Events]
        TimeSeries[Time Series Metrics]
        Logs[Application Logs]
        Analytics[Analytics Data]
    end
    
    subgraph "Cache Data"
        TokenCache[JWT Token Cache]
        SessionCache[Session Data]
        QueryCache[Query Result Cache]
    end
    
    Users --> MongoDB
    Devices --> MongoDB
    Config --> MongoDB
    
    RealTime --> Kafka
    TimeSeries --> Cassandra
    Logs --> Cassandra
    
    Analytics --> Pinot
    
    TokenCache --> Redis
    SessionCache --> Redis
    QueryCache --> Redis
```

### Data Flow Patterns

**Write Pattern (Event-Driven)**:
```mermaid
sequenceDiagram
    participant API as API Service
    participant MongoDB as MongoDB
    participant Kafka as Kafka
    participant Stream as Stream Processing
    participant Pinot as Pinot
    
    API->>MongoDB: Write Operation
    MongoDB->>Kafka: CDC Event (Debezium)
    Kafka->>Stream: Event Consumed
    Stream->>Stream: Enrich & Transform
    Stream->>Pinot: Analytics Event
    Stream->>Kafka: Unified Event
```

**Read Pattern (CQRS)**:
```mermaid
sequenceDiagram
    participant Client
    participant API as API Service  
    participant Cache as Redis Cache
    participant MongoDB as MongoDB
    participant Pinot as Apache Pinot
    
    Client->>API: GraphQL Query
    API->>Cache: Check Cache
    alt Cache Hit
        Cache-->>API: Cached Result
    else Cache Miss
        API->>MongoDB: Operational Query
        API->>Pinot: Analytics Query
        MongoDB-->>API: Operational Data
        Pinot-->>API: Analytics Data
        API->>Cache: Cache Result
    end
    API-->>Client: Combined Result
```

## Security Architecture

### Multi-Tenant Security Model

OpenFrame implements tenant isolation at multiple layers:

```mermaid
graph TB
    subgraph "Application Layer"
        TenantFilter[Tenant Context Filter]
        AuthZ[Authorization Service]
        DataFilter[Data Access Filter]
    end
    
    subgraph "Data Layer"
        TenantDB[(Tenant-Scoped Collections)]
        TenantKeys[(Per-Tenant JWT Keys)]
        TenantConfig[(Tenant Configuration)]
    end
    
    subgraph "Infrastructure Layer"  
        K8sNS[Kubernetes Namespaces]
        NetworkPol[Network Policies]
        ServiceMesh[Istio Service Mesh]
    end
    
    TenantFilter --> AuthZ
    AuthZ --> DataFilter
    DataFilter --> TenantDB
    
    AuthZ --> TenantKeys
    DataFilter --> TenantConfig
    
    TenantDB --> K8sNS
    TenantKeys --> NetworkPol
    TenantConfig --> ServiceMesh
```

### Authentication Flow

**JWT-Based Authentication with Tenant Isolation**:
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant Auth
    participant API
    participant DB
    
    User->>Frontend: Login Request
    Frontend->>Auth: OAuth2 Authorization
    Auth->>Auth: Generate Tenant-Specific JWT
    Auth-->>Frontend: JWT + Refresh Token
    Frontend->>Gateway: API Request + JWT
    Gateway->>Gateway: Validate JWT Signature
    Gateway->>API: Forward Request + User Context
    API->>API: Apply Tenant Data Filters
    API->>DB: Scoped Query
    DB-->>API: Tenant Data Only
    API-->>Frontend: Response
```

## Key Design Decisions

### 1. Microservices vs Monolith

**Decision**: Microservices architecture
**Rationale**: 
- Independent scaling of different components
- Technology diversity (Java backend, Vue frontend, Rust client)
- Team autonomy and development velocity
- Fault isolation and resilience

**Trade-offs**:
- Increased operational complexity
- Network latency between services
- Distributed system challenges (eventual consistency)

### 2. Event-Driven Architecture

**Decision**: Kafka-based event streaming
**Rationale**:
- Decoupling between services
- Real-time data processing capabilities
- Scalable event ingestion
- Replay and reprocessing capabilities

**Implementation**:
- Debezium for change data capture
- Kafka Streams for real-time processing
- Event sourcing for critical business events

### 3. GraphQL for API Layer

**Decision**: GraphQL as primary API interface
**Rationale**:
- Type-safe API contracts
- Efficient data fetching (solve N+1 problem)
- Real-time subscriptions
- Excellent developer experience

**Complementary REST APIs** for:
- External integrations
- Simple CRUD operations
- File uploads
- Health checks

### 4. Multi-Tenant Architecture

**Decision**: Shared infrastructure with data isolation
**Rationale**:
- Cost efficiency through resource sharing
- Simplified operations and maintenance
- Scalability through horizontal scaling
- Security through robust isolation patterns

**Implementation Strategy**:
- Row-level security in databases
- Tenant context propagation
- Per-tenant JWT signing keys
- Kubernetes namespace isolation

### 5. Polyglot Persistence

**Decision**: Multiple databases optimized for use cases
**Rationale**:
- MongoDB: Document storage for application data
- Kafka: Event streaming and messaging
- Redis: Caching and session storage
- Pinot: Real-time analytics queries
- Cassandra: Time-series data (optional)

## Performance Characteristics

### Scalability Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Concurrent Users** | 10,000+ | 5,000 |
| **API Response Time** | < 200ms (p95) | ~150ms |
| **Event Throughput** | 100K events/sec | 50K events/sec |
| **Database Queries** | < 50ms (p95) | ~30ms |
| **Memory Usage** | < 2GB per service | ~1.5GB |

### Caching Strategy

```mermaid
graph TB
    subgraph "Caching Layers"
        Browser[Browser Cache<br/>Static Assets]
        CDN[CDN Cache<br/>Public Resources]
        Gateway[Gateway Cache<br/>Response Cache]
        App[Application Cache<br/>Redis]
        DB[Database Cache<br/>Query Cache]
    end
    
    subgraph "Cache Patterns"
        ReadThrough[Read-Through]
        WriteThrough[Write-Through] 
        WriteBack[Write-Back]
        CacheAside[Cache-Aside]
    end
    
    Browser --> CDN
    CDN --> Gateway
    Gateway --> App
    App --> DB
    
    ReadThrough --> App
    WriteThrough --> App
    WriteBack --> App
    CacheAside --> App
```

## Monitoring and Observability

### Monitoring Stack

```mermaid
graph TB
    subgraph "Application Metrics"
        SpringActuator[Spring Boot Actuator]
        CustomMetrics[Custom Business Metrics]
        JVMMetrics[JVM Metrics]
    end
    
    subgraph "Infrastructure Metrics"
        K8sMetrics[Kubernetes Metrics]
        KafkaMetrics[Kafka Metrics]
        DBMetrics[Database Metrics]
    end
    
    subgraph "Collection & Storage"
        Prometheus[Prometheus]
        InfluxDB[InfluxDB - Optional]
    end
    
    subgraph "Visualization"
        Grafana[Grafana Dashboards]
        AlertManager[Alert Manager]
        PagerDuty[PagerDuty]
    end
    
    SpringActuator --> Prometheus
    CustomMetrics --> Prometheus
    JVMMetrics --> Prometheus
    K8sMetrics --> Prometheus
    KafkaMetrics --> Prometheus
    DBMetrics --> Prometheus
    
    Prometheus --> Grafana
    Prometheus --> AlertManager
    AlertManager --> PagerDuty
```

## Next Steps

This architecture overview provides the foundation for understanding OpenFrame's design. Continue with:

1. **[Security Overview](../security/overview.md)** - Deep dive into security implementation
2. **[Testing Overview](../testing/overview.md)** - Testing strategies for microservices
3. **[Local Development](../setup/local-development.md)** - Hands-on development guide

For specific service architectures, see the detailed documentation in `docs/architecture/` for each service component.

## Architectural Evolution

OpenFrame's architecture continues to evolve. Current areas of active development:

- **Service Mesh Migration** - Complete Istio integration
- **Event Sourcing** - Implement for critical business domains  
- **GraphQL Federation** - Distributed schema composition
- **Serverless Functions** - Event-driven microservices
- **Multi-Region Deployment** - Geographic distribution for performance

Join the [OpenMSP community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) to participate in architectural discussions and contribute to OpenFrame's evolution! 🚀