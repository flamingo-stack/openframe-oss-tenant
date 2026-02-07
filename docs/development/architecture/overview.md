# Architecture Overview

This document provides a comprehensive overview of the OpenFrame architecture, including system design, component interactions, data flow patterns, and key technical decisions.

## System Architecture

OpenFrame follows a distributed microservices architecture designed for scalability, maintainability, and multi-tenancy. The system is built with modern cloud-native principles and emphasizes loose coupling between components.

### High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph "Client Layer"
        Web[🖥️ Vue.js Web App]
        Desktop[💻 Tauri Desktop App]
        Agent[🤖 Rust System Agent]
        Mobile[📱 Mobile App]
    end

    subgraph "Gateway Layer"
        Gateway[🛡️ API Gateway]
        LB[⚖️ Load Balancer]
    end

    subgraph "Service Layer"
        Auth[🔐 Authorization Server]
        API[📊 API Service]
        Management[⚙️ Management Service]
        Stream[🌊 Stream Service]
        Client[👤 Client Service]
        External[🔌 External API]
        Config[📋 Config Service]
    end

    subgraph "Data Layer"
        Mongo[(📄 MongoDB)]
        Redis[(🔄 Redis)]
        Kafka[(📡 Kafka)]
        Cassandra[(⏱️ Cassandra)]
        Pinot[(📈 Apache Pinot)]
    end

    subgraph "External Systems"
        RMM[🛠️ RMM Tools]
        PSA[📋 PSA Tools] 
        Security[🛡️ Security Tools]
        Cloud[☁️ Cloud Services]
    end

    Web --> Gateway
    Desktop --> Gateway
    Agent --> Client
    Mobile --> Gateway

    Gateway --> Auth
    Gateway --> API
    Gateway --> External
    
    Auth --> Mongo
    API --> Mongo
    API --> Redis
    API --> Pinot
    
    Management --> Mongo
    Management --> Kafka
    
    Stream --> Kafka
    Stream --> Cassandra
    Stream --> Pinot
    
    Client --> Kafka
    Client --> Mongo
    
    External --> RMM
    External --> PSA
    External --> Security
    External --> Cloud

    Config --> All[All Services]
```

## Core Design Principles

### 1. Multi-Tenancy First
OpenFrame is designed with multi-tenancy as a foundational principle:

- **Tenant Isolation**: Complete data and configuration isolation between tenants
- **Horizontal Scaling**: Services can scale independently per tenant
- **Resource Optimization**: Shared infrastructure with tenant-specific configurations

### 2. Event-Driven Architecture  
The system uses event streaming for loose coupling and real-time capabilities:

- **Kafka Integration**: All inter-service communication uses Kafka topics
- **Event Sourcing**: Critical state changes are captured as events
- **Real-time Processing**: Stream processing for immediate responses

### 3. API-First Design
All functionality is exposed through well-defined APIs:

- **GraphQL**: Primary API for complex queries and real-time subscriptions
- **REST**: Standard endpoints for simple operations and integrations
- **OpenAPI**: Comprehensive API documentation and client generation

### 4. Security by Design
Security is integrated at every layer:

- **OAuth2/OIDC**: Standards-based authentication and authorization
- **Zero Trust**: No implicit trust between components
- **Encryption**: End-to-end encryption for sensitive data

## Component Architecture

### Service Layer Components

#### API Gateway Service
**Purpose**: Entry point for all external requests
**Technology**: Spring Cloud Gateway
**Key Features**:
- Request routing and load balancing
- JWT token validation and conversion
- Rate limiting and throttling
- WebSocket proxy for real-time communication

```mermaid
graph TD
    A[Client Request] --> B[Gateway]
    B --> C{Authentication}
    C -->|Valid| D[Route to Service]
    C -->|Invalid| E[Return 401]
    D --> F[Add Auth Context]
    F --> G[Forward Request]
```

#### Authorization Server
**Purpose**: OAuth2/OIDC authentication and user management
**Technology**: Spring Authorization Server
**Key Features**:
- Multi-tenant OAuth2 provider
- SSO integration (Google, Microsoft, Custom OIDC)
- User registration and invitation management
- JWT token issuance and validation

#### API Service
**Purpose**: Core business logic and data access APIs
**Technology**: Spring Boot with Netflix DGS (GraphQL)
**Key Features**:
- GraphQL schema and resolvers
- REST endpoints for simple operations
- Database integration (MongoDB, Redis, Pinot)
- Real-time subscriptions

#### Management Service
**Purpose**: System administration and background tasks
**Technology**: Spring Boot with Scheduler
**Key Features**:
- Tenant provisioning and lifecycle management
- Background job processing
- System health monitoring
- Integration management

#### Stream Service
**Purpose**: Real-time event processing and data enrichment
**Technology**: Spring Boot with Kafka Streams
**Key Features**:
- Event stream processing
- Data enrichment and transformation
- Real-time analytics
- Alert generation

#### Client Service
**Purpose**: Agent communication and device management
**Technology**: Spring Boot with WebSocket
**Key Features**:
- Agent registration and authentication
- Device heartbeat processing
- Command dispatch to agents
- Agent software updates

### Data Architecture

#### Primary Database (MongoDB)
**Use Cases**: 
- User accounts and profiles
- Organization and tenant data
- Device metadata and configuration
- OAuth2 tokens and sessions

**Collections**:
```text
users              # User accounts and authentication
organizations      # Client organizations
devices           # Device metadata and configuration
oauth_clients     # OAuth2 client registrations
oauth_tokens      # Access and refresh tokens
tenants           # Tenant configurations
```

#### Cache Layer (Redis)
**Use Cases**:
- Session storage
- API response caching
- Rate limiting counters
- Temporary data storage

**Data Structures**:
```text
sessions:*         # User sessions
cache:api:*        # API response cache
limits:*           # Rate limiting counters
locks:*            # Distributed locks
```

#### Event Streaming (Kafka)
**Use Cases**:
- Inter-service communication
- Real-time data pipeline
- Event sourcing
- Integration with external systems

**Topics**:
```text
device.heartbeats     # Agent heartbeat events
device.alerts         # Device alert notifications
user.activities       # User action events
system.events         # System-level events
integration.events    # External system events
```

#### Time-Series Data (Cassandra)
**Use Cases**:
- Device metrics and monitoring data
- System performance metrics
- Audit logs and trails
- Historical analytics

#### Analytics Database (Apache Pinot)
**Use Cases**:
- Real-time analytics queries
- Dashboard aggregations
- Reporting and business intelligence
- Performance monitoring

## Data Flow Patterns

### Request-Response Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant G as Gateway
    participant A as Auth Service
    participant API as API Service
    participant DB as Database

    C->>G: HTTP Request + JWT Cookie
    G->>A: Validate Token
    A-->>G: Token Valid + User Context
    G->>API: Forward Request + Auth Headers
    API->>DB: Query Data
    DB-->>API: Result Data
    API-->>G: Response
    G-->>C: HTTP Response
```

### Event Processing Flow
```mermaid
sequenceDiagram
    participant Agent as System Agent
    participant CS as Client Service
    participant K as Kafka
    participant SS as Stream Service
    participant DB as Databases

    Agent->>CS: Heartbeat/Event
    CS->>K: Publish Event
    K->>SS: Stream Processing
    SS->>SS: Enrich & Transform
    SS->>DB: Store Processed Data
    SS->>K: Publish Enriched Event
    Note over K: Other services consume enriched events
```

### Real-time Notification Flow
```mermaid
sequenceDiagram
    participant SS as Stream Service
    participant K as Kafka
    participant API as API Service
    participant G as Gateway
    participant C as Client (WebSocket)

    SS->>K: Publish Alert Event
    K->>API: Consume Event
    API->>G: WebSocket Message
    G->>C: Real-time Notification
```

## Authentication & Authorization

### Authentication Flow

OpenFrame uses OAuth2/OIDC with JWT tokens stored in HTTP-only cookies for security:

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser  
    participant G as Gateway
    participant AS as Auth Server
    participant IDP as Identity Provider

    U->>B: Access Application
    B->>G: Request (no token)
    G-->>B: Redirect to Auth
    B->>AS: Login Request
    
    alt SSO Login
        AS->>IDP: OAuth2 Authorization
        IDP-->>AS: Authorization Code
        AS->>IDP: Exchange for Token
        IDP-->>AS: User Info
    else Password Login
        AS->>AS: Validate Credentials
    end
    
    AS-->>B: Set HTTP-Only Cookie
    B->>G: Request with Cookie
    G->>AS: Validate Token
    AS-->>G: User Context
    G->>API: Forward with Auth Headers
```

### Authorization Model

OpenFrame implements a hierarchical role-based access control (RBAC) system:

```text
System Admin
├── Platform-wide access
└── Can manage all tenants

Tenant Admin  
├── Full access within tenant
└── Can manage users and resources

Organization Admin
├── Access to specific organizations
└── Can manage organization users

User Roles
├── Technician: Device and incident management
├── Manager: Read-only access + reporting
└── Viewer: Limited read-only access
```

## Scalability Patterns

### Horizontal Scaling
Each service can scale independently based on load:

```mermaid
graph TD
    subgraph "API Service Cluster"
        API1[API Instance 1]
        API2[API Instance 2] 
        API3[API Instance 3]
    end
    
    subgraph "Stream Service Cluster"
        SS1[Stream Instance 1]
        SS2[Stream Instance 2]
    end
    
    LB[Load Balancer] --> API1
    LB --> API2
    LB --> API3
    
    Kafka[Kafka Cluster] --> SS1
    Kafka --> SS2
```

### Database Scaling
- **MongoDB**: Sharding by tenant ID for horizontal scaling
- **Redis**: Clustering for high availability and performance
- **Kafka**: Topic partitioning for parallel processing
- **Cassandra**: Natural horizontal scaling with consistent hashing

### Cache Strategies
```text
L1 Cache: In-memory application cache (Caffeine)
L2 Cache: Redis cluster for shared caching
L3 Cache: CDN for static assets (if applicable)
```

## Performance Characteristics

### Response Time Targets
| Operation Type | Target | Measurement |
|---------------|---------|------------|
| **API Queries** | < 200ms | P95 response time |
| **GraphQL Queries** | < 300ms | P95 response time |
| **Real-time Events** | < 100ms | End-to-end latency |
| **Database Writes** | < 50ms | P95 write latency |

### Throughput Targets
| Metric | Target | Notes |
|--------|---------|-------|
| **Concurrent Users** | 10,000+ | Per cluster |
| **API Requests/sec** | 50,000+ | Peak load |
| **Events/sec** | 100,000+ | Stream processing |
| **Device Heartbeats** | 1M+/hour | Agent communication |

## Security Architecture

### Defense in Depth
```mermaid
graph TD
    A[Network Security] --> B[Gateway Security]
    B --> C[Application Security]
    C --> D[Data Security]
    
    A1[Firewalls, DDoS Protection] --> A
    B1[JWT Validation, Rate Limiting] --> B
    C1[RBAC, Input Validation] --> C
    D1[Encryption at Rest/Transit] --> D
```

### Key Security Features
- **End-to-end TLS**: All communication encrypted
- **JWT with HTTP-only Cookies**: Secure token storage
- **API Rate Limiting**: Protection against abuse
- **Input Validation**: Comprehensive sanitization
- **Audit Logging**: Complete audit trail
- **Secret Management**: Encrypted configuration management

## Monitoring & Observability

### Three Pillars of Observability
```text
Metrics (Prometheus)
├── System metrics (CPU, memory, network)
├── Application metrics (request rates, errors)
└── Business metrics (user activities, feature usage)

Logs (ELK Stack)
├── Application logs (structured JSON)
├── Audit logs (security events)
└── Access logs (request/response)

Traces (Jaeger)
├── Distributed tracing
├── Request flow visualization
└── Performance bottleneck identification
```

## Development Patterns

### Service Communication
```text
Synchronous:
- Gateway → Services: HTTP/REST
- Frontend → Gateway: GraphQL/REST
- Service → Database: Native drivers

Asynchronous:  
- Service → Service: Kafka events
- Real-time updates: WebSocket
- Background jobs: Kafka consumers
```

### Configuration Management
```text
Spring Cloud Config Server
├── Environment-specific configs
├── Feature flags and toggles
├── Secrets management
└── Dynamic configuration updates
```

### Error Handling
```text
Application Errors:
├── Global exception handlers
├── Standardized error responses
├── Error code classification
└── Client-friendly messages

System Errors:
├── Circuit breaker patterns
├── Retry mechanisms with backoff
├── Graceful degradation
└── Dead letter queues
```

## Technology Decisions

### Key Technology Choices and Rationale

| Technology | Alternative Considered | Rationale |
|-----------|----------------------|-----------|
| **Java 21** | Java 17, Kotlin | Latest LTS with performance improvements |
| **Spring Boot 3** | Micronaut, Quarkus | Ecosystem maturity and team expertise |
| **Vue 3** | React, Angular | Progressive framework with excellent DX |
| **MongoDB** | PostgreSQL | Document model fits domain well |
| **Kafka** | RabbitMQ, Pulsar | Proven for high-throughput event streaming |
| **Netflix DGS** | GraphQL Java | Type-safe code-first GraphQL |
| **Rust** | Go, C++ | Memory safety and performance for agents |

### Architecture Evolution

The architecture has evolved through several phases:

```text
Phase 1: Monolithic Application
└── Single Spring Boot application

Phase 2: Service Separation  
├── Separate auth from main API
└── Extract management functions

Phase 3: Event-Driven Architecture
├── Introduction of Kafka
├── Stream processing service
└── Real-time capabilities

Phase 4: Multi-Tenant Platform (Current)
├── Tenant isolation
├── Horizontal scaling
└── Advanced analytics
```

## Future Architectural Goals

### Short-term (Next 6 months)
- Enhanced monitoring and observability
- Performance optimization for high-scale deployments
- Advanced security features (zero-trust networking)

### Medium-term (6-12 months)  
- Multi-region deployment support
- Advanced AI/ML integration
- Enhanced edge computing capabilities

### Long-term (1-2 years)
- Serverless function support
- Advanced analytics and business intelligence
- IoT device management expansion

---

This architecture overview provides the foundation for understanding OpenFrame's design and implementation. For specific implementation details, refer to the individual service documentation and code examples.