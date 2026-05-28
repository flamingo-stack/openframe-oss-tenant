# Development Documentation

Welcome to the OpenFrame OSS Tenant development documentation. This section contains everything you need to understand, set up, and contribute to the platform.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

---

## Overview

OpenFrame OSS Tenant is a multi-service Java backend platform built with:

- **Java 21** + **Spring Boot 3.3** + **Spring Cloud**
- **Maven** multi-module project structure
- **MongoDB** primary persistence with Redis caching
- **Apache Kafka** event streaming
- **NATS** real-time messaging
- **Netflix DGS** GraphQL framework
- **Spring WebFlux** reactive gateway

The repository contains 9 microservices, shared library dependencies, Rust-based agent clients, and a Next.js frontend service.

---

## Documentation Index

| Section | Description |
|---------|-------------|
| [Environment Setup](./setup/environment.md) | IDE configuration, developer tools, editor plugins |
| [Local Development](./setup/local-development.md) | Clone, build, run locally, debug configuration |
| [Architecture Overview](./architecture/README.md) | High-level architecture, component map, data flows |
| [Security Guidelines](./security/README.md) | Auth patterns, secrets management, security best practices |
| [Testing Guide](./testing/README.md) | Test structure, running tests, writing new tests |
| [Contributing Guidelines](./contributing/guidelines.md) | Code style, PR process, commit format |

---

## Quick Navigation

### For New Developers

1. Start with [Environment Setup](./setup/environment.md) to configure your IDE
2. Follow [Local Development](./setup/local-development.md) to get the stack running
3. Read [Architecture Overview](./architecture/README.md) to understand the system

### For Contributors

1. Review [Contributing Guidelines](./contributing/guidelines.md) for code standards
2. Check [Testing Guide](./testing/README.md) before submitting a PR
3. Follow [Security Guidelines](./security/README.md) for security-sensitive changes

### For Operators

1. Review [Architecture Overview](./architecture/README.md) for service dependencies
2. Check [Security Guidelines](./security/README.md) for production hardening

---

## Repository Structure

```text
openframe-oss-tenant/
├── openframe/
│   └── services/
│       ├── openframe-api/              # GraphQL + REST API Service
│       ├── openframe-authorization-server/  # OAuth2/OIDC Server
│       ├── openframe-client/           # Java Agent Client Service
│       ├── openframe-config/           # Spring Cloud Config Server
│       ├── openframe-external-api/     # External REST API
│       ├── openframe-frontend/         # Next.js frontend application
│       ├── openframe-gateway/          # Reactive Gateway (WebFlux)
│       ├── openframe-management/       # Management Control Plane
│       ├── openframe-stream/           # Kafka Stream Processing
│       └── openframe-test/             # Integration Test Runner
├── clients/
│   ├── openframe-chat/                 # Tauri desktop chat client
│   └── openframe-client/               # Rust-based device agent
├── manifests/
│   ├── integrated-tools/               # Kubernetes configs for tools
│   └── datasources/                    # Datasource Kubernetes configs
├── pom.xml                             # Maven parent POM
└── package.json                        # Node.js tooling (documentation)
```

---

## Community & Support

All development discussions happen on the **OpenMSP Slack community**:

- 💬 **Slack**: [Join OpenMSP](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🌐 **Website**: [https://www.openmsp.ai/](https://www.openmsp.ai/)

> **Note:** We do not use GitHub Issues or GitHub Discussions. All questions, bug reports, and feature requests go through the OpenMSP Slack community.
