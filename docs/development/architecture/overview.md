# Architecture Overview

OpenFrame is built as a distributed microservices platform designed for multi-tenant MSP operations. This document provides a comprehensive overview of the system architecture, service interactions, and design principles.

## High-Level Architecture

```mermaid
graph TB
    subgraph "External Clients"
        Browser[Web Browser]
        Mobile[Mobile Apps]
        Agents[OpenFrame Agents]
        Tools[External MSP Tools]
    end
    
    subgraph "OpenFrame Platform"
        Gateway[API Gateway<br/>:8081]
        
        subgraph "Core Services"
            Auth[Authorization Server<br/>:8082]
            API[API Service<br/>:8080]
            External[External API<br/>:8083]
            Management[Management Service<br/>:8084]
            Stream[Stream Processing<br/>:8085]
        end
        
        subgraph "Data Layer"
            MongoDB[(MongoDB<br/>Primary Data)]
            Redis[(Redis<br/>Cache)]
            Kafka[(Kafka<br/>Event Streams)]
            Cassandra[(Cassandra<br/>Time Series)]
        end
        
        subgraph "Frontend"
            NextJS[Next.js Frontend<br/>:3000]
            Chat[AI Chat Client<br/>Tauri/Rust]
        end
    end
    
    Browser --> Gateway
    Mobile --> Gateway
    Agents --> Gateway
    Tools --> External
    
    Gateway --> Auth
    Gateway --> API
    Gateway --> External
    
    API --> MongoDB
    API --> Redis
    API --> Kafka
    
    Stream --> Kafka
    Stream --> Cassandra
    
    NextJS --> Gateway
    Chat --> Gateway
```

## Core Service Architecture

### 1. API Gateway (`openframe-gateway`)

**Purpose**: Unified entry point for all external requests, handling authentication, routing, and cross-cutting concerns.

```mermaid
graph TD
    subgraph "API Gateway Features"
        A[Request Routing] --> B[Authentication]
        B --> C[Rate Limiting]
        C --> D[Request Transformation]
        D --> E[Response Aggregation]
        E --> F[WebSocket Handling]
        
        G[JWT Validation] --> H[Tenant Resolution]
        H --> I[Security Headers]
        I --> J[CORS Handling]
        
        K[Service Discovery] --> L[Load Balancing]
        L --> M[Circuit Breaking]
        M --> N[Health Checks]
    end
```

**Key Responsibilities**:
- Route requests to appropriate backend services
- Validate JWT tokens and API keys
- Handle WebSocket connections for real-time features
- Implement rate limiting and throttling
- Provide centralized logging and monitoring

**Technology Stack**:
- Spring Cloud Gateway
- Spring Security OAuth2 Resource Server
- WebSocket support
- Reactive programming model (WebFlux)

### 2. Authorization Server (`openframe-authorization-server`)

**Purpose**: Multi-tenant OAuth2/OpenID Connect provider handling authentication and authorization.

```mermaid
graph TD
    subgraph "Authorization Server"
        A[OAuth2 Endpoints] --> B[JWT Token Issuance]
        B --> C[Tenant-Specific Keys]
        C --> D[User Management]
        D --> E[SSO Integration]
        
        F[Login/Registration] --> G[Password Reset]
        G --> H[Invitation System]
        H --> I[Multi-Factor Auth]
        
        J[Tenant Discovery] --> K[Domain Policies]
        K --> L[Client Registration]
        L --> M[Scope Management]
    end
```

**Key Features**:
- **Multi-tenant JWT**: Per-tenant signing keys
- **SSO Integration**: Google, Azure AD, Okta support
- **User Lifecycle**: Registration, invitations, password reset
- **Client Management**: Dynamic OAuth2 client registration

**Technology Stack**:
- Spring Authorization Server
- MongoDB for persistence
- JWT with per-tenant keys
- OpenID Connect compliance

### 3. API Service (`openframe-api`)

**Purpose**: Core business logic and data access layer exposing GraphQL and REST APIs.

```mermaid
graph TD
    subgraph "API Service Architecture"
        A[GraphQL API] --> B[Data Fetchers]
        C[REST Controllers] --> D[Service Layer]
        
        B --> E[Business Logic]
        D --> E
        E --> F[Data Access Layer]
        
        F --> G[MongoDB Repositories]
        F --> H[Redis Cache]
        F --> I[Kafka Publishers]
        
        J[Domain Models] --> K[Device Management]
        K --> L[Organization Management]
        L --> M[User Management]
        M --> N[Log Processing]
        N --> O[Event Handling]
    end
```

**Domain Models**:

| Domain | Purpose | Key Entities |
|--------|---------|--------------|
| **Organizations** | Multi-tenant structure | Organization, Contact, Address |
| **Devices** | Endpoint management | Machine, DeviceStatus, Tags |
| **Users** | Identity and access | User, Invitation, Roles |
| **Events** | Activity tracking | CoreEvent, ExternalEvent |
| **Tools** | Integration management | IntegratedTool, ToolConnection |

**Technology Stack**:
- Netflix DGS (Domain Graph Service) for GraphQL
- Spring Boot with WebFlux (reactive)
- MongoDB with reactive repositories
- Redis for caching and sessions
- Apache Kafka for event publishing

### 4. External API Service (`openframe-external-api`)

**Purpose**: Public-facing REST API with API key authentication for external integrations.

**Architecture**:
```mermaid
graph LR
    A[External Tools] --> B[API Key Auth]
    B --> C[Rate Limiting]
    C --> D[REST Controllers]
    D --> E[Service Layer]
    E --> F[Data Access]
    
    G[OpenAPI Docs] --> H[Swagger UI]
    I[Proxy Services] --> J[Tool Integration]
```

**Key Features**:
- API key-based authentication
- OpenAPI 3.0 documentation
- Rate limiting and throttling
- Proxy services for tool integration
- Comprehensive request/response logging

### 5. Stream Processing Service (`openframe-stream`)

**Purpose**: Real-time event processing, normalization, and enrichment.

```mermaid
graph TD
    subgraph "Stream Processing"
        A[Kafka Consumers] --> B[Event Deserializers]
        B --> C[Message Handlers]
        C --> D[Data Enrichment]
        D --> E[Event Mapping]
        E --> F[Kafka Producers]
        
        G[CDC Events] --> H[Tool Events]
        H --> I[System Events]
        I --> J[Unified Events]
        
        K[Enrichment Services] --> L[Tool Caches]
        L --> M[Data Lookups]
        M --> N[Context Addition]
    end
```

**Processing Pipeline**:

1. **Ingestion**: Consume events from various Kafka topics
2. **Deserialization**: Convert raw messages to structured data
3. **Enrichment**: Add context from external systems
4. **Normalization**: Map to unified event format
5. **Distribution**: Route processed events to downstream consumers

**Technology Stack**:
- Apache Kafka for streaming
- Custom deserializers for different event types
- Cassandra for time-series data storage
- Integration with Tactical RMM, Fleet MDM, MeshCentral

## Data Architecture

### Database Design Patterns

```mermaid
erDiagram
    TENANT {
        string id PK
        string domain
        string name
        datetime createdAt
        TenantStatus status
    }
    
    ORGANIZATION {
        string id PK
        string tenantId FK
        string name
        Address address
        ContactInformation contact
    }
    
    USER {
        string id PK
        string tenantId FK
        string organizationId FK
        string email
        string name
        UserStatus status
        datetime lastLogin
    }
    
    DEVICE {
        string id PK
        string tenantId FK
        string organizationId FK
        string name
        string hostname
        DeviceType type
        DeviceStatus status
        datetime lastSeen
    }
    
    EVENT {
        string id PK
        string tenantId FK
        string deviceId FK
        EventType type
        datetime timestamp
        json payload
    }
    
    TENANT ||--o{ ORGANIZATION : "contains"
    TENANT ||--o{ USER : "contains"
    TENANT ||--o{ DEVICE : "contains"
    ORGANIZATION ||--o{ USER : "belongs_to"
    ORGANIZATION ||--o{ DEVICE : "manages"
    DEVICE ||--o{ EVENT : "generates"
```

### Data Storage Strategy

| Data Type | Storage | Rationale | Retention |
|-----------|---------|-----------|-----------|
| **Master Data** | MongoDB | Document model fits complex entities | Permanent |
| **Time-Series** | Cassandra | Optimized for high-volume writes | 90 days |
| **Session Data** | Redis | Fast access, automatic expiration | 24 hours |
| **Event Streams** | Kafka | Distributed, fault-tolerant messaging | 7 days |
| **File Attachments** | Object Storage | Scalable, cost-effective | Variable |

### Multi-Tenancy Strategy

OpenFrame implements **schema-per-tenant** multi-tenancy:

```mermaid
graph TD
    subgraph "Multi-Tenant Data Isolation"
        A[Tenant Request] --> B[Tenant Resolution]
        B --> C[Database Context]
        C --> D[Tenant-Filtered Queries]
        
        E[Tenant A Data] --> F[Database Collection A]
        G[Tenant B Data] --> H[Database Collection B]
        
        I[Shared Infrastructure] --> J[Per-Tenant Keys]
        J --> K[Isolated Secrets]
        K --> L[Separate Analytics]
    end
```

**Implementation Details**:
- All entities include `tenantId` field
- Automatic tenant filtering in repositories
- Tenant-specific JWT signing keys
- Isolated metrics and logging per tenant

## Security Architecture

### Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant User as User/Client
    participant Gateway as API Gateway
    participant Auth as Auth Server
    participant API as API Service
    participant DB as Database
    
    User->>Auth: Login Request
    Auth->>DB: Validate Credentials
    DB-->>Auth: User Details
    Auth->>Auth: Generate JWT
    Auth-->>User: JWT Token + Cookies
    
    User->>Gateway: API Request + JWT
    Gateway->>Auth: Validate Token
    Auth-->>Gateway: Token Claims
    Gateway->>API: Request + User Context
    API->>DB: Tenant-Filtered Query
    DB-->>API: Results
    API-->>Gateway: Response
    Gateway-->>User: Final Response
```

### Security Layers

| Layer | Component | Purpose | Implementation |
|-------|-----------|---------|----------------|
| **Edge Security** | API Gateway | Request filtering, rate limiting | Spring Security, JWT validation |
| **Service Security** | Each Service | Authorization checks | Method-level security |
| **Data Security** | Repository Layer | Tenant isolation | Automatic tenant filtering |
| **Transport Security** | All Components | Encryption in transit | TLS 1.3, HTTPS only |
| **Secret Management** | Configuration | Secure credential storage | Environment variables, vault integration |

### JWT Token Structure

```json
{
  "iss": "https://auth.openframe.domain",
  "sub": "user-uuid-here",
  "aud": "openframe-api",
  "exp": 1640995200,
  "iat": 1640908800,
  "tenant_id": "tenant-uuid-here",
  "organization_id": "org-uuid-here",
  "scope": "read:devices write:organizations",
  "roles": ["admin", "technician"],
  "email": "user@company.com"
}
```

## Event-Driven Architecture

### Event Flow Architecture

```mermaid
graph LR
    subgraph "Event Sources"
        A[Device Agents] --> D[Kafka Topics]
        B[External Tools] --> D
        C[User Actions] --> D
    end
    
    subgraph "Event Processing"
        D --> E[Stream Service]
        E --> F[Event Enrichment]
        F --> G[Event Routing]
    end
    
    subgraph "Event Consumers"
        G --> H[Real-time UI Updates]
        G --> I[Alert Processing]
        G --> J[Analytics Storage]
        G --> K[Integration Webhooks]
    end
```

### Event Types and Topics

| Topic | Event Type | Producer | Consumer | Retention |
|-------|------------|----------|----------|-----------|
| `device.status` | Device state changes | Agents | Stream Service, UI | 7 days |
| `user.activity` | User actions | API Service | Analytics, Audit | 30 days |
| `system.alerts` | System alerts | All Services | Alert Manager | 7 days |
| `integration.events` | External tool events | Proxies | Stream Service | 7 days |
| `audit.logs` | Security events | All Services | Compliance, SIEM | 1 year |

### Event Schema Evolution

OpenFrame uses **Avro schemas** with **Schema Registry** for event compatibility:

```json
{
  "namespace": "com.openframe.events",
  "name": "DeviceStatusEvent",
  "type": "record",
  "fields": [
    {"name": "deviceId", "type": "string"},
    {"name": "tenantId", "type": "string"},
    {"name": "status", "type": {"type": "enum", "symbols": ["ONLINE", "OFFLINE", "ERROR"]}},
    {"name": "timestamp", "type": "long"},
    {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}}
  ]
}
```

## Service Communication Patterns

### Synchronous Communication

**Internal Service-to-Service**:
- HTTP/REST for simple operations
- Circuit breaker pattern for resilience
- Timeout and retry mechanisms
- Service discovery through configuration

**External API Access**:
- GraphQL for complex queries
- REST for simple operations  
- WebSocket for real-time updates
- API versioning for compatibility

### Asynchronous Communication

**Event-Driven Patterns**:
- **Publish-Subscribe**: Event broadcasting to multiple consumers
- **Request-Reply**: Asynchronous request processing with callbacks
- **Message Queues**: Reliable delivery with acknowledgment
- **Event Sourcing**: State reconstruction from event history

### Communication Security

```mermaid
graph TD
    subgraph "Service Communication Security"
        A[mTLS Between Services] --> B[JWT Propagation]
        B --> C[Service Authentication]
        C --> D[Request Signing]
        
        E[Network Policies] --> F[Service Mesh]
        F --> G[Traffic Encryption]
        G --> H[Certificate Rotation]
    end
```

## Scalability and Performance

### Horizontal Scaling Strategy

| Component | Scaling Approach | Constraints | Metrics |
|-----------|------------------|-------------|---------|
| **API Gateway** | Stateless replicas | Session affinity for WebSocket | RPS, latency |
| **API Service** | Auto-scaling pods | Database connection limits | CPU, memory, DB connections |
| **Stream Service** | Kafka consumer groups | Partition limitations | Message lag, throughput |
| **Database** | Replica sets, sharding | Data consistency requirements | IOPS, connection count |

### Performance Optimization

**Caching Strategy**:
```mermaid
graph LR
    A[API Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Data]
    B -->|No| D[Query Database]
    D --> E[Update Cache]
    E --> F[Return Fresh Data]
    
    G[Cache Invalidation] --> H[Event-Driven Updates]
    H --> I[TTL Expiration]
    I --> J[Manual Cache Clear]
```

**Database Performance**:
- Read replicas for query distribution
- Indexes optimized for tenant + query patterns
- Connection pooling and prepared statements
- Query result caching with Redis

**Application Performance**:
- Reactive programming model (WebFlux)
- Asynchronous processing where possible  
- Bulk operations for data-intensive tasks
- Lazy loading and pagination

## Deployment Architecture

### Container Orchestration

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: openframe"
            A[API Gateway Pods] --> B[Service Discovery]
            C[API Service Pods] --> B
            D[Auth Server Pods] --> B
            E[Stream Service Pods] --> B
        end
        
        subgraph "Namespace: data"
            F[MongoDB StatefulSet]
            G[Redis Deployment]
            H[Kafka Cluster]
        end
        
        subgraph "Ingress"
            I[Load Balancer] --> J[TLS Termination]
            J --> A
        end
    end
```

### Infrastructure Components

| Component | Technology | Purpose | HA Strategy |
|-----------|------------|---------|-------------|
| **Orchestration** | Kubernetes | Container management | Multi-zone clusters |
| **Service Mesh** | Istio | Traffic management | Envoy proxy per pod |
| **Monitoring** | Prometheus/Grafana | Observability | Federated setup |
| **Logging** | ELK Stack | Centralized logging | Multiple shipper nodes |
| **CI/CD** | GitHub Actions | Automated deployment | Blue-green deployments |

## Design Principles

### 1. **Domain-Driven Design (DDD)**
- Clear bounded contexts for each service
- Rich domain models with business logic
- Anti-corruption layers for external integrations
- Ubiquitous language across teams

### 2. **CQRS (Command Query Responsibility Segregation)**
- Separate read and write models
- GraphQL for complex queries
- REST for commands and updates
- Event sourcing for audit trails

### 3. **Microservices Best Practices**
- Single responsibility per service
- Database per service pattern
- API-first development
- Independent deployability

### 4. **Reactive Architecture**
- Non-blocking I/O throughout the stack
- Backpressure handling
- Resilience patterns (circuit breakers, bulkheads)
- Event-driven communication

### 5. **Security by Design**
- Zero-trust network model
- Defense in depth
- Principle of least privilege
- Secure defaults everywhere

## Next Steps

To dive deeper into specific architectural aspects:

1. **[Service Implementation](../development/setup/local-development.md)** - Setting up and running services
2. **[Testing Architecture](../testing/overview.md)** - Testing strategies and implementation
3. **[Contributing Guidelines](../contributing/guidelines.md)** - How to contribute to the architecture

This architecture enables OpenFrame to scale from single-tenant deployments to multi-thousand tenant SaaS operations while maintaining security, performance, and developer productivity. 🏗️