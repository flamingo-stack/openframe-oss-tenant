# Architecture Overview

This document provides a comprehensive overview of OpenFrame's architecture, including high-level system design, core components, data flow patterns, and key design decisions.

## High-Level Architecture

OpenFrame follows a distributed microservices architecture with event-driven communication, designed for scalability, security, and multi-tenancy.

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Browser]
        Agent[OpenFrame Agent]
        Mobile[Mobile App]
    end
    
    subgraph "API Gateway Layer"
        Gateway[OpenFrame Gateway]
    end
    
    subgraph "Authentication Layer"  
        AuthServer[Authorization Server]
        OAuth[OAuth2 + OIDC]
    end
    
    subgraph "Application Services"
        API[API Service]
        Client[Client Service]
        Management[Management Service]
        Stream[Stream Service]
        External[External API]
    end
    
    subgraph "Frontend Services"
        Frontend[React Frontend]
        Chat[AI Chat Service]
    end
    
    subgraph "Data Layer"
        Mongo[(MongoDB)]
        Redis[(Redis)]
        Cassandra[(Cassandra)]
        Pinot[(Apache Pinot)]
    end
    
    subgraph "Messaging Layer"
        Kafka[Apache Kafka]
        NATS[NATS JetStream]
    end
    
    subgraph "External Integrations"
        TacticalRMM[Tactical RMM]
        FleetMDM[Fleet MDM]  
        MeshCentral[MeshCentral]
        Tools[Other MSP Tools]
    end
    
    %% Client connections
    Web --> Gateway
    Agent --> Client
    Mobile --> Gateway
    
    %% Gateway routing
    Gateway --> API
    Gateway --> External
    Gateway --> Frontend
    Gateway --> AuthServer
    
    %% Service interconnections
    API --> Mongo
    API --> Redis
    API --> Kafka
    Client --> NATS
    Client --> Mongo
    Stream --> Kafka
    Stream --> Cassandra
    Stream --> Pinot
    Management --> Mongo
    Management --> NATS
    
    %% Authentication flows
    AuthServer --> Mongo
    OAuth --> AuthServer
    
    %% External tool integration
    Tools --> Stream
    TacticalRMM --> Stream
    FleetMDM --> Stream
    MeshCentral --> Stream
    
    style Gateway fill:#e1f5fe
    style AuthServer fill:#f3e5f5
    style Kafka fill:#fff3e0
    style Mongo fill:#e8f5e8
```

## Core Components

### 1. API Gateway (openframe-gateway)

**Purpose**: Centralized entry point for all client requests

**Responsibilities**:
- Request routing and load balancing
- JWT token validation and transformation
- API key authentication and rate limiting
- WebSocket proxy for real-time features
- CORS handling and security headers

**Technology Stack**:
- Spring Cloud Gateway
- Spring Security OAuth2 Resource Server
- WebSocket support
- Redis for rate limiting

**Key Features**:
```java
// JWT validation with dynamic issuer resolution
@Component
public class JwtAuthConfig {
    private JwtIssuerAuthenticationManagerResolver authManagerResolver;
    
    // Supports multi-tenant JWT validation
    // Converts cookies to Authorization headers
}
```

### 2. API Service (openframe-api)

**Purpose**: Core business logic and data access layer

**Responsibilities**:
- GraphQL API (Netflix DGS framework)
- RESTful endpoints for specific use cases
- Business service orchestration
- Data validation and transformation
- Real-time subscriptions

**Technology Stack**:
- Spring Boot 3.3
- Netflix DGS (GraphQL)
- Spring Data MongoDB
- Redis caching
- Kafka integration

**Architecture Pattern**:
```mermaid
graph LR
    GraphQL[GraphQL Layer] --> DataFetchers[Data Fetchers]
    REST[REST Controllers] --> Services[Business Services]
    DataFetchers --> Services
    Services --> Repositories[Data Repositories]
    Services --> Cache[Redis Cache]
    Services --> Events[Kafka Events]
    
    subgraph "Data Sources"
        Repositories --> MongoDB
        Cache --> Redis
        Events --> Kafka
    end
```

### 3. Authorization Server (openframe-authorization-server)

**Purpose**: Multi-tenant OAuth2/OpenID Connect identity provider

**Responsibilities**:
- Tenant registration and management
- OAuth2 authorization flows
- JWT token issuance with per-tenant signing keys
- SSO integration (Google, Microsoft)
- User invitation workflows

**Key Features**:
- **Per-Tenant Keys**: Each tenant gets unique RSA signing keys
- **PKCE Support**: Enhanced security for public clients
- **Multi-Provider SSO**: Google and Microsoft integration
- **Dynamic Client Registration**: Automatic client setup per tenant

```java
@Component
public class TenantKeyService {
    // Generates and manages RSA keys per tenant
    public AuthenticationKeyPair generateKeyPairForTenant(String tenantId) {
        // Creates unique signing keys for JWT isolation
    }
}
```

### 4. Client Service (openframe-client)

**Purpose**: Agent communication and device lifecycle management

**Responsibilities**:
- OpenFrame agent authentication
- Device registration and heartbeat processing
- Tool agent installation coordination
- NATS message routing
- Machine status tracking

**Communication Flow**:
```mermaid
sequenceDiagram
    participant Agent as OpenFrame Agent
    participant Client as Client Service
    participant NATS as NATS JetStream
    participant Mongo as MongoDB
    
    Agent->>Client: Register Device
    Client->>Mongo: Store Device Info
    Client-->>Agent: Return Auth Token
    
    Agent->>NATS: Send Heartbeat
    NATS->>Client: Route Message
    Client->>Mongo: Update Last Seen
    
    Agent->>NATS: Tool Connection Event
    NATS->>Client: Process Event
    Client->>Mongo: Update Tool Status
```

### 5. Stream Service (openframe-stream)

**Purpose**: Real-time data processing and enrichment

**Responsibilities**:
- Kafka stream processing
- Debezium CDC event handling
- Data enrichment with device/organization context
- Event normalization and routing
- Analytics data preparation

**Event Processing Pipeline**:
```mermaid
graph LR
    External[External Tools] --> Debezium[Debezium CDC]
    Debezium --> Kafka[Kafka Topics]
    Kafka --> StreamProcessor[Stream Processor]
    StreamProcessor --> Enrichment[Data Enrichment]
    Enrichment --> Cassandra[(Cassandra)]
    Enrichment --> Pinot[(Pinot)]
    Enrichment --> OutputKafka[Output Topics]
    
    subgraph "Enrichment Services"
        DeviceService[Device Context]
        OrgService[Organization Context] 
        ToolService[Tool Mapping]
    end
    
    Enrichment --> DeviceService
    Enrichment --> OrgService
    Enrichment --> ToolService
```

### 6. Management Service (openframe-management)

**Purpose**: System administration and background processing

**Responsibilities**:
- System initialization and migrations
- Scheduled task execution
- External service health monitoring
- Configuration management
- Cleanup and maintenance operations

**Scheduled Operations**:
- API key statistics synchronization
- Debezium connector health checks
- Agent registration secret rotation
- System health monitoring

### 7. Frontend Service (openframe-frontend)

**Purpose**: Modern web interface for OpenFrame

**Technology Stack**:
- React 18 with TypeScript
- Apollo GraphQL Client
- PrimeReact UI components
- Zustand state management
- Vite build system

**Key Features**:
- **Responsive Design**: Mobile-first approach
- **Real-time Updates**: WebSocket integration
- **AI Chat Interface**: Mingo AI integration
- **Role-based UI**: Dynamic permissions
- **Multi-tenant Support**: Tenant-aware routing

## Data Architecture

### Storage Strategy

OpenFrame uses a polyglot persistence approach, choosing the right database for each use case:

| Database | Use Case | Data Types |
|----------|----------|------------|
| **MongoDB** | Primary application data | Documents, users, organizations, configurations |
| **Redis** | Caching and sessions | Cache, rate limiting, session storage |
| **Cassandra** | Time-series events | Logs, metrics, audit trails |
| **Apache Pinot** | Real-time analytics | Aggregated data, dashboards, reporting |

### Data Flow Architecture

```mermaid
graph TB
    subgraph "Data Ingestion"
        Agents[OpenFrame Agents]
        Tools[External MSP Tools]
        API[API Requests]
    end
    
    subgraph "Message Streaming"
        NATS[NATS JetStream]
        Kafka[Apache Kafka]
    end
    
    subgraph "Stream Processing"
        Debezium[Debezium CDC]
        StreamService[Stream Service]
        Enrichment[Data Enrichment]
    end
    
    subgraph "Storage Layer"
        MongoDB[(MongoDB<br/>Operational Data)]
        Cassandra[(Cassandra<br/>Time Series)]
        Pinot[(Pinot<br/>Analytics)]
        Redis[(Redis<br/>Cache)]
    end
    
    subgraph "Application Layer"
        APIService[API Service]
        ClientService[Client Service]
        Frontend[Frontend]
    end
    
    %% Ingestion flows
    Agents --> NATS
    Tools --> Kafka
    API --> MongoDB
    
    %% Message processing
    NATS --> ClientService
    Kafka --> Debezium
    Debezium --> StreamService
    StreamService --> Enrichment
    
    %% Storage flows
    Enrichment --> Cassandra
    Enrichment --> Pinot
    ClientService --> MongoDB
    APIService --> Redis
    APIService --> MongoDB
    
    %% Query flows
    Frontend --> APIService
    APIService --> MongoDB
    APIService --> Cassandra
    APIService --> Pinot
    APIService --> Redis
```

## Security Architecture

### Multi-Layered Security Model

OpenFrame implements defense-in-depth security across all layers:

```mermaid
graph TB
    subgraph "Transport Layer"
        TLS[TLS 1.3 Encryption]
        HTTPS[HTTPS Only]
    end
    
    subgraph "Authentication Layer"
        OAuth2[OAuth2 + PKCE]
        JWT[JWT Tokens]
        APIKey[API Key Authentication]
    end
    
    subgraph "Authorization Layer"  
        RBAC[Role-Based Access Control]
        Tenant[Tenant Isolation]
        Permissions[Fine-grained Permissions]
    end
    
    subgraph "Data Layer"
        Encryption[AES-256 Encryption]
        Hashing[bcrypt Password Hashing]
        Signing[RSA Key Signing]
    end
    
    subgraph "Network Layer"
        Gateway[API Gateway Filtering]
        CORS[CORS Policies]
        RateLimit[Rate Limiting]
    end
    
    TLS --> OAuth2
    OAuth2 --> RBAC
    RBAC --> Encryption
    HTTPS --> APIKey
    APIKey --> Tenant
    Tenant --> Hashing
    Gateway --> JWT
    JWT --> Permissions
    Permissions --> Signing
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Browser as User Browser
    participant Gateway as API Gateway
    participant AuthServer as Auth Server
    participant API as API Service
    participant DB as MongoDB
    
    Browser->>AuthServer: Initiate OAuth2 Login
    AuthServer->>AuthServer: Generate PKCE Challenge
    AuthServer-->>Browser: Redirect to SSO Provider
    
    Browser->>AuthServer: Return with Auth Code
    AuthServer->>AuthServer: Validate PKCE + Code
    AuthServer->>DB: Create/Update User Session
    AuthServer-->>Browser: Set HTTP-Only Cookie + JWT
    
    Browser->>Gateway: API Request with Cookie
    Gateway->>Gateway: Extract JWT from Cookie
    Gateway->>AuthServer: Validate JWT Signature
    AuthServer-->>Gateway: JWT Valid + Claims
    Gateway->>API: Request with Authorization Header
    
    API->>API: Extract User Principal
    API->>DB: Query User Permissions
    API-->>Gateway: Response
    Gateway-->>Browser: Final Response
```

## Event-Driven Architecture

### Event Processing Model

OpenFrame uses event-driven architecture for real-time processing and system integration:

**Event Categories**:
1. **System Events**: User actions, configuration changes
2. **Device Events**: Agent heartbeats, status updates
3. **Tool Events**: External MSP tool integrations
4. **Audit Events**: Security and compliance tracking

**Event Flow**:
```mermaid
graph LR
    subgraph "Event Sources"
        UserActions[User Actions]
        AgentEvents[Agent Events]
        ToolEvents[Tool Integration Events]
        SystemEvents[System Events]
    end
    
    subgraph "Event Processing"
        Ingestion[Event Ingestion]
        Validation[Event Validation]
        Enrichment[Event Enrichment]
        Routing[Event Routing]
    end
    
    subgraph "Event Storage"
        Kafka[Kafka Topics]
        Cassandra[Cassandra Events]
        MongoDB[MongoDB Documents]
    end
    
    subgraph "Event Consumers"
        Notifications[Real-time Notifications]
        Analytics[Analytics Processing]
        Auditing[Audit Logging]
        Automation[Automated Actions]
    end
    
    UserActions --> Ingestion
    AgentEvents --> Ingestion
    ToolEvents --> Ingestion
    SystemEvents --> Ingestion
    
    Ingestion --> Validation
    Validation --> Enrichment
    Enrichment --> Routing
    
    Routing --> Kafka
    Routing --> Cassandra
    Routing --> MongoDB
    
    Kafka --> Notifications
    Cassandra --> Analytics
    MongoDB --> Auditing
    Analytics --> Automation
```

## Key Design Decisions

### 1. Microservices Architecture

**Decision**: Use microservices over monolithic architecture
**Reasoning**: 
- Independent scaling and deployment
- Technology diversity (Java, React, Rust)
- Team autonomy and parallel development
- Fault isolation

### 2. Event-Driven Communication

**Decision**: Use Apache Kafka for inter-service communication
**Reasoning**:
- Decoupled service interactions
- Built-in durability and replay capability
- High throughput for real-time data
- Support for complex event processing

### 3. Polyglot Persistence

**Decision**: Multiple databases for different use cases
**Reasoning**:
- MongoDB: Document flexibility for varied schemas
- Cassandra: Time-series performance at scale
- Redis: Sub-millisecond cache access
- Pinot: Real-time analytics queries

### 4. GraphQL + REST Hybrid

**Decision**: GraphQL for complex queries, REST for simple operations
**Reasoning**:
- GraphQL: Efficient data fetching, strong typing
- REST: Simple operations, external integrations
- Both: Different client needs and use cases

### 5. Multi-Tenant Architecture

**Decision**: Shared infrastructure with tenant isolation
**Reasoning**:
- Cost efficiency over tenant-per-instance
- Operational simplicity
- Resource sharing benefits
- Strong isolation through security layers

## Scalability Considerations

### Horizontal Scaling Strategy

```mermaid
graph TB
    subgraph "Load Balancers"
        LB[Application Load Balancer]
    end
    
    subgraph "Gateway Layer - Auto Scaling"
        GW1[Gateway Instance 1]
        GW2[Gateway Instance 2]  
        GWN[Gateway Instance N]
    end
    
    subgraph "Service Layer - Auto Scaling"
        API1[API Service 1]
        API2[API Service 2]
        APIN[API Service N]
    end
    
    subgraph "Data Layer - Partitioned"
        MongoDB[MongoDB Replica Set]
        Cassandra[Cassandra Ring]
        Kafka[Kafka Cluster]
        Redis[Redis Cluster]
    end
    
    LB --> GW1
    LB --> GW2
    LB --> GWN
    
    GW1 --> API1
    GW2 --> API2
    GWN --> APIN
    
    API1 --> MongoDB
    API1 --> Cassandra
    API1 --> Kafka
    API1 --> Redis
    
    API2 --> MongoDB
    API2 --> Cassandra 
    API2 --> Kafka
    API2 --> Redis
```

### Performance Optimization

**Caching Strategy**:
- L1: Application-level caching (Caffeine)
- L2: Redis distributed cache
- L3: Database query optimization

**Database Optimization**:
- MongoDB: Proper indexing, read preferences
- Cassandra: Partition key optimization
- Redis: Connection pooling, pipelining

**Network Optimization**:
- HTTP/2 for reduced latency
- Connection pooling for database access
- CDN for static assets

## Observability and Monitoring

### Monitoring Stack

```mermaid
graph TB
    subgraph "Application Metrics"
        AppMetrics[Application Metrics]
        CustomMetrics[Custom Business Metrics]  
        JVMMetrics[JVM Metrics]
    end
    
    subgraph "Infrastructure Metrics"
        SystemMetrics[System Metrics]
        DatabaseMetrics[Database Metrics]
        NetworkMetrics[Network Metrics]
    end
    
    subgraph "Logging"
        AppLogs[Application Logs]
        AccessLogs[Access Logs]
        AuditLogs[Audit Logs]
    end
    
    subgraph "Tracing"
        DistributedTracing[Distributed Tracing]
        RequestTracing[Request Tracing]
    end
    
    subgraph "Collection & Storage"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki]
        Jaeger[Jaeger]
    end
    
    subgraph "Alerting"
        AlertManager[Alert Manager]
        Notifications[Slack/Email/PagerDuty]
    end
    
    AppMetrics --> Prometheus
    CustomMetrics --> Prometheus
    JVMMetrics --> Prometheus
    SystemMetrics --> Prometheus
    DatabaseMetrics --> Prometheus
    NetworkMetrics --> Prometheus
    
    AppLogs --> Loki
    AccessLogs --> Loki
    AuditLogs --> Loki
    
    DistributedTracing --> Jaeger
    RequestTracing --> Jaeger
    
    Prometheus --> Grafana
    Loki --> Grafana
    Prometheus --> AlertManager
    AlertManager --> Notifications
```

---

**Next Steps**: 
- Explore [Testing Overview](../testing/overview.md) to understand testing strategies
- Review [Contributing Guidelines](../contributing/guidelines.md) for development workflows
- Dive into specific service documentation in the reference docs