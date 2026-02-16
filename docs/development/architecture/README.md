# Architecture Overview

OpenFrame is designed as a modern, cloud-native platform using microservices architecture patterns. This guide provides a comprehensive overview of the system design, component interactions, and key architectural decisions.

## High-Level System Architecture

```mermaid
graph TB
    %% Client Layer
    subgraph "Client Applications"
        WebApp[Web Application<br/>Next.js + VoltAgent]
        Desktop[Desktop Chat Client<br/>Tauri + React]
        Mobile[Mobile App<br/>Future]
        Agent[System Agents<br/>Rust]
    end
    
    %% Gateway Layer
    subgraph "API Gateway Layer"
        Gateway[Spring Cloud Gateway<br/>Port 8080]
    end
    
    %% Service Layer
    subgraph "Microservices Layer"
        AuthServer[Authorization Server<br/>OAuth2/OIDC<br/>Port 8082]
        APIService[API Service<br/>GraphQL + REST<br/>Port 8081]
        ExternalAPI[External API<br/>Versioned REST<br/>Port 8083]
        Management[Management Service<br/>Operations<br/>Port 8084]
        Stream[Stream Processing<br/>Kafka Consumer<br/>Port 8085]
        Client[Client Service<br/>Agent Coordination<br/>Port 8086]
        Config[Config Server<br/>Spring Cloud Config<br/>Port 8888]
    end
    
    %% Data Layer
    subgraph "Data Persistence Layer"
        MongoDB[(MongoDB<br/>Primary Database)]
        Redis[(Redis<br/>Cache + Sessions)]
    end
    
    %% Streaming Layer
    subgraph "Event Streaming Layer"
        Kafka[Apache Kafka<br/>Event Streaming]
        Pinot[Apache Pinot<br/>Analytics]
        NATS[NATS<br/>Real-time Messaging]
    end
    
    %% External Integrations
    subgraph "Integrated Tools"
        FleetMDM[Fleet MDM]
        TacticalRMM[Tactical RMM]
        MeshCentral[MeshCentral]
        CustomTools[Custom Tools]
    end
    
    %% Client connections
    WebApp --> Gateway
    Desktop --> Gateway
    Agent --> Gateway
    
    %% Gateway routing
    Gateway --> AuthServer
    Gateway --> APIService
    Gateway --> ExternalAPI
    Gateway --> Client
    
    %% Service interactions
    APIService --> MongoDB
    APIService --> Redis
    APIService --> Kafka
    AuthServer --> MongoDB
    Management --> MongoDB
    Management --> Kafka
    Stream --> Kafka
    Stream --> Pinot
    Stream --> MongoDB
    
    %% External tool integrations
    Gateway --> FleetMDM
    Gateway --> TacticalRMM
    Gateway --> MeshCentral
    APIService --> CustomTools
    
    %% Styling
    style Gateway fill:#FFC008,color:#000
    style APIService fill:#e1f5fe
    style AuthServer fill:#f3e5f5
    style MongoDB fill:#47a248,color:#fff
    style Kafka fill:#231f20,color:#fff
    style Redis fill:#dc382d,color:#fff
```

## Core Components Overview

### Client Applications Layer

| Component | Technology | Purpose | Key Features |
|-----------|------------|---------|-------------|
| **Web Application** | Next.js 16 + VoltAgent | Primary user interface | AI-powered UI, responsive design, SSR |
| **Desktop Chat Client** | Tauri + React | AI assistant interface | Native performance, secure token storage |
| **System Agents** | Rust | Device monitoring | Low resource usage, cross-platform |

### API Gateway Layer

**Spring Cloud Gateway** serves as the single entry point for all client requests:

- **JWT Validation**: Multi-issuer JWT verification
- **API Key Authentication**: For programmatic access
- **Rate Limiting**: Per-client request throttling
- **WebSocket Proxying**: Real-time communication support
- **Tool Routing**: Dynamic routing to integrated tools
- **CORS Management**: Cross-origin request handling

### Microservices Layer

```mermaid
graph LR
    subgraph "Business Logic"
        API[API Service<br/>Core Business Logic]
        External[External API<br/>Public Interface]
    end
    
    subgraph "Infrastructure Services"
        Auth[Auth Server<br/>Identity Management]
        Gateway[Gateway<br/>Entry Point]
        Config[Config Server<br/>Configuration]
    end
    
    subgraph "Operational Services"
        Management[Management<br/>System Operations]
        Stream[Stream Processing<br/>Event Handling]
        Client[Client Service<br/>Agent Management]
    end
    
    Gateway --> API
    Gateway --> External
    Gateway --> Auth
    
    API --> Stream
    Management --> Stream
    Stream --> API
    
    style API fill:#e1f5fe
    style Gateway fill:#FFC008,color:#000
    style Auth fill:#f3e5f5
```

#### Service Responsibilities

**API Service (Port 8081)**
- **Primary Role**: Core business logic and data operations
- **Technologies**: Spring Boot, Netflix DGS (GraphQL), MongoDB
- **Key Features**:
  - GraphQL API with DataLoader optimization
  - REST endpoints for mutations
  - Multi-tenant data isolation
  - Business rule enforcement

**Authorization Server (Port 8082)**
- **Primary Role**: Identity and access management
- **Technologies**: Spring Authorization Server, OAuth2/OIDC
- **Key Features**:
  - Multi-tenant OAuth2 flows
  - Dynamic SSO provider integration
  - JWT token management
  - User registration and invitation flows

**External API (Port 8083)**
- **Primary Role**: Public API for integrations
- **Technologies**: Spring Boot, OpenAPI/Swagger
- **Key Features**:
  - Versioned REST API
  - Rate limiting and quotas
  - API key management
  - Public documentation

**Management Service (Port 8084)**
- **Primary Role**: System operations and orchestration
- **Technologies**: Spring Boot, Scheduled Tasks
- **Key Features**:
  - Database initialization
  - Health monitoring
  - Automated maintenance tasks
  - System metrics collection

**Stream Processing Service (Port 8085)**
- **Primary Role**: Event processing and data enrichment
- **Technologies**: Spring Kafka, Apache Kafka Streams
- **Key Features**:
  - Real-time event processing
  - Data transformation pipelines
  - Integration with external tools
  - Analytics data preparation

**Client Service (Port 8086)**
- **Primary Role**: Agent coordination and communication
- **Technologies**: Spring Boot, NATS
- **Key Features**:
  - Agent registration and authentication
  - Command dispatch to agents
  - File transfer coordination
  - Tool installation management

## Data Flow Architecture

### Request-Response Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant Gateway as Gateway
    participant Auth as Auth Server
    participant API as API Service
    participant DB as MongoDB
    participant Cache as Redis

    Client->>Gateway: HTTPS Request + JWT
    Gateway->>Auth: Validate JWT
    Auth-->>Gateway: JWT Valid + Claims
    Gateway->>API: Forward Request + User Context
    
    API->>Cache: Check Cache
    alt Cache Hit
        Cache-->>API: Cached Data
    else Cache Miss
        API->>DB: Query Database
        DB-->>API: Database Result
        API->>Cache: Store in Cache
    end
    
    API-->>Gateway: Response Data
    Gateway-->>Client: HTTP Response
```

### Event-Driven Flow

```mermaid
sequenceDiagram
    participant Agent as System Agent
    participant Client as Client Service
    participant Kafka as Kafka
    participant Stream as Stream Service
    participant API as API Service
    participant DB as MongoDB

    Agent->>Client: Device Event
    Client->>Kafka: Publish Event
    
    Kafka->>Stream: Event Consumed
    Stream->>Stream: Process & Enrich
    Stream->>Kafka: Enriched Event
    
    Kafka->>API: Enriched Event
    API->>DB: Update Database
    
    API->>Kafka: State Change Event
    Kafka->>Client: Notification Event
    Client-->>Agent: Command/Response
```

## Key Design Decisions

### Multi-Tenancy Strategy

**Database-Level Isolation:**
```text
Collection Structure:
├── organizations (tenant_id: ObjectId)
├── users (organization_id: ObjectId)
├── devices (organization_id: ObjectId)
└── events (organization_id: ObjectId)
```

**Benefits:**
- Complete data isolation between tenants
- Simplified backup and recovery per tenant
- Flexible per-tenant configuration
- Scalable to thousands of tenants

**Trade-offs:**
- Slightly more complex queries (tenant filtering)
- Additional indexes required
- More careful migration planning

### Authentication & Authorization Architecture

```mermaid
graph TB
    subgraph "Multi-Tenant Auth Flow"
        Browser[Browser] --> TenantDetection[Tenant Context Detection]
        TenantDetection --> AuthServer[Authorization Server]
        AuthServer --> TenantKeys[Per-Tenant RSA Keys]
        TenantKeys --> JWT[Signed JWT Tokens]
    end
    
    subgraph "Token Validation"
        JWT --> Gateway[API Gateway]
        Gateway --> JWTValidator[Multi-Issuer JWT Validator]
        JWTValidator --> ServiceCall[Service Invocation]
    end
    
    style AuthServer fill:#f3e5f5
    style Gateway fill:#FFC008,color:#000
    style JWT fill:#fff3e0
```

**Key Features:**
- **Per-Tenant Keys**: Each tenant uses unique RSA key pairs
- **Dynamic SSO**: Runtime SSO provider configuration
- **Session Management**: Redis-backed session storage
- **API Key Support**: Programmatic access with scoped permissions

### Data Consistency Patterns

**Eventual Consistency for Events:**
```mermaid
graph LR
    Write[Write to Primary] --> Event[Publish Event]
    Event --> Consumer1[Update Analytics]
    Event --> Consumer2[Update Cache]
    Event --> Consumer3[Send Notifications]
    
    style Write fill:#e8f5e8
    style Event fill:#fff3e0
```

**Strong Consistency for Transactions:**
- User authentication and authorization
- Financial and billing operations
- Critical configuration changes

**Benefits:**
- High performance for read operations
- Scalable event processing
- Resilient to temporary service outages

### Microservices Communication Patterns

**Synchronous Communication:**
- Client-to-service: HTTP/HTTPS with JWT
- Service-to-service: Internal HTTP with service accounts
- External integrations: HTTP/HTTPS with API keys

**Asynchronous Communication:**
- Event streaming: Apache Kafka for data events
- Real-time messaging: NATS for command/control
- Batch processing: Scheduled tasks and background jobs

## Security Architecture

### Defense in Depth Strategy

```mermaid
graph TD
    subgraph "Network Security"
        TLS[TLS/HTTPS Everywhere]
        Firewall[Network Segmentation]
        WAF[Web Application Firewall]
    end
    
    subgraph "Application Security"
        JWT[JWT Token Validation]
        RBAC[Role-Based Access Control]
        InputValidation[Input Validation]
        SQLPrevention[SQL Injection Prevention]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption at Rest]
        Transit[Data Encryption in Transit]
        Backup[Secure Backup & Recovery]
    end
    
    subgraph "Operational Security"
        Monitoring[Security Monitoring]
        Audit[Audit Logging]
        Incident[Incident Response]
    end
    
    TLS --> JWT
    Firewall --> RBAC
    JWT --> Encryption
    InputValidation --> Monitoring
    
    style TLS fill:#ffebee
    style JWT fill:#e8f5e8
    style Encryption fill:#e3f2fd
```

### Security Controls

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Transport** | TLS 1.3 | All communications encrypted |
| **Authentication** | OAuth2/OIDC | Multi-tenant identity management |
| **Authorization** | JWT + RBAC | Token-based access control |
| **Data** | AES-256 | Encryption at rest and in transit |
| **Network** | Private subnets | Service mesh communication |
| **Monitoring** | Audit logs | Comprehensive activity tracking |

## Performance and Scalability

### Horizontal Scaling Strategy

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        ALB[Application Load Balancer]
    end
    
    subgraph "Application Layer (Auto-Scaling)"
        Gateway1[Gateway Instance 1]
        Gateway2[Gateway Instance 2]
        GatewayN[Gateway Instance N]
        
        API1[API Instance 1]
        API2[API Instance 2]
        APIN[API Instance N]
    end
    
    subgraph "Data Layer (Distributed)"
        MongoCluster[MongoDB Cluster<br/>Replica Set]
        RedisCluster[Redis Cluster<br/>High Availability]
        KafkaCluster[Kafka Cluster<br/>Partitioned]
    end
    
    ALB --> Gateway1
    ALB --> Gateway2
    ALB --> GatewayN
    
    Gateway1 --> API1
    Gateway2 --> API2
    GatewayN --> APIN
    
    API1 --> MongoCluster
    API2 --> RedisCluster
    APIN --> KafkaCluster
    
    style ALB fill:#FFC008,color:#000
    style MongoCluster fill:#47a248,color:#fff
    style KafkaCluster fill:#231f20,color:#fff
```

### Performance Optimizations

**Caching Strategy:**
- **L1 Cache**: Application-level caching with Caffeine
- **L2 Cache**: Redis distributed cache
- **L3 Cache**: CDN for static assets

**Database Optimization:**
- **Read Replicas**: Separate read and write operations
- **Indexing Strategy**: Compound indexes for complex queries
- **Connection Pooling**: HikariCP for optimal connection management

**Event Processing:**
- **Partitioning**: Kafka topic partitioning for parallel processing
- **Batch Processing**: Grouped event processing for efficiency
- **Consumer Groups**: Multiple consumers for scalability

## Deployment Architecture

### Container Strategy

```mermaid
graph TB
    subgraph "Container Registry"
        Registry[Docker Registry<br/>Container Images]
    end
    
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: openframe-production"
            Gateway[Gateway Pods<br/>3 replicas]
            API[API Pods<br/>5 replicas]
            Auth[Auth Pods<br/>2 replicas]
        end
        
        subgraph "Namespace: openframe-data"
            MongoDB[MongoDB StatefulSet]
            Redis[Redis Deployment]
            Kafka[Kafka StatefulSet]
        end
        
        subgraph "Infrastructure"
            Ingress[Nginx Ingress Controller]
            Service[Service Mesh - Istio]
            Monitoring[Monitoring Stack]
        end
    end
    
    Registry --> Gateway
    Registry --> API
    Registry --> Auth
    
    Ingress --> Gateway
    Gateway --> API
    Gateway --> Auth
    
    API --> MongoDB
    API --> Redis
    API --> Kafka
    
    style Gateway fill:#FFC008,color:#000
    style MongoDB fill:#47a248,color:#fff
    style Kafka fill:#231f20,color:#fff
```

### Environment Strategy

| Environment | Purpose | Infrastructure | Deployment |
|-------------|---------|---------------|------------|
| **Development** | Local development | Docker Compose | Manual |
| **Staging** | Integration testing | Kubernetes (single node) | CI/CD Pipeline |
| **Production** | Live system | Kubernetes (multi-node) | GitOps + Automation |

## Monitoring and Observability

### Three Pillars of Observability

```mermaid
graph TB
    subgraph "Metrics"
        Prometheus[Prometheus<br/>Time Series DB]
        Grafana[Grafana<br/>Dashboards]
        Alerts[Alert Manager<br/>Notifications]
    end
    
    subgraph "Logging"
        Loki[Loki<br/>Log Aggregation]
        Fluent[Fluent Bit<br/>Log Shipping]
        LogDash[Log Dashboards]
    end
    
    subgraph "Tracing"
        Jaeger[Jaeger<br/>Distributed Tracing]
        OpenTel[OpenTelemetry<br/>Instrumentation]
        TraceDash[Trace Analysis]
    end
    
    Prometheus --> Grafana
    Grafana --> Alerts
    
    Fluent --> Loki
    Loki --> LogDash
    
    OpenTel --> Jaeger
    Jaeger --> TraceDash
    
    style Prometheus fill:#e6522c,color:#fff
    style Grafana fill:#f46800,color:#fff
    style Loki fill:#00d4aa,color:#000
```

### Key Performance Indicators (KPIs)

**Application Metrics:**
- Request latency (P50, P95, P99)
- Error rates by service
- Throughput (requests per second)
- CPU and memory utilization

**Business Metrics:**
- User registration rate
- AI conversation engagement
- Device onboarding success rate
- Multi-tenant usage patterns

**System Health:**
- Database connection pool utilization
- Kafka consumer lag
- Cache hit rates
- Service availability (uptime)

## Future Architecture Considerations

### Planned Enhancements

**AI/ML Integration:**
- Dedicated AI inference services
- Model serving infrastructure
- Training pipeline automation
- Vector database for embeddings

**Edge Computing:**
- Edge deployment capabilities
- Offline-first agent functionality
- Local data processing
- Sync mechanisms

**Advanced Analytics:**
- Real-time analytics dashboards
- Predictive maintenance algorithms
- Anomaly detection systems
- Custom reporting engines

---

This architecture overview provides the foundation for understanding OpenFrame's design principles and technical implementation. The modular, scalable design enables rapid development, easy maintenance, and future growth.

**Next Steps:**
- [Security Best Practices](../security/README.md) - Deep dive into security implementation
- [Local Development](../setup/local-development.md) - Set up your development environment
- [Testing Strategy](../testing/README.md) - Learn about our testing approach

> **💡 Architecture Tip**: OpenFrame's microservices architecture allows you to focus on specific services without understanding the entire system. Start with the API service for business logic or the Gateway service for routing and security.