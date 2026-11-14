# Project Documentation

Welcome to the documentation for **OpenFrame OSS Tenant** — the tenant-facing service and deployment repository for [OpenFrame](https://openframe.ai), [Flamingo](https://flamingo.run)'s unified, AI-driven MSP platform. This repository assembles independently-deployable Spring Boot services (API, authorization server, client, config, external API, gateway, management, stream) plus a Rust client component, together with the Kubernetes manifests used to deploy them.

## 📚 Table of Contents

### Getting Started
- [Introduction](./getting-started/introduction.md) - **OpenFrame OSS Tenant** is the tenant-facing service and deployment repository for [OpenFrame](https://openframe.ai), the unified, AI-driven platform from Flamingo
- [Prerequisites](./getting-started/prerequisites.md) - What you need installed and configured before working with this repository
- [Quick Start](./getting-started/quick-start.md) - Gets you from a clean checkout to a running OpenFrame API service (and a quick look at the rest of the stack) in about 5 minutes
- [First Steps](./getting-started/first-steps.md) - You have an OpenFrame OSS Tenant environment deployed — the gateway, authorization server, API, client, management, stream, external API, and config services are running

### Development
- [Development](./development/README.md) - The entry point for everything you need to build, run, and contribute to the **OpenFrame OSS Tenant** repository
- [Architecture Overview](./development/architecture/README.md) - OpenFrame OSS Tenant is the tenant-facing service and deployment repository for OpenFrame, Flamingo's unified AI-driven MSP platform
- [Contributing Guidelines](./development/contributing/guidelines.md) - OpenFrame OSS Tenant is the tenant-facing service and deployment repository for OpenFrame, Flamingo's unified AI-driven MSP platform
- [Security](./development/security/README.md) - Describes the security model that applies to the OpenFrame OSS Tenant repository: how the tenant services authenticate and authorize requests
- [Development Environment Setup](./development/setup/environment.md) - Covers how to set up a local development environment for **OpenFrame OSS Tenant**
- [Local Development](./development/setup/local-development.md) - Walks through cloning OpenFrame OSS Tenant, building its Spring Boot services and Rust client, running services locally, enabling hot reload

### Reference

Reference docs are in `./reference/architecture/`:

- [OpenFrame OSS Tenant](./reference/architecture/README.md) - OpenFrame OSS Tenant is the tenant-facing service and deployment repository for OpenFrame, Flamingo's unified AI-driven MSP platform
- [Ecosystem: OpenFrame OSS Tenant](./reference/architecture/ecosystem.md) - OpenFrame OSS Tenant is a **service** (bash, java, rust)
- [Api Service Core](./reference/architecture/api-service-core/api-service-core.md) - The Spring Boot entry point for the OpenFrame API service
- [Authorization Server Core](./reference/architecture/authorization-server-core/authorization-server-core.md) - The Spring Boot entry point for OpenFrame's OAuth2 and OpenID Connect authorization service
- [Client Service Core](./reference/architecture/client-service-core/client-service-core.md) - The Spring Boot entry point for the OpenFrame client service
- [Config Server Core](./reference/architecture/config-server-core/config-server-core.md) - The OpenFrame service entry point for centralized runtime configuration
- [External Api Service](./reference/architecture/external-api-service/external-api-service.md) - The servlet-based OpenFrame boundary for programmatic access authenticated with API keys
- [Gateway Service Core](./reference/architecture/gateway-service-core/gateway-service-core.md) - The reactive edge service for an OpenFrame tenant deployment
- [Management Service Core](./reference/architecture/management-service-core/management-service-core.md) - The Spring Boot entry point for the OpenFrame management service
- [Stream Service Core](./reference/architecture/stream-service-core/stream-service-core.md) - The Spring Boot service that consumes inbound log events from Kafka
  - [Application Bootstrap](./reference/architecture/stream-service-core/stream-service-core/application_bootstrap/application_bootstrap.md) - Contains `StreamApplication`, the executable entry point for Stream Service Core
  - [Log Event Consumption](./reference/architecture/stream-service-core/stream-service-core/log_event_consumption/log_event_consumption.md) - Contains `LogsEventListener`, the Kafka-facing consumer for the inbound log-event stream

### Diagrams

Visual documentation - View Mermaid diagrams in: `./diagrams/architecture/`

These `.mmd` files cover the published services and their internal components, including `README.mmd` (and variants), `api-service-core.mmd` (and variants), `authorization-server-core.mmd` (and variants), `client-service-core.mmd` (and variants), `config-server-core.mmd` (and variants), `external-api-service.mmd` (and variants), `gateway-service-core.mmd` (and variants), `management-service-core.mmd` (and variant), `stream-service-core.mmd` (and variant), `application_bootstrap.mmd`, and `log_event_consumption.mmd` (and variant).

### CLI Tools

The OpenFrame CLI tools is maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

### Other Documentation

Documentation coming soon.

## 🔗 Ecosystem

OpenFrame OSS Tenant publishes nine Maven artifacts (`openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test`) and one Cargo crate (`openframe_client`). It depends on 22 pinned artifacts from [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib), including `fleetmdm`, `openframe-api-lib`, `openframe-core`, `openframe-security-core`, and the Rust crate `openframe_agent_lib`. See the [Ecosystem reference](./reference/architecture/ecosystem.md) for the full dependency and delivery-chain tables.

## 📖 Quick Links
- [Project README](../README.md) - Main project README
- [Contributing](../CONTRIBUTING.md) - How to contribute
- [License](../LICENSE.md) - License information

---
*Documentation generated by [🦩 Flamingo Code Documentation](https://flamingo.run)*
