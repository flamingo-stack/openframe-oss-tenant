# Architecture Overview

This document provides a comprehensive overview of OpenFrame's architecture, including system design, component interactions, data flow, and key design decisions that shape the platform.

## High-Level Architecture

OpenFrame follows a modern microservices architecture designed for scalability, maintainability, and extensibility in MSP environments.

### System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Dashboard<br/>Vue 3 + TypeScript]
        MOBILE[Mobile App<br/>Future]
        API_CLIENTS[External API Clients<br/>REST/GraphQL]
    end
    
    subgraph "Gateway Layer"
        GATEWAY[OpenFrame Gateway<br/>Spring Cloud Gateway<br/>Port 8080]
    end
    
    subgraph "Service Layer"
        API[OpenFrame API<br/>GraphQL + OAuth2<br/>Port 8081]
        AUTH[Authorization Server<br/>OAuth2/OIDC<br/>Port 8082]
        MGMT[Management Service<br/>Admin Tasks<br/>Port 8083]
        STREAM[Stream Service<br/>Event Processing<br/>Port 8084]
        CLIENT[Client Service<br/>Agent Management<br/>Port 8085]
        CONFIG[Config Service<br/>Spring Cloud Config<br/>Port 8888]
    end
    
    subgraph "Data Layer"
        MONGODB[(MongoDB<br/>Primary Storage)]
        CASSANDRA[(Cassandra<br/>Time Series)]
        PINOT[(Apache Pinot<br/>Analytics)]
        REDIS[(Redis<br/>Cache/Sessions)]
        KAFKA[Apache Kafka<br/>Event Streaming]
    end
    
    subgraph "External Tools"
        TACTICAL[TacticalRMM<br/>RMM Platform]
        MESH[MeshCentral<br/>Remote Access]
        FLEET[Fleet MDM<br/>Device Management]
        AUTHENTIK[Authentik<br/>Identity Provider]
    end
    
    subgraph "Client Agents"
        RUST_AGENT[OpenFrame Agent<br/>Rust Application]
        CHAT_CLIENT[AI Chat Client<br/>Desktop App]
    end
    
    %% Client connections
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    API_CLIENTS --> GATEWAY
    
    %% Gateway routing
    GATEWAY --> API
    GATEWAY --> AUTH
    GATEWAY --> MGMT
    GATEWAY -.-> TACTICAL
    GATEWAY -.-> MESH
    GATEWAY -.-> FLEET
    
    %% Service dependencies
    API --> MONGODB
    API --> REDIS
    API --> KAFKA
    AUTH --> MONGODB
    AUTH --> REDIS
    MGMT --> CONFIG
    MGMT --> MONGODB
    STREAM --> KAFKA
    STREAM --> CASSANDRA
    STREAM --> PINOT
    CLIENT --> REDIS
    CLIENT --> KAFKA
    
    %% External tool integration
    TACTICAL --> STREAM
    MESH --> STREAM
    FLEET --> STREAM
    AUTHENTIK --> AUTH
    
    %% Agent connections
    RUST_AGENT --> CLIENT
    CHAT_CLIENT --> API
    RUST_AGENT -.-> TACTICAL
    RUST_AGENT -.-> MESH
```

## Core Components

### Gateway Layer

#### OpenFrame Gateway
**Purpose**: Central entry point and traffic routing
**Technology**: Spring Cloud Gateway
**Key Responsibilities**:
- Request routing and load balancing
- Authentication and authorization
- Rate limiting and throttling
- CORS handling
- WebSocket proxy for real-time features
- Tool integration proxy

**Configuration**:
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: api-route
          uri: http://openframe-api:8081
          predicates:
            - Path=/api/**, /graphql/**
        - id: auth-route
          uri: http://openframe-authorization-server:8082
          predicates:
            - Path=/oauth2/**, /login/**
        - id: tools-route
          uri: http://tactical-rmm:8000
          predicates:
            - Path=/tactical/**
          filters:
            - StripPrefix=1
```

### Service Layer

#### OpenFrame API Service
**Purpose**: Core business logic and GraphQL API
**Technology**: Spring Boot + Netflix DGS
**Key Responsibilities**:
- GraphQL schema and resolvers
- Business logic implementation
- Data access and caching
- Real-time subscriptions via WebSocket
- Authentication and authorization

**Data Flow**:
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant MongoDB
    participant Redis
    participant Kafka
    
    Client->>Gateway: GraphQL Query
    Gateway->>API: Authenticated Request
    API->>Redis: Check Cache
    alt Cache Hit
        Redis-->>API: Cached Data
    else Cache Miss
        API->>MongoDB: Query Database
        MongoDB-->>API: Raw Data
        API->>Redis: Store Cache
    end
    API->>Kafka: Publish Event (if mutation)
    API-->>Gateway: Response
    Gateway-->>Client: JSON Response
```

#### Authorization Server
**Purpose**: OAuth2/OpenID Connect authentication
**Technology**: Spring Authorization Server
**Key Responsibilities**:
- User authentication and authorization
- JWT token issuance and validation
- Multi-tenant support
- SSO integration
- Session management

#### Management Service
**Purpose**: Administrative operations and scheduled tasks
**Technology**: Spring Boot + Spring Scheduler
**Key Responsibilities**:
- System maintenance tasks
- Data cleanup and archiving
- Health monitoring
- Configuration management
- Backup coordination

#### Stream Service
**Purpose**: Real-time data processing and enrichment
**Technology**: Spring Boot + Apache Kafka
**Key Responsibilities**:
- Event stream processing
- Data transformation and enrichment
- Metric aggregation
- Alert generation
- Integration with external tools

**Stream Processing Architecture**:
```mermaid
graph LR
    subgraph "Data Sources"
        A[MSP Tools<br/>Events]
        B[Agent Data<br/>Metrics]
        C[User Actions<br/>Audit]
    end
    
    subgraph "Kafka Topics"
        D[raw-events]
        E[device-metrics]
        F[security-events]
        G[enriched-events]
    end
    
    subgraph "Stream Processors"
        H[Event Enricher<br/>Add Context]
        I[Metric Aggregator<br/>Time Windows]
        J[Alert Generator<br/>Threshold Check]
    end
    
    subgraph "Data Sinks"
        K[Cassandra<br/>Time Series]
        L[Pinot<br/>Analytics]
        M[MongoDB<br/>Alerts]
    end
    
    A --> D
    B --> E
    C --> F
    
    D --> H
    E --> I
    F --> J
    
    H --> G
    I --> G
    J --> G
    
    G --> K
    G --> L
    G --> M
```

#### Client Service
**Purpose**: Agent management and coordination
**Technology**: Spring Boot + NATS
**Key Responsibilities**:
- Agent registration and authentication
- Command distribution
- Status monitoring
- File transfer coordination
- Tool installation management

### Data Layer

#### MongoDB (Primary Storage)
**Purpose**: Primary operational data storage
**Usage**:
- User accounts and organizations
- Device inventory and metadata
- Configuration and policies
- Audit logs and events
- Tool integration settings

**Collections Structure**:
```javascript
// Key MongoDB collections
{
  "users": {
    "_id": ObjectId,
    "email": String,
    "organizationId": ObjectId,
    "roles": [String],
    "lastLogin": Date
  },
  "organizations": {
    "_id": ObjectId,
    "name": String,
    "domain": String,
    "settings": Object,
    "createdAt": Date
  },
  "devices": {
    "_id": ObjectId,
    "hostname": String,
    "organizationId": ObjectId,
    "agentId": String,
    "lastSeen": Date,
    "metadata": Object
  }
}
```

#### Cassandra (Time Series Storage)
**Purpose**: High-volume time-series data
**Usage**:
- Device metrics and performance data
- Log events and audit trails
- Historical monitoring data
- Alert history

**Keyspace Design**:
```cql
CREATE TABLE device_metrics (
  device_id UUID,
  metric_timestamp TIMESTAMP,
  metric_name TEXT,
  metric_value DOUBLE,
  tags MAP<TEXT, TEXT>,
  PRIMARY KEY (device_id, metric_timestamp, metric_name)
) WITH CLUSTERING ORDER BY (metric_timestamp DESC);

CREATE TABLE log_events (
  device_id UUID,
  log_date DATE,
  log_timestamp TIMESTAMP,
  level TEXT,
  source TEXT,
  message TEXT,
  PRIMARY KEY ((device_id, log_date), log_timestamp)
) WITH CLUSTERING ORDER BY (log_timestamp DESC);
```

#### Apache Pinot (Analytics Engine)
**Purpose**: Real-time analytics and reporting
**Usage**:
- Dashboard analytics
- Performance reporting
- Compliance monitoring
- Cost analysis

#### Redis (Caching and Sessions)
**Purpose**: High-performance caching and session storage
**Usage**:
- Session management
- GraphQL query caching
- Rate limiting counters
- Real-time data caching
- Pub/sub messaging

#### Apache Kafka (Event Streaming)
**Purpose**: Event-driven communication and data pipeline
**Usage**:
- Service-to-service communication
- Real-time data streaming
- Event sourcing
- Integration with external tools

**Topic Structure**:
```yaml
Topics:
  raw-events:
    partitions: 12
    replication: 3
    retention: 7 days
    
  device-metrics:
    partitions: 24
    replication: 3
    retention: 30 days
    
  security-events:
    partitions: 6
    replication: 3
    retention: 90 days
    
  audit-logs:
    partitions: 6
    replication: 3
    retention: 365 days
```

## Authentication and Authorization

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AuthServer
    participant API
    participant Redis
    
    User->>Frontend: Login Request
    Frontend->>Gateway: POST /oauth2/token
    Gateway->>AuthServer: Forward Auth Request
    AuthServer->>AuthServer: Validate Credentials
    AuthServer->>Redis: Store Session
    AuthServer-->>Gateway: JWT Token + Cookie
    Gateway-->>Frontend: Set HTTP-Only Cookie
    Frontend->>Frontend: Store User State
    
    Note over Frontend,API: Subsequent API Requests
    Frontend->>Gateway: API Request (with cookie)
    Gateway->>Gateway: Extract JWT from Cookie
    Gateway->>Gateway: Add Authorization Header
    Gateway->>API: Forward Request with JWT
    API->>Redis: Validate Session
    API-->>Gateway: Response
    Gateway-->>Frontend: Response
```

### Authorization Model

OpenFrame implements Role-Based Access Control (RBAC) with multi-tenancy:

```mermaid
graph TB
    subgraph "Tenant: MSP Company A"
        ADMIN_A[Admin User]
        TECH_A[Technician User]
        VIEW_A[Viewer User]
        ORG_A[Organization A]
        DEV_A[Devices A]
    end
    
    subgraph "Tenant: MSP Company B" 
        ADMIN_B[Admin User]
        TECH_B[Technician User]
        ORG_B[Organization B]
        DEV_B[Devices B]
    end
    
    subgraph "Permissions Matrix"
        PERMS[User Management<br/>Device Control<br/>Configuration<br/>Reports<br/>API Access]
    end
    
    ADMIN_A --> ORG_A
    TECH_A --> ORG_A
    VIEW_A --> ORG_A
    ORG_A --> DEV_A
    
    ADMIN_B --> ORG_B
    TECH_B --> ORG_B
    ORG_B --> DEV_B
    
    ADMIN_A -.-> PERMS
    TECH_A -.-> PERMS
    VIEW_A -.-> PERMS
```

**Permission Levels**:

| Role | User Mgmt | Device Control | Configuration | Reports | API Access |
|------|-----------|----------------|---------------|---------|-------------|
| **Super Admin** | ✅ All Tenants | ✅ All Tenants | ✅ System Config | ✅ All | ✅ Full |
| **Tenant Admin** | ✅ Own Tenant | ✅ Own Devices | ✅ Tenant Config | ✅ Own Tenant | ✅ Full |
| **Technician** | ❌ | ✅ Own Devices | ❌ | ✅ Own Tenant | ✅ Limited |
| **Viewer** | ❌ | ❌ | ❌ | ✅ Own Tenant | ✅ Read Only |

## Data Flow Architecture

### Real-Time Data Pipeline

```mermaid
graph TB
    subgraph "Data Ingestion"
        A[OpenFrame Agents<br/>System Metrics]
        B[MSP Tools<br/>TacticalRMM, MeshCentral]
        C[User Actions<br/>Frontend Events]
        D[External APIs<br/>Third-party Tools]
    end
    
    subgraph "Event Processing"
        E[Kafka Ingestion<br/>Raw Events]
        F[Stream Processing<br/>Data Enrichment]
        G[Event Classification<br/>Security, Performance]
    end
    
    subgraph "Storage Layer"
        H[MongoDB<br/>Operational Data]
        I[Cassandra<br/>Time Series]
        J[Pinot<br/>Analytics]
        K[Redis<br/>Cache & Sessions]
    end
    
    subgraph "API Layer"
        L[GraphQL API<br/>Query Interface]
        M[REST API<br/>Tool Integration]
        N[WebSocket<br/>Real-time Updates]
    end
    
    subgraph "Frontend Layer"
        O[Vue Dashboard<br/>Management UI]
        P[Mobile App<br/>Field Access]
        Q[External Clients<br/>Custom Apps]
    end
    
    A --> E
    B --> E
    C --> E
    D --> E
    
    E --> F
    F --> G
    
    G --> H
    G --> I
    G --> J
    F --> K
    
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> O
    M --> Q
    N --> O
    N --> P
```

### Query Processing

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant Redis
    participant MongoDB
    participant Pinot
    
    Note over Client,Pinot: Complex Dashboard Query
    Client->>Gateway: GraphQL Query (devices + metrics)
    Gateway->>API: Authenticated Request
    
    par Device Data Query
        API->>Redis: Check Device Cache
        alt Cache Miss
            API->>MongoDB: Query Device Collection
            MongoDB-->>API: Device Data
            API->>Redis: Cache Results (5min TTL)
        else Cache Hit
            Redis-->>API: Cached Device Data
        end
    and Metrics Data Query
        API->>Pinot: Query Device Metrics (Last 24h)
        Pinot-->>API: Aggregated Metrics
    end
    
    API->>API: Merge Data & Apply Filters
    API-->>Gateway: Combined Response
    Gateway-->>Client: JSON Response
```

## External Tool Integration

### Integration Architecture

OpenFrame integrates with existing MSP tools through a unified proxy approach:

```mermaid
graph LR
    subgraph "OpenFrame Core"
        GW[Gateway<br/>Proxy Layer]
        API[OpenFrame API<br/>Unified Interface]
        STREAM[Stream Service<br/>Data Processing]
    end
    
    subgraph "MSP Tool Ecosystem"
        TACTICAL[TacticalRMM<br/>Remote Monitoring]
        MESH[MeshCentral<br/>Remote Access]
        FLEET[Fleet MDM<br/>Mobile Devices]
        AUTHENTIK[Authentik<br/>Identity Management]
    end
    
    subgraph "Data Flow"
        KAFKA[Kafka Topics<br/>Event Streaming]
        MONGO[MongoDB<br/>Unified Storage]
        CASS[Cassandra<br/>Metrics Storage]
    end
    
    GW -.-> TACTICAL
    GW -.-> MESH
    GW -.-> FLEET
    GW -.-> AUTHENTIK
    
    TACTICAL --> STREAM
    MESH --> STREAM
    FLEET --> STREAM
    AUTHENTIK --> API
    
    STREAM --> KAFKA
    KAFKA --> MONGO
    KAFKA --> CASS
    
    API --> MONGO
    API --> CASS
```

### Tool Integration Patterns

#### 1. API Proxy Pattern
For tools with REST APIs (TacticalRMM):
```java
@Component
@RequiredArgsConstructor
public class TacticalRmmProxy {
    private final WebClient tacticalClient;
    
    public Mono<DeviceList> getDevices(String organizationId) {
        return tacticalClient
            .get()
            .uri("/api/v1/agents?org={org}", organizationId)
            .header("X-API-KEY", getApiKey(organizationId))
            .retrieve()
            .bodyToMono(DeviceList.class)
            .map(this::mapToOpenFrameDevices);
    }
}
```

#### 2. Event Streaming Pattern
For real-time data integration:
```java
@KafkaListener(topics = "tactical-rmm-events")
public void processTacticalEvent(TacticalRmmEvent event) {
    DeviceEvent openFrameEvent = DeviceEvent.builder()
        .deviceId(event.getAgentId())
        .organizationId(event.getOrganizationId())
        .timestamp(Instant.now())
        .eventType(mapEventType(event.getType()))
        .data(event.getData())
        .build();
        
    eventPublisher.publishEvent(openFrameEvent);
}
```

#### 3. WebSocket Relay Pattern
For real-time features (MeshCentral remote control):
```javascript
// Gateway WebSocket proxy configuration
{
  path: "/meshcentral/**",
  target: "ws://meshcentral:443",
  changeOrigin: true,
  secure: false,
  headers: {
    "Authorization": "Bearer ${jwt_token}"
  }
}
```

## Performance Characteristics

### System Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | < 200ms | P95 for GraphQL queries |
| **Throughput** | 100,000 events/sec | Kafka ingestion capacity |
| **Concurrent Users** | 10,000+ | Active dashboard sessions |
| **Database Query Time** | < 50ms | P95 for MongoDB queries |
| **Cache Hit Ratio** | > 85% | Redis cache effectiveness |
| **Availability** | 99.9% | Monthly uptime SLA |

### Scalability Design

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[HAProxy/NGINX<br/>SSL Termination]
    end
    
    subgraph "Gateway Cluster"
        GW1[Gateway Instance 1]
        GW2[Gateway Instance 2]
        GW3[Gateway Instance N]
    end
    
    subgraph "Service Clusters"
        API1[API Instance 1]
        API2[API Instance 2]
        AUTH1[Auth Instance 1]
        AUTH2[Auth Instance 2]
    end
    
    subgraph "Data Layer Clusters"
        MONGO_CLUSTER[MongoDB Replica Set<br/>3+ Nodes]
        REDIS_CLUSTER[Redis Cluster<br/>6+ Nodes]
        KAFKA_CLUSTER[Kafka Cluster<br/>3+ Brokers]
        CASS_CLUSTER[Cassandra Ring<br/>3+ Nodes]
    end
    
    LB --> GW1
    LB --> GW2
    LB --> GW3
    
    GW1 --> API1
    GW1 --> AUTH1
    GW2 --> API2
    GW2 --> AUTH2
    
    API1 --> MONGO_CLUSTER
    API1 --> REDIS_CLUSTER
    API2 --> MONGO_CLUSTER
    API2 --> REDIS_CLUSTER
    
    AUTH1 --> MONGO_CLUSTER
    AUTH1 --> REDIS_CLUSTER
```

## Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "Network Security"
        A[TLS 1.3 Encryption<br/>End-to-End]
        B[VPN/Private Network<br/>Optional]
        C[Firewall Rules<br/>Port Restrictions]
    end
    
    subgraph "Application Security"
        D[OAuth2/OIDC<br/>Authentication]
        E[JWT Tokens<br/>HTTP-Only Cookies]
        F[RBAC Authorization<br/>Multi-Tenant]
        G[Rate Limiting<br/>DDoS Protection]
    end
    
    subgraph "Data Security"
        H[AES-256 Encryption<br/>At Rest]
        I[Field-Level Encryption<br/>Sensitive Data]
        J[Audit Logging<br/>Complete Trail]
        K[Data Anonymization<br/>Privacy]
    end
    
    subgraph "Infrastructure Security"
        L[Container Security<br/>Image Scanning]
        M[Secret Management<br/>Vault/K8s Secrets]
        N[Network Policies<br/>Micro-segmentation]
        O[Monitoring & Alerting<br/>Security Events]
    end
```

### Threat Model

| Threat Category | Mitigation Strategy | Implementation |
|-----------------|-------------------|----------------|
| **Data Breaches** | Encryption + Access Control | AES-256, JWT, RBAC |
| **Man-in-the-Middle** | TLS Everywhere | Certificate management |
| **Injection Attacks** | Input Validation | Parameterized queries |
| **Privilege Escalation** | Least Privilege | Role-based permissions |
| **DDoS Attacks** | Rate Limiting | Gateway throttling |

## Deployment Architecture

### Kubernetes Deployment

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Ingress Layer"
            ING[NGINX Ingress<br/>SSL Termination]
        end
        
        subgraph "Application Pods"
            GW_POD[Gateway Pods<br/>3 replicas]
            API_POD[API Pods<br/>5 replicas]
            AUTH_POD[Auth Pods<br/>2 replicas]
            MGMT_POD[Management Pod<br/>1 replica]
            STREAM_POD[Stream Pods<br/>3 replicas]
        end
        
        subgraph "Data Services"
            MONGO_STS[MongoDB StatefulSet<br/>3 replicas]
            REDIS_STS[Redis Cluster<br/>6 replicas]
            KAFKA_STS[Kafka StatefulSet<br/>3 replicas]
            CASS_STS[Cassandra StatefulSet<br/>3 replicas]
        end
        
        subgraph "Storage"
            PV[Persistent Volumes<br/>SSD Storage]
        end
    end
    
    ING --> GW_POD
    GW_POD --> API_POD
    GW_POD --> AUTH_POD
    GW_POD --> MGMT_POD
    
    API_POD --> MONGO_STS
    API_POD --> REDIS_STS
    AUTH_POD --> MONGO_STS
    STREAM_POD --> KAFKA_STS
    
    MONGO_STS --> PV
    REDIS_STS --> PV
    KAFKA_STS --> PV
    CASS_STS --> PV
```

## Key Design Decisions

### 1. Microservices vs. Monolith
**Decision**: Microservices architecture
**Rationale**: 
- Independent scaling of components
- Technology diversity (Java, TypeScript, Rust)
- Team autonomy and parallel development
- Fault isolation

### 2. GraphQL vs. REST
**Decision**: GraphQL for primary API, REST for tool integration
**Rationale**:
- Flexible frontend data fetching
- Strong typing and introspection
- Real-time subscriptions
- Better developer experience

### 3. JWT in Cookies vs. Headers
**Decision**: HTTP-only cookies for JWT storage
**Rationale**:
- XSS attack mitigation
- Automatic CSRF protection
- Browser security best practices
- Mobile app compatibility

### 4. Event Streaming Architecture
**Decision**: Apache Kafka for all inter-service communication
**Rationale**:
- Scalable event processing
- Decoupled service architecture
- Replay and recovery capabilities
- Integration with external tools

### 5. Multi-Database Strategy
**Decision**: Polyglot persistence with specialized databases
**Rationale**:
- MongoDB for operational data (flexibility)
- Cassandra for time-series (scale)
- Pinot for analytics (performance)
- Redis for caching (speed)

### 6. Container-First Deployment
**Decision**: Kubernetes-native architecture
**Rationale**:
- Cloud-agnostic deployment
- Auto-scaling and healing
- Resource efficiency
- DevOps best practices

## Future Architecture Considerations

### Planned Enhancements

1. **Service Mesh Integration**: Istio for advanced traffic management
2. **Event Sourcing**: Complete event-driven architecture
3. **CQRS Implementation**: Separate read/write models
4. **Multi-Region Deployment**: Global availability
5. **AI/ML Pipeline**: Integrated machine learning capabilities

### Technology Evolution

```mermaid
graph LR
    subgraph "Current (v1.x)"
        A[Spring Boot Services]
        B[Vue.js Frontend]
        C[Kafka Streaming]
        D[MongoDB Primary]
    end
    
    subgraph "Near Future (v2.x)"
        E[Reactive Services<br/>Spring WebFlux]
        F[Progressive Web App]
        G[Event Sourcing]
        H[Multi-Region Data]
    end
    
    subgraph "Long Term (v3.x)"
        I[Serverless Functions]
        J[AI-Driven UI]
        K[Real-time ML]
        L[Edge Computing]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    
    E --> I
    F --> J
    G --> K
    H --> L
```

This architecture overview provides the foundation for understanding OpenFrame's design and implementation. The system is designed to be scalable, maintainable, and extensible while meeting the demanding requirements of modern MSP operations.

For implementation details of specific components, refer to the individual service documentation and the [Development Setup](../setup/environment.md) guides.