# Architecture Overview

OpenFrame follows a modern microservices architecture designed for scalability, maintainability, and developer productivity. This document provides a comprehensive overview of the system design, data flow patterns, and key architectural decisions.

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Dashboard<br/>Vue 3 + TypeScript]
        Mobile[Mobile Apps<br/>Future]
        Desktop[Desktop Client<br/>Tauri + Rust]
        Agent[System Agent<br/>Rust]
    end
    
    subgraph "Edge Layer"
        LB[Load Balancer<br/>Nginx/Istio]
        Gateway[API Gateway<br/>openframe-gateway<br/>:8081]
    end
    
    subgraph "Service Layer"
        API[GraphQL API<br/>openframe-api<br/>:8082]
        Auth[Authorization Server<br/>openframe-authorization-server]
        Management[Management Service<br/>openframe-management<br/>:8083]
        Stream[Stream Processing<br/>openframe-stream<br/>:8084]
        Config[Config Server<br/>openframe-config<br/>:8888]
        Client[Client Service<br/>openframe-client<br/>:8085]
        External[External API<br/>openframe-external-api]
    end
    
    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Application Data)]
        Cassandra[(Cassandra<br/>Time Series)]
        Redis[(Redis<br/>Cache/Sessions)]
        Pinot[(Apache Pinot<br/>Analytics)]
    end
    
    subgraph "Message Layer"
        Kafka[Apache Kafka<br/>Event Streaming]
        NATS[NATS<br/>Real-time Messaging]
    end
    
    subgraph "External Tools"
        TacticalRMM[TacticalRMM]
        Fleet[Fleet MDM]
        Mesh[MeshCentral]
        Authentik[Authentik SSO]
    end
    
    Web --> LB
    Desktop --> LB
    Agent --> Client
    
    LB --> Gateway
    Gateway --> API
    Gateway --> Auth
    Gateway --> Management
    Gateway --> External
    
    API --> MongoDB
    API --> Redis
    Management --> MongoDB
    Management --> Redis
    Stream --> Kafka
    Stream --> Cassandra
    Stream --> Pinot
    
    API --> Kafka
    Management --> Kafka
    Kafka --> NATS
    
    External --> TacticalRMM
    External --> Fleet
    External --> Mesh
    External --> Authentik
```

## Core Services Deep Dive

### 1. API Gateway (openframe-gateway)

**Purpose**: Central entry point for all client requests with routing, authentication, and rate limiting.

**Key Responsibilities**:
- **Request Routing**: Routes requests to appropriate backend services
- **Authentication**: Validates JWT tokens and converts cookies to headers
- **Rate Limiting**: Protects services from abuse using Redis-backed limits
- **CORS Handling**: Manages cross-origin requests for web clients
- **WebSocket Proxying**: Enables real-time communication

**Technology Stack**:
- Spring Boot 3.3.0 with Spring Cloud Gateway
- JWT authentication with cookie support
- Redis for rate limiting and session management
- WebSocket support for real-time features

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant API
    participant Redis
    
    Client->>Gateway: HTTP Request + JWT Cookie
    Gateway->>Redis: Check Rate Limit
    Redis-->>Gateway: Rate Limit OK
    Gateway->>Gateway: Validate JWT & Extract Claims
    Gateway->>API: Forward Request + Authorization Header
    API-->>Gateway: Response
    Gateway-->>Client: Response + Updated Cookie
```

### 2. GraphQL API Service (openframe-api)

**Purpose**: Main data API providing GraphQL endpoint for frontend applications.

**Key Responsibilities**:
- **GraphQL Schema**: Defines data types and operations
- **Data Fetching**: Implements efficient data loading with DataLoaders
- **Business Logic**: Core application logic and validation
- **Multi-tenancy**: Organization-based data isolation
- **Real-time Updates**: Subscriptions for live data

**Schema Architecture**:
```graphql
type Query {
    organizations(filter: OrganizationFilter): OrganizationConnection
    devices(filter: DeviceFilter): DeviceConnection
    logs(filter: LogFilter): LogConnection
    tools(filter: ToolFilter): ToolConnection
}

type Mutation {
    createOrganization(input: CreateOrganizationInput): OrganizationResponse
    updateDevice(input: UpdateDeviceInput): DeviceResponse
    executeRemoteCommand(input: RemoteCommandInput): CommandResponse
}

type Subscription {
    deviceStatusUpdates(organizationId: ID!): DeviceStatus
    logUpdates(filter: LogFilter): LogEvent
    toolConnectionUpdates: ToolConnectionStatus
}
```

### 3. Management Service (openframe-management)

**Purpose**: Administrative operations, scheduled tasks, and system management.

**Key Responsibilities**:
- **Scheduled Jobs**: Background tasks using Spring's `@Scheduled`
- **System Health**: Monitors service health and performance
- **Tool Integration**: Manages external tool connections
- **Data Cleanup**: Maintains data retention policies
- **Release Management**: Handles software updates

**Scheduled Tasks**:
```mermaid
gantt
    title Management Service Scheduled Tasks
    dateFormat HH:mm
    axisFormat %H:%M
    
    section Health Checks
    Service Health Monitor    :crit, health, 00:00, 1m
    Database Health Check     :health-db, after health, 1m
    
    section Data Management
    Log Cleanup              :cleanup, 01:00, 10m
    Metrics Aggregation      :metrics, 02:00, 5m
    
    section Integration Tasks
    Tool Status Sync         :sync, 00:30, 2m
    Agent Update Check       :update, 03:00, 5m
```

### 4. Stream Processing Service (openframe-stream)

**Purpose**: Real-time data processing and event streaming using Apache Kafka.

**Key Responsibilities**:
- **Event Processing**: Processes Kafka streams for real-time insights
- **Data Enrichment**: Enhances incoming data with contextual information
- **Time-Series Storage**: Stores processed data in Cassandra
- **Analytics Pipeline**: Feeds data to Apache Pinot for analytics
- **Alert Generation**: Triggers notifications based on patterns

**Data Flow Architecture**:
```mermaid
graph LR
    subgraph "Data Sources"
        A[TacticalRMM Events]
        B[Fleet MDM Events]
        C[MeshCentral Events]
        D[System Agent Data]
    end
    
    subgraph "Kafka Topics"
        E[device-events]
        F[log-events]
        G[tool-events]
        H[user-events]
    end
    
    subgraph "Stream Processors"
        I[Device Status Processor]
        J[Log Enrichment Processor]
        K[Alert Generation Processor]
        L[Analytics Processor]
    end
    
    subgraph "Data Stores"
        M[Cassandra<br/>Time Series]
        N[Pinot<br/>Analytics]
        O[MongoDB<br/>Aggregated Data]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    
    E --> I
    F --> J
    G --> K
    H --> L
    
    I --> M
    J --> M
    K --> O
    L --> N
```

### 5. Authorization Server (openframe-authorization-server)

**Purpose**: OAuth2/OpenID Connect authentication and authorization.

**Key Responsibilities**:
- **User Authentication**: Login, registration, password reset
- **OAuth2 Flows**: Authorization code, client credentials
- **SSO Integration**: Google, Microsoft, custom OIDC providers
- **Multi-tenant Support**: Organization-based user isolation
- **Session Management**: Secure session handling

**Authentication Flows**:
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant AuthServer
    participant API
    participant Database
    
    User->>Frontend: Login Request
    Frontend->>AuthServer: POST /oauth2/token
    AuthServer->>Database: Validate Credentials
    Database-->>AuthServer: User Data
    AuthServer->>AuthServer: Generate JWT
    AuthServer-->>Frontend: JWT in HTTP-Only Cookie
    Frontend->>API: API Request with Cookie
    API->>API: Validate JWT from Cookie
    API-->>Frontend: API Response
```

## Data Architecture

### Database Strategy

**MongoDB - Primary Application Data**
- User accounts and organizations
- Device inventory and configuration
- Tool connections and credentials
- Application settings and preferences

**Cassandra - Time-Series Data**
- Device metrics and performance data
- System logs and events
- Historical monitoring data
- Audit trails

**Apache Pinot - Real-time Analytics**
- Real-time dashboards and reporting
- Performance metrics aggregation
- Business intelligence queries
- Custom analytics views

**Redis - Caching and Sessions**
- API response caching
- Session storage
- Rate limiting counters
- Real-time notifications

### Data Flow Patterns

#### Write Path (Data Ingestion)
```mermaid
sequenceDiagram
    participant Agent as System Agent
    participant Gateway as API Gateway
    participant API as GraphQL API
    participant Kafka as Kafka Stream
    participant Cassandra as Cassandra
    participant MongoDB as MongoDB
    
    Agent->>Gateway: Device Metrics
    Gateway->>API: Authenticated Request
    API->>MongoDB: Store Device State
    API->>Kafka: Publish Metrics Event
    Kafka->>Cassandra: Time-Series Data
    Note over Cassandra: Long-term storage
```

#### Read Path (Data Querying)
```mermaid
sequenceDiagram
    participant Frontend
    participant Gateway as API Gateway
    participant API as GraphQL API
    participant Redis as Redis Cache
    participant MongoDB as MongoDB
    participant Pinot as Apache Pinot
    
    Frontend->>Gateway: GraphQL Query
    Gateway->>API: Authenticated Request
    API->>Redis: Check Cache
    alt Cache Hit
        Redis-->>API: Cached Data
    else Cache Miss
        API->>MongoDB: Query Application Data
        API->>Pinot: Query Analytics Data
        MongoDB-->>API: Data
        Pinot-->>API: Metrics
        API->>Redis: Cache Response
    end
    API-->>Gateway: GraphQL Response
    Gateway-->>Frontend: JSON Response
```

## Security Architecture

### Multi-Tenant Security Model

```mermaid
graph TB
    subgraph "Tenant Isolation"
        T1[Organization 1<br/>Tenant A]
        T2[Organization 2<br/>Tenant B]
        T3[Organization 3<br/>Tenant C]
    end
    
    subgraph "Security Layer"
        JWT[JWT Token<br/>with Tenant Claims]
        RBAC[Role-Based Access<br/>Control]
        DataFilter[Data Filtering<br/>by Organization]
    end
    
    subgraph "Data Layer"
        DB[(Database with<br/>Organization ID)]
    end
    
    T1 --> JWT
    T2 --> JWT
    T3 --> JWT
    JWT --> RBAC
    RBAC --> DataFilter
    DataFilter --> DB
    
    note1[Every request includes<br/>organization context]
    note2[Data queries automatically<br/>filter by organization]
    
    JWT -.-> note1
    DataFilter -.-> note2
```

### Authentication Security Features

- **JWT with HTTP-Only Cookies**: Prevents XSS attacks
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Prevents brute force attacks
- **Password Policies**: Configurable complexity requirements
- **Account Lockout**: Temporary lockout after failed attempts
- **Audit Logging**: Complete authentication audit trail

## Integration Architecture

### External Tool Integration

OpenFrame integrates with various MSP tools through a standardized integration pattern:

```mermaid
graph TB
    subgraph "OpenFrame Core"
        Gateway[API Gateway]
        External[External API Service]
        Stream[Stream Service]
    end
    
    subgraph "Integration Layer"
        Adapter1[TacticalRMM Adapter]
        Adapter2[Fleet MDM Adapter]
        Adapter3[MeshCentral Adapter]
        Adapter4[Authentik Adapter]
    end
    
    subgraph "External Tools"
        Tool1[TacticalRMM]
        Tool2[Fleet MDM]
        Tool3[MeshCentral]
        Tool4[Authentik SSO]
    end
    
    Gateway --> External
    External --> Adapter1
    External --> Adapter2
    External --> Adapter3
    External --> Adapter4
    
    Adapter1 <--> Tool1
    Adapter2 <--> Tool2
    Adapter3 <--> Tool3
    Adapter4 <--> Tool4
    
    Adapter1 --> Stream
    Adapter2 --> Stream
    Adapter3 --> Stream
    Adapter4 --> Stream
```

### Integration Patterns

#### Tool Connection Protocol
1. **Discovery**: Auto-detect tool availability
2. **Authentication**: Establish secure connections
3. **Schema Mapping**: Map tool data to OpenFrame models
4. **Event Streaming**: Real-time event synchronization
5. **Error Handling**: Graceful failure management

#### Data Synchronization
```mermaid
sequenceDiagram
    participant OpenFrame
    participant Adapter
    participant ExternalTool
    participant Kafka
    
    Note over OpenFrame,ExternalTool: Initial Sync
    OpenFrame->>Adapter: Request Full Sync
    Adapter->>ExternalTool: Query All Data
    ExternalTool-->>Adapter: Data Response
    Adapter->>OpenFrame: Bulk Import
    
    Note over OpenFrame,ExternalTool: Real-time Updates
    ExternalTool->>Adapter: Webhook Event
    Adapter->>Kafka: Publish Event
    Kafka->>OpenFrame: Process Event
    OpenFrame->>OpenFrame: Update Local Data
```

## Performance Architecture

### Scalability Patterns

#### Horizontal Scaling
```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/Istio]
    end
    
    subgraph "API Gateway Cluster"
        GW1[Gateway Instance 1]
        GW2[Gateway Instance 2]
        GW3[Gateway Instance 3]
    end
    
    subgraph "API Service Cluster"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance 3]
    end
    
    subgraph "Database Cluster"
        MongoDB[MongoDB Replica Set]
        Cassandra[Cassandra Ring]
        Redis[Redis Cluster]
    end
    
    LB --> GW1
    LB --> GW2
    LB --> GW3
    
    GW1 --> API1
    GW2 --> API2
    GW3 --> API3
    
    API1 --> MongoDB
    API2 --> Cassandra
    API3 --> Redis
```

### Caching Strategy

#### Multi-Level Caching
```mermaid
graph TB
    subgraph "Client Side"
        Browser[Browser Cache]
        Apollo[Apollo Client Cache]
    end
    
    subgraph "CDN Layer"
        CDN[CloudFlare CDN]
    end
    
    subgraph "Application Layer"
        Redis[Redis Cache]
        Memory[In-Memory Cache]
    end
    
    subgraph "Database Layer"
        MongoDB[MongoDB]
        Cassandra[Cassandra]
    end
    
    Browser --> CDN
    Apollo --> CDN
    CDN --> Redis
    Redis --> Memory
    Memory --> MongoDB
    Memory --> Cassandra
    
    note1[TTL: 5 minutes<br/>Static Assets]
    note2[TTL: 1 minute<br/>API Responses]
    note3[TTL: 30 seconds<br/>Hot Data]
    
    CDN -.-> note1
    Redis -.-> note2
    Memory -.-> note3
```

## Deployment Architecture

### Kubernetes Deployment

```mermaid
graph TB
    subgraph "Ingress Layer"
        Istio[Istio Gateway]
        Nginx[Nginx Ingress]
    end
    
    subgraph "Application Namespace"
        GW[Gateway Deployment]
        API[API Deployment]
        Management[Management Deployment]
        Stream[Stream Deployment]
        Frontend[Frontend Deployment]
    end
    
    subgraph "Data Namespace"
        MongoDB[MongoDB StatefulSet]
        Cassandra[Cassandra StatefulSet]
        Redis[Redis Deployment]
        Kafka[Kafka StatefulSet]
    end
    
    subgraph "Monitoring Namespace"
        Prometheus[Prometheus]
        Grafana[Grafana]
        Jaeger[Jaeger Tracing]
    end
    
    Istio --> GW
    Nginx --> Frontend
    
    GW --> API
    GW --> Management
    GW --> Stream
    
    API --> MongoDB
    Stream --> Kafka
    Management --> Redis
    
    Prometheus --> API
    Prometheus --> GW
    Grafana --> Prometheus
    Jaeger --> API
```

## Monitoring and Observability

### Three Pillars of Observability

#### 1. Metrics (Prometheus + Grafana)
- **Service Metrics**: Request rates, latencies, error rates
- **Business Metrics**: Active users, API usage, feature adoption
- **Infrastructure Metrics**: CPU, memory, disk, network utilization

#### 2. Logging (ELK Stack)
- **Application Logs**: Structured JSON logging with correlation IDs
- **Access Logs**: HTTP request/response logging
- **Audit Logs**: Security and compliance tracking

#### 3. Tracing (Jaeger)
- **Distributed Tracing**: Request flow across microservices
- **Performance Analysis**: Identify bottlenecks and optimize
- **Error Investigation**: Root cause analysis for failures

### Health Check Architecture

```mermaid
sequenceDiagram
    participant K8s as Kubernetes
    participant Service as OpenFrame Service
    participant Database as Database
    participant ExternalTool as External Tool
    
    K8s->>Service: Liveness Probe
    Service-->>K8s: 200 OK (Basic Health)
    
    K8s->>Service: Readiness Probe
    Service->>Database: Health Check
    Database-->>Service: Connection OK
    Service->>ExternalTool: Health Check
    ExternalTool-->>Service: Integration OK
    Service-->>K8s: 200 OK (Ready)
```

## Key Architectural Decisions

### 1. Microservices vs Monolith
**Decision**: Microservices architecture
**Rationale**: 
- Independent scaling of components
- Technology diversity (Java, Rust, TypeScript)
- Team autonomy and faster development cycles
- Fault isolation and resilience

### 2. GraphQL vs REST
**Decision**: GraphQL for main API, REST for external integrations
**Rationale**:
- GraphQL provides better developer experience for frontend
- Single endpoint reduces network overhead
- Strong typing and introspection
- REST for external tools due to wider compatibility

### 3. Event Streaming with Kafka
**Decision**: Apache Kafka for event streaming (not NiFi)
**Rationale**:
- High throughput and low latency
- Strong ecosystem and community support
- Natural fit with microservices architecture
- Excellent monitoring and operational tools

### 4. Multi-Database Strategy
**Decision**: Use appropriate database for each use case
**Rationale**:
- MongoDB for application data (document flexibility)
- Cassandra for time-series (write-heavy workloads)
- Redis for caching (in-memory performance)
- Pinot for analytics (real-time OLAP)

### 5. Container-First Deployment
**Decision**: Kubernetes-native deployment
**Rationale**:
- Cloud portability
- Automatic scaling and recovery
- Standardized deployment patterns
- Rich ecosystem of tools and operators

## Future Architecture Considerations

### Planned Enhancements

1. **Service Mesh Evolution**: Full Istio service mesh with advanced traffic management
2. **Event Sourcing**: Implement event sourcing for critical business entities
3. **CQRS Implementation**: Separate read/write models for better performance
4. **Multi-Region Deployment**: Geographic distribution for global customers
5. **AI/ML Pipeline**: Dedicated machine learning infrastructure for advanced analytics

### Technology Roadmap

```mermaid
timeline
    title OpenFrame Architecture Roadmap
    
    Q1 2024 : Basic Microservices
            : JWT Authentication
            : MongoDB + Redis
            
    Q2 2024 : Kafka Integration
            : Cassandra Time-Series
            : Kubernetes Deployment
            
    Q3 2024 : Apache Pinot Analytics
            : Advanced Monitoring
            : Service Mesh
            
    Q4 2024 : Event Sourcing
            : CQRS Implementation
            : Multi-Region Support
```

---

This architecture overview provides the foundation for understanding OpenFrame's design principles and implementation patterns. For specific implementation details, refer to the individual service documentation and code examples.