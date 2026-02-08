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

**The reference multi-tenant OpenFrame distribution that assembles all OpenFrame service cores, shared libraries, runtime entrypoints, frontend applications, and agent-facing services into a single, production-ready OSS tenant stack.**

A distributed microservices platform that creates a unified layer for data, APIs, automation, and AI on top of carefully selected open-source projects. OpenFrame simplifies IT and security operations through a single, cohesive platform that replaces expensive proprietary MSP software with intelligent automation.

## 🎥 Product Overview

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

[![Autonomous AI Agents That Actually Fix Your Infrastructure | OpenFrame v0.5.2](https://img.youtube.com/vi/jEkFcS4AcQ4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jEkFcS4AcQ4)

## ✨ Features

- **🤖 AI-Powered Automation** - Autonomous incident triage, alert management, and intelligent troubleshooting with Mingo AI for technicians and Fae for clients
- **🔧 Unified Tool Integration** - Single interface for managing all MSP services and workflows, replacing expensive proprietary software
- **🛡️ Enterprise Security** - OAuth2/OIDC authentication, multi-tenant isolation, and integrated security controls across all services
- **📊 Real-Time Processing** - Event-driven architecture handling 100,000+ events/second with sub-500ms latency
- **⚡ High Performance** - Built on proven microservices principles with Spring Boot, Apache Kafka, and modern data stores
- **📱 Cross-Platform Clients** - Web UI, desktop chat client (Tauri/Rust), and cross-platform agents

## 🏗️ Architecture

OpenFrame uses a modern microservices architecture with four key layers:

```mermaid
flowchart TB
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
| **Frontend** | Next.js 15 + React 19 + TypeScript 5.8 | Modern web interface |
| **Client** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## 🚀 Quick Start

### Prerequisites

- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+

### CLI Usage

The OpenFrame CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

```bash
# Bootstrap a new OpenFrame installation
./openframe bootstrap

# Non-interactive mode with verbose output
./openframe bootstrap --non-interactive --verbose
```

### Local Development

> **Note:** This project depends on `openframe-oss-lib` (version defined in `pom.xml` as `<openframe.libs.version>`). Maven authentication via GitHub Packages is required - set `GITHUB_ACTOR` and `GITHUB_TOKEN` environment variables before building.

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication for Maven
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Build backend services
mvn clean install

# Start frontend development server
cd openframe/services/openframe-frontend
npm install && npm run dev

# Build Rust agent
cd ../../client
cargo build --release
```

Once started, OpenFrame will be available at:
- **UI Dashboard:** https://localhost

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides covering:

- **Getting Started** - Quick setup and basic concepts
- **Development** - Local environment setup and contribution guidelines  
- **Reference** - Technical architecture and API documentation
- **Diagrams** - Visual architecture documentation

### Key Documentation Sections

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/README.md#getting-started) | Quick start guide and basic concepts |
| [Architecture](./docs/README.md#reference) | System design and components |
| [Development Setup](./docs/README.md#development) | Local development environment |
| [CLI Tools](https://github.com/flamingo-stack/openframe-cli) | External CLI repository |

## 🏢 What This Repository Contains

At a high level, `openframe-oss-tenant` provides:

- ✅ **Service Entrypoints** (Spring Boot applications)
- ✅ **Service Core Libraries** (API, Auth, Gateway, Stream, Management, Client)
- ✅ **Shared Infrastructure Layers** (Mongo, Redis, Kafka, Security)
- ✅ **Frontend Applications** (Web UI, Desktop Chat Client)
- ✅ **Agent & Tool Connectivity Services**
- ✅ **Multi-tenant security and OAuth foundations**

This repo does **not** duplicate business logic. Instead, it **composes and wires together** the OpenFrame OSS building blocks into runnable services.

## 🔧 Core Service Domains

| Domain | Module | Purpose |
|--------|--------|---------|
| **API Service Core** | Internal APIs & GraphQL | Business logic and GraphQL API |
| **Authorization Service Core** | OAuth2 / OIDC / SSO | Authentication and authorization |
| **Gateway Service Core** | Ingress, routing, security | API gateway and traffic management |
| **External API Service Core** | Public API (API keys) | External tool integrations |
| **Management Service Core** | Platform automation | Admin operations and scheduling |
| **Stream Service Core** | Event processing | Real-time data processing |
| **Client Agent Service Core** | Agent lifecycle | Device and agent management |

## 🛡️ Key Design Principles

- **Gateway-first security** - All HTTP and WebSocket traffic flows through the Gateway where authentication, authorization, CORS, rate limits, and tenant isolation are enforced
- **Thin services, strong cores** - Entrypoints contain almost no logic. All behavior lives in reusable service-core libraries
- **Multi-tenant by default** - Tenant context is enforced across OAuth, JWTs, Kafka, MongoDB, Redis, and caches
- **Event-driven backbone** - Kafka, Debezium, and Stream Service Core normalize events across tools and agents

## 🧪 Running Tests

```bash
# Java backend tests
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm run type-check

# Rust client tests
cd client
cargo test
```

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🌍 Community

OpenFrame is developed by the OpenMSP community. Join us for discussions, support, and contributions:

- 🗣️ **OpenMSP Slack**: [https://www.openmsp.ai/](https://www.openmsp.ai/)
- 💬 **Join Community**: [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

> **Note**: We don't use GitHub Issues or GitHub Discussions. All coordination happens in the OpenMSP Slack community.

## 📄 License

This project is licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Apache Kafka, and many more
- Special thanks to the broader open-source community

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>