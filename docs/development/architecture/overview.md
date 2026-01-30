# Architecture Overview

OpenFrame is built on a modern microservices architecture designed for scalability, maintainability, and multi-tenant operation. This guide provides a comprehensive understanding of the system architecture, design patterns, and key components.

## High-Level Architecture

### System Overview

OpenFrame follows a **layered microservices architecture** with clear separation of concerns across multiple abstraction layers:

```mermaid
graph TB
    subgraph external[External Layer]
        Users[Users & Clients]
        Devices[Managed Devices]
        Tools[MSP Tools<br/>Fleet MDM, Tactical RMM, MeshCentral]
        APIs[External APIs]
    end
    
    subgraph client[Client Layer]
        WebApp[Web Application<br/>Vue 3 + TypeScript]
        ChatClient[Chat Client<br/>Tauri + Rust]
        DeviceAgent[Device Agent<br/>Rust + NATS]
        MobileApp[Mobile App<br/>Future: React Native]
    end
    
    subgraph gateway[Gateway Layer]
        APIGateway[API Gateway<br/>Spring Cloud Gateway<br/>- Authentication<br/>- Rate Limiting<br/>- Load Balancing<br/>- WebSocket Proxy]
    end
    
    subgraph services[Service Layer]
        subgraph core[Core Services]
            APIService[API Service<br/>GraphQL + REST<br/>- Device Management<br/>- User Management<br/>- Real-time Queries]
            AuthService[Authorization Service<br/>OAuth 2.0 + OIDC<br/>- Multi-tenant Auth<br/>- SSO Integration<br/>- JWT Management]
        end
        
        subgraph business[Business Services]
            ClientService[Client Service<br/>Agent Management<br/>- Device Registration<br/>- Heartbeat Processing<br/>- Status Tracking]
            ManagementService[Management Service<br/>System Management<br/>- Tool Integration<br/>- Configuration<br/>- Health Monitoring]
            StreamService[Stream Service<br/>Event Processing<br/>- Real-time Analytics<br/>- CDC Processing<br/>- Data Enrichment]
            ExternalService[External API Service<br/>Public APIs<br/>- REST Endpoints<br/>- API Key Auth<br/>- Rate Limiting]
        end
        
        subgraph support[Support Services]
            ConfigService[Config Service<br/>Spring Cloud Config<br/>- Centralized Config<br/>- Environment Management<br/>- Dynamic Updates]
        end
    end
    
    subgraph data[Data Layer]
        subgraph primary[Primary Storage]
            MongoDB[(MongoDB<br/>- Users & Organizations<br/>- Device Metadata<br/>- Configuration)]
        end
        
        subgraph streaming[Event Streaming]
            Kafka[(Apache Kafka<br/>- Real-time Events<br/>- CDC Streams<br/>- Message Queuing)]
        end
        
        subgraph analytics[Analytics Storage]
            Pinot[(Apache Pinot<br/>- Real-time Analytics<br/>- Aggregated Metrics<br/>- OLAP Queries)]
            Cassandra[(Cassandra<br/>- Time-series Data<br/>- Device Metrics<br/>- Log Storage)]
        end
        
        subgraph cache[Caching Layer]
            Redis[(Redis<br/>- Session Storage<br/>- API Rate Limiting<br/>- Real-time Cache)]
        end
    end
    
    subgraph integration[Integration Layer]
        FleetSDK[Fleet MDM SDK<br/>Java Client Library]
        TacticalSDK[Tactical RMM SDK<br/>Java Client Library]
        MeshAPI[MeshCentral API<br/>WebSocket Integration]
    end

    external --> client
    client --> gateway
    gateway --> services
    services --> data
    services <--> integration
    integration <--> Tools
    
    classDef externalStyle fill:#f8f9fa,stroke:#6c757d
    classDef clientStyle fill:#e3f2fd,stroke:#1976d2
    classDef gatewayStyle fill:#f3e5f5,stroke:#7b1fa2
    classDef coreStyle fill:#e8f5e8,stroke:#388e3c
    classDef businessStyle fill:#fff3e0,stroke:#f57c00
    classDef supportStyle fill:#fce4ec,stroke:#c2185b
    classDef dataStyle fill:#f1f8e9,stroke:#558b2f
    classDef integrationStyle fill:#fff8e1,stroke:#ffa000
    
    class Users,Devices,Tools,APIs externalStyle
    class WebApp,ChatClient,DeviceAgent,MobileApp clientStyle
    class APIGateway gatewayStyle
    class APIService,AuthService coreStyle
    class ClientService,ManagementService,StreamService,ExternalService businessStyle
    class ConfigService supportStyle
    class MongoDB,Kafka,Pinot,Cassandra,Redis dataStyle
    class FleetSDK,TacticalSDK,MeshAPI integrationStyle
```

### Key Architectural Principles

| Principle | Implementation | Benefits |
|-----------|----------------|----------|
| **Microservices** | Independent services with clear boundaries | Scalability, maintainability, team autonomy |
| **Multi-Tenancy** | Tenant isolation at all layers | Data security, resource isolation, cost efficiency |
| **Event-Driven** | Kafka-based event streaming | Real-time processing, loose coupling, scalability |
| **API-First** | GraphQL and REST APIs | Flexibility, client diversity, integration ease |
| **Security-First** | OAuth 2.0, JWT, role-based access | Enterprise security, compliance, audit trails |
| **Observability** | Comprehensive monitoring and logging | Operations visibility, debugging, performance tuning |

## Core Services Architecture

### API Gateway Service

**Purpose**: Single entry point for all client requests with intelligent routing and security.

```mermaid
graph LR
    subgraph clients[Clients]
        Web[Web App]
        Mobile[Mobile App]
        API[API Clients]
        Agents[Device Agents]
    end
    
    subgraph gateway[API Gateway]
        Auth[JWT Authentication]
        RateLimit[Rate Limiting]
        Router[Request Router]
        Proxy[WebSocket Proxy]
        CORS[CORS Handler]
    end
    
    subgraph backends[Backend Services]
        APIService[API Service]
        AuthService[Auth Service]
        ClientService[Client Service]
        ExternalService[External API]
    end
    
    clients --> Auth
    Auth --> RateLimit
    RateLimit --> CORS
    CORS --> Router
    Router --> APIService
    Router --> AuthService
    Router --> ClientService
    Router --> ExternalService
    
    Web --> Proxy
    Proxy --> APIService
    
    classDef clientStyle fill:#e3f2fd
    classDef gatewayStyle fill:#f3e5f5
    classDef backendStyle fill:#e8f5e8
    
    class Web,Mobile,API,Agents clientStyle
    class Auth,RateLimit,Router,Proxy,CORS gatewayStyle
    class APIService,AuthService,ClientService,ExternalService backendStyle
```

**Key Features**:
- **Multi-tenant JWT Authentication**: Validates tenant-specific JWTs with issuer caching
- **Rate Limiting**: Per-tenant and per-API-key rate limiting with Redis backend
- **WebSocket Proxying**: Real-time communication for chat and monitoring
- **Request Routing**: Intelligent routing based on path, headers, and tenant context
- **CORS Management**: Configurable cross-origin resource sharing policies

**Technology Stack**: Spring Cloud Gateway, Spring WebFlux, Redis

### API Service (GraphQL + REST)

**Purpose**: Primary business logic service providing GraphQL and REST APIs for device and user management.

```mermaid
graph TB
    subgraph api_service[API Service]
        subgraph controllers[Controllers]
            GraphQL[GraphQL DataFetchers<br/>Netflix DGS]
            REST[REST Controllers<br/>Spring MVC]
            Health[Health Endpoints<br/>Actuator]
        end
        
        subgraph business[Business Logic]
            DeviceService[Device Service]
            UserService[User Service]
            OrgService[Organization Service]
            EventService[Event Service]
        end
        
        subgraph data[Data Access]
            MongoRepo[MongoDB Repositories]
            PinotClient[Pinot Query Client]
            CassandraRepo[Cassandra Repositories]
        end
    end
    
    subgraph external[External Dependencies]
        MongoDB[(MongoDB)]
        Pinot[(Apache Pinot)]
        Cassandra[(Cassandra)]
        FleetSDK[Fleet MDM SDK]
        TacticalSDK[Tactical RMM SDK]
    end
    
    GraphQL --> DeviceService
    REST --> UserService
    DeviceService --> MongoRepo
    DeviceService --> PinotClient
    UserService --> MongoRepo
    EventService --> CassandraRepo
    
    MongoRepo --> MongoDB
    PinotClient --> Pinot
    CassandraRepo --> Cassandra
    DeviceService --> FleetSDK
    DeviceService --> TacticalSDK
    
    classDef controllerStyle fill:#e3f2fd
    classDef businessStyle fill:#e8f5e8
    classDef dataStyle fill:#fff3e0
    classDef externalStyle fill:#f8f9fa
    
    class GraphQL,REST,Health controllerStyle
    class DeviceService,UserService,OrgService,EventService businessStyle
    class MongoRepo,PinotClient,CassandraRepo dataStyle
    class MongoDB,Pinot,Cassandra,FleetSDK,TacticalSDK externalStyle
```

**Key Features**:
- **GraphQL API**: Type-safe queries with efficient data fetching and N+1 prevention
- **Multi-tenant Data Access**: Automatic tenant filtering at repository level
- **Real-time Subscriptions**: WebSocket-based GraphQL subscriptions
- **Advanced Filtering**: Dynamic query building with cursor-based pagination
- **Tool Integration**: Direct integration with Fleet MDM and Tactical RMM SDKs

**Technology Stack**: Spring Boot 3.x, Netflix DGS, Spring Data MongoDB, Apache Pinot

### Authorization Service (OAuth 2.0)

**Purpose**: Multi-tenant OAuth 2.0/OIDC authorization server with enterprise SSO integration.

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AuthService
    participant Database
    participant SSO as SSO Provider<br/>(Entra ID/Google)
    
    Client->>Gateway: Login Request
    Gateway->>AuthService: Forward Request
    AuthService->>SSO: Redirect to SSO
    SSO->>Client: SSO Login Page
    Client->>SSO: User Credentials
    SSO->>AuthService: Authorization Code
    AuthService->>SSO: Exchange for Access Token
    SSO->>AuthService: User Info + Token
    AuthService->>Database: Store/Update User
    AuthService->>Client: JWT + Refresh Token (HTTP-only cookies)
    
    note over Client,AuthService: Subsequent API Requests
    Client->>Gateway: API Request (with cookies)
    Gateway->>AuthService: Validate JWT
    AuthService->>Gateway: User Context
    Gateway->>Client: API Response
```

**Key Features**:
- **OAuth 2.0 Authorization Code Flow**: Standards-compliant with PKCE support
- **Multi-tenant JWT Signing**: Tenant-specific RSA key pairs for token signing
- **Enterprise SSO**: Microsoft Entra ID and Google Workspace integration
- **User Lifecycle Management**: Registration, invitation, password reset workflows
- **Dynamic Client Registration**: Automatic OAuth client provisioning per tenant

**Technology Stack**: Spring Authorization Server, Spring Security OAuth2, MongoDB

## Data Architecture

### Data Layer Strategy

OpenFrame implements a **polyglot persistence** strategy, choosing the right database for each use case:

```mermaid
graph TB
    subgraph applications[Application Layer]
        WebApp[Web Application]
        ChatApp[Chat Application]
        DeviceAgent[Device Agents]
    end
    
    subgraph services[Service Layer]
        APIService[API Service]
        StreamService[Stream Service]
        ClientService[Client Service]
    end
    
    subgraph data_layer[Data Layer]
        subgraph transactional[Transactional Data]
            MongoDB[(MongoDB<br/>- Users & Organizations<br/>- Device Metadata<br/>- Configuration<br/>- Application State)]
        end
        
        subgraph streaming[Event Streaming]
            Kafka[(Apache Kafka<br/>- Real-time Events<br/>- CDC Streams<br/>- Inter-service Messaging<br/>- Event Sourcing)]
        end
        
        subgraph analytics[Analytics & Time-series]
            Pinot[(Apache Pinot<br/>- Real-time Analytics<br/>- OLAP Queries<br/>- Aggregated Metrics<br/>- Dashboard Data)]
            
            Cassandra[(Cassandra<br/>- Time-series Metrics<br/>- Device Performance<br/>- Log Storage<br/>- Historical Data)]
        end
        
        subgraph cache[Caching & Session]
            Redis[(Redis<br/>- Session Storage<br/>- Rate Limiting<br/>- Real-time Cache<br/>- Pub/Sub)]
        end
    end
    
    applications --> services
    
    APIService --> MongoDB
    APIService --> Pinot
    APIService --> Redis
    
    StreamService --> Kafka
    StreamService --> Pinot
    StreamService --> Cassandra
    
    ClientService --> MongoDB
    ClientService --> Redis
    
    MongoDB -.->|CDC Events| Kafka
    Kafka -.->|Processed Data| Pinot
    Kafka -.->|Metrics| Cassandra
    
    classDef appStyle fill:#e3f2fd
    classDef serviceStyle fill:#e8f5e8
    classDef transactionalStyle fill:#fff3e0
    classDef streamingStyle fill:#f3e5f5
    classDef analyticsStyle fill:#f1f8e9
    classDef cacheStyle fill:#fce4ec
    
    class WebApp,ChatApp,DeviceAgent appStyle
    class APIService,StreamService,ClientService serviceStyle
    class MongoDB transactionalStyle
    class Kafka streamingStyle
    class Pinot,Cassandra analyticsStyle
    class Redis cacheStyle
```

### Data Flow Architecture

```mermaid
graph LR
    subgraph ingestion[Data Ingestion]
        Devices[Device Agents<br/>Performance Metrics]
        Tools[MSP Tools<br/>Fleet MDM, Tactical RMM]
        Users[User Actions<br/>Web/Mobile Apps]
        External[External APIs<br/>Third-party Systems]
    end
    
    subgraph processing[Stream Processing]
        Kafka[Apache Kafka<br/>Event Streaming]
        StreamService[Stream Service<br/>Data Processing]
        CDC[Change Data Capture<br/>Debezium]
    end
    
    subgraph storage[Data Storage]
        MongoDB[(MongoDB<br/>Transactional)]
        Pinot[(Apache Pinot<br/>Analytics)]
        Cassandra[(Cassandra<br/>Time-series)]
    end
    
    subgraph consumption[Data Consumption]
        Dashboard[Real-time Dashboard]
        API[GraphQL/REST APIs]
        Reports[Analytics & Reports]
        Alerts[Monitoring & Alerts]
    end
    
    Devices --> Kafka
    Tools --> Kafka
    Users --> MongoDB
    External --> Kafka
    
    MongoDB --> CDC
    CDC --> Kafka
    
    Kafka --> StreamService
    StreamService --> Pinot
    StreamService --> Cassandra
    
    MongoDB --> API
    Pinot --> Dashboard
    Pinot --> Reports
    Cassandra --> Dashboard
    
    API --> Dashboard
    Dashboard --> Alerts
    
    classDef ingestionStyle fill:#e3f2fd
    classDef processingStyle fill:#e8f5e8
    classDef storageStyle fill:#fff3e0
    classDef consumptionStyle fill:#f3e5f5
    
    class Devices,Tools,Users,External ingestionStyle
    class Kafka,StreamService,CDC processingStyle
    class MongoDB,Pinot,Cassandra storageStyle
    class Dashboard,API,Reports,Alerts consumptionStyle
```

## Multi-Tenant Architecture

### Tenant Isolation Strategy

OpenFrame implements **complete tenant isolation** across all layers:

```mermaid
graph TB
    subgraph tenant_1[Tenant 1: MSP Company A]
        subgraph t1_apps[Applications]
            T1_Web[Web Dashboard]
            T1_Chat[Chat Client]
        end
        
        subgraph t1_auth[Authentication]
            T1_JWT[JWT Tokens<br/>tenant1.openframe.ai]
            T1_SSO[SSO Config<br/>Azure AD Tenant A]
        end
        
        subgraph t1_data[Data Isolation]
            T1_Mongo[MongoDB<br/>tenant: tenant1]
            T1_Kafka[Kafka Topics<br/>tenant1-*]
        end
    end
    
    subgraph tenant_2[Tenant 2: MSP Company B]
        subgraph t2_apps[Applications]
            T2_Web[Web Dashboard]
            T2_Chat[Chat Client]
        end
        
        subgraph t2_auth[Authentication]
            T2_JWT[JWT Tokens<br/>tenant2.openframe.ai]
            T2_SSO[SSO Config<br/>Google Workspace B]
        end
        
        subgraph t2_data[Data Isolation]
            T2_Mongo[MongoDB<br/>tenant: tenant2]
            T2_Kafka[Kafka Topics<br/>tenant2-*]
        end
    end
    
    subgraph shared_services[Shared Services Layer]
        Gateway[API Gateway<br/>Tenant Resolution]
        ConfigService[Config Service<br/>Per-tenant Config]
        StreamService[Stream Service<br/>Tenant-aware Processing]
    end
    
    T1_Web --> Gateway
    T2_Web --> Gateway
    
    Gateway --> T1_JWT
    Gateway --> T2_JWT
    
    Gateway --> ConfigService
    ConfigService --> StreamService
    
    StreamService --> T1_Kafka
    StreamService --> T2_Kafka
    
    classDef tenant1Style fill:#e3f2fd,stroke:#1976d2
    classDef tenant2Style fill:#e8f5e8,stroke:#388e3c
    classDef sharedStyle fill:#fff3e0,stroke:#f57c00
    
    class T1_Web,T1_Chat,T1_JWT,T1_SSO,T1_Mongo,T1_Kafka tenant1Style
    class T2_Web,T2_Chat,T2_JWT,T2_SSO,T2_Mongo,T2_Kafka tenant2Style
    class Gateway,ConfigService,StreamService sharedStyle
```

### Tenant Context Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AuthService
    participant APIService
    participant Database
    
    Note over Client,Database: Tenant Resolution & Context Injection
    
    Client->>Gateway: Request with tenant domain<br/>tenant1.openframe.ai
    Gateway->>Gateway: Resolve tenant from domain
    Gateway->>AuthService: Validate JWT with tenant context
    AuthService->>Gateway: Return user + tenant info
    Gateway->>APIService: Forward with X-Tenant-ID header
    APIService->>APIService: Inject tenant filter
    APIService->>Database: Query with tenant isolation
    Database->>APIService: Tenant-specific results
    APIService->>Gateway: Response
    Gateway->>Client: Final response
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
graph TB
    subgraph client_apps[Client Applications]
        WebApp[Web Application<br/>Cookie-based Auth]
        ChatApp[Chat Application<br/>Token-based Auth]
        DeviceAgent[Device Agent<br/>Service Account]
        APIClient[API Clients<br/>API Key Auth]
    end
    
    subgraph auth_layer[Authentication Layer]
        Gateway[API Gateway<br/>- JWT Validation<br/>- Cookie Processing<br/>- API Key Validation]
        AuthService[Auth Service<br/>- OAuth 2.0 Server<br/>- User Management<br/>- Token Issuance]
    end
    
    subgraph security_services[Security Services]
        JWTService[JWT Service<br/>- Token Generation<br/>- Signature Validation<br/>- Tenant Key Management]
        OAuthService[OAuth Service<br/>- PKCE Flow<br/>- SSO Integration<br/>- Token Exchange]
    end
    
    subgraph external_auth[External Auth Providers]
        EntraID[Microsoft Entra ID]
        Google[Google Workspace]
        CustomOIDC[Custom OIDC Provider]
    end
    
    WebApp -->|HTTP-only Cookies| Gateway
    ChatApp -->|JWT Bearer Token| Gateway
    DeviceAgent -->|Service Account| Gateway
    APIClient -->|API Key| Gateway
    
    Gateway --> AuthService
    AuthService --> JWTService
    AuthService --> OAuthService
    
    OAuthService --> EntraID
    OAuthService --> Google
    OAuthService --> CustomOIDC
    
    classDef clientStyle fill:#e3f2fd
    classDef authStyle fill:#e8f5e8
    classDef securityStyle fill:#fff3e0
    classDef externalStyle fill:#f3e5f5
    
    class WebApp,ChatApp,DeviceAgent,APIClient clientStyle
    class Gateway,AuthService authStyle
    class JWTService,OAuthService securityStyle
    class EntraID,Google,CustomOIDC externalStyle
```

### Security Features

| Component | Security Features | Implementation |
|-----------|-------------------|----------------|
| **Authentication** | OAuth 2.0, OIDC, JWT, SSO | Spring Security OAuth2, custom JWT service |
| **Authorization** | RBAC, tenant isolation, API keys | Custom authorization framework |
| **Data Protection** | Encryption at rest, in transit | AES-256, TLS 1.3, encrypted cookies |
| **Session Management** | HTTP-only cookies, token refresh | Spring Session with Redis |
| **Rate Limiting** | Per-tenant, per-API key limits | Redis-based sliding window |
| **Audit Logging** | Comprehensive audit trails | Structured logging with correlation IDs |

## Event-Driven Architecture

### Event Processing Pipeline

```mermaid
graph LR
    subgraph sources[Event Sources]
        DeviceEvents[Device Events<br/>- Status Changes<br/>- Performance Metrics<br/>- Alerts]
        UserEvents[User Events<br/>- Actions<br/>- Authentication<br/>- Configuration]
        ToolEvents[Tool Events<br/>- Fleet MDM<br/>- Tactical RMM<br/>- MeshCentral]
        SystemEvents[System Events<br/>- Service Health<br/>- Database Changes<br/>- Background Jobs]
    end
    
    subgraph kafka_cluster[Apache Kafka Cluster]
        DeviceTopic[device-events-*<br/>Partitioned by Device ID]
        UserTopic[user-events-*<br/>Partitioned by User ID]
        ToolTopic[tool-events-*<br/>Partitioned by Tool Type]
        SystemTopic[system-events<br/>Single Partition]
    end
    
    subgraph stream_processing[Stream Processing]
        StreamService[Stream Processing Service<br/>- Event Enrichment<br/>- Data Transformation<br/>- Real-time Aggregation]
        CDCProcessor[CDC Processor<br/>- Database Change Events<br/>- Data Synchronization<br/>- Event Sourcing]
    end
    
    subgraph consumers[Event Consumers]
        Analytics[Real-time Analytics<br/>Apache Pinot]
        Monitoring[Monitoring System<br/>Alerts & Dashboards]
        Notifications[Notification Service<br/>Email, SMS, Slack]
        WebSockets[WebSocket Service<br/>Real-time UI Updates]
    end
    
    DeviceEvents --> DeviceTopic
    UserEvents --> UserTopic
    ToolEvents --> ToolTopic
    SystemEvents --> SystemTopic
    
    DeviceTopic --> StreamService
    UserTopic --> StreamService
    ToolTopic --> StreamService
    SystemTopic --> StreamService
    
    DeviceTopic --> CDCProcessor
    CDCProcessor --> SystemTopic
    
    StreamService --> Analytics
    StreamService --> Monitoring
    StreamService --> Notifications
    StreamService --> WebSockets
    
    classDef sourceStyle fill:#e3f2fd
    classDef kafkaStyle fill:#e8f5e8
    classDef processingStyle fill:#fff3e0
    classDef consumerStyle fill:#f3e5f5
    
    class DeviceEvents,UserEvents,ToolEvents,SystemEvents sourceStyle
    class DeviceTopic,UserTopic,ToolTopic,SystemTopic kafkaStyle
    class StreamService,CDCProcessor processingStyle
    class Analytics,Monitoring,Notifications,WebSockets consumerStyle
```

## Performance & Scalability

### Scalability Patterns

| Pattern | Implementation | Benefits |
|---------|----------------|----------|
| **Horizontal Scaling** | Kubernetes-based service scaling | Handle increased load |
| **Database Sharding** | Tenant-based data partitioning | Distribute data load |
| **Caching Strategy** | Redis multi-level caching | Reduce database load |
| **Event Streaming** | Kafka partitioning by tenant/entity | Parallel processing |
| **CDN Integration** | Static asset caching | Reduce frontend load times |
| **Connection Pooling** | Database connection management | Optimize resource usage |

### Performance Characteristics

```mermaid
graph TB
    subgraph performance[Performance Targets]
        subgraph api_performance[API Performance]
            GraphQL[GraphQL Queries<br/>< 200ms p95]
            REST[REST Endpoints<br/>< 100ms p95]
            WebSocket[WebSocket Messages<br/>< 50ms]
        end
        
        subgraph throughput[Throughput]
            Events[Event Processing<br/>100K events/sec]
            Users[Concurrent Users<br/>10K+ users]
            Devices[Device Monitoring<br/>1M+ devices]
        end
        
        subgraph availability[Availability]
            Uptime[Service Uptime<br/>99.9% SLA]
            Recovery[Recovery Time<br/>< 5 minutes]
            Backup[Data Backup<br/>RPO < 1 hour]
        end
    end
    
    subgraph optimizations[Performance Optimizations]
        Caching[Multi-level Caching<br/>- Application Cache<br/>- Database Query Cache<br/>- CDN Edge Cache]
        
        DatabaseOpt[Database Optimization<br/>- Proper Indexing<br/>- Query Optimization<br/>- Connection Pooling]
        
        EventOpt[Event Processing<br/>- Parallel Processing<br/>- Batch Operations<br/>- Stream Optimization]
    end
    
    api_performance --> Caching
    throughput --> EventOpt
    availability --> DatabaseOpt
    
    classDef performanceStyle fill:#e3f2fd
    classDef optimizationStyle fill:#e8f5e8
    
    class GraphQL,REST,WebSocket,Events,Users,Devices,Uptime,Recovery,Backup performanceStyle
    class Caching,DatabaseOpt,EventOpt optimizationStyle
```

## Development Patterns

### Code Organization

```
openframe/
├── services/                   # Microservices
│   ├── openframe-api/         # GraphQL/REST API service
│   ├── openframe-gateway/     # API Gateway service  
│   ├── openframe-auth/        # Authorization service
│   └── ...
├── libs/                      # Shared libraries
│   ├── openframe-core/        # Core models and utilities
│   ├── openframe-data/        # Data access layer
│   ├── openframe-security/    # Security components
│   └── ...
clients/                       # Client applications
├── openframe-client/          # Rust device agent
├── openframe-chat/            # Tauri chat application
└── ...
integrated-tools/              # External tool integration
├── fleet-mdm/                 # Fleet MDM configuration
├── tactical-rmm/              # Tactical RMM setup
└── ...
```

### Design Patterns

| Pattern | Usage | Implementation |
|---------|-------|----------------|
| **Domain-Driven Design** | Service boundaries | Bounded contexts per domain |
| **CQRS** | Read/write separation | GraphQL queries vs commands |
| **Event Sourcing** | Audit trail, replay | Kafka event streams |
| **Repository Pattern** | Data access abstraction | Spring Data repositories |
| **Factory Pattern** | Service creation | Spring configuration |
| **Observer Pattern** | Real-time updates | WebSocket subscriptions |
| **Strategy Pattern** | Multi-tenant behavior | Tenant-specific implementations |

## Monitoring & Observability

### Observability Stack

```mermaid
graph TB
    subgraph applications[Application Layer]
        Services[OpenFrame Services]
        Clients[Client Applications]
    end
    
    subgraph observability[Observability Stack]
        subgraph metrics[Metrics]
            Prometheus[Prometheus<br/>Metrics Collection]
            Grafana[Grafana<br/>Dashboards & Alerting]
        end
        
        subgraph logging[Logging]
            Loki[Loki<br/>Log Aggregation]
            LogDashboard[Log Dashboards<br/>Centralized Logging]
        end
        
        subgraph tracing[Distributed Tracing]
            Jaeger[Jaeger<br/>Trace Collection]
            TracingUI[Tracing UI<br/>Request Flow Analysis]
        end
        
        subgraph alerting[Alerting]
            AlertManager[Alert Manager<br/>Alert Routing]
            Notifications[Notifications<br/>Slack, Email, PagerDuty]
        end
    end
    
    Services --> Prometheus
    Services --> Loki
    Services --> Jaeger
    Clients --> Prometheus
    
    Prometheus --> Grafana
    Loki --> LogDashboard
    Jaeger --> TracingUI
    
    Grafana --> AlertManager
    AlertManager --> Notifications
    
    classDef appStyle fill:#e3f2fd
    classDef metricsStyle fill:#e8f5e8
    classDef loggingStyle fill:#fff3e0
    classDef tracingStyle fill:#f3e5f5
    classDef alertingStyle fill:#fce4ec
    
    class Services,Clients appStyle
    class Prometheus,Grafana metricsStyle
    class Loki,LogDashboard loggingStyle
    class Jaeger,TracingUI tracingStyle
    class AlertManager,Notifications alertingStyle
```

### Key Metrics

| Category | Metrics | Tools |
|----------|---------|-------|
| **Application** | Request latency, throughput, error rate | Micrometer, Spring Actuator |
| **Infrastructure** | CPU, memory, disk, network | Prometheus Node Exporter |
| **Database** | Query performance, connection pool | Database-specific exporters |
| **Business** | User activity, device status, revenue | Custom application metrics |
| **Security** | Authentication events, failed logins | Security audit logs |

## Next Steps

Now that you understand the OpenFrame architecture:

### 🎯 **For Developers**
1. **[Local Development Setup](../setup/local-development.md)** - Get the platform running locally
2. **[Testing Overview](../testing/overview.md)** - Learn testing strategies and frameworks
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing to the project

### 🏗️ **For Architects**
1. **Service Extension** - Learn how to add new microservices
2. **Integration Patterns** - Understand external system integration
3. **Performance Optimization** - Implement performance improvements

### 🔧 **For DevOps**
1. **Deployment Architecture** - Understand Kubernetes deployment
2. **Monitoring Setup** - Configure observability stack
3. **Security Hardening** - Implement production security measures

## Architecture Resources

### 🗨️ **Community & Support**
- **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Architecture discussions in `#architecture` channel
- **[OpenMSP.ai](https://www.openmsp.ai/)** - Community hub and resources

### 📚 **Technical References**
- **[Microservices Patterns](https://microservices.io/patterns/)** - Proven microservices patterns
- **[Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)** - Event-driven design principles
- **[Multi-Tenant SaaS](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html)** - Multi-tenancy best practices

### 🔗 **Framework Documentation**
- **[Spring Boot](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)** - Backend services framework
- **[Spring Cloud Gateway](https://docs.spring.io/spring-cloud-gateway/docs/current/reference/html/)** - API Gateway implementation
- **[Netflix DGS](https://netflix.github.io/dgs/)** - GraphQL framework
- **[Apache Kafka](https://kafka.apache.org/documentation/)** - Event streaming platform

---

**Architecture Questions?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and ask in the `#architecture` channel. Our team and community are ready to help you understand and extend the OpenFrame platform! 🚀