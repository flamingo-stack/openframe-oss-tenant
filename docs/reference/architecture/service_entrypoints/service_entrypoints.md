# Service Entrypoints

## Overview

Service Entrypoints is the top-level module that defines and boots all runtime services in the OpenFrame platform. Each entrypoint corresponds to a standalone Spring Boot application responsible for starting a specific service domain (API, Gateway, Authorization, Stream processing, and more).

This module does **not** implement business logic itself. Instead, it wires together lower-level *service core* modules by:

- Declaring Spring Boot applications
- Defining component scan boundaries
- Enabling infrastructure capabilities (Kafka, discovery, configuration)
- Acting as the executable boundary for deployment units

In practice, Service Entrypoints represents the **runtime topology** of OpenFrame.

---

## Architectural Role

At a high level, Service Entrypoints sits at the outermost layer of the system:

- Below it: service core modules (API, Gateway, Authorization, Stream, Management, Client)
- Beside it: frontend and client applications
- Above it: deployment, orchestration, and infrastructure

Each entrypoint starts exactly one Spring application context and exposes network interfaces (HTTP, WebSocket, Kafka consumers, etc.) as defined by the underlying core modules.

```mermaid
flowchart TD
    User["User / Agent / Client"] --> Gateway["Gateway Service"]
    Gateway --> Api["API Service"]
    Gateway --> ExternalApi["External API Service"]
    Gateway --> Authz["Authorization Service"]

    Api --> Data["Data Layer"]
    ExternalApi --> Data
    Authz --> Data

    Stream["Stream Service"] --> Data
    Management["Management Service"] --> Data
    Client["Client Service"] --> Gateway
```

---

## Entrypoint Applications

Each of the following classes defines a runnable service. All are standard Spring Boot `main` classes with explicit component scanning to compose the required capabilities.

### API Application

**Class**: `ApiApplication`

**Purpose**:
- Core internal API for OpenFrame
- Serves authenticated platform clients
- Exposes GraphQL and REST controllers

**Key Characteristics**:
- Scans API, data, core, notification, and Kafka packages
- Acts as the primary backend for UI and internal services

```mermaid
flowchart LR
    ApiApp["API Application"] --> Controllers["API Controllers"]
    Controllers --> Services["Domain Services"]
    Services --> Repositories["Data Repositories"]
```

---

### Authorization Server Application

**Class**: `OpenFrameAuthorizationServerApplication`

**Purpose**:
- OAuth2 and OIDC authorization server
- Handles login, SSO, tenant registration, and token issuance

**Key Characteristics**:
- Enabled for service discovery
- Isolated security domain
- Integrates deeply with tenant and user data

```mermaid
flowchart LR
    AuthzApp["Authorization Server"] --> Login["Login & SSO"]
    Login --> Tokens["Token Issuance"]
    Tokens --> Clients["Clients & Gateways"]
```

---

### Gateway Application

**Class**: `GatewayApplication`

**Purpose**:
- Single ingress point for HTTP and WebSocket traffic
- Routes requests to backend services
- Enforces authentication, CORS, and rate limits

**Key Characteristics**:
- Stateless edge service
- Applies API key and JWT based security
- Proxies both REST and WebSocket connections

```mermaid
flowchart TD
    Incoming["Incoming Requests"] --> Filters["Security & Routing Filters"]
    Filters --> Backend["Backend Services"]
```

---

### External API Application

**Class**: `ExternalApiApplication`

**Purpose**:
- Public-facing API for third-party integrations
- Exposes limited, stable endpoints

**Key Characteristics**:
- Reuses API and data layers
- Designed for automation and integrations
- OpenAPI documented

```mermaid
flowchart LR
    Partner["External Partner"] --> ExternalApi["External API"]
    ExternalApi --> Data["Data Layer"]
```

---

### Management Application

**Class**: `ManagementApplication`

**Purpose**:
- Operational and administrative backend
- Handles schedulers, initializers, and system maintenance

**Key Characteristics**:
- Runs background jobs
- Manages integrations and system configuration
- No direct end-user traffic

```mermaid
flowchart LR
    Scheduler["Schedulers"] --> Management["Management Service"]
    Management --> Data["Data Layer"]
```

---

### Stream Application

**Class**: `StreamApplication`

**Purpose**:
- Event and stream processing service
- Consumes Kafka topics
- Enriches and transforms events

**Key Characteristics**:
- Kafka-enabled
- No HTTP interface
- High-throughput, asynchronous processing

```mermaid
flowchart LR
    Kafka["Kafka Topics"] --> Stream["Stream Service"]
    Stream --> Enriched["Enriched Events"]
```

---

### Client Application

**Class**: `ClientApplication`

**Purpose**:
- Backend service for agent and client connectivity
- Handles agent registration and heartbeats

**Key Characteristics**:
- Integrates with Kafka producers
- Excludes Cassandra health checks where not required
- Bridges agents with the platform

```mermaid
flowchart LR
    Agent["Agent"] --> ClientSvc["Client Service"]
    ClientSvc --> Gateway
```

---

### Config Server Application

**Class**: `ConfigServerApplication`

**Purpose**:
- Centralized configuration service
- Supplies configuration to other services at startup

**Key Characteristics**:
- Lightweight Spring Boot application
- No domain logic
- Critical for environment consistency

```mermaid
flowchart LR
    Config["Config Server"] --> Services["All Services"]
```

---

## How Service Entrypoints Fit Together

Service Entrypoints defines **what runs** in an OpenFrame deployment:

- Each entrypoint maps to a container or JVM process
- Scaling is done per entrypoint
- Failures are isolated to a single service boundary

Business logic, persistence, and integrations live in the underlying service core modules. Service Entrypoints simply composes and launches them in a consistent, observable, and scalable way.

---

## Key Takeaways

- Service Entrypoints is the executable layer of OpenFrame
- Each class represents one deployable service
- Clear separation between runtime wiring and business logic
- Enables modular scaling, deployment, and operations

This module is foundational for understanding **how OpenFrame runs in production**.
