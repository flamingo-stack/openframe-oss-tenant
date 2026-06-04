# OpenFrame OSS Tenant — Documentation

Welcome to the documentation for **OpenFrame OSS Tenant**, the full multi-tenant runtime backend of the [OpenFrame](https://openframe.ai) platform — an AI-powered MSP platform that unifies RMM/MDM tools behind a single API, GraphQL layer, and intelligent automation interface.

> **Community**: All questions and discussions happen in [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA). We do not use GitHub Issues.

---

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Development](#development)
- [Reference Architecture](#reference-architecture)
- [Architecture Diagrams](#architecture-diagrams)
- [Quick Links](#quick-links)

---

## Getting Started

New to OpenFrame? Start here to understand the platform, set up your environment, and run your first tenant.

| Guide | Description |
|---|---|
| [Introduction](./getting-started/introduction.md) | What OpenFrame is, its architecture, and who it's for |
| [Prerequisites](./getting-started/prerequisites.md) | Required software, system requirements, and infrastructure dependencies |
| [Quick Start](./getting-started/quick-start.md) | Get the full platform running in under 10 minutes |
| [First Steps](./getting-started/first-steps.md) | Register a tenant, explore the dashboard, connect integrations, install agents |

---

## Development

Guides for developers working on or extending OpenFrame OSS Tenant.

| Guide | Description |
|---|---|
| [Architecture Overview](./development/architecture/README.md) | Deep-dive into the system architecture, design decisions, and service interactions |
| [Local Development](./development/setup/local-development.md) | Hot reload, debugging, IDE configuration, and service startup order |
| [Environment Setup](./development/setup/environment.md) | IDE setup, JDK/Node installation, Maven settings, and environment variables |
| [Testing Overview](./development/testing/README.md) | Unit tests, integration tests, E2E tests, Playwright UI tests, and coverage |
| [Security Best Practices](./development/security/README.md) | JWT model, multi-tenant isolation, secrets management, production checklist |
| [Contributing Guidelines](./development/contributing/guidelines.md) | Branch naming, commit conventions, PR process, code style, and review checklist |

---

## Reference Architecture

Technical reference documentation for each core module in the OpenFrame platform, generated from source code analysis.

### Core Libraries

| Module | Description |
|---|---|
| [API Service Core — GraphQL & REST](./architecture/api-service-core-graphql-and-rest/api-service-core-graphql-and-rest.md) | REST controllers, Netflix DGS GraphQL DataFetchers, OAuth2 resource server, Relay node resolution |
| [API Lib — Contracts & Domain Services](./architecture/api-lib-contracts-and-domain-services/api-lib-contracts-and-domain-services.md) | DTOs, filter models, Relay pagination contracts, domain mappers, shared domain services |
| [Authorization Server Core](./architecture/authorization-server-core/authorization-server-core.md) | OAuth2/OIDC, multi-tenant JWT, per-tenant RSA keys, SSO (Google/Microsoft), PKCE, onboarding flows |
| [Gateway Service Core — Routing & Security](./architecture/gateway-service-core-routing-and-security/gateway-service-core-routing-and-security.md) | Spring Cloud Gateway, JWT validation, API key auth, rate limiting, WebSocket proxying, tool routing |
| [Data Mongo — Domain & Repositories](./architecture/data-mongo-domain-and-repositories/data-mongo-domain-and-repositories.md) | Core domain documents, multi-tenant `tenantId` enforcement, reactive repositories, aggregation pipelines |
| [Stream Processing Core](./architecture/stream-processing-core/stream-processing-core.md) | Debezium CDC ingestion, Kafka Streams, event normalization, Cassandra unified logs |
| [Tenant Messaging — NATS & Kafka](./architecture/tenant-messaging-nats-and-kafka/tenant-messaging-nats-and-kafka.md) | Multi-tenant Kafka config, topic management, NATS real-time notifications, agent command models |
| [Management Service Core — Initialization & Scheduling](./architecture/management-service-core-initialization-and-scheduling/management-service-core-initialization-and-scheduling.md) | Startup initializers, NATS stream provisioning, Mongock migrations, ShedLock distributed schedulers |

### Runtime Applications

| Module | Description |
|---|---|
| [Service Runtime Applications](./architecture/service-runtime-applications/service-runtime-applications.md) | Executable Spring Boot services — API, Auth Server, Gateway, Stream, Management, Client, Config |

---

## Architecture Diagrams

Visual Mermaid diagrams for each module are available in the diagrams directory:

```text
docs/architecture/diagrams/
├── README.mmd                                          # Platform overview diagrams
├── api-service-core-graphql-and-rest.mmd               # API layer architecture
├── authorization-server-core.mmd                       # OAuth2/OIDC flow
├── gateway-service-core-routing-and-security.mmd       # Gateway security layers
├── stream-processing-core.mmd                          # Event pipeline
├── tenant-messaging-nats-and-kafka.mmd                 # Messaging architecture
├── management-service-core-initialization-and-scheduling.mmd  # Startup & scheduling
├── data-mongo-domain-and-repositories.mmd              # Data model
└── service-runtime-applications.mmd                    # Runtime service composition
```

---

## 🔗 Quick Links

| Resource | Link |
|---|---|
| [Project README](../README.md) | Main project overview and quick start |
| [Contributing Guide](../CONTRIBUTING.md) | How to contribute to OpenFrame |
| [License](../LICENSE.md) | Flamingo AI Unified License v1.0 |
| [OpenFrame Website](https://openframe.ai) | Official product site |
| [Flamingo Platform](https://flamingo.run) | AI-powered MSP platform |
| [OpenMSP Community](https://www.openmsp.ai/) | Community hub |
| [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) | Join the community |

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*
