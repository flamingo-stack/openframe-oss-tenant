# Development Documentation

Welcome to the OpenFrame OSS Tenant development documentation. This section covers everything you need to develop, extend, test, and contribute to the platform.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

---

## Overview

OpenFrame OSS Tenant is a **multi-module Java/Spring Boot microservices platform** with a **Next.js frontend**. Development spans multiple technology layers, from reactive gateway services to AI-assisted ticket resolution.

The platform is designed for:
- **Modularity** — Core logic lives in reusable libraries (`openframe-oss-lib`); runtime services compose those libraries
- **Multi-tenancy** — Every layer is tenant-scoped by design
- **Extensibility** — Default processors and hooks can be overridden per deployment

---

## Documentation Index

| Document | Description |
|---|---|
| [Environment Setup](setup/environment.md) | IDE configuration, tools, and editor extensions |
| [Local Development](setup/local-development.md) | Clone, build, run locally, hot reload |
| [Architecture Overview](architecture/README.md) | High-level design, diagrams, data flow |
| [Security Guidelines](security/README.md) | Auth patterns, secrets, vulnerability mitigation |
| [Testing Overview](testing/README.md) | Test structure, running tests, coverage |
| [Contributing Guidelines](contributing/guidelines.md) | Code style, PR process, commit conventions |

---

## Technology Stack at a Glance

### Backend

| Technology | Version | Role |
|---|---|---|
| Java | 21 | Runtime language |
| Spring Boot | 3.3.0 | Microservices framework |
| Spring Cloud | 2023.0.3 | Config, Gateway, Discovery |
| Netflix DGS | 7.0.0 | GraphQL framework |
| MongoDB | — | Primary data store |
| Apache Kafka | 3.6.0 | Event streaming |
| NATS | — | Real-time agent messaging |
| Redis | — | Caching, rate limiting, locking |
| Apache Cassandra | — | Unified log storage |
| gRPC | 1.58.0 | Internal service communication |
| Micrometer + Prometheus | 1.14.1 | Observability |

### Frontend

| Technology | Role |
|---|---|
| Next.js | React meta-framework |
| TypeScript | Type-safe frontend code |
| `@flamingo-stack/openframe-frontend-core` | Shared UI component library |
| TailwindCSS | Utility-first CSS |

### AI/Automation Tooling

| Technology | Role |
|---|---|
| `@voltagent/core` | AI agent orchestration |
| `@anthropic-ai/sdk` | Anthropic Claude integration |
| `@ai-sdk/anthropic` | AI SDK for Anthropic models |

---

## Repository Layout

```text
openframe-oss-tenant/
├── pom.xml                          # Root Maven parent POM
├── package.json                     # AI/tooling workspace root
├── openframe/
│   └── services/
│       ├── openframe-api/           # API Service (GraphQL + REST)
│       ├── openframe-authorization-server/  # OAuth2/OIDC service
│       ├── openframe-client/        # Client/agent-facing service
│       ├── openframe-config/        # Spring Cloud Config Server
│       ├── openframe-external-api/  # External API service
│       ├── openframe-gateway/       # Reactive Gateway
│       ├── openframe-management/    # Management + schedulers
│       ├── openframe-stream/        # Kafka stream processing
│       ├── openframe-test/          # Integration test suite
│       └── openframe-frontend/      # Next.js frontend
├── clients/
│   ├── openframe-client/            # Rust agent client
│   └── openframe-chat/              # Tauri desktop app
└── manifests/                       # Kubernetes manifests
```

---

## Quick Development Workflow

```bash
# Build all Java services (skip tests for speed)
mvn clean install -DskipTests

# Run a specific service
cd openframe/services/openframe-api
mvn spring-boot:run

# Run the frontend in dev mode
cd openframe/services/openframe-frontend
npm install && npm run dev

# Run tests
mvn test

# Run a specific module's tests
cd openframe/services/openframe-api
mvn test
```

---

## Community

All development discussions happen in the **OpenMSP Slack**:

- **Join**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Community Hub**: [openmsp.ai](https://www.openmsp.ai/)

> We do **not** use GitHub Issues or GitHub Discussions. All questions, bug reports, and feature requests are handled in Slack.
