# Architecture Overview

OpenFrame is built as a cloud-native, microservices-based platform designed for scalability, maintainability, and extensibility. This document provides a comprehensive overview of the system architecture, core components, and design decisions.

## High-Level Architecture

### System Overview

```mermaid
graph TB
    Client[Web Browser] --> Gateway[API Gateway Service]
    Agent[OpenFrame Agent] --> Gateway
    External[External Integrations] --> Gateway
    
    Gateway --> Auth[Authorization Server]
    Gateway --> API[API Service]
    Gateway --> ExtAPI[External API Service]
    Gateway --> ClientSvc[Client Service]
    
    API --> DataMongo[(MongoDB)]
    API --> DataRedis[(Redis)]
    API --> DataPinot[(Apache Pinot)]
    
    Stream[Stream Service] --> DataKafka[(Apache Kafka)]
    DataKafka --> DataCassandra[(Cassandra)]
    DataKafka --> DataPinot
    
    Management[Management Service] --> DataMongo
    Management --> DataKafka
    Management --> NATS[(NATS JetStream)]
    
    Tools[Integrated Tools] --> Stream
    Agent --> NATS
```

### Core Principles

| Principle | Implementation | Benefit |
|-----------|---------------|---------|
| **Microservices** | Separate services with single responsibilities | Independent scaling, deployment |
| **Event-Driven** | Kafka for async communication | Decoupled services, real-time processing |
| **API-First** | GraphQL/REST APIs for all interactions | Consistent interfaces, easy integration |
| **Multi-Tenant** | Tenant isolation at data and service level | Secure, scalable SaaS architecture |
| **Cloud-Native** | Kubernetes-ready, stateless services | Portability, auto-scaling |

## Service Architecture

### Gateway Service (Port 8080)

**Purpose**: Unified entry point for all external requests

**Key Responsibilities**:
- **Authentication & Authorization**: JWT validation, API key authentication
- **Rate Limiting**: Per-tenant, per-key rate limiting
- **Request Routing**: Route to appropriate backend services
- **WebSocket Proxying**: Real-time communication support
- **CORS & Security Headers**: Cross-origin security

**Technology Stack**:
- Spring Cloud Gateway
- Spring Security
- Redis (for rate limiting)
- WebSocket support

```mermaid
graph LR
    Request[HTTP/WS Request] --> Auth[Authentication]
    Auth --> RateLimit[Rate Limiting]
    RateLimit --> Route[Request Routing]
    Route --> Backend[Backend Service]
    Backend --> Response[HTTP Response]
```

### API Service (Port 8081)

**Purpose**: Core business logic and data access APIs

**Key Responsibilities**:
- **GraphQL API**: Complex queries with DataLoaders
- **REST Endpoints**: Simple CRUD operations
- **User Management**: Users, organizations, invitations
- **Device Management**: Device registration, status, metadata
- **Tool Integration**: Tool connection management

**Architecture Pattern**:
```mermaid
graph TD
    Controller[REST Controllers] --> Service[Business Services]
    DataFetcher[GraphQL DataFetchers] --> Service
    Service --> Repository[Data Repositories]
    Service --> Processor[Post Processors]
    DataFetcher --> DataLoader[DGS DataLoaders]
    Repository --> MongoDB[(MongoDB)]
    Repository --> Pinot[(Apache Pinot)]
```

**Technology Stack**:
- Spring Boot 3.3
- Netflix DGS (GraphQL)
- Spring Data MongoDB
- Apache Pinot client

### Authorization Server (Port 8082)

**Purpose**: OAuth2/OIDC authentication and tenant management

**Key Responsibilities**:
- **Multi-Tenant OAuth2**: Per-tenant signing keys and configuration
- **SSO Integration**: Google, Microsoft, custom OIDC providers
- **User Registration**: Self-service and invitation-based registration
- **Tenant Discovery**: Domain-based tenant routing

**Security Features**:
- **JWKS per Tenant**: Unique signing keys for each tenant
- **Dynamic Client Registration**: Auto-configure OAuth clients
- **Security Policies**: Password policies, MFA support

```mermaid
graph TB
    User[User Login] --> Discover[Tenant Discovery]
    Discover --> Provider{Auth Provider}
    Provider -->|SSO| External[External Provider]
    Provider -->|Password| Local[Local Authentication]
    External --> Token[Generate JWT]
    Local --> Token
    Token --> Keys[Tenant-Specific Keys]
    Keys --> Client[Client Application]
```

### Stream Service (Port 8084)

**Purpose**: Real-time event processing and data enrichment

**Key Responsibilities**:
- **Event Ingestion**: Receive events from tools and agents
- **Data Normalization**: Convert tool-specific formats to unified schema
- **Data Enrichment**: Add metadata, correlate events
- **Stream Processing**: Real-time analytics and aggregations

**Processing Pipeline**:
```mermaid
graph LR
    Tools[External Tools] --> Deserializer[Event Deserializers]
    Agents[OpenFrame Agents] --> Deserializer
    Deserializer --> Enrichment[Data Enrichment]
    Enrichment --> Kafka[(Kafka Topics)]
    Kafka --> Cassandra[(Time-Series Data)]
    Kafka --> Pinot[(Analytics Data)]
    Kafka --> Notifications[Real-time Notifications]
```

**Technology Stack**:
- Apache Kafka 3.6+
- Spring Kafka
- Custom stream processors
- Debezium for CDC

### Management Service (Port 8083)

**Purpose**: Administrative operations and scheduled tasks

**Key Responsibilities**:
- **System Initialization**: Bootstrap configuration, default data
- **Scheduled Tasks**: Cleanup, maintenance, reporting
- **Health Monitoring**: Service health checks, metrics collection
- **Tool Management**: Tool agent lifecycle, updates

**Task Scheduling**:
```mermaid
graph TD
    Scheduler[Spring Scheduler] --> Health[Health Checks]
    Scheduler --> Cleanup[Data Cleanup]
    Scheduler --> Sync[Service Sync]
    Scheduler --> Reports[Report Generation]
    
    Health --> Metrics[Metrics Collection]
    Cleanup --> Database[(Database)]
    Sync --> NATS[(NATS)]
    Reports --> Storage[(File Storage)]
```

### External API Service (Port 8085)

**Purpose**: Stable REST API for external integrations

**Key Responsibilities**:
- **Partner Integrations**: API-key secured endpoints
- **Webhook Support**: Outbound webhook notifications
- **Data Export**: Bulk data access for reporting
- **Legacy Support**: Maintain API compatibility

**API Design**:
- RESTful endpoints with consistent naming
- Cursor-based pagination for large datasets
- OpenAPI 3.0 specification
- Rate limiting per API key

## Data Architecture

### Multi-Model Data Strategy

OpenFrame uses different databases optimized for specific use cases:

```mermaid
graph TB
    subgraph "Operational Data"
        Mongo[(MongoDB)]
        Redis[(Redis Cache)]
    end
    
    subgraph "Event Streaming"
        Kafka[(Apache Kafka)]
        NATS[(NATS JetStream)]
    end
    
    subgraph "Analytics & Time-Series"
        Cassandra[(Cassandra)]
        Pinot[(Apache Pinot)]
    end
    
    Apps[Applications] --> Mongo
    Apps --> Redis
    Apps --> Kafka
    Kafka --> Cassandra
    Kafka --> Pinot
    Agents[Agents] --> NATS
```

### Database Responsibilities

| Database | Data Type | Use Case | Characteristics |
|----------|-----------|----------|-----------------|
| **MongoDB** | Documents | Users, devices, organizations, configuration | ACID transactions, flexible schema |
| **Redis** | Key-Value | Sessions, cache, rate limiting | In-memory, fast access |
| **Apache Kafka** | Event Streams | Real-time events, messaging | High throughput, durable |
| **Cassandra** | Time-Series | Log storage, metrics, time-based data | Write-optimized, scalable |
| **Apache Pinot** | OLAP | Analytics, reporting, dashboards | Real-time analytics, fast queries |
| **NATS JetStream** | Messaging | Agent communication, updates | Lightweight, reliable |

### Data Flow Patterns

#### Write Path (Event Ingestion)
```mermaid
sequenceDiagram
    participant Tool as External Tool
    participant Stream as Stream Service
    participant Kafka as Kafka
    participant Cassandra as Cassandra
    participant Pinot as Pinot
    participant Mongo as MongoDB
    
    Tool->>Stream: Send Event
    Stream->>Stream: Deserialize & Enrich
    Stream->>Kafka: Publish Event
    Kafka->>Cassandra: Store Raw Event
    Kafka->>Pinot: Store Enriched Event
    Stream->>Mongo: Update Device State
```

#### Read Path (API Query)
```mermaid
sequenceDiagram
    participant Client as Client App
    participant Gateway as Gateway
    participant API as API Service
    participant Mongo as MongoDB
    participant Pinot as Pinot
    participant Redis as Redis Cache
    
    Client->>Gateway: GraphQL Query
    Gateway->>API: Authenticated Request
    API->>Redis: Check Cache
    alt Cache Miss
        API->>Mongo: Query Metadata
        API->>Pinot: Query Analytics
        API->>Redis: Store Cache
    end
    API->>Client: Combined Response
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Agent[OpenFrame Agent]
        API[External API Client]
    end
    
    subgraph "Security Layer"
        Gateway[API Gateway]
        AuthServer[Authorization Server]
        JWT[JWT Validation]
        APIKey[API Key Validation]
    end
    
    subgraph "Application Layer"
        Services[Backend Services]
    end
    
    Browser --> Gateway
    Agent --> Gateway
    API --> Gateway
    
    Gateway --> JWT
    Gateway --> APIKey
    JWT --> AuthServer
    APIKey --> Services
    Gateway --> Services
```

### Security Features

| Feature | Implementation | Purpose |
|---------|---------------|---------|
| **Multi-Tenant JWT** | Per-tenant signing keys | Tenant isolation |
| **API Key Management** | Scoped permissions, rate limiting | External integration security |
| **Session Management** | HTTP-only cookies, Redis storage | Web application security |
| **RBAC** | Role-based access control | Fine-grained permissions |
| **Data Encryption** | AES-256 for sensitive data | Data protection at rest |

## Communication Patterns

### Synchronous Communication

**Internal Service Calls**:
- Direct HTTP calls between services
- Circuit breaker pattern for resilience
- Service discovery via Spring Cloud

**External API Calls**:
- REST APIs for external tool integration
- OAuth2 for third-party authentication
- Rate limiting and retry logic

### Asynchronous Communication

**Event-Driven Architecture**:
```mermaid
graph LR
    Service1[Service A] --> Kafka[Kafka Topic]
    Kafka --> Service2[Service B]
    Kafka --> Service3[Service C]
    Service1 --> Event[Event Published]
    Event --> Process[Async Processing]
```

**Messaging Patterns**:
- **Publish-Subscribe**: Event notifications
- **Request-Reply**: Agent commands via NATS
- **Stream Processing**: Real-time data pipeline

## Scalability & Performance

### Horizontal Scaling Strategy

| Component | Scaling Strategy | Bottlenecks |
|-----------|------------------|-------------|
| **Gateway** | Load balancer + multiple instances | Connection limits |
| **API Service** | Auto-scaling based on CPU/memory | Database connections |
| **Stream Service** | Kafka partition scaling | Processing capacity |
| **Databases** | Read replicas, sharding | Write throughput |
| **Cache** | Redis clustering | Memory capacity |

### Performance Optimizations

#### Application Level
- **Connection Pooling**: Database and HTTP connections
- **Caching Strategy**: Multi-layer caching (Redis, application, HTTP)
- **Async Processing**: Non-blocking I/O, CompletableFuture
- **DataLoaders**: GraphQL N+1 query prevention

#### Database Level
- **Indexing Strategy**: Compound indexes for common queries
- **Partitioning**: Time-based partitioning for time-series data
- **Read Replicas**: Separate read/write workloads
- **Query Optimization**: Efficient queries, projection

#### Infrastructure Level
- **CDN**: Static asset delivery
- **Load Balancing**: Request distribution
- **Auto-scaling**: Dynamic resource allocation
- **Resource Limits**: Prevent resource exhaustion

## Deployment Architecture

### Kubernetes Deployment

```mermaid
graph TB
    subgraph "Ingress Layer"
        Ingress[Ingress Controller]
        LB[Load Balancer]
    end
    
    subgraph "Application Layer"
        Gateway[Gateway Pods]
        API[API Pods]
        Auth[Auth Pods]
        Stream[Stream Pods]
    end
    
    subgraph "Data Layer"
        Mongo[MongoDB StatefulSet]
        Kafka[Kafka Cluster]
        Redis[Redis Cluster]
    end
    
    LB --> Ingress
    Ingress --> Gateway
    Gateway --> API
    Gateway --> Auth
    API --> Stream
    Stream --> Mongo
    Stream --> Kafka
    API --> Redis
```

### Container Strategy

| Service | Container Base | Characteristics |
|---------|---------------|-----------------|
| **Java Services** | Eclipse Temurin 21 JRE | Minimal JRE, optimized startup |
| **Frontend** | nginx:alpine | Static file serving |
| **Databases** | Official images | Persistent volumes |

## Monitoring & Observability

### Metrics Collection

```mermaid
graph LR
    Apps[Applications] --> Metrics[Metrics Endpoint]
    Metrics --> Prometheus[Prometheus]
    Prometheus --> Grafana[Grafana Dashboard]
    
    Apps --> Logs[Application Logs]
    Logs --> Loki[Grafana Loki]
    Loki --> Grafana
    
    Apps --> Traces[Distributed Traces]
    Traces --> Jaeger[Jaeger]
```

### Key Metrics

| Category | Metrics | Purpose |
|----------|---------|---------|
| **Application** | Response time, error rate, throughput | Performance monitoring |
| **Infrastructure** | CPU, memory, disk, network | Resource monitoring |
| **Business** | Active users, API usage, device count | Business intelligence |
| **Security** | Failed logins, API key usage | Security monitoring |

## Extension Points

### Custom Processors

OpenFrame supports custom processors for extending functionality:

```java
@Component
@ConditionalOnMissingBean(DeviceStatusProcessor.class)
public class CustomDeviceProcessor implements DeviceStatusProcessor {
    @Override
    public void processStatusChange(Device device, DeviceStatus oldStatus, DeviceStatus newStatus) {
        // Custom logic for device status changes
    }
}
```

### Tool Integration

New tools can be integrated through:
1. **Stream Processors**: Handle tool-specific event formats
2. **SDK Development**: Create tool-specific client libraries
3. **API Extensions**: Add tool-specific endpoints

### Frontend Extensions

The Vue.js frontend supports:
- **Custom Components**: Reusable UI components
- **Plugin Architecture**: Feature-based plugins
- **Theme Customization**: Brand-specific theming

## Design Decisions & Trade-offs

### Technology Choices

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Java 21** | LTS version, virtual threads, performance | Learning curve for new features |
| **Spring Boot** | Mature ecosystem, auto-configuration | Some overhead, opinionated |
| **MongoDB** | Flexible schema, horizontal scaling | Eventual consistency |
| **Apache Kafka** | High throughput, durability | Complexity, resource usage |
| **Vue 3** | Composition API, TypeScript support | Framework lock-in |
| **Rust** | Performance, safety, cross-platform | Learning curve, compilation time |

### Architectural Trade-offs

| Trade-off | Choice | Reasoning |
|-----------|--------|-----------|
| **Consistency vs Availability** | Availability (AP) | Better user experience for MSP tools |
| **Microservices vs Monolith** | Microservices | Independent scaling, team autonomy |
| **SQL vs NoSQL** | Multi-model | Different data patterns need different solutions |
| **REST vs GraphQL** | Both | REST for integrations, GraphQL for UI |

## Future Architecture Evolution

### Planned Enhancements

1. **Service Mesh**: Istio for advanced traffic management
2. **Event Sourcing**: Complete audit trail for compliance
3. **CQRS**: Separate read/write models for better performance
4. **Multi-Region**: Geographic distribution for global MSPs
5. **AI/ML Pipeline**: Integrated machine learning for predictive analytics

### Migration Strategies

- **Database Migration**: Gradual migration with dual-write pattern
- **Service Decomposition**: Split services as they grow
- **API Versioning**: Maintain backward compatibility
- **Zero-Downtime Deployments**: Blue-green or canary deployments

This architecture provides a solid foundation for OpenFrame while maintaining flexibility for future growth and evolution.