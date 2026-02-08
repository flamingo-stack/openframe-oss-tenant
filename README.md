<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docs/assets/logo-openframe-full-dark-bg.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docs/assets/logo-openframe-full-light-bg.png">
    <img alt="OpenFrame Logo" src="https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docs/assets/logo-openframe-full-light-bg.png" width="400">
  </picture>
</div>

<p align="center">
  <a href="LICENSE.md"><img alt="License" src="https://img.shields.io/badge/LICENSE-FLAMINGO%20AI%20Unified%20v1.0-%23FFC109?style=for-the-badge&labelColor=white"></a>
  <a href="https://github.com/flamingo-stack/openframe-oss-tenant/releases"><img alt="Release" src="https://img.shields.io/github/v/release/flamingo-stack/openframe-oss-tenant?style=for-the-badge&color=%23FFC109&labelColor=white"></a>
  <a href="https://www.flamingo.run/knowledge-base"><img alt="Docs" src="https://img.shields.io/badge/DOCS-flamingo.run-%23FFC109?style=for-the-badge&labelColor=white"></a>
  <a href="https://www.openmsp.ai/"><img alt="Community" src="https://img.shields.io/badge/COMMUNITY-openmsp.ai-%23FFC109?style=for-the-badge&labelColor=white"></a>
</p>

# OpenFrame OSS Tenant

**A distributed platform that creates a unified layer for data, APIs, automation, and AI on top of carefully selected open-source projects. We simplify IT and security operations through a single, cohesive platform.**

OpenFrame is Flamingo's AI-powered MSP platform that replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation (Mingo AI for technicians, Fae for clients). 

## 🎯 Features

- **🤖 Mingo AI Assistant** - Intelligent technician support with enterprise guardrails and real-time troubleshooting
- **🎛️ Unified Dashboard** - Single interface for managing all services, devices, and workflows across your infrastructure  
- **⚡ Smart Automation** - Automated deployment, monitoring, and incident response capabilities
- **🔍 AI-Powered Insights** - Real-time anomaly detection, predictive maintenance, and intelligent assistants  
- **🔒 Enterprise Security** - Multi-tenant architecture with integrated security controls and audit logging
- **📈 High Performance** - Handles 100,000+ events/second with sub-500ms latency using modern microservices
- **🔧 Scalable Architecture** - Built on proven open-source technologies like Spring Boot, Vue.js, and Apache Kafka

## 🎬 Platform Overview

Experience OpenFrame's AI-powered capabilities:

[![OpenFrame v0.4.4: Mingo AI Assistant with Enterprise Guardrails](https://img.youtube.com/vi/mAi4qqA8b00/maxresdefault.jpg)](https://www.youtube.com/watch?v=mAi4qqA8b00)

[![Autonomous AI Agents That Actually Fix Your Infrastructure | OpenFrame v0.5.2](https://img.youtube.com/vi/jEkFcS4AcQ4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jEkFcS4AcQ4)

## 🚀 Quick Start

Get OpenFrame running locally in minutes:

### Prerequisites
- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+

### Installation

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication for Maven packages
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Start infrastructure services
docker compose -f integrated-tools/docker-compose.yml up -d

# Build and start OpenFrame
mvn clean install
./scripts/dev/start-dev.sh
```

### Using OpenFrame CLI

For the complete CLI experience, use the external OpenFrame CLI tools:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

```bash
# Example CLI usage (after installing from external repo)
openframe bootstrap
openframe bootstrap --non-interactive --verbose
```

Once started, OpenFrame will be available at:
- **UI Dashboard:** https://localhost:3000
- **API Gateway:** https://localhost:8080
- **GraphQL Playground:** https://localhost:8080/graphiql

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

| Service | Purpose | Technology |
|---------|---------|------------|
| **Gateway Service** | Unified ingress and security perimeter | Spring Boot 3.3, JWT Auth |
| **API Service** | Internal system-of-record APIs | GraphQL, REST, DataLoaders |
| **Authorization Server** | Tenant-aware OAuth2/OIDC issuer | Spring Security, Multi-tenant |
| **Stream Service** | Real-time event processing | Apache Kafka, Event Sourcing |
| **Management Service** | Platform orchestration and control | Distributed Schedulers |
| **Client Service** | Agent lifecycle and connectivity | WebSocket, Heartbeat Monitoring |

## 📚 Documentation

📖 **[Complete Documentation](./docs/README.md)** - Comprehensive guides, tutorials, and API references

### Quick Links
- [Getting Started Guide](./docs/getting-started/introduction.md) - Learn OpenFrame fundamentals
- [Development Setup](./docs/development/setup/environment.md) - Configure your development environment  
- [Architecture Overview](./docs/reference/architecture/overview.md) - Understand the platform design
- [API References](./docs/reference/architecture/api_service_core/api_service_core.md) - Explore GraphQL and REST APIs

### External Resources
- **OpenFrame CLI**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli) - Command-line interface and tools
- **Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base) - Official documentation
- **Community**: [openmsp.ai](https://www.openmsp.ai/) - Join our Slack community

## 💻 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.3 + Java 21 | Core runtime & APIs |
| **Frontend** | Vue 3 + TypeScript 5.8 | Modern web interface |
| **Client** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Join our [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) on Slack for discussions, support, and collaboration.

## 📊 Screenshots

### Dashboard Overview
<img src="docs/assets/1.%20dashboard.png" alt="Dashboard Overview" width="100%">

### Device Management
<img src="docs/assets/2.%20deviecs.png" alt="Devices" width="100%">

### Policies & Compliance
<img src="docs/assets/5.%20policies.png" alt="Policies & Compliance" width="100%">

## 🗺️ Roadmap

- [x] Core microservices architecture
- [x] GraphQL API with authentication  
- [x] Real-time stream processing
- [x] Cross-platform Rust agent
- [x] Multi-tenant support *(Q2 2025)*
- [x] **Advanced AI/ML integrations** *(Q3 2025)*
- [ ] **Edge computing capabilities** *(Q4 2025)*
- [ ] **Mobile companion app** *(2026)*

## 🔒 Security

OpenFrame implements enterprise-grade security:

- **OAuth 2.0 + JWT** authentication with multi-tenant isolation
- **AES-256** encryption for data at rest and in transit
- **Comprehensive** audit logging and security monitoring
- **Rate limiting** and circuit breakers for API protection
- **Real-time** anomaly detection and threat response

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## ❓ FAQ

<details>
<summary><strong>How does OpenFrame compare to other MSP platforms?</strong></summary>

OpenFrame uniquely combines data processing, API management, and AI capabilities in a single unified platform, while most alternatives focus on just one area. Built on open-source foundations, it eliminates vendor lock-in while providing enterprise-grade features.
</details>

<details>
<summary><strong>What are the minimum hardware requirements?</strong></summary>

For development: 8GB RAM, 4 CPU cores, 20GB storage. For production: 16GB RAM, 8 CPU cores, 100GB storage minimum. OpenFrame scales horizontally across multiple nodes.
</details>

<details>
<summary><strong>Can I integrate OpenFrame with existing infrastructure?</strong></summary>

Yes! OpenFrame is designed to integrate with existing systems through its flexible API layer, standard protocols (REST/GraphQL), and extensive connector ecosystem.
</details>

<details>
<summary><strong>Is commercial support available?</strong></summary>

Yes, enterprise support and managed services are available through [Flamingo](https://www.flamingo.run). Contact us for details on SLAs, professional services, and custom development.
</details>

## 🏆 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Vue.js, Apache Kafka, and many more
- Special thanks to the broader open-source and MSP communities

## 📄 License

This project is licensed under the [The Flamingo AI Unified License v1.0](LICENSE.md).

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>