# Architecture Overview

This document provides a comprehensive overview of OpenFrame's architecture, component relationships, design decisions, and system structure. Understanding this architecture is essential for effective development and contribution to the platform.

## High-Level Architecture

OpenFrame follows a modern, event-driven microservices architecture designed for scalability, maintainability, and multi-tenant operation.

### System Architecture Diagram

```mermaid
flowchart TB
    subgraph "Client Layer"
        Browser[Tenant Frontend<br/>React/Next.js]
        Agent[OpenFrame Agent<br/>Rust Client]
        ExternalClient[External APIs<br/>Third-party Integration]
    end

    subgraph "Gateway Layer"
        Gateway[API Gateway<br/>Spring Cloud Gateway]
    end

    subgraph "Service Layer"
        AuthZ[Authorization Server<br/>OAuth2/OIDC]
        API[API Service Core<br/>REST + GraphQL]
        External[External API Service<br/>Public REST API]
        Client[Client Service Core<br/>Agent Management]
        Management[Management Service<br/>Operations]
        Stream[Stream Service<br/>Event Processing]
    end

    subgraph "Messaging Layer"
        NATS[NATS JetStream<br/>Real-time Messaging]
        Kafka[Apache Kafka<br/>Event Streaming]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB<br/>Primary Storage)]
        Cassandra[(Cassandra<br/>Audit Storage)]
        Redis[(Redis<br/>Caching)]
    end

    Browser --> Gateway
    Agent --> Client
    Agent --> NATS
    ExternalClient --> Gateway

    Gateway --> AuthZ
    Gateway --> API
    Gateway --> External
    Gateway --> Client

    NATS --> Client
    Client --> Kafka
    Kafka --> Stream
    Stream --> Cassandra
    Stream --> MongoDB

    API --> MongoDB
    AuthZ --> MongoDB
    Management --> MongoDB
    Client --> MongoDB

    Stream --> Redis
    API --> Redis
```

## Core Components

### 1. Frontend Application (Tenant UI)

**Technology Stack:**
- Next.js with TypeScript
- VoltAgent Core for AI functionality
- Anthropic SDK for Claude integration
- Zod for validation
- Glob for file operations

**Responsibilities:**
- Multi-tenant SaaS user interface
- Real-time updates via WebSocket connections
- AI assistant (Mingo) integration
- Device management and remote access
- User and organization management

### 2. API Gateway (Spring Cloud Gateway)

**Key Features:**
- JWT token validation
- API key authentication
- Request routing and load balancing
- CORS handling
- Rate limiting and throttling

**Architecture Pattern:**
```mermaid
flowchart LR
    Client[Client Request] --> Auth[Authentication Filter]
    Auth --> Route[Route Resolution]
    Route --> Service[Target Service]
    Service --> Response[Response Transform]
    Response --> Client
```

### 3. Authorization Server (OAuth2/OIDC)

**Capabilities:**
- Multi-tenant identity management
- OAuth2 authorization code flow
- JWT token issuance and validation
- SSO integration (Google, Microsoft)
- Per-tenant RSA key management

**Token Flow:**
```mermaid
sequenceDiagram
    participant Client
    participant AuthServer as Authorization Server
    participant ResourceServer as API Service
    participant Database as MongoDB

    Client->>AuthServer: Authentication Request
    AuthServer->>Database: Validate Credentials
    AuthServer->>Client: Authorization Code
    Client->>AuthServer: Exchange for Token
    AuthServer->>Client: JWT Access Token
    Client->>ResourceServer: API Request + Token
    ResourceServer->>AuthServer: Validate Token
    ResourceServer->>Client: Protected Resource
```

### 4. API Service Core

**Features:**
- REST endpoints for mutations/commands
- GraphQL queries via Netflix DGS
- Device and organization management
- User and permission management
- Log and event querying

**Data Access Pattern:**
```mermaid
flowchart TD
    Controller[REST Controller] --> Service[Business Service]
    DataFetcher[GraphQL DataFetcher] --> Service
    Service --> Repository[MongoDB Repository]
    Service --> Cache[Redis Cache]
    Service --> EventPublisher[Kafka Producer]
```

### 5. Client Service Core

**Purpose:**
- Agent registration and authentication
- Device heartbeat processing
- Tool connection management
- Agent command distribution

**Agent Communication:**
```mermaid
sequenceDiagram
    participant Agent as OpenFrame Agent
    participant Client as Client Service
    participant NATS as NATS JetStream
    participant Database as MongoDB

    Agent->>Client: Registration Request
    Client->>Database: Store Agent Info
    Client->>Agent: OAuth Token
    Agent->>NATS: Heartbeat Messages
    NATS->>Client: Process Heartbeats
    Client->>Database: Update Device Status
```

## Data Flow and Event Streaming

### Event-Driven Architecture

OpenFrame uses an event-driven approach for loose coupling and scalability:

```mermaid
flowchart LR
    subgraph "Event Sources"
        Agent[Agent Events]
        API[API Commands]
        External[External Systems]
    end

    subgraph "Event Streams"
        NATS[NATS JetStream<br/>Real-time]
        Kafka[Kafka<br/>Durable]
    end

    subgraph "Event Processors"
        Stream[Stream Service]
        Listeners[Event Listeners]
    end

    subgraph "Data Stores"
        MongoDB[(MongoDB)]
        Cassandra[(Cassandra)]
    end

    Agent --> NATS
    API --> Kafka
    External --> Kafka
    
    NATS --> Stream
    Kafka --> Stream
    Kafka --> Listeners
    
    Stream --> MongoDB
    Stream --> Cassandra
    Listeners --> MongoDB
```

### Message Patterns

#### 1. Command Pattern (NATS)
- Agent commands and responses
- Real-time device communication
- Tool installation messages

#### 2. Event Sourcing (Kafka)
- Audit trail for compliance
- State change notifications
- Integration events

#### 3. CQRS (Command Query Responsibility Segregation)
- Commands: REST API mutations
- Queries: GraphQL and filtered endpoints
- Separate read/write optimizations

## Data Architecture

### Primary Storage (MongoDB)

**Collections Structure:**
```text
MongoDB Collections:
├── organizations           # Tenant organizations
├── users                  # User accounts and profiles
├── devices               # Managed devices/machines
├── installedAgents       # Agent registrations
├── toolConnections       # Tool integrations
├── apiKeys              # API access credentials
├── events               # System events
├── invitations          # User invitations
└── ssoConfigs           # SSO configurations
```

**Document Relationships:**
```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Device : manages
    User ||--o{ ApiKey : owns
    Device ||--o{ InstalledAgent : runs
    Device ||--o{ ToolConnection : connects
    Organization ||--o{ Invitation : sends
    Organization ||--|| SsoConfig : configures
```

### Audit Storage (Cassandra)

**Purpose:**
- Immutable audit logs
- High-volume event storage
- Compliance and reporting data
- Time-series data for analytics

**Schema Design:**
```cql
CREATE TABLE unified_log_events (
    tenant_id UUID,
    event_date DATE,
    event_time TIMESTAMP,
    event_id UUID,
    event_type TEXT,
    source_system TEXT,
    data MAP<TEXT, TEXT>,
    PRIMARY KEY ((tenant_id, event_date), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC);
```

### Caching Strategy (Redis)

**Cache Patterns:**
- **Session Storage**: User session data
- **Device Status Cache**: Real-time device states
- **API Response Cache**: Frequently accessed data
- **Rate Limiting**: API throttling counters

## Multi-Tenancy Design

### Tenant Isolation Strategies

#### 1. Database-Level Isolation
```java
// Tenant context in Spring Data MongoDB
@Document(collection = "#{tenantContext.getCollection('users')}")
public class User {
    private String tenantId;
    // ... other fields
}
```

#### 2. Service-Level Isolation
```java
@Component
@TenantScope
public class TenantAwareService {
    public List<Device> getDevices() {
        String tenantId = TenantContext.getCurrentTenant();
        return deviceRepository.findByTenantId(tenantId);
    }
}
```

#### 3. Security Context Isolation
```java
// JWT token contains tenant information
{
  "sub": "user@tenant.com",
  "tenant_id": "tenant-uuid",
  "tenant_slug": "tenant-name",
  "roles": ["ADMIN", "USER"]
}
```

### Tenant-Aware Components

```mermaid
flowchart TD
    Request[HTTP Request] --> TenantFilter[Tenant Resolution Filter]
    TenantFilter --> TenantContext[Tenant Context]
    TenantContext --> Service[Business Service]
    Service --> Repository[Tenant-Aware Repository]
    Repository --> Database[(Tenant-Partitioned Data)]
```

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Gateway
    participant AuthServer
    participant APIService
    participant Database

    Browser->>Gateway: Request with no token
    Gateway->>AuthServer: Redirect to login
    Browser->>AuthServer: Login credentials
    AuthServer->>Database: Validate user
    AuthServer->>Browser: OAuth authorization code
    Browser->>AuthServer: Exchange code for token
    AuthServer->>Browser: JWT access token
    Browser->>Gateway: API request + JWT
    Gateway->>APIService: Validated request + user context
```

### Authorization Patterns

#### Role-Based Access Control (RBAC)
```java
@PreAuthorize("hasRole('ADMIN') or hasRole('TECHNICIAN')")
public DeviceResponse updateDevice(String deviceId, UpdateDeviceRequest request) {
    // Implementation
}
```

#### Resource-Based Authorization
```java
@PreAuthorize("@deviceSecurityService.hasAccess(authentication, #deviceId)")
public DeviceResponse getDevice(String deviceId) {
    // Implementation
}
```

## AI Integration Architecture

### Mingo AI Assistant

**Components:**
- VoltAgent Core for agent orchestration
- Anthropic SDK for Claude model access
- Context management for conversations
- Enterprise guardrails and policies

**AI Data Flow:**
```mermaid
flowchart LR
    User[User Query] --> Frontend[Frontend UI]
    Frontend --> AIService[AI Service]
    AIService --> Context[Context Manager]
    Context --> Anthropic[Anthropic API]
    Anthropic --> Response[AI Response]
    Response --> Guardrails[Policy Enforcement]
    Guardrails --> User
```

### AI Security and Governance

- **Data Privacy**: Sensitive data filtering
- **Approval Workflows**: Administrative oversight for critical operations
- **Audit Logging**: All AI interactions tracked
- **Rate Limiting**: Usage controls and billing management

## Performance and Scalability

### Horizontal Scaling Strategy

```mermaid
flowchart TB
    LB[Load Balancer] --> GW1[Gateway 1]
    LB --> GW2[Gateway 2]
    LB --> GWn[Gateway N]
    
    GW1 --> API1[API Service 1]
    GW1 --> API2[API Service 2]
    GW2 --> API2
    GW2 --> API3[API Service 3]
    
    API1 --> DB[(MongoDB Cluster)]
    API2 --> DB
    API3 --> DB
```

### Caching Strategies

#### 1. Application-Level Caching
```java
@Cacheable(value = "devices", key = "#tenantId + ':' + #deviceId")
public Device getDevice(String tenantId, String deviceId) {
    return deviceRepository.findById(deviceId);
}
```

#### 2. Database Query Optimization
```javascript
// MongoDB indexes for multi-tenant queries
db.devices.createIndex({ "tenantId": 1, "status": 1, "lastSeen": -1 })
db.users.createIndex({ "tenantId": 1, "email": 1 }, { unique: true })
```

### Monitoring and Observability

**Metrics Collection:**
- Spring Boot Actuator endpoints
- Micrometer with Prometheus integration
- Custom business metrics
- Real-time performance dashboards

**Logging Strategy:**
- Structured JSON logging
- Tenant-aware log correlation
- Centralized log aggregation
- Compliance audit trails

## Key Design Decisions

### 1. Microservices vs. Modular Monolith
**Decision**: Microservices architecture
**Rationale**: 
- Independent scaling of components
- Technology diversity (Java backend, Rust agents)
- Team autonomy and deployment independence
- Fault isolation

### 2. Event-Driven Communication
**Decision**: NATS for real-time, Kafka for durability
**Rationale**:
- Loose coupling between services
- Horizontal scalability
- Audit trail for compliance
- Integration with external systems

### 3. Multi-Database Strategy
**Decision**: MongoDB (operational), Cassandra (audit), Redis (cache)
**Rationale**:
- Optimal data models for each use case
- Performance optimization
- Compliance requirements
- Caching and session management

### 4. OAuth2/OIDC for Authentication
**Decision**: Custom authorization server with Spring Security
**Rationale**:
- Multi-tenant identity management
- Standard protocol compatibility
- Fine-grained access control
- Integration with external identity providers

## Development Patterns and Best Practices

### 1. Domain-Driven Design (DDD)
- Bounded contexts for each service
- Rich domain models
- Repository pattern for data access
- Domain events for inter-service communication

### 2. CQRS Implementation
```java
// Command side
@PostMapping("/devices")
public ResponseEntity<DeviceResponse> createDevice(@RequestBody CreateDeviceCommand command) {
    Device device = deviceCommandService.createDevice(command);
    return ResponseEntity.ok(deviceMapper.toResponse(device));
}

// Query side
@QueryMapping
public DeviceConnection devices(@Argument DeviceFilterInput filter) {
    return deviceQueryService.getDevices(filter);
}
```

### 3. Event Sourcing Patterns
```java
@EventHandler
public void on(DeviceCreatedEvent event) {
    // Update read model
    DeviceReadModel readModel = new DeviceReadModel(event);
    readModelRepository.save(readModel);
    
    // Publish integration event
    integrationEventPublisher.publish(new DeviceIntegrationEvent(event));
}
```

This architecture overview provides the foundation for understanding OpenFrame's design and implementation. The next sections dive deeper into specific aspects like security, testing, and contributing guidelines.