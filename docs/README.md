# OpenFrame OSS Tenant — Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** — the open-source, multi-tenant backend platform powering [OpenFrame](https://openframe.ai), the AI-driven unified platform for Managed Service Providers (MSPs).

> **Community:** All questions, discussions, and support are in the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) community.

---

## 📚 Table of Contents

- [Getting Started](#-getting-started)
- [Development](#-development)
- [Architecture Reference](#-architecture-reference)
- [Architecture Diagrams](#-architecture-diagrams)
- [Quick Links](#-quick-links)

---

## 🚀 Getting Started

New to OpenFrame? Start here.

| Guide | Description |
|-------|-------------|
| [Introduction](./getting-started/introduction.md) | What is OpenFrame OSS Tenant, key features, and platform overview |
| [Prerequisites](./getting-started/prerequisites.md) | Required software, infrastructure dependencies, and system requirements |
| [Quick Start](./getting-started/quick-start.md) | Get OpenFrame running in under 5 minutes |
| [First Steps](./getting-started/first-steps.md) | Register a tenant, connect tools, install the agent, and explore the platform |

---

## 🛠️ Development

Everything you need to build and contribute to OpenFrame.

| Guide | Description |
|-------|-------------|
| [Development Overview](./development/README.md) | Technology stack at a glance and repository structure |
| [Environment Setup](./development/setup/environment.md) | IDE configuration, recommended extensions, and toolchain setup |
| [Local Development](./development/setup/local-development.md) | Clone, build, run services locally, hot reload, and debugging |
| [Architecture Overview](./development/architecture/README.md) | System design, component relationships, and data flow diagrams |
| [Security Guidelines](./development/security/README.md) | Auth patterns, secrets management, and vulnerability mitigations |
| [Testing Guide](./development/testing/README.md) | Test structure, running tests, patterns, and coverage requirements |
| [Contributing Guidelines](./development/contributing/guidelines.md) | Code style, branch naming, PR process, and commit conventions |

---

## 📐 Architecture Reference

Deep-dive technical documentation for every core module, generated from source code analysis.

### Platform Overview

| Document | Description |
|----------|-------------|
| [Repository Overview](./architecture/README.md) | End-to-end architecture, repository structure, and core service interactions |

### API Layer

| Document | Description |
|----------|-------------|
| [API Service Core — GraphQL & REST](./architecture/api-service-core-graphql-and-rest/api-service-core-graphql-and-rest.md) | REST controllers, GraphQL (Netflix DGS), Relay pagination, DataLoaders |
| [API Service Core — DTO](./architecture/api-service-core-dto/api-service-core-dto.md) | Request/response contracts and validation |
| [API Service Core — Domain Services](./architecture/api-service-core-domain-services/api-service-core-domain-services.md) | Business logic layer |
| [API Service Core — DataLoaders & Relay](./architecture/api-service-core-dataloaders-and-relay/api-service-core-dataloaders-and-relay.md) | GraphQL DataLoader batching and Relay global node resolution |
| [API Contracts & Mapping](./architecture/api-contracts-and-mapping/api-contracts-and-mapping.md) | Shared DTOs, filters, pagination, and mapping utilities |

### Security & Identity

| Document | Description |
|----------|-------------|
| [Authorization Server Core](./architecture/authorization-server-core/authorization-server-core.md) | Multi-tenant OAuth2/OIDC server, per-tenant RSA keys, SSO, PKCE |
| [Security OAuth BFF](./architecture/security-oauth-bff/security-oauth-bff.md) | Backend-for-Frontend OAuth layer, cookie-based token management |

### Gateway

| Document | Description |
|----------|-------------|
| [Gateway Service Core](./architecture/gateway-service-core/gateway-service-core.md) | Reactive edge proxy, JWT validation, API key rate limiting, tool upstream routing |

### Event Streaming & Data

| Document | Description |
|----------|-------------|
| [Stream Service Core](./architecture/stream-service-core/stream-service-core.md) | Kafka event ingestion, CDC processing, tool-specific deserializers, Cassandra persistence |
| [Data — Kafka & Debezium](./architecture/data-kafka-and-debezium/data-kafka-and-debezium.md) | Messaging infrastructure, tenant-aware Kafka config, Debezium connector lifecycle |
| [Data — MongoDB Domain & Repositories](./architecture/data-mongo-domain-and-repositories/data-mongo-domain-and-repositories.md) | Multi-tenant domain model, compound indexes, base repositories |
| [Data — MongoDB Sync Configuration & Custom Repositories](./architecture/data-mongo-sync-configuration-and-custom-repositories/data-mongo-sync-configuration-and-custom-repositories.md) | Custom Mongo repositories and sync configuration |

### Orchestration

| Document | Description |
|----------|-------------|
| [Management Service Core](./architecture/management-service-core/management-service-core.md) | Operational orchestration, distributed schedulers, migrations, tool lifecycle |

### Service Applications

| Document | Description |
|----------|-------------|
| [Service Applications](./architecture/service-applications/service-applications.md) | All deployable Spring Boot services — API, Gateway, Auth, Management, Stream, External API, Config |

---

## 📊 Architecture Diagrams

Visual Mermaid diagrams for each core module are available in the diagrams directory:

```text
docs/architecture/diagrams/
```

Key diagrams include:

- `README.mmd` — End-to-end platform architecture
- `gateway-service-core.mmd` — Gateway request routing flow
- `authorization-server-core.mmd` — OAuth2 / JWT issuance flow
- `stream-service-core.mmd` — Event processing pipeline
- `management-service-core.mmd` — Operational orchestration
- `api-service-core-graphql-and-rest.mmd` — API layer structure
- `data-kafka-and-debezium.mmd` — Kafka + Debezium infrastructure
- `service-applications.mmd` — Service deployment topology

---

## 📖 Quick Links

| Resource | Link |
|----------|------|
| Project README | [../README.md](../README.md) |
| Contributing Guide | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| OpenFrame Platform | [https://openframe.ai](https://openframe.ai) |
| Flamingo | [https://flamingo.run](https://flamingo.run) |
| OpenMSP Community | [https://www.openmsp.ai/](https://www.openmsp.ai/) |
| OpenMSP Slack | [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) |

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*
