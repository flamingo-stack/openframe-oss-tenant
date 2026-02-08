# Architecture Overview

OpenFrame is built as a modern, cloud-native platform following microservices architecture principles. This guide provides a comprehensive overview of the system design, component relationships, and key architectural decisions.

## High-Level Architecture

OpenFrame follows a layered architecture with clear separation of concerns:

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Application]
        ChatApp[OpenFrame Chat]
        SystemAgents[System Agents]
        MobileApp[Mobile Apps]
    end
    
    subgraph "API Gateway Layer"
        Gateway[API Gateway]
        LB[Load Balancer]
    end
    
    subgraph "Application Services Layer"
        Auth[Authorization Server]
        API[API Service]
        Stream[Stream Service]
        Management[Management Service]
        Client[Client Service]
        External[External API]
    end
    
    subgraph "Data Processing Layer"
        Kafka[Apache Kafka]
        StreamProc[Stream Processing]
        Analytics[Real-time Analytics]
    end
    
    subgraph "Data Storage Layer"
        MongoDB[(MongoDB)]
        Cassandra[(Cassandra)]
        Redis[(Redis)]
        Pinot[(Apache Pinot)]
    end
    
    WebApp --> LB
    ChatApp --> LB
    SystemAgents --> LB
    MobileApp --> LB
    
    LB --> Gateway
    
    Gateway --> Auth
    Gateway --> API
    Gateway --> Stream
    Gateway --> Management
    Gateway --> Client
    Gateway --> External
    
    API --> MongoDB
    API --> Redis
    Auth --> MongoDB
    Client --> MongoDB
    Management --> MongoDB
    
    Stream --> Kafka
    StreamProc --> Kafka
    StreamProc --> Cassandra
    StreamProc --> Pinot
    
    Analytics --> Pinot
    
    style WebApp fill:#e3f2fd
    style Gateway fill:#fff3e0
    style Auth fill:#e8f5e8
    style MongoDB fill:#fce4ec
```

## Core Design Principles

### 1. Microservices Architecture

**Service Decomposition Strategy:**
- **Domain-Driven Design**: Services organized around business capabilities
- **Single Responsibility**: Each service has a well-defined purpose
- **Data Independence**: Services own their data and schemas
- **API-First**: All inter-service communication via APIs

### 2. Event-Driven Architecture

**Event Streaming Patterns:**
- **Event Sourcing**: All state changes captured as events
- **CQRS**: Command and Query Responsibility Segregation
- **Saga Pattern**: Distributed transaction management
- **Event Choreography**: Decoupled service interactions

### 3. Multi-Tenancy

**Tenant Isolation Strategy:**
- **Database-per-Tenant**: Complete data isolation
- **Row-Level Security**: Shared schema with tenant filtering
- **Service-Level Isolation**: Tenant context propagation
- **Resource Quotas**: Per-tenant resource limits

### 4. Security by Design

**Security Layers:**
- **Authentication**: OAuth2/OIDC with JWT tokens
- **Authorization**: RBAC with fine-grained permissions
- **Network Security**: mTLS between services
- **Data Encryption**: At-rest and in-transit encryption

## Service Architecture Details

### API Gateway Service

**Responsibilities:**
- External traffic routing and load balancing
- Authentication and authorization enforcement
- Rate limiting and request throttling
- CORS handling and origin validation
- WebSocket connection management

```mermaid
graph LR
    subgraph "Gateway Components"
        Router[Request Router]
        Auth[Auth Filter]
        RateLimit[Rate Limiter]
        CORS[CORS Handler]
        Proxy[Service Proxy]
    end
    
    Request --> Router
    Router --> Auth
    Auth --> RateLimit
    RateLimit --> CORS
    CORS --> Proxy
    Proxy --> Backend[Backend Services]
    
    style Router fill:#e1f5fe
    style Auth fill:#f3e5f5
    style Proxy fill:#e8f5e8
```

**Technology Stack:**
- Spring Boot 3.3 with Spring Cloud Gateway
- JWT authentication with cookie support
- Redis for rate limiting and session storage
- WebSocket proxy for real-time communication

### Authorization Server

**OAuth2/OIDC Implementation:**
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AuthServer
    participant Backend
    
    Client->>Gateway: Request with credentials
    Gateway->>AuthServer: Validate token
    AuthServer->>AuthServer: Check tenant context
    AuthServer->>Gateway: Token validation result
    Gateway->>Backend: Forward with tenant context
    Backend->>Gateway: Response
    Gateway->>Client: Final response
```

**Key Features:**
- Multi-tenant token issuance
- SSO integration (Google, Microsoft, SAML)
- Dynamic client registration
- Tenant-scoped signing keys

### API Service Core

**GraphQL and REST APIs:**
```mermaid
graph TB
    subgraph "API Service Architecture"
        GraphQL[GraphQL Endpoint]
        REST[REST Controllers]
        DataFetchers[GraphQL DataFetchers]
        Services[Business Services]
        DataLoaders[Data Loaders]
        Repositories[Data Repositories]
    end
    
    Client1[GraphQL Client] --> GraphQL
    Client2[REST Client] --> REST
    
    GraphQL --> DataFetchers
    REST --> Services
    DataFetchers --> Services
    Services --> DataLoaders
    DataLoaders --> Repositories
    
    Repositories --> MongoDB[(MongoDB)]
    Repositories --> Redis[(Redis)]
```

**Data Access Patterns:**
- **Repository Pattern**: Data access abstraction
- **DataLoader Pattern**: N+1 query prevention
- **Cursor Pagination**: Efficient large dataset handling
- **GraphQL Federation**: Schema composition across services

### Stream Processing Service

**Real-time Data Pipeline:**
```mermaid
flowchart LR
    subgraph "Data Sources"
        Agents[System Agents]
        Tools[External Tools]
        Apps[Applications]
    end
    
    subgraph "Ingestion Layer"
        Kafka[Apache Kafka]
        Debezium[Debezium CDC]
    end
    
    subgraph "Processing Layer"
        StreamApp[Stream Application]
        Enrichment[Data Enrichment]
        Transformation[Data Transformation]
    end
    
    subgraph "Storage Layer"
        Cassandra[(Cassandra)]
        Pinot[(Apache Pinot)]
        MongoDB[(MongoDB)]
    end
    
    Agents --> Kafka
    Tools --> Debezium
    Apps --> Kafka
    
    Kafka --> StreamApp
    StreamApp --> Enrichment
    Enrichment --> Transformation
    
    Transformation --> Cassandra
    Transformation --> Pinot
    Transformation --> MongoDB
```

**Processing Capabilities:**
- Real-time event enrichment
- Data format normalization
- Anomaly detection
- Metrics aggregation

## Data Architecture

### Database Selection Rationale

| Database | Use Case | Rationale |
|----------|----------|-----------|
| **MongoDB** | Transactional Data | Document model fits complex business entities |
| **Redis** | Caching & Sessions | High-performance in-memory operations |
| **Cassandra** | Time-Series Data | Excellent write performance for logs/metrics |
| **Apache Pinot** | Analytics | Real-time OLAP queries on large datasets |
| **Kafka** | Event Streaming | Durable, scalable event processing |

### Data Flow Patterns

```mermaid
graph TD
    subgraph "Write Path"
        App[Application] --> API[API Service]
        API --> MongoDB[(MongoDB)]
        MongoDB --> Debezium[Debezium CDC]
        Debezium --> Kafka[Kafka Topic]
    end
    
    subgraph "Stream Processing"
        Kafka --> Processor[Stream Processor]
        Processor --> Cassandra[(Cassandra)]
        Processor --> Pinot[(Pinot)]
    end
    
    subgraph "Read Path"
        Query[Query Service] --> MongoDB
        Query --> Cache[Redis Cache]
        Analytics[Analytics Service] --> Pinot
        Logs[Log Service] --> Cassandra
    end
    
    style App fill:#e3f2fd
    style Processor fill:#fff3e0
    style Query fill:#e8f5e8
```

## Security Architecture

### Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AuthServer
    participant APIService
    participant Database
    
    User->>Frontend: Login request
    Frontend->>Gateway: Auth request
    Gateway->>AuthServer: Validate credentials
    AuthServer->>Database: Check user/tenant
    Database->>AuthServer: User data
    AuthServer->>Gateway: JWT token (tenant-scoped)
    Gateway->>Frontend: Secure cookie
    
    Frontend->>Gateway: API request (with cookie)
    Gateway->>Gateway: Extract JWT from cookie
    Gateway->>AuthServer: Validate token
    AuthServer->>Gateway: Validation + tenant context
    Gateway->>APIService: Request with tenant context
    APIService->>Database: Tenant-scoped query
```

### Security Controls

| Layer | Security Measures | Implementation |
|-------|------------------|----------------|
| **Network** | mTLS, VPN, Firewall | Istio service mesh, network policies |
| **Application** | JWT validation, RBAC | Spring Security, custom filters |
| **Data** | Encryption, access control | MongoDB encryption, field-level security |
| **API** | Rate limiting, input validation | Spring Cloud Gateway, Bean Validation |

## Scalability and Performance

### Horizontal Scaling Strategy

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB[Load Balancer]
    end
    
    subgraph "Gateway Cluster"
        GW1[Gateway 1]
        GW2[Gateway 2]
        GWN[Gateway N]
    end
    
    subgraph "Service Clusters"
        API1[API Service 1]
        API2[API Service 2]
        APIN[API Service N]
        
        Stream1[Stream Service 1]
        Stream2[Stream Service 2]
    end
    
    subgraph "Data Tier"
        MongoDB[(MongoDB Cluster)]
        Kafka[(Kafka Cluster)]
        Cassandra[(Cassandra Cluster)]
    end
    
    LB --> GW1
    LB --> GW2
    LB --> GWN
    
    GW1 --> API1
    GW2 --> API2
    GWN --> APIN
    
    GW1 --> Stream1
    GW2 --> Stream2
    
    API1 --> MongoDB
    API2 --> MongoDB
    Stream1 --> Kafka
    Stream2 --> Kafka
```

### Performance Optimizations

**Application Level:**
- Connection pooling for databases
- Async processing with CompletableFuture
- Caching strategies (Redis, application-level)
- GraphQL DataLoader for N+1 prevention

**Data Level:**
- Database indexing strategies
- Partition key optimization
- Read replicas for query distribution
- Data archiving and retention policies

## Deployment Architecture

### Kubernetes Deployment

```yaml
# Example deployment structure
apiVersion: v1
kind: Namespace
metadata:
  name: openframe-prod
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openframe-gateway
  template:
    spec:
      containers:
      - name: gateway
        image: openframe/gateway:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

### Service Mesh Integration

**Istio Configuration:**
- Automatic mTLS between services
- Traffic management and load balancing
- Observability with distributed tracing
- Security policies and RBAC

## Monitoring and Observability

### Observability Stack

```mermaid
graph TB
    subgraph "Application Metrics"
        Micrometer[Micrometer]
        Prometheus[Prometheus]
    end
    
    subgraph "Logging"
        Logback[Logback]
        Loki[Grafana Loki]
    end
    
    subgraph "Tracing"
        Sleuth[Spring Cloud Sleuth]
        Jaeger[Jaeger]
    end
    
    subgraph "Visualization"
        Grafana[Grafana Dashboards]
        AlertManager[AlertManager]
    end
    
    Services[OpenFrame Services] --> Micrometer
    Services --> Logback
    Services --> Sleuth
    
    Micrometer --> Prometheus
    Logback --> Loki
    Sleuth --> Jaeger
    
    Prometheus --> Grafana
    Loki --> Grafana
    Jaeger --> Grafana
    
    Prometheus --> AlertManager
```

### Key Metrics

**Application Metrics:**
- Request throughput and latency
- Error rates and types
- Resource utilization (CPU, memory)
- Business metrics (user activity, tenant usage)

**Infrastructure Metrics:**
- Database performance and connections
- Kafka topic lag and throughput
- Network latency and bandwidth
- Container resource usage

## Development and Testing Architecture

### Testing Strategy

```mermaid
pyramid
    "Unit Tests (80%)"
    "Integration Tests (15%)"
    "E2E Tests (5%)"
```

**Testing Layers:**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **Contract Tests**: API contract verification
- **End-to-End Tests**: Complete user journey testing

### CI/CD Pipeline

```mermaid
graph LR
    Code[Code Change] --> Build[Build & Test]
    Build --> Security[Security Scan]
    Security --> Deploy[Deploy to Staging]
    Deploy --> E2ETest[E2E Testing]
    E2ETest --> Promote[Promote to Production]
    
    Build --> UnitTest[Unit Tests]
    Build --> IntegTest[Integration Tests]
    
    style Code fill:#e3f2fd
    style Security fill:#ffebee
    style Promote fill:#e8f5e8
```

## Design Decisions and Trade-offs

### Key Architectural Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Microservices** | Scalability, team autonomy | Complexity, network overhead |
| **Event-Driven** | Loose coupling, resilience | Eventual consistency, debugging complexity |
| **Multi-Database** | Optimal tool per use case | Operational complexity, data consistency |
| **GraphQL + REST** | Flexible queries, compatibility | Learning curve, caching complexity |

### Technology Choices

| Technology | Alternative | Why Chosen |
|------------|-------------|------------|
| **Spring Boot** | Quarkus, Micronaut | Mature ecosystem, extensive documentation |
| **Vue 3** | React, Angular | Gentle learning curve, excellent TypeScript support |
| **MongoDB** | PostgreSQL | Document model fits complex domain objects |
| **Kafka** | RabbitMQ, Apache Pulsar | Proven scalability, rich ecosystem |

## Future Architecture Evolution

### Planned Enhancements

1. **AI/ML Integration**: MLOps pipeline for Mingo AI capabilities
2. **Edge Computing**: Distributed edge deployments for remote locations
3. **Federation**: Multi-region deployments with data federation
4. **Serverless**: Function-as-a-Service for event processing
5. **Blockchain**: Immutable audit logs and smart contracts

### Migration Strategies

**Database Evolution:**
- Blue-green deployment for schema changes
- Event sourcing for backward compatibility
- Feature flags for gradual rollouts

**Service Evolution:**
- API versioning strategies
- Strangler Fig pattern for legacy replacement
- Circuit breaker pattern for resilience

---

This architecture overview provides the foundation for understanding OpenFrame's design. For specific implementation details, refer to the individual service documentation and API references.