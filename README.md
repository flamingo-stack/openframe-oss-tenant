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

**A distributed platform that creates a unified layer for data, APIs, automation, and AI on top of carefully selected open-source projects.** OpenFrame simplifies IT and security operations through a single, cohesive platform designed for MSP environments.

This repository contains the **open-source, tenant-aware backend stack** that powers OpenFrame and the Flamingo AI MSP platform. It provides a complete, production-grade foundation for building multi-tenant MSP platforms with strict tenant isolation, horizontal scalability, and event-driven automation.

## 🎬 Product Overview

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

[![Autonomous AI Agents That Actually Fix Your Infrastructure | OpenFrame v0.5.2](https://img.youtube.com/vi/jEkFcS4AcQ4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jEkFcS4AcQ4)

## ✨ Highlights

- **🎯 Unified Dashboard** - Single interface for managing all services and workflows
- **🤖 Smart Automation** - Automated deployment and monitoring capabilities with AI-powered insights
- **🔒 Enterprise Security** - Integrated security controls across all services with OAuth2/OIDC
- **⚡ High Performance** - Handles 100,000+ events/second with sub-500ms latency
- **📈 Scalable Architecture** - Built on proven microservices principles with event-driven design
- **🔧 Multi-tenant Ready** - Strict tenant isolation at identity, data, and messaging layers

## 🚀 Quick Start

Get OpenFrame running locally in **5 minutes**:

### Prerequisites
- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose up -d mongodb kafka redis cassandra pinot

# 3. Build the platform (grab a coffee ☕)
mvn clean install -DskipTests

# 4. Start OpenFrame services
./scripts/run-mac.sh --silent        # macOS
./scripts/run-linux.sh --silent      # Linux  
./scripts/run-windows.ps1 -Silent    # Windows PowerShell

# 5. Start frontend development server
cd openframe/services/openframe-frontend
npm install && npm run dev
```

### Access the Platform
- **Main Platform**: http://localhost:8080 (API Gateway)
- **Frontend Dev**: http://localhost:3000 (Vue.js development server)
- **GraphQL Playground**: http://localhost:8082/graphiql (API exploration)

For detailed setup instructions and troubleshooting, see our [Quick Start Guide](./docs/getting-started/quick-start.md).

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

### Core Services

- **Gateway Service** - Edge routing, security enforcement, WebSocket proxying
- **Authorization Server** - Multi-tenant OAuth2/OIDC Identity Provider  
- **API Service** - Internal REST + GraphQL API layer
- **Client Service** - Agent and machine interaction layer
- **Management Service** - Platform control plane and automation
- **Stream Service** - Real-time event ingestion and enrichment

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.3 + Java 21 | Core runtime & APIs |
| **Frontend** | Vue.js 3 + TypeScript 5.8 | Modern web interface |
| **Client** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides including:

- **Getting Started** - Introduction, prerequisites, and quick start
- **Development** - Environment setup, architecture, and contribution guidelines  
- **Reference** - Technical documentation and architecture details
- **Deployment** - Production deployment guides
- **API Reference** - GraphQL schema and REST endpoints

### External Dependencies

**OpenFrame CLI Tools** is maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [CLI Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

> **Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

OpenFrame takes security seriously with comprehensive security measures:

- **OAuth 2.0 + JWT** authentication
- **AES-256** encryption for data at rest
- **Multi-tenant** isolation
- **Rate limiting** and circuit breakers
- **Real-time** security monitoring

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## 💬 Community & Support

**Join our OpenMSP Slack Community:**
🔗 https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> **Note**: We don't use GitHub Issues or GitHub Discussions. All support and community interaction happens in our Slack community.

## 📄 License

This project is licensed under the [The Flamingo AI Unified License v1.0](LICENSE.md).

## 🎯 What This Enables

- ✅ Fully open-source MSP backend stack
- ✅ Multi-tenant SaaS or self-hosted deployments
- ✅ Secure identity and SSO at scale
- ✅ Agent-based device management
- ✅ Event-driven automation and analytics
- ✅ Extensible architecture without forking core services

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Apache Kafka, Vue.js, and many more
- Special thanks to the broader open-source community

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>