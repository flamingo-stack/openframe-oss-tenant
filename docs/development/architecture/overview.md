# Architecture Overview

OpenFrame is built as a modern, cloud-native microservices platform designed for scalability, security, and developer productivity. This guide provides a comprehensive overview of the system architecture, design patterns, and key components.

[![OpenFrame v0.5.2: Autonomous AI Agent Architecture for MSPs](https://img.youtube.com/vi/PexpoNdZtUk/maxresdefault.jpg)](https://www.youtube.com/watch?v=PexpoNdZtUk)

## System Architecture

### High-Level Architecture

OpenFrame follows a **gateway-centric, zero-trust, multi-tenant architecture** with strict isolation at all layers:

```mermaid
flowchart TB
    subgraph "Client Layer"
        Browser[Web Browser<br/>Vue 3 + TypeScript]
        Agent[OpenFrame Agent<br/>Rust Cross-platform]
        Chat[Mingo Chat<br/>Tauri Desktop App]
        Mobile[Mobile Apps<br/>Future]
    end

    subgraph "Gateway & Security Layer"
        Gateway[API Gateway<br/>Spring Cloud Gateway]
        AuthServer[Authorization Server<br/>OAuth2 + OIDC]
        LoadBalancer[Load Balancer<br/>NGINX/HAProxy]
    end

    subgraph "Service Layer"
        APIService[API Service<br/>GraphQL + REST]
        ClientService[Client Service<br/>Agent Management]
        StreamService[Stream Service<br/>Event Processing]
        ManagementService[Management Service<br/>Orchestration]
        ConfigService[Config Service<br/>Spring Cloud Config]
        ExternalAPI[External API Service<br/>Public APIs]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Primary Storage)]
        Redis[(Redis<br/>Cache & Sessions)]
        Cassandra[(Cassandra<br/>Time Series)]
        Kafka[Apache Kafka<br/>Event Streaming]
        Pinot[(Apache Pinot<br/>Analytics)]
    end

    subgraph "External Integrations"
        FleetDM[FleetDM<br/>Device Management]
        TacticalRMM[Tactical RMM<br/>Monitoring]
        MeshCentral[MeshCentral<br/>Remote Access]
        AI[AI Services<br/>OpenAI, Anthropic]
    end

    Browser --> LoadBalancer
    Agent --> LoadBalancer
    Chat --> LoadBalancer
    
    LoadBalancer --> Gateway
    Gateway --> AuthServer
    Gateway --> APIService
    Gateway --> ClientService
    Gateway --> ExternalAPI

    APIService --> MongoDB
    APIService --> Redis
    ClientService --> MongoDB
    ClientService --> Redis
    
    StreamService --> Kafka
    StreamService --> Cassandra
    StreamService --> MongoDB
    
    ManagementService --> MongoDB
    ManagementService --> Redis
    
    Gateway --> FleetDM
    Gateway --> TacticalRMM
    Gateway --> MeshCentral
    
    APIService --> AI
```

## Core Design Principles

### 1. Multi-Tenancy by Design

Every component is built with tenant isolation as a fundamental requirement:

```mermaid
flowchart LR
    subgraph "Tenant A"
        A_UI[Tenant A Frontend]
        A_Data[(Tenant A Data)]
        A_Cache[(Tenant A Cache)]
    end
    
    subgraph "Tenant B"
        B_UI[Tenant B Frontend]
        B_Data[(Tenant B Data)]
        B_Cache[(Tenant B Cache)]
    end
    
    subgraph "Shared Services"
        Gateway[API Gateway]
        AuthServer[Auth Server]
        Services[Core Services]
    end
    
    A_UI --> Gateway
    B_UI --> Gateway
    Gateway --> AuthServer
    Gateway --> Services
    Services --> A_Data
    Services --> B_Data
    Services --> A_Cache
    Services --> B_Cache
```

**Key Features:**
- **Database-level partitioning** using `tenantId` fields
- **Cache namespacing** with tenant-specific prefixes
- **Request context propagation** with tenant information
- **Resource isolation** at the application level

### 2. API-First Architecture

OpenFrame follows an API-first approach with GraphQL as the primary interface:

```mermaid
flowchart TD
    Frontend[Frontend Apps] --> GraphQL[GraphQL Gateway]
    Mobile[Mobile Apps] --> GraphQL
    Integrations[3rd Party] --> REST[REST APIs]
    
    GraphQL --> DataFetchers[Data Fetchers]
    REST --> Controllers[REST Controllers]
    
    DataFetchers --> Services[Business Services]
    Controllers --> Services
    
    Services --> Repositories[Data Repositories]
    Repositories --> Database[(Database)]
```

**Benefits:**
- **Type safety** across frontend and backend
- **Efficient data fetching** with GraphQL
- **API versioning** through schema evolution
- **Self-documenting APIs** with introspection

### 3. Event-Driven Architecture

OpenFrame uses event-driven patterns for loose coupling and scalability:

```mermaid
sequenceDiagram
    participant Agent
    participant Gateway
    participant ClientService
    participant Kafka
    participant StreamService
    participant Database

    Agent->>Gateway: Device Heartbeat
    Gateway->>ClientService: Process Heartbeat
    ClientService->>Kafka: Publish Device Event
    Kafka->>StreamService: Consume Event
    StreamService->>Database: Store Processed Data
    StreamService->>Kafka: Publish Enriched Event
```

**Event Types:**
- **Device events** (heartbeats, status changes)
- **User actions** (login, configuration changes)
- **System events** (service startup, errors)
- **Integration events** (external tool synchronization)

## Core Components

### API Gateway Service

**Purpose**: Unified entry point for all client traffic

```mermaid
flowchart TB
    subgraph "API Gateway"
        Router[Request Router]
        Auth[JWT Validator]
        RateLimit[Rate Limiter]
        CORS[CORS Handler]
        WebSocket[WebSocket Proxy]
    end

    Client[Clients] --> Router
    Router --> Auth
    Auth --> RateLimit
    RateLimit --> CORS
    CORS --> Services[Backend Services]
    WebSocket --> ExternalTools[External Tools]
```

**Key Responsibilities:**
- **JWT validation** and issuer resolution
- **Tenant routing** based on JWT claims
- **Rate limiting** and DDoS protection
- **WebSocket proxying** for real-time connections
- **CORS and security headers** management

### Authorization Server

**Purpose**: OAuth2/OIDC authentication and authorization

```mermaid
flowchart TB
    subgraph "Authorization Server"
        Discovery[Tenant Discovery]
        OAuth[OAuth2 Provider]
        SSO[SSO Integration]
        Registration[User Registration]
        JWKS[JWKS Endpoint]
    end

    Browser[Web Browser] --> Discovery
    Discovery --> OAuth
    OAuth --> SSO
    SSO --> ExternalSSO[Google, Microsoft]
    OAuth --> Registration
    OAuth --> JWKS
    JWKS --> APIGateway[API Gateway]
```

**Features:**
- **Multi-tenant OAuth2** with tenant-specific issuers
- **SSO integration** with Google, Microsoft, custom OIDC
- **User registration** and invitation flows
- **JWT signing** with tenant-specific keys
- **Session management** and refresh tokens

### API Service

**Purpose**: Core GraphQL API and business logic

```mermaid
flowchart TB
    subgraph "API Service"
        GraphQL[GraphQL Schema]
        DataFetchers[Data Fetchers]
        DataLoaders[Data Loaders]
        Services[Business Services]
        Security[Security Layer]
    end

    GraphQL --> DataFetchers
    DataFetchers --> DataLoaders
    DataLoaders --> Services
    Services --> Security
    Security --> Database[(Database)]
```

**Core Features:**
- **GraphQL schema** with type-safe operations
- **Data fetching optimization** with DataLoader pattern
- **Real-time subscriptions** for live updates
- **Multi-tenant data access** with automatic filtering
- **Business logic** for devices, organizations, users

### Stream Processing Service

**Purpose**: Real-time event processing and enrichment

```mermaid
flowchart LR
    subgraph "Stream Service"
        KafkaConsumer[Kafka Consumer]
        Processor[Event Processor]
        Enricher[Data Enricher]
        Publisher[Event Publisher]
    end

    Kafka[Kafka Topics] --> KafkaConsumer
    KafkaConsumer --> Processor
    Processor --> Enricher
    Enricher --> Publisher
    Publisher --> Cassandra[(Cassandra)]
    Publisher --> Pinot[(Pinot)]
```

**Processing Pipeline:**
1. **Ingest events** from Kafka topics
2. **Normalize data** from different sources
3. **Enrich events** with contextual information
4. **Store processed data** in analytics stores
5. **Generate derived events** for downstream systems

## Data Architecture

### Data Storage Strategy

OpenFrame uses a polyglot persistence approach:

| Database | Use Case | Data Types |
|----------|----------|------------|
| **MongoDB** | Primary storage | Users, devices, organizations, configuration |
| **Redis** | Caching & Sessions | Session data, temporary tokens, cache |
| **Cassandra** | Time-series data | Logs, metrics, audit events |
| **Apache Pinot** | Analytics | Aggregated metrics, reporting data |
| **Apache Kafka** | Event streaming | Real-time events, message queues |

### Data Model Design

#### Multi-Tenant Data Partitioning

```javascript
// MongoDB Document Structure
{
  "_id": ObjectId("..."),
  "tenantId": "tenant-123",  // Always present for isolation
  "organizationId": "org-456", // Optional sub-partitioning
  "name": "Device Name",
  "status": "ONLINE",
  "metadata": { ... },
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}

// Automatic tenant filtering in queries
db.devices.find({
  "tenantId": "tenant-123",  // Always added by framework
  "status": "ONLINE"
})
```

#### Event Sourcing Pattern

```javascript
// Event Store Structure
{
  "_id": ObjectId("..."),
  "tenantId": "tenant-123",
  "aggregateId": "device-789",
  "eventType": "DEVICE_STATUS_CHANGED",
  "eventData": {
    "oldStatus": "OFFLINE",
    "newStatus": "ONLINE",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "version": 15,
  "createdAt": ISODate("...")
}
```

## Security Architecture

### Zero-Trust Security Model

OpenFrame implements zero-trust principles at every layer:

```mermaid
flowchart TB
    subgraph "Client Layer"
        Client[Client Apps]
    end
    
    subgraph "Network Security"
        TLS[TLS 1.3]
        WAF[Web Application Firewall]
    end
    
    subgraph "Application Security"
        JWT[JWT Validation]
        RBAC[Role-Based Access]
        TenantIsolation[Tenant Isolation]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption]
        Auditing[Audit Logging]
        Backup[Encrypted Backups]
    end

    Client --> TLS
    TLS --> WAF
    WAF --> JWT
    JWT --> RBAC
    RBAC --> TenantIsolation
    TenantIsolation --> Encryption
    Encryption --> Auditing
    Auditing --> Backup
```

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Gateway
    participant AuthServer
    participant APIService
    participant Database

    Browser->>Gateway: Request with JWT Cookie
    Gateway->>Gateway: Extract JWT from Cookie
    Gateway->>AuthServer: Validate JWT (JWKS)
    AuthServer-->>Gateway: JWT Valid + Tenant Info
    Gateway->>APIService: Request with Authorization Header
    APIService->>APIService: Extract Tenant Context
    APIService->>Database: Query with Tenant Filter
    Database-->>APIService: Tenant-Filtered Results
    APIService-->>Gateway: Response
    Gateway-->>Browser: Response
```

**Security Features:**
- **HTTP-only cookies** for JWT storage (XSS protection)
- **Automatic token refresh** with sliding expiration
- **Role-based access control** with granular permissions
- **Audit logging** for all sensitive operations
- **Data encryption** at rest and in transit

## Scalability & Performance

### Horizontal Scaling Strategy

```mermaid
flowchart TB
    subgraph "Load Balancing"
        LB[Load Balancer]
        LB --> GW1[Gateway 1]
        LB --> GW2[Gateway 2]
        LB --> GWN[Gateway N]
    end

    subgraph "Service Scaling"
        GW1 --> API1[API Service 1]
        GW1 --> API2[API Service 2]
        GW2 --> API3[API Service 3]
        GWN --> APIN[API Service N]
    end

    subgraph "Data Layer Scaling"
        API1 --> MongoDB1[(MongoDB Replica Set)]
        API2 --> Redis1[(Redis Cluster)]
        API3 --> Kafka1[Kafka Cluster]
    end
```

### Performance Optimizations

#### Caching Strategy

| Layer | Cache Type | TTL | Invalidation |
|--------|------------|-----|--------------|
| **API Gateway** | Request cache | 60s | Event-driven |
| **GraphQL** | Query cache | 300s | Schema changes |
| **Database** | Query result cache | 900s | Data changes |
| **Session** | User session cache | 24h | Logout/expiry |

#### Database Indexing

```javascript
// MongoDB Indexes for Performance
db.devices.createIndex({ "tenantId": 1, "status": 1 })
db.devices.createIndex({ "tenantId": 1, "organizationId": 1, "name": 1 })
db.users.createIndex({ "email": 1 }, { "unique": true })
db.events.createIndex({ "tenantId": 1, "timestamp": -1 })

// TTL Index for temporary data
db.sessions.createIndex({ "expiresAt": 1 }, { "expireAfterSeconds": 0 })
```

## Development Patterns

### Service Communication Patterns

#### Synchronous Communication
```java
// REST Template for service-to-service calls
@Service
public class DeviceService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    public DeviceStatus getDeviceStatus(String deviceId) {
        return restTemplate.getForObject(
            "http://client-service/api/devices/{deviceId}/status",
            DeviceStatus.class,
            deviceId
        );
    }
}
```

#### Asynchronous Communication
```java
// Kafka producer for event publishing
@Service
public class DeviceEventPublisher {
    
    @Autowired
    private KafkaTemplate<String, DeviceEvent> kafkaTemplate;
    
    public void publishDeviceEvent(DeviceEvent event) {
        kafkaTemplate.send("device-events", event.getDeviceId(), event);
    }
}
```

### Error Handling Patterns

#### Centralized Error Handling
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(DeviceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleDeviceNotFound(DeviceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("DEVICE_NOT_FOUND", ex.getMessage()));
    }
    
    @ExceptionHandler(TenantAccessViolationException.class)
    public ResponseEntity<ErrorResponse> handleTenantViolation(TenantAccessViolationException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("ACCESS_DENIED", "Insufficient permissions"));
    }
}
```

### GraphQL Schema Design Patterns

#### Connection Pattern for Pagination
```graphql
type Query {
  devices(
    first: Int
    after: String
    filter: DeviceFilter
  ): DeviceConnection!
}

type DeviceConnection {
  edges: [DeviceEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type DeviceEdge {
  node: Device!
  cursor: String!
}
```

#### Input Types for Complex Operations
```graphql
input CreateDeviceInput {
  name: String!
  organizationId: ID!
  type: DeviceType!
  configuration: DeviceConfigurationInput
}

input DeviceConfigurationInput {
  monitoring: MonitoringConfigInput
  security: SecurityConfigInput
  networking: NetworkingConfigInput
}
```

## Deployment Architecture

### Container Strategy

```yaml
# docker-compose.yml structure
services:
  gateway:
    image: openframe/gateway:latest
    ports: ["8080:8080"]
    depends_on: [config-service, auth-server]
    
  api-service:
    image: openframe/api:latest
    ports: ["8081:8081"]
    depends_on: [mongodb, redis]
    
  mongodb:
    image: mongo:7.0
    volumes: ["mongodb_data:/data/db"]
    
  redis:
    image: redis:7.0-alpine
    volumes: ["redis_data:/data"]
```

### Kubernetes Deployment

```yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openframe-api
  template:
    metadata:
      labels:
        app: openframe-api
    spec:
      containers:
      - name: api
        image: openframe/api:latest
        ports:
        - containerPort: 8081
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "kubernetes"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: openframe-secrets
              key: mongodb-uri
```

## Next Steps

Now that you understand the OpenFrame architecture:

1. **[Testing Overview](../testing/overview.md)** - Learn how to test the system
2. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing code
3. **[Local Development](../setup/local-development.md)** - Set up your development workflow

## Additional Resources

- **[Security OAuth BFF and JWT Core](../../reference/architecture/security_oauth_bff_and_jwt_core.md)** - Deep dive into security implementation
- **[Data Layer MongoDB](../../reference/architecture/data_layer_mongo_and_repositories.md)** - Database architecture details
- **[Stream Service Architecture](../../reference/architecture/openframe_stream_service.md)** - Event processing details

## Getting Help

For architecture questions and discussions:

1. **Join our community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Ask in #architecture channel** for design discussions
3. **Review existing documentation** in the reference section
4. **Check GitHub discussions** for architectural decisions