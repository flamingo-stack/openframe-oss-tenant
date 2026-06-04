# Development Documentation

Welcome to the OpenFrame OSS Tenant development documentation. This section covers everything you need to set up a development environment, understand the architecture, contribute code, write tests, and follow security best practices.

---

## Quick Navigation

| Document | Description |
|----------|-------------|
| [Environment Setup](setup/environment.md) | IDE configuration, editor extensions, and development tools |
| [Local Development](setup/local-development.md) | Clone, build, run locally, and hot reload |
| [Architecture Overview](architecture/README.md) | System design, component relationships, and data flows |
| [Security Guidelines](security/README.md) | Auth patterns, secrets management, and vulnerability mitigation |
| [Testing Guide](testing/README.md) | Test structure, running tests, and coverage requirements |
| [Contributing Guidelines](contributing/guidelines.md) | Code style, branch naming, PR process, and commit conventions |

---

## Technology Stack at a Glance

### Backend

| Technology | Version | Role |
|------------|---------|------|
| Java | 21 | Primary language |
| Spring Boot | 3.3.0 | Application framework |
| Spring Cloud Gateway | 2023.0.3 | Reactive edge gateway |
| Spring Authorization Server | (included) | OAuth2 / OIDC |
| Netflix DGS | 7.0.0 | GraphQL framework |
| Apache Kafka | 3.6.0 | Event streaming |
| MongoDB | 4.2.0 (Spring Data) | Primary datastore |
| Redis | (Spring Data) | Cache + distributed locks |
| NATS | 0.6.2 | Agent messaging |
| Debezium | (managed) | Change Data Capture |
| gRPC | 1.58.0 | Internal service communication |
| Lombok | 1.18.30 | Boilerplate reduction |

### AI Agent Tooling

| Technology | Version | Role |
|------------|---------|------|
| `@voltagent/core` | 2.7.6 | AI agent orchestration |
| `@ai-sdk/anthropic` | 2.0.80 | Claude AI SDK (Vercel AI) |
| `@anthropic-ai/sdk` | 0.100.1 | Anthropic native SDK |
| `zod` | 4.4.3 | Schema validation |

### Frontend (Next.js App)

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 15 | React framework (App Router) |
| React | 19 | UI library |
| Relay | (included) | GraphQL client |
| TanStack Query | (included) | Server state management |
| `@flamingo-stack/openframe-frontend-core` | (included) | Shared UI components |

---

## Repository Structure

```text
openframe-oss-tenant/
├── openframe/
│   └── services/
│       ├── openframe-api/              # GraphQL + REST API service
│       ├── openframe-authorization-server/  # OAuth2 / OIDC server
│       ├── openframe-gateway/          # Edge gateway
│       ├── openframe-management/       # Operational control plane
│       ├── openframe-stream/           # Kafka event processing
│       ├── openframe-external-api/     # Public REST API
│       ├── openframe-client/           # Client integration layer
│       ├── openframe-config/           # Config server
│       ├── openframe-frontend/         # Next.js frontend
│       └── openframe-test/             # Integration test suite
├── clients/
│   ├── openframe-client/               # Rust device agent
│   └── openframe-chat/                 # Chat client (Tauri)
├── manifests/
│   ├── integrated-tools/               # Kubernetes manifests
│   └── datasources/                    # Data source configs
├── pom.xml                             # Maven parent POM
└── package.json                        # Node.js / AI tooling
```

---

## Getting Started with Development

New to the project? Follow these steps:

1. Read the [Prerequisites](../getting-started/prerequisites.md) guide
2. Follow the [Local Development](setup/local-development.md) guide to set up your environment
3. Review the [Architecture Overview](architecture/README.md) to understand how services interact
4. Read the [Contributing Guidelines](contributing/guidelines.md) before submitting code

---

## Community Support

All development questions, feature requests, and discussions happen in the **OpenMSP Slack community**:

> **Join OpenMSP Slack:** [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
>
> **OpenMSP Community Website:** [https://www.openmsp.ai/](https://www.openmsp.ai/)
