<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docs/assets/logo-openframe-full-dark-bg.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docs/assets/logo-openframe-full-light-bg.png">
    <img alt="OpenFrame Logo" src="https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docs/assets/logo-openframe-full-light-bg.png" width="400">
  </picture>
</div>

<p align="center">
  <a href="LICENSE.md"><img alt="License" src="https://img.shields.io/badge/LICENSE-FLAMINGO%20AI%20Unified%20v1.0-%23FFC109?style=for-the-badge&labelColor=white"></a>
</p>

# OpenFrame OSS Tenant

**The multi-tenant, open-source backbone of the OpenFrame platform** — a unified AI-powered MSP platform that consolidates your IT management tools into a single, intelligent interface.

OpenFrame replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation (**Mingo AI** for technicians, **Fae AI** for clients), providing a complete MSP solution built on proven open-source technologies.

## Overview

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

OpenFrame is the flagship product of [Flamingo's](https://flamingo.run) open-source MSP stack. This repository contains the **complete, production-grade OpenFrame backend** that powers:

- **Identity and Multi-Tenant Security** — OAuth2, OIDC, SSO with complete tenant isolation
- **Gateway-First Architecture** — Secure API routing and WebSocket support
- **Event-Driven Data Pipelines** — Real-time stream processing with Kafka and Apache Pinot
- **Unified APIs** — Internal GraphQL and external REST APIs for integrations
- **AI-Ready Infrastructure** — Supporting Mingo and Fae AI assistants
- **Client Agent Support** — Cross-platform Rust agents with secure communication

## Features

### 🚀 **Core Platform**
- **Unified Dashboard** — Single interface managing all MSP tools and workflows
- **Multi-Tenant Architecture** — Secure organization isolation with full SSO support
- **Real-Time Analytics** — Live dashboards powered by Apache Pinot and Kafka streams
- **Event-Driven Processing** — 100,000+ events/second with sub-500ms latency

### 🤖 **AI-Powered Automation**
- **Mingo AI Assistant** — Autonomous ticket triage and infrastructure monitoring
- **Fae AI Client Portal** — Self-service support with intelligent chat assistance
- **Predictive Analytics** — Proactive issue detection and resolution recommendations
- **Smart Workflows** — Automated deployment and monitoring capabilities

### 🔧 **Tool Integration**
- **Device Management** — Unified monitoring across Windows, macOS, Linux platforms
- **Remote Access** — Browser-based remote desktop and file management
- **Security Controls** — Integrated security controls across all connected services
- **Custom Integrations** — Flexible API layer for existing tool integration

### 🏗️ **Enterprise Architecture**
- **Microservices Design** — Gateway, API, Auth, Stream, Management services
- **High Availability** — Circuit breakers, rate limiting, and fault tolerance
- **Scalable Infrastructure** — Built on Spring Boot 3.3, Apache Kafka, MongoDB
- **Multi-Platform Agents** — Rust-based cross-platform system agents

## Quick Start

### Using the CLI

The OpenFrame CLI provides the fastest way to get started:

```bash
# Get the CLI from the external repository
# See: https://github.com/flamingo-stack/openframe-cli

# Linux/macOS
curl -sSL https://install.openframe.ai | bash
openframe bootstrap

# Windows
# Download from: https://github.com/flamingo-stack/openframe-cli/releases
openframe.exe bootstrap --non-interactive
```

### Manual Setup

For development or custom deployments:

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication for dependencies
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Build and run backend services
mvn clean install
mvn spring-boot:run

# Start frontend (separate terminal)
cd openframe/services/openframe-frontend
npm install && npm run dev

# Build system agents
cd client
cargo build --release
```

Once started, OpenFrame will be available at `https://localhost`

## Architecture

OpenFrame uses a modern microservices architecture with event-driven data processing:

```mermaid
flowchart TD
    Client[Client Applications] --> LB[Load Balancer]
    LB --> Gateway[API Gateway]
    
    subgraph "Gateway Layer"
        Gateway --> GraphQL[GraphQL Engine]
        Gateway --> Auth[Auth Service]
    end
    
    subgraph "Processing Layer"
        Stream[Stream Processing] --> Kafka[Apache Kafka]
        Kafka --> |Analytics| Pinot[Apache Pinot]
        Kafka --> |Storage| Cassandra[Cassandra]
    end
    
    subgraph "Data Layer"
        GraphQL --> MongoDB[(MongoDB)]
        GraphQL --> Cassandra
        GraphQL --> Pinot
        GraphQL --> Redis[(Redis Cache)]
    end
    
    subgraph "Infrastructure Layer"
        Loki       --> Grafana
        Prometheus --> Grafana
    end
    
    style Gateway fill:#FFC109,stroke:#1A1A1A,color:#FAFAFA
    style Stream fill:#666666,stroke:#1A1A1A,color:#FAFAFA
    style MongoDB fill:#212121,stroke:#1A1A1A,color:#FAFAFA
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.3 + Java 21 | Core runtime & APIs |
| **Frontend** | Vue 3 + TypeScript | Modern web interface |
| **Client** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## AI Innovation Showcase

See how autonomous AI agents are transforming MSP operations:

[![Autonomous AI Agents That Actually Fix Your Infrastructure | OpenFrame v0.5.2](https://img.youtube.com/vi/jEkFcS4AcQ4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jEkFcS4AcQ4)

## Documentation

📚 **Complete documentation is available in the [docs](./docs/README.md) directory.**

### Quick Links
- **[Getting Started Guide](./docs/getting-started/introduction.md)** — New user introduction and setup
- **[Development Setup](./docs/development/setup/environment.md)** — Local development environment
- **[Architecture Overview](./docs/development/architecture/overview.md)** — System design and components
- **[API Reference](./docs/reference/architecture/api_service_core/api_service_core.md)** — GraphQL schema and endpoints
- **[Contributing Guide](CONTRIBUTING.md)** — How to contribute to the project

### External Resources
- **[OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli)** — Command-line tools (separate repository)
- **[Community](https://www.openmsp.ai/)** — Join the OpenMSP Slack community
- **[Knowledge Base](https://www.flamingo.run/knowledge-base)** — Comprehensive guides and tutorials
- **[Flamingo Platform](https://www.flamingo.run)** — Enterprise support and hosted services

## Community and Support

- 💬 **[OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** — Get support and connect with other users
- 📖 **[Knowledge Base](https://www.flamingo.run/knowledge-base)** — Comprehensive documentation
- 🐛 **Issues** — Report bugs and request features via GitHub Issues
- 🚀 **[Flamingo Platform](https://www.flamingo.run)** — Enterprise support and hosted services

## Security

OpenFrame takes security seriously:

- **OAuth 2.0 + JWT** authentication with complete tenant isolation
- **AES-256** encryption for data at rest
- **Real-time** security monitoring and audit logging  
- **Rate limiting** and circuit breakers for DDoS protection
- **Multi-tenant** data isolation at all layers

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup and workflow
- Code standards and testing requirements
- Pull request process
- Community guidelines

## License

This project is licensed under the [The Flamingo AI Unified License v1.0](LICENSE.md) — allowing free use with attribution while supporting sustainable open-source development.

## Roadmap

- [x] Core microservices architecture
- [x] GraphQL API with authentication  
- [x] Real-time stream processing
- [x] Cross-platform Rust agents
- [x] Multi-tenant support
- [x] **Advanced AI/ML integrations** 
- [ ] **Edge computing capabilities** *(Q4 2025)*
- [ ] **Mobile companion app** *(2026)*

---
<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>