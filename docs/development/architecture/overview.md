# Architecture Overview

This document provides a comprehensive overview of OpenFrame's architecture, including high-level design principles, core components, data flow patterns, and key architectural decisions.

## Architectural Principles

OpenFrame is built on several foundational principles:

### 1. Gateway-First Security
All external requests flow through the API Gateway, which handles authentication, authorization, and request routing. Services never trust the edge directly.

### 2. Event-Driven Architecture
Asynchronous communication via Apache Kafka enables loose coupling, scalability, and real-time data processing.

### 3. Multi-Tenant by Design
Every component supports tenant isolation at the data, security, and configuration levels.

### 4. Domain-Driven Design
Services are organized around business domains (devices, users, organizations) rather than technical layers.

### 5. Cloud-Native Patterns
Microservices, containerization, and horizontal scaling are core to the platform design.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WebApp[Web Dashboard]
        ChatApp[Chat Client]
        MobileApp[Mobile Apps]
        Agents[System Agents]
    end
    
    subgraph "Gateway Layer"
        Gateway[API Gateway]
        LoadBalancer[Load Balancer]
    end
    
    subgraph "Service Layer"
        API[API Service]
        Auth[Auth Service]
        Management[Management Service]
        Stream[Stream Service]
        External[External API]
        Client[Client Service]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Redis[(Redis)]
        Kafka[Apache Kafka]
        Pinot[(Apache Pinot)]
        Cassandra[(Cassandra)]
    end
    
    subgraph "Integration Layer"
        TacticalRMM[Tactical RMM]
        MeshCentral[MeshCentral]
        FleetMDM[Fleet MDM]
        CustomTools[Custom Tools]
    end
    
    WebApp --> LoadBalancer
    ChatApp --> LoadBalancer
    MobileApp --> LoadBalancer
    Agents --> LoadBalancer
    
    LoadBalancer --> Gateway
    
    Gateway --> API
    Gateway --> Auth
    Gateway --> External
    Gateway --> Client
    
    API --> MongoDB
    API --> Redis
    API --> Kafka
    
    Management --> MongoDB
    Management --> Kafka
    
    Stream --> Kafka
    Stream --> Pinot
    Stream --> Cassandra
    
    Kafka --> TacticalRMM
    Kafka --> MeshCentral
    Kafka --> FleetMDM
    Kafka --> CustomTools
```

## Core Components

### API Gateway (openframe-gateway)

**Purpose**: Central entry point for all external requests

**Responsibilities**:
- Request routing and load balancing
- JWT authentication and validation
- Rate limiting and throttling
- WebSocket proxy for real-time features
- CORS and security headers

**Technology Stack**:
- Spring Cloud Gateway
- Spring Security OAuth2
- Redis for rate limiting
- WebSocket support

**Key Configuration**:
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: api-route
          uri: http://openframe-api:8082
          predicates:
            - Path=/api/**,/graphql/**
        - id: auth-route
          uri: http://openframe-auth:8081
          predicates:
            - Path=/auth/**
```

### API Service (openframe-api)

**Purpose**: Core business logic and data access

**Responsibilities**:
- GraphQL API for complex queries
- REST endpoints for mutations
- Business rule enforcement
- Data aggregation and transformation
- Real-time subscriptions

**Architecture**:
```mermaid
graph TD
    Controller[REST Controllers] --> Service[Business Services]
    DataFetcher[GraphQL Data Fetchers] --> Service
    Service --> Repository[Data Repositories]
    Service --> EventPublisher[Event Publishers]
    DataLoader[GraphQL Data Loaders] --> Repository
    
    Repository --> MongoDB[(MongoDB)]
    EventPublisher --> Kafka[Apache Kafka]
```

**Technology Stack**:
- Netflix DGS for GraphQL
- Spring Data MongoDB
- Spring Kafka
- MapStruct for DTOs

### Authorization Service (openframe-authorization-server)

**Purpose**: Identity and access management

**Responsibilities**:
- OAuth2 authorization server
- User authentication and registration
- SSO integration (Google, Microsoft)
- Multi-tenant user management
- JWT token lifecycle

**OAuth2 Flow**:
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Auth as Auth Service
    participant API as API Service
    
    User->>Frontend: Login Request
    Frontend->>Auth: Authorization Code Flow
    Auth->>Auth: Validate Credentials
    Auth->>Frontend: Access Token + Refresh Token
    Frontend->>API: API Request + Access Token
    API->>Auth: Validate Token
    Auth->>API: User Context
    API->>Frontend: API Response
```

### Stream Processing Service (openframe-stream)

**Purpose**: Real-time event processing and data enrichment

**Responsibilities**:
- Kafka stream processing
- Event normalization from external tools
- Data enrichment and correlation
- Real-time analytics preparation
- Integration event routing

**Stream Processing Architecture**:
```mermaid
graph LR
    subgraph "Input Sources"
        TacticalEvents[Tactical RMM Events]
        MeshEvents[MeshCentral Events]
        AgentEvents[Agent Heartbeats]
        UserEvents[User Actions]
    end
    
    subgraph "Stream Processing"
        Kafka[Apache Kafka Topics]
        Processor[Stream Processors]
        Enricher[Data Enrichers]
    end
    
    subgraph "Output Sinks"
        Pinot[(Apache Pinot)]
        Cassandra[(Cassandra)]
        Notifications[Real-time Notifications]
    end
    
    TacticalEvents --> Kafka
    MeshEvents --> Kafka
    AgentEvents --> Kafka
    UserEvents --> Kafka
    
    Kafka --> Processor
    Processor --> Enricher
    Enricher --> Pinot
    Enricher --> Cassandra
    Enricher --> Notifications
```

### Management Service (openframe-management)

**Purpose**: Administrative and operational tasks

**Responsibilities**:
- System initialization and configuration
- Scheduled tasks and cleanup
- Health monitoring and metrics
- Integration management
- Platform updates and migrations

**Scheduled Tasks**:
- Agent registration secret rotation
- Database cleanup and archiving
- Integration health checks
- Performance metric collection

### External API Service (openframe-external-api)

**Purpose**: Public API for third-party integrations

**Responsibilities**:
- REST API for external consumers
- API key authentication
- Rate limiting per client
- Data filtering and access control
- Integration webhook endpoints

### Client Service (openframe-client)

**Purpose**: Agent management and communication

**Responsibilities**:
- Agent registration and authentication
- Agent configuration distribution
- Tool installation orchestration
- Agent update management
- Secure agent-to-server communication

## Data Architecture

### Database Design

**MongoDB Collections**:
```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Device : manages
    User ||--o{ ApiKey : creates
    Device ||--o{ InstalledAgent : runs
    Device ||--o{ ToolConnection : connects
    Organization ||--o{ Invitation : sends
    
    Organization {
        string id PK
        string name
        string domain
        address contactInfo
        datetime createdAt
    }
    
    User {
        string id PK
        string email
        string organizationId FK
        string role
        boolean emailVerified
    }
    
    Device {
        string id PK
        string name
        string organizationId FK
        string status
        object systemInfo
        datetime lastSeen
    }
    
    InstalledAgent {
        string id PK
        string deviceId FK
        string toolType
        string version
        string status
    }
```

**Redis Cache Structure**:
- Session storage: `session:{sessionId}`
- Rate limiting: `rate_limit:{clientId}:{window}`
- JWT blacklist: `jwt_blacklist:{tokenId}`
- Tenant configuration: `tenant_config:{domain}`

### Data Flow Patterns

**Write Path**:
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant MongoDB
    participant Kafka
    participant Stream
    
    Client->>Gateway: Mutation Request
    Gateway->>API: Authenticated Request
    API->>MongoDB: Persist Data
    API->>Kafka: Publish Event
    Kafka->>Stream: Process Event
    Stream->>Stream: Enrich Data
    API->>Client: Success Response
```

**Read Path**:
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant Redis
    participant MongoDB
    participant Pinot
    
    Client->>Gateway: Query Request
    Gateway->>API: Authenticated Request
    API->>Redis: Check Cache
    alt Cache Hit
        Redis->>API: Cached Data
    else Cache Miss
        API->>MongoDB: Query Operational Data
        API->>Pinot: Query Analytics Data
        MongoDB->>API: Operational Result
        Pinot->>API: Analytics Result
        API->>Redis: Cache Result
    end
    API->>Client: Combined Response
```

## Security Architecture

### Multi-Tenant Security

**Tenant Isolation**:
- Database level: All queries include `organizationId` filter
- Cache level: Keys prefixed with tenant identifier
- API level: Request context includes tenant scope
- File storage: Tenant-specific directories

**Authentication Flow**:
```mermaid
graph TD
    Request[Incoming Request] --> Gateway[API Gateway]
    Gateway --> JWTValidation[JWT Validation]
    JWTValidation --> TenantExtraction[Extract Tenant Context]
    TenantExtraction --> RoleCheck[Role-Based Access Control]
    RoleCheck --> Service[Backend Service]
    Service --> TenantFilter[Apply Tenant Filters]
    TenantFilter --> Database[(Database)]
```

### API Security

**Rate Limiting Strategy**:
- Per-user limits: 1000 requests/hour
- Per-API key limits: 10,000 requests/hour
- Global limits: 100,000 requests/hour
- Sliding window algorithm using Redis

**Input Validation**:
- GraphQL schema validation
- JSON schema validation for REST
- XSS prevention and sanitization
- SQL injection prevention (NoSQL injection for MongoDB)

## Integration Architecture

### External Tool Integration

**Integration Pattern**:
```mermaid
graph LR
    subgraph "External Tools"
        TacticalRMM[Tactical RMM API]
        MeshCentral[MeshCentral WebSocket]
        FleetMDM[Fleet MDM Webhooks]
    end
    
    subgraph "OpenFrame Integration"
        Connectors[Tool Connectors]
        EventNormalizer[Event Normalizer]
        Mapper[Data Mapper]
    end
    
    subgraph "OpenFrame Core"
        Kafka[Event Stream]
        API[Core API]
        Database[(Database)]
    end
    
    TacticalRMM --> Connectors
    MeshCentral --> Connectors
    FleetMDM --> Connectors
    
    Connectors --> EventNormalizer
    EventNormalizer --> Mapper
    Mapper --> Kafka
    Kafka --> API
    API --> Database
```

**Integration Types**:
- **Pull-based**: Periodic API polling for tools without webhooks
- **Push-based**: Webhook receivers for real-time events
- **Stream-based**: Direct Kafka integration for high-volume tools
- **Hybrid**: Combination approach based on tool capabilities

### Real-Time Features

**WebSocket Architecture**:
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant Kafka
    participant Stream
    
    Client->>Gateway: WebSocket Connection
    Gateway->>API: Proxy WebSocket
    API->>Kafka: Subscribe to Events
    
    Stream->>Kafka: Publish Real-time Event
    Kafka->>API: Event Notification
    API->>Gateway: WebSocket Message
    Gateway->>Client: Real-time Update
```

**Supported Real-Time Events**:
- Device status changes
- New log entries
- User activity notifications
- System alerts and warnings
- Chat messages and AI responses

## Performance and Scalability

### Horizontal Scaling

**Stateless Services**:
All services are designed to be stateless, enabling horizontal scaling:
- Session state stored in Redis
- No in-memory caches (except local caching)
- Database connections pooled
- Message processing is idempotent

**Load Balancing**:
```mermaid
graph TD
    LoadBalancer[Load Balancer] --> Gateway1[Gateway Instance 1]
    LoadBalancer --> Gateway2[Gateway Instance 2]
    LoadBalancer --> GatewayN[Gateway Instance N]
    
    Gateway1 --> API1[API Instance 1]
    Gateway1 --> API2[API Instance 2]
    Gateway2 --> API1
    Gateway2 --> API3[API Instance 3]
    GatewayN --> APIN[API Instance N]
```

### Caching Strategy

**Multi-Level Caching**:
1. **Application Cache**: In-memory caching for configuration
2. **Redis Cache**: Shared cache for session and frequently accessed data
3. **Database Cache**: MongoDB's WiredTiger cache
4. **CDN Cache**: Static assets and API responses (for read-heavy endpoints)

**Cache Invalidation**:
- Event-driven cache invalidation via Kafka
- TTL-based expiration for time-sensitive data
- Manual invalidation for critical updates

### Database Optimization

**MongoDB Indexing Strategy**:
```javascript
// Core indexes for performance
db.devices.createIndex({ organizationId: 1, status: 1 })
db.devices.createIndex({ organizationId: 1, lastSeen: -1 })
db.logs.createIndex({ organizationId: 1, timestamp: -1 })
db.logs.createIndex({ organizationId: 1, severity: 1, timestamp: -1 })

// Compound indexes for common queries
db.users.createIndex({ organizationId: 1, email: 1 }, { unique: true })
db.apikeys.createIndex({ organizationId: 1, status: 1, expiresAt: 1 })
```

**Query Optimization**:
- Use aggregation pipelines for complex queries
- Implement cursor-based pagination
- Limit result sets with proper filtering
- Use projections to reduce network overhead

### Monitoring and Observability

**Metrics Collection**:
```mermaid
graph LR
    Services[Microservices] --> Prometheus[Prometheus]
    Prometheus --> Grafana[Grafana]
    
    Services --> Logs[Application Logs]
    Logs --> Loki[Loki]
    Loki --> Grafana
    
    Services --> Traces[Distributed Tracing]
    Traces --> Jaeger[Jaeger]
    Jaeger --> Grafana
```

**Key Metrics**:
- Request throughput and latency
- Database query performance
- Cache hit ratios
- Error rates and patterns
- Resource utilization (CPU, memory, disk)

## Deployment Architecture

### Containerization

**Docker Images**:
- Base images: OpenJDK 21, Node 18, Nginx
- Multi-stage builds for optimization
- Security scanning in CI/CD
- Minimal runtime images

**Container Orchestration**:
```mermaid
graph TD
    subgraph "Kubernetes Cluster"
        subgraph "Application Namespace"
            Gateway[Gateway Pods]
            API[API Pods]
            Auth[Auth Pods]
            Management[Management Pods]
        end
        
        subgraph "Data Namespace"
            MongoDB[MongoDB StatefulSet]
            Redis[Redis Deployment]
            Kafka[Kafka StatefulSet]
        end
        
        subgraph "Ingress"
            Ingress[Ingress Controller]
            LB[Load Balancer]
        end
    end
    
    LB --> Ingress
    Ingress --> Gateway
    Gateway --> API
    Gateway --> Auth
    API --> MongoDB
    API --> Redis
    API --> Kafka
```

### Environment Strategy

**Environment Progression**:
- **Development**: Local Docker Compose
- **Testing**: Kubernetes with test data
- **Staging**: Production-like with synthetic data
- **Production**: Full HA deployment with monitoring

## Future Architecture Considerations

### Planned Enhancements

**Service Mesh Integration**:
- Istio for advanced traffic management
- mTLS between services
- Advanced observability and tracing

**Event Sourcing**:
- Migration to event-sourced architecture
- Improved auditability and replay capabilities
- Better support for temporal queries

**GraphQL Federation**:
- Federated GraphQL schema across services
- Independent service deployments
- Better separation of concerns

**AI/ML Integration**:
- Model serving infrastructure
- Real-time inference pipelines
- A/B testing for AI features

---

This architecture overview provides the foundation for understanding OpenFrame's design. For specific implementation details, refer to individual service documentation and the [development guides](../setup/local-development.md).