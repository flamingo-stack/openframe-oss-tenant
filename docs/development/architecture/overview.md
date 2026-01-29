# Architecture Overview

OpenFrame is built as a distributed microservices platform designed for scalability, reliability, and extensibility. This document provides a comprehensive overview of the system architecture, component responsibilities, and design patterns.

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        CHAT[OpenFrame Chat App]
        AGENT[OpenFrame Client Agent]
    end
    
    subgraph "Gateway Layer"
        GW[OpenFrame Gateway]
        LB[Load Balancer]
    end
    
    subgraph "Application Services"
        API[API Service<br/>GraphQL + REST]
        AUTH[Authorization Server<br/>OAuth2/OIDC]
        MGMT[Management Service<br/>Admin + Scheduling]
        STREAM[Stream Service<br/>Event Processing]
        CONFIG[Config Service<br/>Spring Cloud Config]
        CLIENT[Client Service<br/>Agent Management]
        EXT[External API Service<br/>Integrations]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB<br/>Primary Data)]
        CASSANDRA[(Cassandra<br/>Time Series)]
        REDIS[(Redis<br/>Cache + Sessions)]
        PINOT[(Apache Pinot<br/>Analytics)]
    end
    
    subgraph "Messaging Layer"
        KAFKA[Apache Kafka<br/>Event Streams]
        NATS[NATS<br/>Real-time Messaging]
    end
    
    subgraph "External Tools"
        TACTICAL[TacticalRMM]
        FLEET[FleetMDM]
        MESH[MeshCentral]
        AUTHENTIK[Authentik]
    end
    
    WEB --> LB
    CHAT --> LB  
    AGENT --> LB
    LB --> GW
    
    GW --> API
    GW --> AUTH
    GW --> CLIENT
    GW --> EXT
    
    API --> MONGO
    API --> REDIS
    API --> KAFKA
    
    AUTH --> MONGO
    AUTH --> REDIS
    
    MGMT --> MONGO
    MGMT --> KAFKA
    MGMT --> CONFIG
    
    STREAM --> KAFKA
    STREAM --> CASSANDRA
    STREAM --> PINOT
    
    CLIENT --> MONGO
    CLIENT --> NATS
    
    EXT --> TACTICAL
    EXT --> FLEET
    EXT --> MESH
    EXT --> AUTHENTIK
    
    STREAM --> TACTICAL
    STREAM --> FLEET
    STREAM --> MESH
```

## Core Components

### Service Layer Components

| Service | Port | Responsibility | Technology Stack |
|---------|------|----------------|------------------|
| **OpenFrame Gateway** | 8080 | Request routing, authentication, WebSocket proxy | Spring Cloud Gateway, JWT |
| **API Service** | 8081 | GraphQL API, user management, core business logic | Spring Boot, Netflix DGS |
| **Authorization Server** | 8085 | OAuth2/OIDC provider, tenant management | Spring Authorization Server |
| **Management Service** | 8082 | Administrative tasks, scheduled jobs, system management | Spring Boot, ShedLock |
| **Stream Service** | 8083 | Real-time event processing, data enrichment | Spring Boot, Kafka Streams |
| **Config Service** | 8888 | Centralized configuration management | Spring Cloud Config |
| **Client Service** | 8081 | Agent registration, device communication | Spring Boot, NATS |
| **External API Service** | 8084 | External tool integrations, proxy services | Spring Boot, WebClient |

### Data Storage Components

| Database | Purpose | Data Types | Access Pattern |
|----------|---------|------------|----------------|
| **MongoDB** | Primary data store | Organizations, devices, users, configurations | CRUD operations, complex queries |
| **Cassandra** | Time-series data | Logs, metrics, events, audit trails | Write-heavy, time-range queries |
| **Redis** | Caching and sessions | User sessions, temporary data, rate limiting | Key-value, pub/sub |
| **Apache Pinot** | Analytics | Aggregated metrics, reporting data | OLAP queries, real-time analytics |

### Messaging Components

| System | Purpose | Use Cases |
|--------|---------|-----------|
| **Apache Kafka** | Event streaming | Service communication, data pipeline, integration events |
| **NATS** | Real-time messaging | Agent communication, WebSocket notifications, live updates |

## Service Communication Patterns

### Request/Response Communication

```mermaid
sequenceDiagram
    participant Client as Web Client
    participant Gateway as API Gateway
    participant API as API Service
    participant DB as MongoDB
    
    Client->>Gateway: GraphQL Request
    Gateway->>Gateway: Validate JWT Token
    Gateway->>API: Forward Request
    API->>API: Process Business Logic
    API->>DB: Query/Update Data
    DB-->>API: Response
    API-->>Gateway: GraphQL Response
    Gateway-->>Client: HTTP Response
```

### Event-Driven Communication

```mermaid
sequenceDiagram
    participant Agent as OpenFrame Agent
    participant Client as Client Service
    participant Kafka as Kafka
    participant Stream as Stream Service
    participant Cassandra as Cassandra
    participant API as API Service
    participant Frontend as Frontend
    
    Agent->>Client: Device Status Update
    Client->>Kafka: Publish Device Event
    Kafka->>Stream: Stream Processing
    Stream->>Cassandra: Store Time-Series Data
    Stream->>API: Trigger Real-time Update
    API->>Frontend: WebSocket Notification
```

## Data Flow Architecture

### Ingestion Pipeline

```mermaid
graph LR
    subgraph "Data Sources"
        A1[OpenFrame Agents]
        A2[TacticalRMM API]
        A3[FleetMDM Webhooks]
        A4[MeshCentral Events]
        A5[External APIs]
    end
    
    subgraph "Ingestion Layer"
        B1[Client Service]
        B2[External API Service]
        B3[Stream Service]
    end
    
    subgraph "Processing Layer"
        C1[Kafka Streams]
        C2[Data Enrichment]
        C3[Event Correlation]
    end
    
    subgraph "Storage Layer"
        D1[MongoDB<br/>Structured Data]
        D2[Cassandra<br/>Time Series]
        D3[Pinot<br/>Analytics]
        D4[Redis<br/>Cache]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B2
    A4 --> B2
    A5 --> B2
    
    B1 --> C1
    B2 --> C1
    B3 --> C1
    
    C1 --> D1
    C1 --> D2
    C1 --> D3
    C1 --> D4
```

### Query and Response Flow

```mermaid
graph LR
    subgraph "Client Layer"
        E1[Web Dashboard]
        E2[Mobile App]
        E3[API Clients]
    end
    
    subgraph "API Layer"
        F1[GraphQL API]
        F2[REST API]
        F3[WebSocket API]
    end
    
    subgraph "Data Access"
        G1[MongoDB Queries]
        G2[Cassandra Queries]
        G3[Pinot Queries]
        G4[Redis Cache]
    end
    
    E1 --> F1
    E2 --> F1
    E3 --> F2
    
    F1 --> G1
    F1 --> G2
    F1 --> G3
    F1 --> G4
    
    F2 --> G1
    F3 --> G4
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend
    participant Gateway as Gateway
    participant Auth as Auth Server
    participant API as API Service
    
    User->>Frontend: Login Request
    Frontend->>Auth: OAuth2 Authorization
    Auth->>Auth: Validate Credentials
    Auth-->>Frontend: Authorization Code
    Frontend->>Auth: Exchange Code for Token
    Auth-->>Frontend: JWT + Refresh Token
    Frontend->>Gateway: API Request + JWT Cookie
    Gateway->>Gateway: Validate JWT
    Gateway->>API: Forward Request + Auth Header
    API->>API: Process Request
    API-->>Gateway: Response
    Gateway-->>Frontend: Response
```

### Authorization Model

| Component | Authentication Method | Authorization Model |
|-----------|----------------------|---------------------|
| **Web Users** | OAuth2/OIDC + JWT cookies | Role-based (Owner, Admin, Technician, Viewer) |
| **API Clients** | API Keys | Scoped permissions per key |
| **OpenFrame Agents** | Service account credentials | Device-specific permissions |
| **External Tools** | Tool-specific tokens/credentials | Integration-scoped access |

### Security Layers

```mermaid
graph TD
    A[Internet/External Network] --> B[Load Balancer/WAF]
    B --> C[API Gateway]
    C --> D[JWT Validation]
    D --> E[Rate Limiting]
    E --> F[Service Mesh/mTLS]
    F --> G[Application Services]
    G --> H[Database Access Control]
```

## Key Design Decisions

### Microservices Architecture

**Why Microservices?**
- **Scalability**: Independent service scaling based on load
- **Technology Flexibility**: Best tool for each service
- **Team Autonomy**: Independent development and deployment
- **Fault Isolation**: Service failures don't cascade
- **Integration Flexibility**: Easy to add new external tools

**Trade-offs:**
- Increased operational complexity
- Network latency between services
- Data consistency challenges
- Monitoring complexity

### Event-Driven Architecture

**Benefits:**
- **Loose Coupling**: Services don't need direct dependencies
- **Scalability**: Asynchronous processing handles load spikes
- **Resilience**: Events can be replayed if services fail
- **Audit Trail**: Complete event history for compliance

**Implementation:**
- **Kafka Topics**: Domain-specific event streams
- **Event Sourcing**: Rebuild state from events
- **CQRS**: Separate read and write models
- **Saga Pattern**: Distributed transaction management

### Multi-Tenant Design

**Tenant Isolation:**
- **Data**: Separate MongoDB collections per tenant
- **Security**: Tenant-aware JWT claims
- **Configuration**: Tenant-specific settings
- **Networking**: Optional network isolation

**Shared Resources:**
- **Services**: Single deployment serves all tenants
- **Infrastructure**: Shared Kafka, Redis, monitoring
- **Code**: Multi-tenant aware business logic

## Data Models and Relationships

### Core Domain Entities

```mermaid
erDiagram
    Organization ||--o{ Machine : "manages"
    Organization ||--o{ User : "employs"  
    Organization ||--o{ Event : "generates"
    
    Machine ||--o{ InstalledAgent : "runs"
    Machine ||--o{ DeviceEvent : "emits"
    Machine ||--o{ SecurityAlert : "triggers"
    
    User ||--o{ APIKey : "owns"
    User ||--o{ Event : "performs"
    
    IntegratedTool ||--o{ ToolConnection : "provides"
    ToolConnection ||--o{ Machine : "connects"
    
    Organization {
        string id PK
        string name
        string domain
        address contactInfo
        enum status
        timestamp createdAt
    }
    
    Machine {
        string machineId PK
        string organizationId FK
        string hostname
        string ipAddress
        enum deviceType
        enum status
        timestamp lastSeen
    }
    
    User {
        string id PK
        string organizationId FK
        string email
        string fullName
        enum role
        enum status
    }
```

### Event Schema Design

```mermaid
graph TD
    A[Raw Event] --> B[Event Enrichment]
    B --> C[Structured Event]
    C --> D[Event Storage]
    
    subgraph "Event Types"
        E1[Device Events]
        E2[User Events]
        E3[System Events]
        E4[Integration Events]
        E5[Security Events]
    end
    
    C --> E1
    C --> E2
    C --> E3
    C --> E4
    C --> E5
```

### Integration Patterns

OpenFrame uses several integration patterns to connect with external tools:

#### Pull-Based Integration
```java
@Scheduled(fixedRate = 300000) // 5 minutes
public void syncTacticalRmmData() {
    List<Agent> agents = tacticalRmmClient.getAgents();
    agents.forEach(agent -> {
        deviceService.updateDeviceFromAgent(agent);
        kafkaProducer.send(new DeviceUpdateEvent(agent));
    });
}
```

#### Push-Based Integration (Webhooks)
```java
@RestController
@RequestMapping("/webhooks")
public class WebhookController {
    
    @PostMapping("/fleetmdm")
    public ResponseEntity<Void> handleFleetMdmWebhook(@RequestBody FleetEvent event) {
        eventProcessor.process(event);
        return ResponseEntity.ok().build();
    }
}
```

#### Event-Driven Integration
```java
@KafkaListener(topics = "device-events")
public void handleDeviceEvent(DeviceEvent event) {
    // Enrich with external data
    ExternalDeviceData data = externalApiClient.getDeviceData(event.getDeviceId());
    
    // Store enriched event
    UnifiedLogEvent enrichedEvent = enrichmentService.enrich(event, data);
    cassandraRepository.save(enrichedEvent);
    
    // Trigger real-time notifications
    webSocketService.notifyDeviceUpdate(event.getOrganizationId(), enrichedEvent);
}
```

## Technology Stack Rationale

### Backend Technology Choices

| Technology | Rationale | Alternatives Considered |
|------------|-----------|------------------------|
| **Java 21** | Mature ecosystem, enterprise support, performance improvements | Go, .NET, Python |
| **Spring Boot 3** | Comprehensive framework, excellent tooling, community | Quarkus, Micronaut |
| **GraphQL** | Flexible queries, strong typing, client efficiency | REST only, gRPC |
| **MongoDB** | Document model fits domain, horizontal scaling | PostgreSQL, CockroachDB |
| **Apache Kafka** | Industry standard for event streaming, proven at scale | RabbitMQ, Apache Pulsar |
| **Cassandra** | Excellent for time-series data, linear scalability | InfluxDB, TimescaleDB |

### Frontend Technology Choices

| Technology | Rationale | Alternatives Considered |
|------------|-----------|------------------------|
| **Vue 3** | Progressive adoption, excellent DX, Composition API | React, Angular, Svelte |
| **TypeScript** | Type safety, better tooling, enterprise adoption | JavaScript only |
| **Vite** | Fast builds, excellent HMR, modern tooling | Webpack, Rollup |
| **PrimeVue** | Enterprise UI components, consistent design | Vuetify, Quasar |
| **Pinia** | Modern state management, Vue 3 optimized | Vuex, Zustand |

## Scalability Patterns

### Horizontal Scaling

```mermaid
graph TD
    subgraph "Load Balancer"
        LB[Nginx/HAProxy]
    end
    
    subgraph "API Gateway Cluster"
        GW1[Gateway 1]
        GW2[Gateway 2]
        GWN[Gateway N]
    end
    
    subgraph "Service Clusters"
        API1[API Service 1]
        API2[API Service 2]
        APIN[API Service N]
        
        MGMT1[Management 1]
        MGMT2[Management 2]
    end
    
    subgraph "Data Layer"
        MONGO_CLUSTER[MongoDB Replica Set]
        CASSANDRA_CLUSTER[Cassandra Cluster]
        KAFKA_CLUSTER[Kafka Cluster]
    end
    
    LB --> GW1
    LB --> GW2
    LB --> GWN
    
    GW1 --> API1
    GW1 --> API2
    GW2 --> APIN
    
    API1 --> MONGO_CLUSTER
    API2 --> MONGO_CLUSTER
    APIN --> CASSANDRA_CLUSTER
    
    MGMT1 --> KAFKA_CLUSTER
    MGMT2 --> KAFKA_CLUSTER
```

### Performance Characteristics

| Component | Expected Throughput | Scaling Strategy |
|-----------|-------------------|------------------|
| **API Gateway** | 10,000+ req/sec | Horizontal scaling behind load balancer |
| **GraphQL API** | 5,000+ queries/sec | Connection pooling, database sharding |
| **Kafka** | 1M+ events/sec | Partition scaling, consumer groups |
| **MongoDB** | 100,000+ ops/sec | Sharding, read replicas |
| **Cassandra** | 1M+ writes/sec | Node addition, replication factor tuning |

## Security Model

### Authentication Architecture

```mermaid
graph TD
    A[User Login] --> B{Authentication Type}
    
    B -->|Email/Password| C[Local Auth]
    B -->|SSO| D[External IdP]
    B -->|API Key| E[API Key Auth]
    
    C --> F[Generate JWT]
    D --> G[OIDC Flow]
    E --> H[Validate Key]
    
    F --> I[Set HTTP-Only Cookie]
    G --> I
    H --> J[Set Authorization Header]
    
    I --> K[Gateway Cookie to Header]
    J --> K
    K --> L[Service Authorization]
```

### Multi-Tenant Security

| Security Layer | Implementation | Purpose |
|----------------|----------------|---------|
| **Network** | VPC, Security Groups, WAF | Infrastructure protection |
| **Transport** | TLS 1.3, mTLS for service mesh | Encryption in transit |
| **Application** | JWT tokens, RBAC, tenant isolation | Access control |
| **Data** | Encryption at rest, field-level encryption | Data protection |
| **Audit** | Comprehensive logging, immutable audit trail | Compliance and forensics |

### Authorization Model

```mermaid
graph TD
    A[JWT Token] --> B[Extract Claims]
    B --> C[Tenant ID]
    B --> D[User Role]  
    B --> E[Permissions]
    
    C --> F[Tenant Context]
    D --> G[Role-Based Access]
    E --> H[Resource Permissions]
    
    F --> I[Data Filtering]
    G --> I
    H --> I
    
    I --> J[Authorized Response]
```

## Integration Architecture

### External Tool Integration Patterns

#### Polling Pattern (TacticalRMM)
```java
@Component
public class TacticalRmmIntegration {
    
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void syncAgents() {
        List<TacticalAgent> agents = tacticalRmmClient.getAgents();
        
        agents.parallelStream()
            .map(this::mapToDevice)
            .forEach(device -> {
                deviceService.upsert(device);
                kafkaProducer.send(new DeviceUpdateEvent(device));
            });
    }
}
```

#### Webhook Pattern (FleetMDM)
```java
@RestController
public class FleetMdmWebhookController {
    
    @PostMapping("/webhooks/fleetmdm/device-update")
    public ResponseEntity<Void> handleDeviceUpdate(@RequestBody FleetDeviceEvent event) {
        // Validate webhook signature
        if (!webhookValidator.isValid(event, request)) {
            return ResponseEntity.status(401).build();
        }
        
        // Process event asynchronously
        eventProcessor.processAsync(event);
        return ResponseEntity.ok().build();
    }
}
```

#### Real-time Integration (MeshCentral)
```java
@Component
public class MeshCentralEventListener {
    
    @EventListener
    public void handleMeshEvent(MeshCentralEvent event) {
        switch (event.getType()) {
            case DEVICE_CONNECTED:
                deviceStatusService.markOnline(event.getDeviceId());
                break;
            case FILE_CHANGE:
                securityService.scanFileChange(event.getFileInfo());
                break;
            case REMOTE_SESSION:
                auditService.logRemoteAccess(event.getSessionInfo());
                break;
        }
    }
}
```

## Deployment Architecture

### Container Strategy

```yaml
# Example service deployment
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
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: mongodb-uri
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi" 
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8081
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
```

### Service Mesh Integration

```yaml
# Istio VirtualService example
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: openframe-api
spec:
  hosts:
  - api.openframe.local
  gateways:
  - openframe-gateway
  http:
  - match:
    - uri:
        prefix: /api/
    route:
    - destination:
        host: openframe-api-service
        port:
          number: 8081
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
```

## Monitoring and Observability

### Metrics Collection

```mermaid
graph LR
    A[Application Services] --> B[Micrometer Metrics]
    B --> C[Prometheus]
    C --> D[Grafana Dashboards]
    
    A --> E[Distributed Tracing]
    E --> F[Jaeger/Zipkin]
    
    A --> G[Application Logs]
    G --> H[Loki/ELK Stack]
    H --> I[Grafana/Kibana]
```

### Key Metrics

| Metric Category | Examples | Purpose |
|-----------------|----------|---------|
| **Business Metrics** | Active devices, organizations, user logins | Business intelligence |
| **Application Metrics** | Request rates, response times, error rates | Performance monitoring |
| **Infrastructure Metrics** | CPU, memory, disk, network usage | Resource monitoring |
| **Security Metrics** | Failed logins, API key usage, access patterns | Security monitoring |

## Development Best Practices

### Service Design Principles

1. **Single Responsibility**: Each service has one clear purpose
2. **API-First**: Define interfaces before implementation
3. **Stateless**: Services don't maintain session state
4. **Idempotent**: Operations can be safely retried
5. **Graceful Degradation**: Partial functionality during failures

### Data Management

1. **Database per Service**: Each service owns its data
2. **Event Sourcing**: Maintain event history for audit
3. **CQRS**: Separate read and write models for performance
4. **Eventual Consistency**: Accept temporary inconsistency for performance
5. **Backup Strategy**: Automated backups and disaster recovery

### Code Organization

1. **Domain-Driven Design**: Organize code around business domains
2. **Clean Architecture**: Dependency inversion, testable code
3. **Repository Pattern**: Abstract data access logic
4. **Service Layer**: Encapsulate business logic
5. **DTO Pattern**: Separate API contracts from domain models

## Next Steps

Now that you understand the architecture:

1. **[Local Development](../setup/local-development.md)** - Run the system locally
2. **[Testing Overview](../testing/overview.md)** - Learn testing strategies
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing

For architecture questions or discussions, join the #architecture channel in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).