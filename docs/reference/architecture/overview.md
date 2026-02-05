<OVERVIEW>

# openframe-oss-tenant — Repository Overview

## Overview

The **`openframe-oss-tenant`** repository is the **tenant-aware, open-source core of the OpenFrame platform**, powering Flamingo’s AI-driven MSP stack.  
It brings together all **runtime services**, **shared libraries**, and **data layers** required to operate OpenFrame as a **multi-tenant, cloud-native MSP platform**.

At a high level, this repository provides:

- A **multi-tenant control plane** (authentication, authorization, tenant discovery)
- A **unified API layer** (REST + GraphQL) for UI, agents, and integrations
- A **gateway ingress** that centralizes security, routing, and WebSockets
- **External APIs** for partners and automations (API-key–based)
- **Real-time streaming & enrichment** for events and logs
- **Lifecycle management** for tools, agents, connectors, and infrastructure
- **Shared data & security libraries** reused across all services

This repository is designed to be:
- **Composable** (services + shared libs)
- **Extensible** (processor hooks, overrides, tenant customization)
- **Scalable** (Kafka, Pinot, Cassandra, Redis)
- **Vendor-neutral** (open-source-first MSP tooling)

---

## Repository Structure (High Level)

```text
openframe-oss-tenant/
├── openframe/services/              # Runtime microservices
│   ├── openframe-api                # Core REST + GraphQL API
│   ├── openframe-authorization-server
│   ├── openframe-gateway
│   ├── openframe-external-api
│   ├── openframe-client
│   ├── openframe-stream
│   └── openframe-management
│
├── openframe-oss-lib/                # Shared libraries
│   ├── openframe-data-mongo
│   ├── openframe-data (Kafka, Redis, Cassandra, Pinot)
│   ├── openframe-security-core
│   ├── openframe-security-oauth
│   ├── openframe-api-lib
│   └── openframe-core
│
└── openframe-frontend (consumer)     # Referenced by APIs (not the focus here)
```

---

## End-to-End Architecture

### Platform-Level View

```mermaid
flowchart TD
    Browser["Frontend / UI"] --> Gateway["Gateway Service"]
    Agent["OpenFrame Agent"] --> Gateway
    Partner["External Integrations"] --> Gateway

    Gateway --> Authz["Authorization Server"]
    Gateway --> Api["API Service"]
    Gateway --> ExternalApi["External API Service"]
    Gateway --> ClientSvc["Client Service"]

    Api --> Mongo["MongoDB"]
    Api --> Redis["Redis"]
    Api --> Pinot["Apache Pinot"]

    ExternalApi --> Pinot
    ExternalApi --> Mongo

    ClientSvc --> Nats["NATS / JetStream"]

    Stream["Stream Service"] --> Kafka["Kafka"]
    Kafka --> Stream
    Stream --> Pinot
    Stream --> Cassandra["Cassandra"]

    Management["Management Service"] --> Mongo
    Management --> Kafka
    Management --> Pinot
    Management --> Nats
```

**Key ideas:**
- **Gateway-first**: All ingress flows through the gateway
- **Tenant-aware security**: Tokens, keys, and issuers are tenant-scoped
- **Event-driven core**: Kafka + Stream Service normalize all tool activity
- **Read/write separation**: Mongo for transactions, Pinot for analytics

---

## Core Runtime Services

### 1. OpenFrame API Service

**Purpose**
- Central backend API for OpenFrame
- Serves the UI, agents, and internal services

**Key Capabilities**
- REST + GraphQL (Netflix DGS)
- User, organization, device, tool management
- SSO configuration & lifecycle
- Agent registration & force actions
- Cursor-based pagination with DataLoaders

**Architecture (Internal)**

```mermaid
flowchart TD
    Client["UI / Services"] --> Api["OpenFrame API Service"]

    Api --> Controllers["REST Controllers"]
    Api --> Fetchers["GraphQL DataFetchers"]

    Fetchers --> Loaders["DGS DataLoaders"]
    Controllers --> Services["Domain Services"]
    Fetchers --> Services

    Services --> Processors["Post-Processors"]
    Services --> Mongo["MongoDB"]
    Services --> Kafka["Kafka"]
```

📘 **Core documentation**: `openframe-api-service`

---

### 2. Authorization Server

**Purpose**
- Multi-tenant OAuth 2.1 / OIDC authorization server

**Key Capabilities**
- Tenant discovery & registration
- Username/password and SSO (Google, Microsoft)
- Per-tenant signing keys (JWKS)
- Invitations, password reset, lifecycle hooks

**Architecture**

```mermaid
flowchart TD
    Browser["User Browser"] --> Gateway["Gateway"]
    Gateway --> Authz["Authorization Server"]

    Authz --> TenantCtx["Tenant Context"]
    Authz --> OAuth["Spring Authorization Server"]

    OAuth --> Keys["Tenant Key Service"]
    OAuth --> Tokens["Mongo OAuth Tokens"]
    OAuth --> Clients["OAuth Clients"]
```

📘 **Core documentation**: `authorization-server`

---

### 3. Gateway Service

**Purpose**
- Unified ingress and security enforcement layer

**Key Capabilities**
- JWT & API-key authentication
- Rate limiting
- WebSocket proxying (agents, tools, NATS)
- Tenant-aware issuer validation
- CORS and header normalization

**Architecture**

```mermaid
flowchart LR
    Client["Browser / Agent / Tool"] --> Gateway["Gateway Service"]

    Gateway --> Api["API Service"]
    Gateway --> ExternalApi["External API"]
    Gateway --> Authz["Authorization Server"]
    Gateway --> Tools["Integrated Tools"]
```

📘 **Core documentation**: `gateway-service`

---

### 4. External API Service

**Purpose**
- Stable, API-key–secured REST API for integrations

**Key Capabilities**
- Events, logs, devices, tools, organizations
- Cursor-based pagination
- Filtering & sorting optimized for automation
- No UI coupling, no GraphQL

**Architecture**

```mermaid
flowchart TD
    Partner["External Client"] --> Gateway["Gateway"]
    Gateway --> ExternalApi["External API Service"]

    ExternalApi --> Core["Core Services"]
    Core --> Mongo["MongoDB"]
    Core --> Pinot["Apache Pinot"]
```

📘 **Core documentation**: `external-api-service`

---

### 5. Stream Service

**Purpose**
- Real-time ingestion, normalization, and enrichment of events

**Key Capabilities**
- Kafka & Kafka Streams
- Debezium CDC handling
- Tool-specific deserialization (Fleet, Tactical, MeshCentral)
- Unified event model
- Fan-out to Kafka, Cassandra, Pinot

**Architecture**

```mermaid
flowchart TD
    Tools["Integrated Tools"] --> KafkaIn["Inbound Kafka"]
    KafkaIn --> Stream["Stream Service"]

    Stream --> Enrich["Enrichment"]
    Enrich --> KafkaOut["Outbound Kafka"]
    Enrich --> Cassandra["Cassandra"]
    KafkaOut --> Pinot["Apache Pinot"]
```

📘 **Core documentation**: `stream-service`

---

### 6. Management Service

**Purpose**
- Platform control plane & lifecycle orchestration

**Key Capabilities**
- Integrated tool management
- Debezium connector lifecycle
- Pinot schema & table initialization
- NATS JetStream provisioning
- Distributed schedulers (ShedLock)

**Architecture**

```mermaid
flowchart TD
    Management["Management Service"] --> Init["Startup Initializers"]
    Management --> Schedulers["Schedulers"]

    Init --> Pinot["Pinot"]
    Init --> Nats["NATS"]
    Init --> Debezium["Debezium"]
```

📘 **Core documentation**: `management-service`

---

## Shared Libraries (openframe-oss-lib)

### Data Layers
- **Mongo**: System of record (users, orgs, tools, config)
- **Kafka**: Event streaming backbone
- **Redis**: Tenant-aware caching & locks
- **Cassandra**: Scalable audit/event storage
- **Pinot**: Real-time analytics & filtering

📘 Docs:
- `data-layer-mongo`
- `data-layer-kafka-redis-cassandra-pinot`

---

### Security Libraries
- **security-core**: JWT, PKCE, shared constants
- **security-oauth-bff**: Browser-friendly OAuth BFF

📘 Docs:
- `security-core`
- `security-oauth-bff`

---

### Core Utilities & API Contracts
- **core-shared-utils**: Pagination, slugs, validation
- **api-lib-dtos**: Shared API & filter DTOs

📘 Docs:
- `core-shared-utils`
- `api-lib-dtos`

---

## Summary

The **`openframe-oss-tenant`** repository is the **complete, tenant-aware backend foundation** of OpenFrame and Flamingo:

- ✅ Multi-tenant by design  
- ✅ Event-driven and analytics-ready  
- ✅ Secure OAuth2/OIDC foundation  
- ✅ Extensible via processors and hooks  
- ✅ Open-source–first MSP platform core  

It enables Flamingo to replace proprietary MSP software with a **modern, open, AI-ready platform** that scales from single tenants to large MSPs operating thousands of endpoints.

---