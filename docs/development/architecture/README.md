# Architecture Overview

OpenFrame is built as a distributed, multi-tenant microservices platform designed for scalability, security, and extensibility. This guide provides a comprehensive overview of the system architecture, core components, and design decisions.

## High-Level Architecture

```mermaid
flowchart TB
    subgraph "Client Layer"
        WebApp[Web Application<br/>React/Next.js]
        ChatClient[Chat Client<br/>Tauri/React]
        SystemAgent[System Agent<br/>Rust]
    end
    
    subgraph "Edge Layer"
        Gateway[API Gateway<br/>Spring Cloud Gateway]
    end
    
    subgraph "Service Layer"
        AuthSvc[Authorization Service<br/>OAuth2/OIDC]
        APISvc[API Service<br/>GraphQL/REST]
        ClientSvc[Client Service<br/>Agent Management]
        StreamSvc[Stream Processing<br/>Kafka Streams]
        MgmtSvc[Management Service<br/>System Administration]
        ExtAPI[External API<br/>Public REST API]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Primary Database)]
        Kafka[(Apache Kafka<br/>Event Streaming)]
        Cassandra[(Cassandra<br/>Time-Series Data)]
        Pinot[(Apache Pinot<br/>Analytics)]
        Redis[(Redis<br/>Cache & Sessions)]
        NATS[(NATS<br/>Real-time Messaging)]
    end
    
    subgraph "External Integrations"
        Fleet[Fleet MDM<br/>Device Management]
        Tactical[Tactical RMM<br/>Remote Monitoring]
        MeshCentral[MeshCentral<br/>Remote Access]
        Authentik[Authentik<br/>Identity Provider]
    end
    
    WebApp --> Gateway
    ChatClient --> Gateway
    SystemAgent --> Gateway
    
    Gateway --> AuthSvc
    Gateway --> APISvc
    Gateway --> ClientSvc
    Gateway --> ExtAPI
    
    APISvc --> MongoDB
    AuthSvc --> MongoDB
    ClientSvc --> MongoDB
    MgmtSvc --> MongoDB
    
    StreamSvc --> Kafka
    Kafka --> StreamSvc
    StreamSvc --> Cassandra
    StreamSvc --> Pinot
    
    ClientSvc --> NATS
    MgmtSvc --> NATS
    
    APISvc --> Redis
    Gateway --> Redis
    
    Gateway -.-> Fleet
    Gateway -.-> Tactical
    Gateway -.-> MeshCentral
    AuthSvc -.-> Authentik
```

## Core Design Principles

### 1. Multi-Tenancy First
- **Tenant Isolation**: Complete data and resource isolation between tenants
- **Scalable Architecture**: Support thousands of MSP tenants
- **Per-Tenant Configuration**: Customizable settings and integrations per tenant

### 2. Event-Driven Architecture  
- **Async Processing**: Non-blocking operations using Kafka event streams
- **Real-time Updates**: NATS for immediate notifications and chat
- **Audit Trail**: Complete event logging for compliance and debugging

### 3. API-First Design
- **GraphQL Primary**: Rich query capabilities for complex data relationships
- **REST Fallback**: Simple REST endpoints for basic operations
- **External API**: Public API for third-party integrations

### 4. Security by Design
- **Zero-Trust**: All internal communication authenticated and authorized
- **OAuth2/OIDC**: Industry-standard authentication protocols
- **JWT Tokens**: Stateless authentication with short-lived tokens

### 5. Cloud-Native
- **Containerized Services**: Docker containers for all components
- **Kubernetes Ready**: Helm charts for production deployment
- **Service Mesh**: Istio for traffic management and security

## Component Architecture

### API Gateway (Entry Point)

The Gateway acts as the single entry point for all client requests:

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AuthService
    participant APIService
    participant Cache
    
    Client->>Gateway: Request with JWT
    Gateway->>Cache: Check token cache
    alt Token cached and valid
        Cache-->>Gateway: Token valid
    else Token not cached or expired
        Gateway->>AuthService: Validate token
        AuthService-->>Gateway: Token validation result
        Gateway->>Cache: Cache validation result
    end
    Gateway->>APIService: Forward authenticated request
    APIService-->>Gateway: Response
    Gateway-->>Client: Final response
```

**Key Responsibilities:**
- **Authentication**: JWT token validation and refresh
- **Authorization**: Role-based access control
- **Rate Limiting**: Per-tenant and per-user rate limits
- **Request Routing**: Intelligent routing to backend services
- **WebSocket Support**: Real-time communication proxy

### Authorization Service (Identity)

Handles all authentication and authorization concerns:

```mermaid
flowchart LR
    subgraph "Auth Service Components"
        OAuth[OAuth2 Server]
        OIDC[OpenID Connect]
        JWT[JWT Token Service]
        UserMgmt[User Management]
        TenantMgmt[Tenant Management]
    end
    
    subgraph "Identity Providers"
        Google[Google Workspace]
        Microsoft[Microsoft 365]
        SAML[SAML Providers]
        Local[Local Authentication]
    end
    
    Google --> OAuth
    Microsoft --> OAuth
    SAML --> OAuth
    Local --> OAuth
    
    OAuth --> JWT
    OIDC --> JWT
    JWT --> UserMgmt
    UserMgmt --> TenantMgmt
```

**Features:**
- **Multi-Provider SSO**: Google, Microsoft, SAML, local auth
- **PKCE Support**: Secure public client authentication
- **Tenant-Specific Keys**: RSA key pairs per tenant for token signing
- **Invitation Flows**: User onboarding and organization setup

### API Service (Business Logic)

The core business logic layer exposing GraphQL and REST APIs:

```mermaid
flowchart TD
    subgraph "API Service Layers"
        Controllers[REST Controllers]
        GraphQL[GraphQL Data Fetchers]
        Services[Business Services]
        Repositories[Data Repositories]
        Processors[Event Processors]
    end
    
    subgraph "Domain Models"
        Devices[Device Management]
        Organizations[Organization Management]
        Users[User Management]
        Logs[Audit Logging]
        Tools[Tool Integration]
    end
    
    Controllers --> Services
    GraphQL --> Services
    Services --> Repositories
    Services --> Processors
    
    Services --> Devices
    Services --> Organizations
    Services --> Users
    Services --> Logs
    Services --> Tools
```

**Core Domains:**
- **Device Management**: Device lifecycle, health monitoring, remote access
- **Organization Management**: Multi-tenant organization and client management
- **User Management**: User roles, permissions, and access control
- **Tool Integration**: Fleet MDM, Tactical RMM, MeshCentral connections
- **Audit & Compliance**: Complete activity logging and reporting

### Stream Processing (Data Pipeline)

Handles real-time event processing and data enrichment:

```mermaid
flowchart LR
    subgraph "Data Sources"
        Tools[Integrated Tools]
        Agents[System Agents]
        API[API Services]
        External[External Systems]
    end
    
    subgraph "Kafka Topics"
        DeviceEvents[device.events]
        AuditEvents[audit.events]
        ToolEvents[tool.events]
        AgentEvents[agent.events]
    end
    
    subgraph "Stream Processors"
        Enrichment[Data Enrichment]
        Aggregation[Real-time Aggregation]
        Alerting[Alert Processing]
        Compliance[Compliance Processing]
    end
    
    subgraph "Data Stores"
        Cassandra[(Time-Series<br/>Cassandra)]
        Pinot[(Analytics<br/>Pinot)]
        MongoDB[(Operational<br/>MongoDB)]
    end
    
    Tools --> DeviceEvents
    Agents --> AgentEvents
    API --> AuditEvents
    External --> ToolEvents
    
    DeviceEvents --> Enrichment
    AuditEvents --> Enrichment
    ToolEvents --> Enrichment
    AgentEvents --> Enrichment
    
    Enrichment --> Aggregation
    Aggregation --> Alerting
    Alerting --> Compliance
    
    Enrichment --> Cassandra
    Aggregation --> Pinot
    Compliance --> MongoDB
```

**Processing Capabilities:**
- **Real-time Enrichment**: Add contextual data to raw events
- **Stream Analytics**: Live aggregations and metrics calculation
- **Alert Processing**: Rule-based alerting and notification
- **Compliance Tracking**: Automated compliance report generation

## Data Architecture

### Database Strategy

OpenFrame uses a polyglot persistence approach, choosing the right database for each use case:

| Database | Use Case | Data Types | Scaling Strategy |
|----------|----------|------------|------------------|
| **MongoDB** | Operational data | Documents, transactions | Replica sets, sharding |
| **Apache Kafka** | Event streaming | Messages, logs | Partitioning, replication |
| **Cassandra** | Time-series data | Metrics, sensor data | Ring architecture |
| **Apache Pinot** | Analytics | Aggregated metrics | Segment distribution |
| **Redis** | Caching | Sessions, temp data | Cluster mode |
| **NATS** | Real-time messaging | Chat, notifications | Clustering |

### Data Flow Architecture

```mermaid
sequenceDiagram
    participant Agent as System Agent
    participant NATS as NATS
    participant API as API Service
    participant Kafka as Kafka
    participant Stream as Stream Processing
    participant Cassandra as Cassandra
    participant Pinot as Pinot
    participant Frontend as Frontend
    
    Agent->>NATS: Device heartbeat
    NATS->>API: Process heartbeat
    API->>Kafka: Publish device event
    API->>Frontend: Real-time update via WebSocket
    
    Kafka->>Stream: Consume device event
    Stream->>Stream: Enrich with context
    Stream->>Cassandra: Store time-series data
    Stream->>Pinot: Store analytics data
    Stream->>Kafka: Publish enriched event
    
    Kafka->>API: Alert if anomaly detected
    API->>Frontend: Show alert notification
```

## Security Architecture

### Multi-Tenant Security Model

```mermaid
flowchart TD
    subgraph "Security Layers"
        Network[Network Security<br/>TLS/mTLS]
        Gateway[Gateway Security<br/>JWT Validation]
        Service[Service Security<br/>Internal Auth]
        Data[Data Security<br/>Tenant Isolation]
    end
    
    subgraph "Authentication Flow"
        OAuth2[OAuth2/OIDC]
        JWT[JWT Tokens]
        Refresh[Token Refresh]
        Sessions[Session Management]
    end
    
    subgraph "Authorization Model"
        RBAC[Role-Based Access]
        Tenant[Tenant Isolation]
        Resources[Resource Permissions]
        API[API Key Management]
    end
    
    Network --> Gateway
    Gateway --> Service
    Service --> Data
    
    OAuth2 --> JWT
    JWT --> Refresh
    Refresh --> Sessions
    
    RBAC --> Tenant
    Tenant --> Resources
    Resources --> API
```

**Security Features:**
- **End-to-End Encryption**: TLS 1.3 for all communications
- **Zero-Trust Architecture**: Every request authenticated and authorized
- **Tenant Data Isolation**: Complete separation of tenant data
- **JWT with Rotation**: Short-lived access tokens with refresh capability
- **API Key Management**: Scoped API keys for external integrations

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AuthService
    participant ResourceService
    participant Database
    
    User->>Frontend: Login request
    Frontend->>AuthService: OAuth2/PKCE flow
    AuthService->>AuthService: Validate credentials
    AuthService->>Database: Store session
    AuthService-->>Frontend: JWT tokens (access + refresh)
    
    Frontend->>Gateway: API request with JWT
    Gateway->>Gateway: Validate JWT signature
    Gateway->>AuthService: Check token (if not cached)
    AuthService-->>Gateway: Token valid + user context
    Gateway->>ResourceService: Forward with user context
    ResourceService->>Database: Query with tenant filter
    Database-->>ResourceService: Tenant-scoped data
    ResourceService-->>Gateway: Response
    Gateway-->>Frontend: Final response
```

## Integration Architecture

### Tool Integration Strategy

OpenFrame integrates with external MSP tools through a unified proxy pattern:

```mermaid
flowchart LR
    subgraph "OpenFrame Services"
        Gateway[API Gateway]
        ToolProxy[Tool Proxy Service]
        ToolCache[Tool Data Cache]
    end
    
    subgraph "External Tools"
        Fleet[Fleet MDM<br/>Device Management]
        Tactical[Tactical RMM<br/>Remote Monitoring]
        Mesh[MeshCentral<br/>Remote Access]
        Custom[Custom Tools<br/>via API]
    end
    
    subgraph "Integration Patterns"
        REST[REST API Calls]
        WebHooks[Webhook Listeners]
        EventStream[Event Streaming]
        FileSync[File Synchronization]
    end
    
    Gateway --> ToolProxy
    ToolProxy --> ToolCache
    
    ToolProxy --> Fleet
    ToolProxy --> Tactical
    ToolProxy --> Mesh
    ToolProxy --> Custom
    
    ToolProxy --> REST
    ToolProxy --> WebHooks
    ToolProxy --> EventStream
    ToolProxy --> FileSync
```

**Integration Benefits:**
- **Unified API**: Single API for all tool interactions
- **Caching Layer**: Improved performance with intelligent caching
- **Authentication Proxy**: Single sign-on for all integrated tools
- **Event Normalization**: Consistent event format across tools

## Deployment Architecture

### Kubernetes Deployment Model

```mermaid
flowchart TB
    subgraph "Ingress Layer"
        Ingress[Istio Ingress Gateway]
        LoadBalancer[Load Balancer]
    end
    
    subgraph "Application Namespace"
        Gateway[Gateway Pods<br/>3 replicas]
        API[API Service Pods<br/>3 replicas]
        Auth[Auth Service Pods<br/>2 replicas]
        Stream[Stream Processing Pods<br/>2 replicas]
        Management[Management Pods<br/>1 replica]
    end
    
    subgraph "Data Namespace"
        MongoDB[MongoDB Cluster<br/>3 nodes]
        Kafka[Kafka Cluster<br/>3 brokers]
        Redis[Redis Cluster<br/>6 nodes]
        Cassandra[Cassandra Ring<br/>3 nodes]
    end
    
    subgraph "Monitoring Namespace"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Jaeger[Jaeger]
        Loki[Loki]
    end
    
    LoadBalancer --> Ingress
    Ingress --> Gateway
    Gateway --> API
    Gateway --> Auth
    
    API --> MongoDB
    Auth --> MongoDB
    Stream --> Kafka
    Stream --> Cassandra
    
    Gateway --> Redis
    API --> Redis
```

**Deployment Features:**
- **High Availability**: Multi-replica deployments with health checks
- **Auto-scaling**: Horizontal pod autoscaling based on metrics
- **Service Mesh**: Istio for traffic management and security
- **Observability**: Complete monitoring, logging, and tracing

## Performance Characteristics

### Scalability Targets

| Component | Concurrent Users | Requests/Second | Data Volume | Response Time |
|-----------|------------------|-----------------|-------------|---------------|
| **API Gateway** | 10,000+ | 50,000+ | N/A | < 50ms |
| **API Service** | 5,000+ | 10,000+ | 10TB+ | < 200ms |
| **Auth Service** | 10,000+ | 20,000+ | 1GB+ | < 100ms |
| **Stream Processing** | N/A | 100,000+ events/sec | 100TB+ | < 1s |
| **Database** | 1,000+ connections | 50,000+ ops/sec | 100TB+ | < 10ms |

### Caching Strategy

```mermaid
flowchart LR
    subgraph "Cache Layers"
        Browser[Browser Cache<br/>Static Assets]
        CDN[CDN Cache<br/>Global Distribution]
        Gateway[Gateway Cache<br/>API Responses]
        Service[Service Cache<br/>Database Queries]
        Database[Database Cache<br/>Query Results]
    end
    
    Browser --> CDN
    CDN --> Gateway
    Gateway --> Service
    Service --> Database
```

## Key Design Decisions

### Technology Choices

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Java 21 + Spring Boot** | Mature ecosystem, excellent tooling, enterprise-ready | Higher memory usage vs. Go/Rust |
| **GraphQL over REST** | Flexible queries, type safety, better client experience | More complex caching, learning curve |
| **MongoDB Primary Database** | Document model fits domain, good scalability, JSON-native | No ACID across documents |
| **Apache Kafka** | Industry standard for event streaming, excellent durability | Operational complexity |
| **React Frontend** | Large ecosystem, component reusability, developer familiarity | Bundle size, runtime performance |

### Architectural Trade-offs

**Microservices vs. Monolith:**
- ✅ **Chosen**: Microservices for independent scaling and team autonomy
- ❌ **Rejected**: Monolith due to complexity of multi-tenant requirements

**Event-Driven vs. Request-Response:**
- ✅ **Chosen**: Hybrid approach - synchronous for user requests, async for background processing
- ❌ **Rejected**: Pure event-driven due to complexity for simple CRUD operations

**Multi-Database vs. Single Database:**
- ✅ **Chosen**: Polyglot persistence for optimal performance per use case
- ❌ **Rejected**: Single database due to diverse data patterns and scale requirements

## Future Architecture Evolution

### Planned Enhancements

1. **Edge Computing**: Deploy lightweight agents for local processing
2. **AI/ML Integration**: Native machine learning pipeline for predictive analytics
3. **Multi-Region**: Global deployment with data residency compliance
4. **Plugin Architecture**: Runtime plugin system for custom extensions
5. **Event Sourcing**: Complete event sourcing for audit and replay capabilities

### Scalability Roadmap

```mermaid
timeline
    title OpenFrame Architecture Evolution
    
    section Phase 1 (Current)
        Single Region : Multi-tenant services
                      : Basic integrations
                      : GraphQL APIs
    
    section Phase 2 (Next 6 months)
        Enhanced Security : Zero-trust networking
                         : Advanced RBAC
                         : Audit improvements
    
    section Phase 3 (Next Year)
        Global Scale : Multi-region deployment
                    : Edge computing
                    : Advanced caching
    
    section Phase 4 (Future)
        AI-First : Native ML pipeline
                 : Predictive analytics
                 : Autonomous operations
```

---

This architecture enables OpenFrame to serve thousands of MSP tenants while maintaining security, performance, and extensibility. The modular design allows for independent scaling and evolution of components as requirements grow.