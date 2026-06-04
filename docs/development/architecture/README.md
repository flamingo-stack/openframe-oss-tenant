# Architecture Overview

OpenFrame OSS Tenant is a **modular, library-driven, multi-tenant microservices platform** built on Spring Boot 3.3 and Java 21. This document provides a comprehensive overview of the system architecture.

---

## High-Level Architecture

```mermaid
flowchart TD
    Client["Browser / Agent / Integration"] --> Gateway["Gateway Service\n(Spring Cloud Gateway)"]

    Gateway --> Auth["Authorization Server\n(OAuth2 / OIDC)"]
    Gateway --> API["API Service\n(GraphQL + REST)"]
    Gateway --> ExternalAPI["External API Service"]

    API --> Mongo["MongoDB\n(Primary Store)"]
    API --> NATS["NATS JetStream\n(Real-time Messaging)"]
    API --> Kafka["Apache Kafka\n(Event Streaming)"]

    Auth --> Mongo

    Stream["Stream Service\n(Kafka Streams)"] --> Kafka
    Stream --> Cassandra["Apache Cassandra\n(Unified Logs)"]

    Management["Management Service\n(Initializers & Schedulers)"] --> Mongo
    Management --> NATS
    Management --> Kafka

    Config["Config Server\n(Spring Cloud Config)"] --> Gateway
    Config --> API
    Config --> Auth
    Config --> Management
    Config --> Stream
```

---

## Core Components

| Service | Technology | Responsibility |
|---|---|---|
| **Gateway** | Spring Cloud Gateway (Reactive) | Routing, JWT validation, API key auth, WebSocket proxy, rate limiting |
| **Authorization Server** | Spring Authorization Server | OAuth2/OIDC, multi-tenant JWT, SSO (Google/Microsoft), tenant registration |
| **API Service** | Spring Boot + Netflix DGS | GraphQL + REST API layer for frontend and integrations |
| **External API** | Spring Boot | Restricted REST surface for third-party integrations |
| **Management Service** | Spring Boot | Startup initializers, schedulers, migrations, tool configuration |
| **Stream Service** | Spring Boot + Kafka Streams | Debezium CDC ingestion, event normalization, Cassandra logging |
| **Client Service** | Spring Boot | Agent-facing APIs, device registration, NATS communication |
| **Config Server** | Spring Cloud Config | Centralized configuration for all services |

---

## Design Principles

1. **Multi-tenancy by default** — Every layer enforces `tenantId` isolation: MongoDB queries, JWT claims, NATS topics, Redis keys, and Kafka topics are all tenant-scoped.
2. **Modular library architecture** — Core logic lives in `openframe-oss-lib`. Runtime services (`openframe-oss-tenant`) compose those libraries into deployable applications.
3. **Gateway-first security** — The Gateway handles authentication, authorization header normalization, and rate limiting before requests reach backend services.
4. **Event-driven communication** — Services communicate asynchronously via Kafka (durable, ordered) and NATS (real-time, low-latency).
5. **Extensible processor pattern** — Default implementations (`DefaultXxxProcessor`) can be overridden in SaaS or enterprise deployments.

---

## Authenticated Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant AuthServer as "Authorization Server"
    participant API
    participant DB as "MongoDB"

    Client->>Gateway: HTTP Request with JWT
    Gateway->>AuthServer: Validate JWT (issuer lookup)
    AuthServer-->>Gateway: Token valid + tenant claims
    Gateway->>API: Forward with Authorization header
    API->>API: Extract AuthPrincipal from JWT
    API->>DB: Tenant-scoped query
    DB-->>API: Documents
    API-->>Gateway: JSON response
    Gateway-->>Client: HTTP response
```

---

## Multi-Tenant Model

```mermaid
graph TD
    A["JWT Token"] --> B["tenant_id claim"]
    A --> C["userId claim"]
    A --> D["roles claim"]
    B --> E["MongoDB Collection Filter"]
    B --> F["NATS Topic Prefix"]
    B --> G["Redis Key Namespace"]
    B --> H["Kafka Header"]
```

Each JWT access token carries:
- `tenant_id` — scopes all data operations
- `userId` — identifies the authenticated user
- `roles` — `ROLE_ADMIN`, `ROLE_AGENT`, `ROLE_OWNER`, etc.

Every MongoDB query is automatically filtered by `tenantId`. This is enforced at the repository level in `openframe-oss-lib`.

---

## API Layer Architecture

```mermaid
flowchart TD
    Gateway["Gateway Service"] --> ApiCore["API Service Core"]

    subgraph api_layer["API Layer"]
        direction TB
        REST["REST Controllers\n(OrganizationController, UserController, etc.)"]
        GQL["GraphQL DGS DataFetchers\n(DeviceDataFetcher, TicketDataFetcher, etc.)"]
    end

    subgraph service_layer["Service Layer"]
        direction TB
        Domain["Domain Services"]
        Processors["Post Processors"]
        Validators["Domain Validators"]
    end

    subgraph infra["Infrastructure"]
        Mongo["Mongo Repositories"]
        Messaging["NATS / Kafka"]
        AuthSrv["Authorization Server"]
    end

    ApiCore --> REST
    ApiCore --> GQL
    REST --> Domain
    GQL --> Domain
    Domain --> Processors
    Domain --> Validators
    Domain --> Mongo
    Domain --> Messaging
    Domain --> AuthSrv
```

### GraphQL API

The GraphQL API uses **Netflix DGS** with:
- **Relay-style pagination** — Cursor-based with global IDs
- **DataLoaders** — Batch loading for N+1 prevention
- **Custom scalars** — `Date`, `Instant`, `Long`
- **Multi-issuer JWT** — Auth principal resolved from tenant-scoped tokens

### REST API

REST endpoints handle mutations and operational tasks:
- Identity & access (users, invitations, API keys, SSO)
- Organization and device management
- Agent registration and force operations
- Health and version endpoints

---

## Security Architecture

```mermaid
flowchart TD
    Request["Incoming Request"] --> OriginFilter["Origin Sanitizer Filter"]
    OriginFilter --> AuthHeader["Authorization Header Normalizer\n(cookie → Bearer token)"]
    AuthHeader --> JwtResolver["Multi-issuer JWT Resolver\n(per-tenant RSA keys)"]
    JwtResolver --> RoleCheck["Role-Based Authorization\n(ROLE_ADMIN, ROLE_AGENT, etc.)"]
    RoleCheck --> ApiKeyFilter["API Key Filter (external-api only)"]
    ApiKeyFilter --> RateLimit["Rate Limiting (Redis)"]
    RateLimit --> Upstream["Backend Service"]
```

Key security features:
- **Per-tenant RSA keys** — Each tenant has its own signing key pair stored encrypted in MongoDB
- **Multi-issuer JWT validation** — Gateway validates tokens from any tenant's issuer
- **PKCE support** — Secure public client flows
- **API key rate limiting** — Sliding window rate limiting via Redis

---

## Messaging Architecture

```mermaid
flowchart LR
    Management["Management Service"] -->|"Provision streams"| NATS["NATS JetStream"]
    API --> NATS
    Agent["OpenFrame Agent\n(Rust)"] --> NATS
    NATS --> ClientSvc["Client Service"]

    ToolDB["Tool Database\n(Tactical/Fleet/MeshCentral)"] --> Debezium["Debezium CDC"]
    Debezium --> Kafka["Apache Kafka"]
    Kafka --> Stream["Stream Service"]
    Stream --> Cassandra["Cassandra\n(Unified Logs)"]
    Stream --> Kafka
```

**NATS JetStream** handles:
- Agent heartbeats and metrics
- Tool installation commands
- Client update notifications
- Notification broadcasts

**Apache Kafka** handles:
- Debezium CDC events from integrated tools
- Durable event streaming for audit logs
- Kafka Streams joins for activity enrichment

---

## Data Model Overview

```mermaid
erDiagram
    TENANT {
        string id
        string domain
        string status
    }
    ORGANIZATION {
        string id
        string tenantId
        string name
        string status
    }
    MACHINE {
        string id
        string tenantId
        string organizationId
        string status
        string deviceType
    }
    USER {
        string id
        string tenantId
        string email
        string[] roles
    }
    TICKET {
        string id
        string tenantId
        string status
        string assigneeId
    }
    TENANT ||--o{ ORGANIZATION : "has"
    ORGANIZATION ||--o{ MACHINE : "owns"
    TENANT ||--o{ USER : "has"
    TENANT ||--o{ TICKET : "has"
```

All documents include `tenantId` for multi-tenant isolation enforced at the repository layer.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Spring Boot 3.3 + Java 21** | LTS release, virtual threads support, modern language features |
| **Netflix DGS for GraphQL** | Production-proven, DataLoader support, Spring integration |
| **MongoDB as primary store** | Schema flexibility for MSP data, multi-tenant isolation via `tenantId`, Debezium CDC |
| **NATS for agent messaging** | Ultra-low latency, persistent JetStream, ideal for real-time agent communication |
| **Kafka for event streaming** | Durable, ordered, exactly-once semantics for audit logs |
| **Per-tenant RSA keys** | Cryptographic isolation, key rotation support, OIDC compliance |
| **Config Server** | Centralized configuration management, environment-specific overrides |

---

## Reference Documentation

For deep dives into each module:

- [API Service Core](./architecture/api-service-core-graphql-and-rest/api-service-core-graphql-and-rest.md) — GraphQL + REST details
- [Authorization Server Core](./architecture/authorization-server-core/authorization-server-core.md) — OAuth2/OIDC implementation
- [Gateway Service Core](./architecture/gateway-service-core-routing-and-security/gateway-service-core-routing-and-security.md) — Routing and security
- [Stream Processing Core](./architecture/stream-processing-core/stream-processing-core.md) — Kafka event pipeline
- [Management Service Core](./architecture/management-service-core-initialization-and-scheduling/management-service-core-initialization-and-scheduling.md) — Initialization and schedulers
- [Data Mongo Domain](./architecture/data-mongo-domain-and-repositories/data-mongo-domain-and-repositories.md) — Data model and repositories
- [Service Runtime Applications](./architecture/service-runtime-applications/service-runtime-applications.md) — Spring Boot app entry points
