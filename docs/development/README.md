# Development Documentation

Welcome to the OpenFrame OSS Tenant development documentation. This section covers everything you need to contribute to and work with the platform.

---

## Overview

OpenFrame OSS Tenant is a polyglot platform built across two primary technology stacks:

- **Java / Spring Boot 3.3** — Backend microservices (API, Gateway, Auth, Stream, Management, Client Service)
- **Rust** — Cross-platform endpoint agent (`openframe-client`)

This documentation section guides you through setting up your development environment, understanding the architecture, and contributing code effectively.

---

## Quick Navigation

### Setup & Environment

| Guide | Description |
|---|---|
| [Environment Setup](setup/environment.md) | IDE recommendations, extensions, and toolchain configuration |
| [Local Development](setup/local-development.md) | Clone, run, debug, and develop locally |

### Architecture

| Guide | Description |
|---|---|
| [Architecture Overview](architecture/README.md) | High-level diagrams, component relationships, and data flows |

### Standards & Quality

| Guide | Description |
|---|---|
| [Security Guidelines](security/README.md) | Auth patterns, secrets management, input validation |
| [Testing Overview](testing/README.md) | Test structure, running tests, writing new tests |
| [Contributing Guidelines](contributing/guidelines.md) | Code style, branch naming, PR process, commit format |

---

## Technology Stack at a Glance

### Backend Services

| Service | Tech | Port |
|---|---|---|
| `openframe-api` | Spring Boot 3.3 + Netflix DGS (GraphQL) | 8080 |
| `openframe-gateway` | Spring Cloud Gateway | 8081 |
| `openframe-authorization-server` | Spring Authorization Server (OAuth2/OIDC) | 8082 |
| `openframe-external-api` | Spring Boot REST | 8083 |
| `openframe-client` (service) | Spring Boot + NATS | 8084 |
| `openframe-stream` | Spring Boot + Kafka Streams | 8085 |
| `openframe-management` | Spring Boot | — |
| `openframe-config` | Spring Cloud Config Server | — |

### Client Applications

| Application | Tech | Purpose |
|---|---|---|
| `clients/openframe-client` | Rust | Cross-platform endpoint agent |

### Infrastructure

| Component | Purpose |
|---|---|
| MongoDB | Primary document store (multi-tenant, tenant-scoped collections) |
| Apache Kafka | Event streaming between services |
| NATS JetStream | Real-time agent ↔ platform messaging |
| Apache Cassandra | Time-series log and command result storage |
| Apache Pinot | Real-time analytics |
| Redis | Cache, session storage, rate limiting |

---

## Key Shared Libraries

The `openframe-oss-lib` dependency (version `5.64.0` at time of writing) provides shared Java libraries consumed by all Spring Boot services:

| Library | Purpose |
|---|---|
| `openframe-core` | Core utilities, validation, pagination |
| `openframe-security-core` | JWT validation, `AuthPrincipal`, cookie service |
| `openframe-data-mongo-common` | MongoDB documents, repositories, tenant scoping |
| `openframe-api-service-core` | GraphQL data fetchers, controllers, mappers |
| `openframe-gateway-service-core` | Gateway filters, WebSocket proxy, rate limiting |
| `openframe-authorization-service-core` | OAuth2/OIDC controllers, SSO flows |
| `openframe-data-kafka` | Kafka producers, retry, tenant-aware configuration |
| `openframe-data-nats` | NATS publishers, notification broadcaster |

---

## Getting Help

All development questions, issues, and discussions are handled in the **OpenMSP Slack community** — GitHub Issues and Discussions are not used.

- **Join:** [https://www.openmsp.ai/](https://www.openmsp.ai/)
- **Invite link:** [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
