# Architecture Overview

OpenFrame OSS Tenant is a modular, event-driven, multi-tenant microservice platform built on Java (Spring Boot), Kafka, MongoDB, and a Next.js frontend. This document provides a high-level architectural overview.

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

---

## High-Level Architecture

```mermaid
flowchart TD
    Browser["Web UI / External Client"] --> Gateway["Gateway Service"]
    Agent["Device Agent (Rust)"] --> Gateway
    ExtClient["External API Consumer"] --> Gateway

    Gateway --> Auth["JWT / API Key Validation"]
    Auth --> Api["API Service (GraphQL + REST)"]
    Auth --> Authz["Authorization Server"]
    Auth --> ExtApi["External API"]

    Api --> Mongo[("MongoDB")]
    Api --> Kafka[("Kafka")]
    Api --> Nats[("NATS")]

    Authz --> Mongo
    Authz --> JWKS["Tenant JWKS"]

    Kafka --> Stream["Stream Service"]
    Stream --> Cassandra[("Cassandra")]
    Stream --> Pinot[("Pinot Analytics")]

    Management["Management Service"] --> Mongo
    Management --> Kafka
    Management --> Nats
    Management --> Debezium["Debezium Connect"]

    Debezium --> Kafka
    Config["Config Server"] --> Api
    Config --> Gateway
    Config --> Authz
    Config --> Management
```

---

## Core Service Components

| Service | Purpose | Technology |
|---------|---------|-----------|
| **Gateway** | Single entry point — JWT/API key validation, routing, WebSocket proxy | Spring Cloud Gateway (WebFlux) |
| **API Service** | GraphQL + REST business API surface | Spring Boot + Netflix DGS |
| **Authorization Server** | OAuth2 / OIDC identity provider, multi-tenant SSO | Spring Authorization Server |
| **Management Service** | Operational control plane — schedulers, migrations, tool lifecycle | Spring Boot + ShedLock |
| **Stream Service** | Kafka-based event processing, CDC, device event enrichment | Spring Boot + Kafka Streams |
| **External API** | Public REST API for third-party integrations | Spring Boot |
| **Config Server** | Centralized configuration distribution | Spring Cloud Config |
| **Frontend** | Next.js 15 web application | Next.js + React + Relay |
| **Client Agent** | Device-side agent for managed endpoints | Rust |
| **Chat Client** | Desktop AI chat application | Tauri + React |

---

## Authentication and Authorization Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant Authz["Authorization Server"]
    participant API["API Service"]

    User->>Gateway: Access protected route
    Gateway->>Authz: Redirect to /authorize
    Authz->>User: Login / SSO form
    User->>Authz: Submit credentials
    Authz-->>Gateway: JWT Access Token (tenant_id, roles, userId)
    Gateway->>API: Forward request (Bearer token)
    API->>API: Validate JWT (multi-issuer)
    API-->>User: GraphQL / REST response
```

### JWT Claims

Each JWT issued by the Authorization Server contains:

| Claim | Description |
|-------|-------------|
| `tenant_id` | Scopes the user to a specific tenant |
| `userId` | The authenticated user's identifier |
| `roles` | User roles (`ADMIN`, `OWNER`, `AGENT`, etc.) |
| `iss` | Tenant-specific issuer URL |
| `kid` | RSA key ID for JWKS validation |

---

## Change Data Capture (CDC) Flow

```mermaid
sequenceDiagram
    participant Mongo
    participant Debezium
    participant Kafka
    participant Stream["Stream Service"]
    participant Cassandra

    Mongo->>Debezium: MongoDB oplog change event
    Debezium->>Kafka: Publish DebeziumMessage
    Kafka->>Stream: Kafka Listener receives event
    Stream->>Stream: Deserialize + Enrich + Validate tenant
    Stream->>Cassandra: Persist UnifiedLogEvent
    Stream->>Kafka: Publish enriched domain event
```

Debezium connectors are:
- Auto-provisioned by the Management Service
- Health-monitored with exponential backoff
- Tenant-scoped with dedicated topics

---

## Tool Integration Architecture

```mermaid
flowchart LR
    Admin["Admin configures tool"] --> Management["Management Service"]
    Management --> Mongo[("MongoDB")]
    Management --> Debezium["Debezium Connector"]
    Debezium --> Kafka[("Kafka")]
    Kafka --> Stream["Stream Service"]
    Stream --> Api["API Service"]
    Api --> Frontend["Web Frontend"]

    Gateway --> ToolProxy["Tool Proxy\n(/tools/{toolId}/...)"]
    ToolProxy --> TacticalRMM["Tactical RMM"]
    ToolProxy --> MeshCentral["MeshCentral"]
    ToolProxy --> FleetDM["FleetDM"]
```

Supported tool types:
- **Tactical RMM** — Remote monitoring and management
- **MeshCentral** — Remote access and remote desktop
- **FleetDM** — Device fleet management and compliance

---

## Multi-Tenant Data Model

Every domain entity in MongoDB is scoped to a `tenantId`:

```mermaid
flowchart TD
    Request["Incoming Request"] --> TenantContext["TenantContext (JWT claim)"]
    TenantContext --> Repository["Repository Layer"]
    Repository --> MongoQuery["MongoDB Query: { tenantId: 'xxx', ... }"]
    MongoQuery --> Mongo[("MongoDB Collection")]
```

Key tenant-scoped documents:
- `users`, `auth_users`
- `organizations`
- `machines` (devices)
- `tickets`, `ticket_notes`, `ticket_statuses`
- `integrated_tools`
- `knowledge_base_items`
- `notifications`
- `tags`, `tag_assignments`
- `api_keys`

---

## OpenFrame Client (Agent) Architecture

```mermaid
flowchart LR
    Agent["OpenFrame Client\n(Rust, on device)"] --> NATS["NATS Server"]
    NATS --> ClientSvc["Client Service\n(Java)"]
    ClientSvc --> Mongo[("MongoDB")]
    ClientSvc --> Kafka[("Kafka")]

    Agent --> Gateway["Gateway\n(registration/auth)"]
    Gateway --> Api["API Service"]
```

The Rust agent:
1. Registers with the platform using an agent registration secret
2. Maintains a NATS connection for bidirectional messaging
3. Publishes heartbeat, tool connection, and installed agent events
4. Receives installation, update, and command messages

---

## AI Agent Layer

The Node.js tooling (`package.json`) wraps the platform with AI capabilities using:

```mermaid
flowchart LR
    User["User / Technician"] --> Mingo["Mingo AI\n(VoltAgent)"]
    Mingo --> Claude["Anthropic Claude\n(@ai-sdk/anthropic)"]
    Claude --> Tools["Platform Tools\n(GraphQL, REST APIs)"]
    Tools --> Data["OpenFrame Data\n(devices, tickets, etc.)"]
```

Key packages:
- `@voltagent/core@2.7.6` — Agent orchestration and tool routing
- `@ai-sdk/anthropic@2.0.80` — Vercel AI SDK for Claude
- `@anthropic-ai/sdk@0.100.1` — Direct Anthropic SDK
- `zod@4.4.3` — Structured output validation

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Spring WebFlux for Gateway** | Non-blocking reactive I/O for high-throughput edge routing |
| **Netflix DGS for GraphQL** | Production-grade DGS enables DataLoaders, batching, and Relay compliance |
| **Per-tenant RSA key pairs** | Cryptographic isolation — each tenant's JWTs cannot be validated by other tenants |
| **Debezium for CDC** | Event sourcing from MongoDB without application-level event publishing overhead |
| **ShedLock for scheduling** | Prevents duplicate scheduler execution across multiple service instances |
| **NATS JetStream for agents** | Low-latency, durable messaging with exactly-once semantics for device communications |
| **Relay pagination** | Cursor-based pagination enables efficient, scalable list queries |
| **Pluggable processors** | Key service behaviors (`AgentRegistrationProcessor`, `UserProcessor`, etc.) are interface-based for extension |

---

## Module Dependency Graph

```mermaid
graph TD
    Api["openframe-api"] --> ApiCore["api-service-core"]
    ApiCore --> DataMongo["data-mongo-sync"]
    ApiCore --> SecurityCore["security-core"]

    Gateway["openframe-gateway"] --> GatewayCore["gateway-service-core"]
    GatewayCore --> DataRedis["data-redis"]

    AuthServer["openframe-authorization-server"] --> AuthzCore["authorization-service-core"]
    AuthzCore --> DataMongo

    Management["openframe-management"] --> MgmtCore["management-service-core"]
    MgmtCore --> DataMongo
    MgmtCore --> DataNats["data-nats"]

    Stream["openframe-stream"] --> StreamCore["stream-service-core"]
    StreamCore --> DataKafka["data-kafka"]
    StreamCore --> DataCassandra["data-cassandra"]

    DataMongo --> DataMongoCommon["data-mongo-common"]
    DataMongoCommon --> Core["openframe-core"]
```
