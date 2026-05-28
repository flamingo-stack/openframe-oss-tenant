# OpenFrame OSS Tenant — Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** — the open-source, multi-service tenant runtime of the [OpenFrame platform](https://openframe.ai).

> **Flamingo** ([https://flamingo.run](https://flamingo.run)) powers this platform with AI agents — Mingo AI for technicians and Fae for clients — delivering autonomous IT operations for MSPs.

---

## 📚 Table of Contents

- [Getting Started](#-getting-started)
- [Development](#-development)
- [Architecture Reference](#-architecture-reference)
- [Architecture Diagrams](#-architecture-diagrams)
- [Quick Links](#-quick-links)

---

## 🚀 Getting Started

New to OpenFrame OSS Tenant? Start here.

| Guide | Description |
|-------|-------------|
| [Introduction](./getting-started/introduction.md) | What is OpenFrame OSS Tenant, target audience, and platform overview |
| [Prerequisites](./getting-started/prerequisites.md) | Required software, infrastructure services, system requirements |
| [Quick Start](./getting-started/quick-start.md) | Clone, build, configure, and run the stack in minutes |
| [First Steps](./getting-started/first-steps.md) | Register your first tenant, explore OAuth2, connect tools, register devices |

---

## 🛠 Development

Guides for engineers building on or contributing to the platform.

| Guide | Description |
|-------|-------------|
| [Development Overview](./development/README.md) | Overview, repository structure, community links |
| [Environment Setup](./development/setup/environment.md) | IDE configuration, required tools, editor settings |
| [Local Development](./development/setup/local-development.md) | Clone, build, run locally, hot reload, debug configuration |
| [Architecture Overview](./development/architecture/README.md) | High-level architecture, component map, key design decisions |
| [Security Guidelines](./development/security/README.md) | Auth patterns, secrets management, security best practices |
| [Testing Guide](./development/testing/README.md) | Test structure, running tests, writing new tests |
| [Contributing Guidelines](./development/contributing/guidelines.md) | Code style, PR process, commit format, review checklist |

---

## 📖 Architecture Reference

Deep-dive technical documentation for each service core, generated from source code analysis.

### Core Services

| Module | Description |
|--------|-------------|
| [API Service Core](./architecture/api-service-core/api-service-core.md) | REST controllers, GraphQL DataFetchers (DGS), DataLoaders, Relay pagination |
| [Authorization Server Core](./architecture/authorization-server-core/authorization-server-core.md) | Multi-tenant OAuth2/OIDC, per-tenant RSA keys, SSO (Google & Microsoft) |
| [Gateway Service Core](./architecture/gateway-service-core/gateway-service-core.md) | Reactive edge proxy, JWT validation, API key auth, WebSocket routing |
| [Management Service Core](./architecture/management-service-core/management-service-core.md) | Schedulers (ShedLock), Mongock migrations, tool lifecycle, NATS bootstrap |
| [Stream Processing Core](./architecture/stream-processing-core/stream-processing-core.md) | Kafka CDC ingestion, Debezium handlers, event enrichment, Cassandra persistence |
| [Security and OAuth BFF](./architecture/security-and-oauth-bff/security-and-oauth-bff.md) | PKCE utilities, RSA JWT encoding, OAuth BFF login/refresh/logout flows |

### Data Layer

| Module | Description |
|--------|-------------|
| [Mongo Domain and Repositories](./architecture/mongo-domain-and-repositories/mongo-domain-and-repositories.md) | Canonical document models (User, Org, Device, Ticket, Notification, OAuth) |
| [Mongo Sync Custom Repositories](./architecture/mongo-sync-custom-repositories/mongo-sync-custom-repositories.md) | Cursor pagination, aggregation analytics, bulk updates, composite sorting |

### Contracts & Entrypoints

| Module | Description |
|--------|-------------|
| [API Contracts and Mapping](./architecture/api-contracts-and-mapping/api-contracts-and-mapping.md) | Shared DTOs, Relay pagination primitives, filter contracts, entity mappers |
| [Service Entrypoints](./architecture/service-entrypoints/service-entrypoints.md) | Spring Boot main classes, component scan boundaries, deployment model |

### Platform Overview

| Document | Description |
|----------|-------------|
| [Repository Overview](./architecture/README.md) | End-to-end platform architecture, module map, multi-tenant design principles |

---

## 🗺 Architecture Diagrams

Visual Mermaid diagrams are available in:

```text
docs/architecture/diagrams/
```

Key diagrams include:

- `README.mmd` — Top-level platform architecture
- `api-service-core.mmd` — API service layered architecture
- `authorization-server-core.mmd` — OAuth2/OIDC authorization flow
- `gateway-service-core.mmd` — Gateway security and routing layers
- `stream-processing-core.mmd` — Kafka event processing pipeline
- `security-and-oauth-bff.mmd` — OAuth BFF login flow
- `mongo-domain-and-repositories.mmd` — Domain model relationships
- `management-service-core.mmd` — Management control plane
- `service-entrypoints.mmd` — Service deployment model

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| Project README | [../README.md](../README.md) |
| Contributing Guide | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| OpenFrame Platform | [https://openframe.ai](https://openframe.ai) |
| Flamingo | [https://flamingo.run](https://flamingo.run) |
| OpenMSP Community | [https://www.openmsp.ai/](https://www.openmsp.ai/) |
| OpenMSP Slack | [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) |

---

> **Support:** We do not use GitHub Issues or GitHub Discussions. All questions, bug reports, and feature discussions happen in the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*
