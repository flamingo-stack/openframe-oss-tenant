# Architecture Overview

OpenFrame follows a modern, event-driven microservice architecture designed for scalability, multi-tenancy, and AI-powered automation. This guide provides an overview of the system design, core components, and architectural decisions.

## High-Level System Architecture

```mermaid
flowchart TB
    subgraph "Frontend Layer"
        UI[Web Dashboard]
        Chat[Desktop Chat Client]
        Mobile[Mobile Apps]
    end
    
    subgraph "API Gateway Layer" 
        Gateway[Gateway Service<br/>JWT, API Keys, CORS]
        Auth[Authorization Server<br/>OAuth2/OIDC, Multi-tenant]
    end
    
    subgraph "Core Services Layer"
        API[API Service<br/>REST + GraphQL]
        External[External API Service<br/>Public APIs]
        Client[Client Service<br/>Agent Lifecycle]
        Stream[Stream Service<br/>Event Processing]
        Management[Management Service<br/>Operations]
        Config[Config Server<br/>Centralized Config]
    end
    
    subgraph "AI & Automation Layer"
        VoltAgent[VoltAgent Core<br/>Node.js Engine]
        Mingo[Mingo AI<br/>Anthropic/OpenAI]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Transactional Data)]
        Cassandra[(Cassandra<br/>Time Series)]
        Pinot[(Apache Pinot<br/>Analytics)]
        Redis[(Redis<br/>Cache & Sessions)]
    end
    
    subgraph "Message Layer"
        Kafka[(Kafka<br/>Event Streaming)]
        NATS[(NATS<br/>Agent Messaging)]
    end
    
    UI --> Gateway
    Chat --> Gateway
    Mobile --> Gateway
    
    Gateway --> API
    Gateway --> External
    Gateway --> Auth
    
    API --> MongoDB
    API --> Pinot
    API --> Kafka
    
    Stream --> Kafka
    Stream --> Cassandra
    Stream --> Pinot
    
    Client --> MongoDB
    Client --> NATS
    
    VoltAgent --> API
    Mingo --> VoltAgent
    
    Auth --> MongoDB
```

## Core Components

### API Gateway Layer

The gateway layer provides a unified entry point for all client requests, handling security, routing, and cross-cutting concerns.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Gateway Service** | Request routing, JWT validation, CORS, WebSocket proxy | Spring Cloud Gateway |
| **Authorization Server** | Multi-tenant OAuth2/OIDC, token issuance, SSO flows | Spring Authorization Server |

**Key Features:**
- **Multi-tenant JWT validation** with tenant-scoped signing keys
- **API key authentication** for external integrations
- **Rate limiting** and request throttling
- **WebSocket proxying** for real-time features
- **CORS configuration** for cross-origin requests

### Core Services Layer

Business logic is distributed across specialized microservices, each with a focused responsibility.

| Service | Purpose | Port | Key Technologies |
|---------|---------|------|------------------|
| **API Service** | Internal REST + GraphQL APIs | 8080 | Spring Boot, GraphQL Java |
| **External API Service** | Public API endpoints | 8083 | Spring Boot REST |
| **Client Service** | Agent registration, lifecycle | 8084 | Spring Boot, NATS |
| **Stream Service** | Event processing, enrichment | 8085 | Kafka Streams |
| **Management Service** | Operational tooling | 8086 | Spring Boot |
| **Config Server** | Centralized configuration | 8888 | Spring Cloud Config |

#### Service Interaction Patterns

```mermaid
sequenceDiagram
    participant Frontend
    participant Gateway
    participant API
    participant Stream
    participant External
    
    Frontend->>Gateway: GraphQL Request
    Gateway->>Gateway: Validate JWT
    Gateway->>API: Forward Request
    API->>MongoDB: Query Data
    API->>Kafka: Publish Event
    API-->>Gateway: Response
    Gateway-->>Frontend: JSON Response
    
    Kafka->>Stream: Event Trigger
    Stream->>Cassandra: Store Time-Series
    Stream->>Pinot: Update Analytics
```

### AI & Automation Layer

OpenFrame's AI capabilities are built on a flexible architecture that supports multiple AI providers and automation workflows.

```mermaid
flowchart LR
    subgraph "AI Integration"
        Claude[Anthropic Claude]
        GPT[OpenAI GPT]
        Custom[Custom Models]
    end
    
    subgraph "VoltAgent Engine"
        Core[VoltAgent Core<br/>Node.js Runtime]
        Policies[AI Policies<br/>Decision Engine]
        Workflows[Automation Workflows]
    end
    
    subgraph "Application Integration"
        Mingo[Mingo AI Assistant]
        AutoTriage[Automated Triage]
        Responses[Intelligent Responses]
    end
    
    Claude --> Core
    GPT --> Core
    Custom --> Core
    
    Core --> Policies
    Core --> Workflows
    
    Policies --> Mingo
    Workflows --> AutoTriage
    Workflows --> Responses
```

**Key Components:**
- **VoltAgent Core** - Node.js-based automation engine with AI integration
- **Mingo AI** - Intelligent assistant using Anthropic Claude and OpenAI models
- **AI Policies** - Configurable rules for automated decision making
- **Automation Workflows** - Event-driven processes for routine tasks

### Data Architecture

OpenFrame uses a polyglot persistence approach, choosing the right database technology for each use case.

```mermaid
flowchart TD
    subgraph "Operational Data"
        Apps[Applications] --> MongoDB
        MongoDB --> |Transactional<br/>CRUD Operations| Apps
    end
    
    subgraph "Time-Series Data"
        Events[Event Streams] --> Cassandra
        Cassandra --> |Logs, Metrics<br/>Time-based Queries| Analytics
    end
    
    subgraph "Analytics Data"
        Cassandra --> Pinot
        MongoDB --> Pinot
        Pinot --> |Real-time<br/>OLAP Queries| Dashboards
    end
    
    subgraph "Caching Layer"
        Apps --> Redis
        Redis --> |Sessions, Cache<br/>Fast Access| Apps
    end
    
    subgraph "Event Streaming"
        Services --> Kafka
        Kafka --> |Event Processing<br/>Real-time Stream| Services
    end
```

**Data Store Responsibilities:**

| Technology | Use Cases | Performance Characteristics |
|------------|-----------|----------------------------|
| **MongoDB** | User data, organizations, devices, configuration | High write throughput, flexible schema |
| **Cassandra** | Logs, metrics, time-series data, audit trails | High write performance, time-based queries |
| **Apache Pinot** | Real-time analytics, dashboards, reporting | Low-latency OLAP, aggregations |
| **Redis** | Session storage, caching, rate limiting | Sub-millisecond access, in-memory performance |
| **Kafka** | Event streaming, service communication | High throughput, durable messaging |
| **NATS** | Agent communication, real-time messaging | Low latency, lightweight messaging |

## Architectural Patterns

### Multi-Tenancy Model

OpenFrame implements comprehensive multi-tenancy across all layers:

```mermaid
flowchart TD
    subgraph "Request Layer"
        JWT[JWT Token<br/>tenant_id claim] --> Gateway
    end
    
    subgraph "Application Layer"
        Gateway --> Filter[Tenant Context Filter]
        Filter --> Services[All Services]
        Services --> TenantGuard[Tenant Data Guard]
    end
    
    subgraph "Data Layer"
        TenantGuard --> MongoDB[MongoDB Collections<br/>tenant_id field]
        TenantGuard --> Cassandra[Cassandra Tables<br/>tenant_id partition]
        TenantGuard --> Pinot[Pinot Segments<br/>tenant_id filter]
    end
    
    subgraph "Identity Layer"
        Filter --> TenantKeys[Tenant-specific<br/>RSA Keys]
        Filter --> OAuthClients[Tenant-specific<br/>OAuth Clients]
    end
```

**Multi-Tenant Implementation:**
- **JWT Claims**: Every token includes `tenant_id` and `organization_id` claims
- **Data Partitioning**: All database operations are scoped by tenant ID
- **Resource Isolation**: Separate OAuth clients, RSA keys, and configurations per tenant
- **Security Boundaries**: Cross-tenant data access is architecturally prevented

### Event-Driven Architecture

The platform uses event-driven patterns for loose coupling and real-time processing:

```mermaid
flowchart LR
    subgraph "Event Sources"
        API[API Services]
        Agents[Device Agents]
        External[External Tools]
        Users[User Actions]
    end
    
    subgraph "Event Bus"
        Kafka[Kafka Topics]
        NATS[NATS Streams]
    end
    
    subgraph "Event Processors"
        Stream[Stream Service]
        AI[AI Processing]
        Notifications[Notification Service]
        Analytics[Analytics Engine]
    end
    
    API --> Kafka
    Agents --> NATS
    External --> Kafka
    Users --> Kafka
    
    Kafka --> Stream
    Kafka --> AI
    Kafka --> Notifications
    NATS --> Stream
    
    Stream --> Pinot
    Stream --> Cassandra
    AI --> Workflows
```

**Event Categories:**
- **Device Events**: Agent heartbeats, status changes, performance metrics
- **User Events**: Authentication, UI interactions, configuration changes
- **System Events**: Service health, errors, audit logs
- **Integration Events**: External tool data, webhooks, sync operations

### Security Architecture

Security is implemented as a layered approach across multiple architectural boundaries:

```mermaid
flowchart TB
    subgraph "Edge Security"
        CORS[CORS Policy]
        RateLimit[Rate Limiting]
        SSL[TLS Termination]
    end
    
    subgraph "Authentication Layer"
        OAuth[OAuth2/OIDC]
        JWT[JWT Validation]
        APIKey[API Key Auth]
        RBAC[Role-Based Access]
    end
    
    subgraph "Authorization Layer"
        TenantScope[Tenant Scoping]
        ResourceGuard[Resource Guards]
        PolicyEngine[Policy Engine]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption]
        Audit[Audit Logging]
        DataMask[Data Masking]
    end
    
    Request --> CORS
    CORS --> RateLimit
    RateLimit --> SSL
    SSL --> OAuth
    OAuth --> JWT
    JWT --> APIKey
    APIKey --> RBAC
    RBAC --> TenantScope
    TenantScope --> ResourceGuard
    ResourceGuard --> PolicyEngine
    PolicyEngine --> Encryption
    Encryption --> Audit
    Audit --> DataMask
```

## Key Design Decisions

### Technology Choices

**Why Spring Boot + Java 21?**
- **Enterprise-grade** ecosystem with comprehensive security
- **Strong typing** and compile-time safety for business logic
- **Extensive integration** support for databases and messaging
- **Mature tooling** for debugging, monitoring, and operations

**Why MongoDB for Primary Storage?**
- **Flexible schema** accommodates evolving MSP data models
- **Multi-document transactions** for consistency across related entities
- **Rich query capabilities** with aggregation pipelines
- **Horizontal scaling** with automatic sharding

**Why Kafka for Event Streaming?**
- **High throughput** and durability for critical business events
- **Kafka Streams** for real-time processing and aggregation
- **Strong ecosystem** with connectors and monitoring tools
- **Exactly-once semantics** for reliable event processing

**Why VoltAgent for AI Integration?**
- **Node.js performance** for high-throughput AI workflows
- **Flexible integration** with multiple AI providers
- **Workflow engine** for complex automation scenarios
- **Real-time processing** capabilities for responsive AI features

### Scalability Considerations

**Horizontal Scaling Strategy:**
- **Stateless services** enable horizontal pod scaling in Kubernetes
- **Database sharding** by tenant ID for multi-tenant scaling
- **Message partitioning** distributes load across Kafka brokers
- **Caching layers** reduce database load for read-heavy operations

**Performance Optimization:**
- **Connection pooling** for database and messaging connections
- **Async processing** for non-blocking I/O operations
- **Batch operations** for bulk data processing
- **Indexing strategy** optimized for common query patterns

### Reliability & Resilience

**Fault Tolerance Patterns:**
- **Circuit breakers** prevent cascading failures
- **Retry mechanisms** with exponential backoff
- **Bulkhead isolation** separates critical vs. non-critical operations
- **Graceful degradation** maintains core functionality during outages

**Data Consistency:**
- **Eventual consistency** for cross-service operations
- **Compensating transactions** for distributed transaction patterns
- **Event sourcing** for audit trails and replay capabilities
- **Backup and recovery** strategies for each data store

## Integration Architecture

OpenFrame is designed to integrate with existing MSP tools and workflows:

```mermaid
flowchart LR
    subgraph "MSP Tools"
        RMM[RMM Tools<br/>TacticalRMM, etc.]
        PSA[PSA Tools<br/>ConnectWise, etc.]
        Monitor[Monitoring<br/>Nagios, etc.]
        Backup[Backup Tools<br/>Veeam, etc.]
    end
    
    subgraph "OpenFrame Integration"
        External[External API]
        Webhooks[Webhook Handler]
        Sync[Data Sync Engine]
        Transform[Data Transform]
    end
    
    subgraph "OpenFrame Core"
        Stream[Stream Processing]
        API[Core APIs]
        AI[AI Engine]
    end
    
    RMM --> External
    PSA --> Webhooks
    Monitor --> Sync
    Backup --> Transform
    
    External --> Stream
    Webhooks --> Stream
    Sync --> API
    Transform --> AI
```

**Integration Patterns:**
- **REST APIs** for real-time data exchange
- **Webhooks** for event-driven integrations
- **Bulk sync** for periodic data synchronization
- **Stream processing** for real-time data transformation

## Monitoring and Observability

```mermaid
flowchart TD
    subgraph "Application Layer"
        Services[Spring Boot Services] --> Metrics[Micrometer Metrics]
        Services --> Logs[Structured Logging]
        Services --> Traces[Distributed Tracing]
    end
    
    subgraph "Infrastructure Layer"
        Kafka --> KafkaMetrics[Kafka JMX Metrics]
        MongoDB --> MongoMetrics[MongoDB Metrics]
        System --> SystemMetrics[System Metrics]
    end
    
    subgraph "Observability Stack"
        Metrics --> Prometheus[Prometheus]
        Logs --> Elasticsearch[Elasticsearch]
        Traces --> Jaeger[Jaeger]
        KafkaMetrics --> Prometheus
        MongoMetrics --> Prometheus
        SystemMetrics --> Prometheus
    end
    
    subgraph "Visualization"
        Prometheus --> Grafana[Grafana Dashboards]
        Elasticsearch --> Kibana[Kibana Logs]
        Jaeger --> JaegerUI[Jaeger UI]
    end
```

---

*This architecture overview provides the foundation for understanding OpenFrame's design principles and implementation patterns. Continue with the specific guides for [Security](../security/README.md), [Testing](../testing/README.md), and [Contributing](../contributing/guidelines.md).*