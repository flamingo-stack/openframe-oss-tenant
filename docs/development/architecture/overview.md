# Architecture Overview

OpenFrame is built as a distributed, multi-tenant, AI-powered platform using modern microservices architecture patterns. This guide provides a comprehensive overview of the system design, core components, and architectural decisions.

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebUI[Web Application]
        ChatWidget[Chat Widget]
        MobileApp[Mobile App]
        RestClients[REST Clients]
    end
    
    subgraph "Gateway Layer"
        Gateway[OpenFrame Gateway]
        LoadBalancer[Load Balancer]
    end
    
    subgraph "Service Layer"
        API[API Service]
        Auth[Authorization Server]
        Client[Client Service]
        Management[Management Service]
        Stream[Stream Service]
        External[External API]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Redis[(Redis Cache)]
        Kafka[Kafka Streams]
        Cassandra[(Cassandra)]
        Pinot[(Apache Pinot)]
    end
    
    subgraph "External Integration"
        TacticalRMM[TacticalRMM]
        FleetDM[FleetDM]
        MeshCentral[MeshCentral]
        Tools[Other MSP Tools]
    end
    
    WebUI --> LoadBalancer
    ChatWidget --> LoadBalancer
    RestClients --> LoadBalancer
    LoadBalancer --> Gateway
    
    Gateway --> API
    Gateway --> Auth
    Gateway --> Client
    Gateway --> External
    
    API --> MongoDB
    API --> Redis
    Auth --> MongoDB
    Auth --> Redis
    
    Client --> MongoDB
    Management --> MongoDB
    Stream --> Kafka
    Stream --> Cassandra
    Stream --> Pinot
    
    Tools --> Stream
    TacticalRMM --> Stream
    FleetDM --> Stream
    MeshCentral --> Client
```

## Core Architectural Principles

### 1. Multi-Tenant by Design

Every component supports multi-tenancy from the ground up:

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Service
    participant Database
    
    Client->>Gateway: Request with domain/tenant context
    Gateway->>Gateway: Extract tenant ID from domain/JWT
    Gateway->>Service: Forward request with tenant context
    Service->>Database: Query with tenant isolation
    Database->>Service: Tenant-specific data
    Service->>Gateway: Response
    Gateway->>Client: Response
```

**Key Design Elements:**
- **Domain-based Tenant Resolution**: `tenant1.openframe.ai`, `tenant2.openframe.ai`
- **Data Isolation**: All database queries include tenant ID filtering
- **Configuration Isolation**: Tenant-specific settings and integrations
- **Resource Isolation**: Separate resource quotas and limits per tenant

### 2. Event-Driven Architecture

OpenFrame uses events for loose coupling and real-time processing:

```mermaid
graph LR
    A[User Action] --> B[Command Event]
    B --> C[Service Processing]
    C --> D[Domain Event]
    D --> E[Event Stream]
    E --> F[Multiple Consumers]
    
    F --> G[Database Updates]
    F --> H[Cache Updates]
    F --> I[Notifications]
    F --> J[Analytics]
    F --> K[AI Processing]
```

**Event Categories:**
- **Command Events**: User actions, system commands
- **Domain Events**: Business state changes
- **Integration Events**: External tool data synchronization
- **System Events**: Infrastructure and monitoring events

### 3. API-First Design

All functionality exposed via well-defined APIs:

```mermaid
graph TD
    A[GraphQL API] --> B[Flexible Queries]
    A --> C[Real-time Subscriptions]
    A --> D[Type Safety]
    
    E[REST API] --> F[External Integration]
    E --> G[Tool Compatibility]
    E --> H[Standard HTTP]
    
    I[WebSocket API] --> J[Real-time Updates]
    I --> K[Chat Interface]
    I --> L[Live Monitoring]
```

## Service Architecture Deep Dive

### Service Responsibilities Matrix

| Service | Primary Role | Key Responsibilities | Technology Stack |
|---------|--------------|---------------------|------------------|
| **Gateway** | API Gateway & Routing | Request routing, authentication, WebSocket proxy | Spring Cloud Gateway |
| **API Service** | Core Business Logic | GraphQL API, device management, organization CRUD | Spring Boot, Netflix DGS |
| **Auth Server** | Identity & Access | OAuth2/OIDC flows, user management, SSO | Spring Authorization Server |
| **Client Service** | Agent Management | Agent registration, tool connections, file transfers | Spring Boot, NATS |
| **Management** | System Administration | Scheduled tasks, data initialization, health monitoring | Spring Boot, Scheduling |
| **Stream Service** | Event Processing | Real-time data processing, enrichment, analytics | Spring Boot, Kafka Streams |
| **External API** | Public Interface | External tool integration, public REST API facade | Spring Boot, OpenAPI |

### Inter-Service Communication

```mermaid
sequenceDiagram
    participant Frontend
    participant Gateway
    participant API
    participant Auth
    participant Client
    participant Stream
    
    Frontend->>Gateway: GraphQL Query
    Gateway->>Auth: Validate JWT Token
    Auth-->>Gateway: Token Valid
    Gateway->>API: Forward Request
    API->>Client: Get Device Status
    Client-->>API: Device Data
    API-->>Gateway: GraphQL Response
    Gateway-->>Frontend: Response
    
    Client->>Stream: Device Event
    Stream->>API: Enriched Data
    API->>Frontend: WebSocket Update
```

**Communication Patterns:**
- **Synchronous**: HTTP/REST for immediate responses
- **Asynchronous**: Kafka events for eventual consistency
- **Real-time**: WebSocket for live updates
- **Service Discovery**: Spring Cloud discovery (in cloud deployments)

## Data Architecture

### Polyglot Persistence Strategy

OpenFrame uses different databases optimized for specific use cases:

```mermaid
graph TB
    subgraph "Operational Data"
        MongoDB[(MongoDB)]
        Redis[(Redis)]
    end
    
    subgraph "Analytics Data"
        Cassandra[(Cassandra)]
        Pinot[(Apache Pinot)]
    end
    
    subgraph "Streaming Data"
        Kafka[Kafka]
        NATS[NATS]
    end
    
    App[Application Layer] --> MongoDB
    App --> Redis
    
    Events[Event Layer] --> Kafka
    Events --> NATS
    
    Kafka --> Stream[Stream Processing]
    Stream --> Cassandra
    Stream --> Pinot
    
    Redis --> Cache[Caching Layer]
    MongoDB --> Primary[Primary Data]
```

### Database Usage Patterns

| Database | Use Cases | Data Types | Access Patterns |
|----------|-----------|------------|-----------------|
| **MongoDB** | Primary operational data | Users, devices, organizations, configurations | CRUD operations, complex queries |
| **Redis** | Caching & sessions | Session data, cached queries, rate limiting | Key-value access, TTL-based expiration |
| **Cassandra** | Time-series logs | Device logs, events, metrics | Write-heavy, time-based queries |
| **Apache Pinot** | Real-time analytics | Aggregated metrics, dashboards, reports | Complex analytical queries |
| **Kafka** | Event streaming | Events, commands, integrations | Pub-sub, stream processing |

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant Tools as External Tools
    participant Stream as Stream Service
    participant Kafka as Kafka
    participant Cassandra as Cassandra
    participant Pinot as Pinot
    participant API as API Service
    participant Cache as Redis Cache
    participant UI as Frontend
    
    Tools->>Stream: Raw Events
    Stream->>Kafka: Structured Events
    Kafka->>Stream: Event Stream
    Stream->>Cassandra: Historical Data
    Stream->>Pinot: Analytics Data
    
    UI->>API: Query Request
    API->>Cache: Check Cache
    alt Cache Hit
        Cache-->>API: Cached Data
    else Cache Miss
        API->>Pinot: Analytics Query
        Pinot-->>API: Query Results
        API->>Cache: Cache Results
    end
    API-->>UI: Response
```

## Security Architecture

### Multi-Layered Security Model

```mermaid
graph TB
    subgraph "Client Security"
        A[HTTPS/TLS]
        B[CORS Protection]
        C[CSP Headers]
    end
    
    subgraph "Gateway Security"
        D[Rate Limiting]
        E[IP Filtering]
        F[Request Validation]
    end
    
    subgraph "Authentication"
        G[OAuth2/OIDC]
        H[JWT Tokens]
        I[Multi-factor Auth]
    end
    
    subgraph "Authorization"
        J[RBAC]
        K[Resource-level Permissions]
        L[Tenant Isolation]
    end
    
    subgraph "Data Security"
        M[Encryption at Rest]
        N[Encryption in Transit]
        O[Data Masking]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> G
    E --> G
    F --> G
    
    G --> J
    H --> J
    I --> J
    
    J --> M
    K --> M
    L --> M
```

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AuthServer
    participant APIService
    
    User->>Frontend: Login Request
    Frontend->>AuthServer: OAuth2 Authorization Code Flow
    AuthServer-->>Frontend: Authorization Code
    Frontend->>AuthServer: Exchange Code for Tokens
    AuthServer-->>Frontend: Access Token + Refresh Token
    
    Frontend->>Gateway: API Request with JWT
    Gateway->>AuthServer: Validate Token
    AuthServer-->>Gateway: Token Claims
    Gateway->>APIService: Request with User Context
    APIService->>APIService: Check Permissions
    APIService-->>Gateway: Response
    Gateway-->>Frontend: Response
```

**Security Features:**
- **OAuth2/OIDC Compliance**: Standard authentication flows
- **JWT with Refresh Tokens**: Secure token-based authentication  
- **Role-Based Access Control**: Granular permission system
- **Multi-Tenant Security**: Complete tenant isolation
- **Data Encryption**: AES-256 encryption for sensitive data
- **Audit Logging**: Comprehensive security event logging

## AI Integration Architecture

### Mingo AI & Fae AI Integration

```mermaid
graph TB
    subgraph "AI Services"
        MingoAI[Mingo AI - Technician Assistant]
        FaeAI[Fae AI - Client Assistant]
        AIGateway[AI Gateway]
    end
    
    subgraph "Context Services"
        ContextBuilder[Context Builder]
        ToolIntegration[Tool Integration]
        KnowledgeBase[Knowledge Base]
    end
    
    subgraph "Chat Interface"
        ChatWidget[Chat Widget]
        WebUI[Web Interface]
        MobileChat[Mobile Chat]
    end
    
    subgraph "Approval System"
        ApprovalEngine[Approval Engine]
        Workflows[Workflow Engine]
        Notifications[Notification System]
    end
    
    ChatWidget --> AIGateway
    WebUI --> AIGateway
    
    AIGateway --> MingoAI
    AIGateway --> FaeAI
    
    MingoAI --> ContextBuilder
    FaeAI --> ContextBuilder
    
    ContextBuilder --> ToolIntegration
    ContextBuilder --> KnowledgeBase
    
    MingoAI --> ApprovalEngine
    ApprovalEngine --> Workflows
    Workflows --> Notifications
```

**AI Architecture Features:**
- **Context-Aware AI**: AI understands user role, current page, and available data
- **Tool Integration**: AI can interact with MSP tools through APIs
- **Approval Workflows**: Human approval required for sensitive AI actions
- **Learning System**: AI improves based on usage patterns and feedback
- **Enterprise Guardrails**: Configurable limits and permissions for AI actions

## Deployment Architecture

### Container & Orchestration Strategy

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/HAProxy]
    end
    
    subgraph "Kubernetes Cluster"
        subgraph "Frontend Tier"
            FE1[Frontend Pod 1]
            FE2[Frontend Pod 2]
        end
        
        subgraph "Gateway Tier"
            GW1[Gateway Pod 1]
            GW2[Gateway Pod 2]
        end
        
        subgraph "Service Tier"
            API1[API Pod 1]
            API2[API Pod 2]
            AUTH1[Auth Pod 1]
            CLIENT1[Client Pod 1]
            MGMT1[Management Pod]
        end
        
        subgraph "Data Tier"
            MONGO[MongoDB Cluster]
            REDIS[Redis Cluster]
            KAFKA[Kafka Cluster]
        end
    end
    
    LB --> FE1
    LB --> FE2
    FE1 --> GW1
    FE2 --> GW2
    GW1 --> API1
    GW2 --> API2
    API1 --> MONGO
    API2 --> MONGO
```

**Deployment Features:**
- **Kubernetes Native**: Designed for cloud-native deployment
- **Horizontal Scaling**: Auto-scaling based on metrics
- **Health Checks**: Comprehensive health monitoring
- **Rolling Updates**: Zero-downtime deployments
- **Configuration Management**: Helm charts for environment management

## Performance & Scalability

### Scalability Patterns

```mermaid
graph LR
    A[Horizontal Scaling] --> B[Service Replication]
    A --> C[Database Sharding]
    A --> D[Cache Clustering]
    
    E[Vertical Scaling] --> F[Resource Optimization]
    E --> G[JVM Tuning]
    E --> H[Database Tuning]
    
    I[Caching Strategy] --> J[Redis Clustering]
    I --> K[Application Caching]
    I --> L[CDN Integration]
    
    M[Async Processing] --> N[Event Queues]
    M --> O[Background Jobs]
    M --> P[Stream Processing]
```

**Performance Optimizations:**
- **Database Indexing**: Optimized queries with proper indexing
- **Connection Pooling**: Efficient database connection management
- **Caching Layers**: Multi-level caching strategy
- **Async Processing**: Non-blocking operations for better throughput
- **Resource Management**: Memory and CPU optimization

## Monitoring & Observability

### Observability Stack

```mermaid
graph TB
    subgraph "Application Metrics"
        Micrometer[Micrometer Metrics]
        CustomMetrics[Business Metrics]
        HealthChecks[Health Endpoints]
    end
    
    subgraph "Infrastructure Monitoring"
        Prometheus[Prometheus]
        Grafana[Grafana Dashboards]
        AlertManager[Alert Manager]
    end
    
    subgraph "Logging"
        Logback[Logback Logger]
        FluentBit[Fluent Bit]
        Elasticsearch[Elasticsearch]
        Kibana[Kibana]
    end
    
    subgraph "Tracing"
        OpenTelemetry[OpenTelemetry]
        Jaeger[Jaeger Tracing]
        Zipkin[Zipkin]
    end
    
    Micrometer --> Prometheus
    CustomMetrics --> Prometheus
    Prometheus --> Grafana
    Prometheus --> AlertManager
    
    Logback --> FluentBit
    FluentBit --> Elasticsearch
    Elasticsearch --> Kibana
    
    OpenTelemetry --> Jaeger
```

**Observability Features:**
- **Metrics**: Custom business metrics and infrastructure monitoring
- **Logging**: Structured JSON logging with correlation IDs
- **Tracing**: Distributed tracing for request flow analysis
- **Health Monitoring**: Comprehensive service health checks
- **Alerting**: Intelligent alerting based on metrics and patterns

## Integration Architecture

### External Tool Integration

OpenFrame integrates with various MSP tools through a unified integration framework:

```mermaid
graph TB
    subgraph "MSP Tools"
        TacticalRMM[TacticalRMM]
        FleetDM[FleetDM]
        MeshCentral[MeshCentral]
        Authentik[Authentik]
        CustomTool[Custom Tools]
    end
    
    subgraph "Integration Layer"
        StreamService[Stream Service]
        ClientService[Client Service]
        SDKs[Tool SDKs]
    end
    
    subgraph "Data Processing"
        EventNormalization[Event Normalization]
        DataEnrichment[Data Enrichment]
        ConflictResolution[Conflict Resolution]
    end
    
    subgraph "OpenFrame Core"
        UnifiedAPI[Unified API]
        AIProcessing[AI Processing]
        Dashboard[Unified Dashboard]
    end
    
    TacticalRMM --> StreamService
    FleetDM --> StreamService
    MeshCentral --> ClientService
    Authentik --> ClientService
    CustomTool --> SDKs
    
    StreamService --> EventNormalization
    ClientService --> EventNormalization
    SDKs --> EventNormalization
    
    EventNormalization --> DataEnrichment
    DataEnrichment --> ConflictResolution
    ConflictResolution --> UnifiedAPI
    
    UnifiedAPI --> AIProcessing
    UnifiedAPI --> Dashboard
```

**Integration Capabilities:**
- **Unified Data Model**: Consistent data representation across tools
- **Real-time Sync**: Live data synchronization with external tools
- **Conflict Resolution**: Intelligent handling of data conflicts
- **SDK Framework**: Easy integration of new tools
- **API Translation**: Converting between different tool APIs

---

*🏗️ **Architecture foundation established!** Continue to [Testing Overview](../testing/overview.md) to understand the testing strategies and implementation.*