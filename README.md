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

**A distributed platform that creates a unified layer for data, APIs, automation, and AI on top of carefully selected open-source projects. We simplify IT and security operations through a single, cohesive platform.**

OpenFrame is the tenant-aware, open-source core of the OpenFrame platform, powering Flamingo's AI-driven MSP stack. It brings together all runtime services, shared libraries, and data layers required to operate OpenFrame as a multi-tenant, cloud-native MSP platform.

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

## 🚀 Features

- **🤖 AI-Powered Automation** - Mingo AI for technicians and intelligent assistants for clients
- **🔧 Unified Dashboard** - Single interface for managing all services and workflows
- **📊 Smart Analytics** - Real-time anomaly detection with Apache Pinot and Kafka streams
- **🔒 Enterprise Security** - Multi-tenant OAuth2/OIDC with per-tenant signing keys
- **⚡ High Performance** - Handles 100,000+ events/second with sub-500ms latency
- **🏗️ Scalable Architecture** - Built on proven microservices principles with modern tech stack
- **🔄 Event-Driven Core** - Kafka-based streaming for real-time insights and automation
- **🌐 Multi-Tenant Ready** - Secure isolation and management for multiple organizations

## 🎯 Architecture Overview

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

## ⚡ Quick Start

Get OpenFrame running locally in minutes:

### Prerequisites
- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Docker**: 24.0+ with Docker Compose
- **Maven**: 3.9+

### CLI Bootstrap (Recommended)

The OpenFrame CLI provides the fastest way to get started. The CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

```bash
# Linux
./openframe-linux-amd64 bootstrap
./openframe-linux-amd64 bootstrap --non-interactive --verbose

# Windows
./openframe-windows-amd64.exe bootstrap
./openframe-windows-amd64.exe bootstrap --non-interactive --verbose

# macOS
./openframe bootstrap
./openframe bootstrap --non-interactive --verbose
```

### Manual Setup

For development or custom setups:

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Set up GitHub authentication for Maven dependencies
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# 3. Start infrastructure services
docker compose up -d

# 4. Build backend services
mvn clean install

# 5. Start frontend development server
cd openframe/services/openframe-frontend
npm install && npm run dev

# 6. Build Rust client (optional)
cd ../../client
cargo build --release
```

Once started, OpenFrame will be available at:
- **UI Dashboard**: https://localhost

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## 🏗️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.3 + Java 21 | Core runtime & APIs |
| **Frontend** | Vue 3 + TypeScript 5.0 | Modern web interface |
| **Client** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## 🔒 Security

OpenFrame implements enterprise-grade security:

- **OAuth 2.0 + JWT** authentication with secure HTTP-only cookies
- **Multi-tenant architecture** with per-tenant signing keys and isolation
- **AES-256** encryption for data at rest
- **Comprehensive** audit logging and event tracking
- **Rate limiting** and circuit breakers
- **Real-time** security monitoring and anomaly detection

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

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides including:

- **Getting Started** - Installation, prerequisites, and first steps
- **Development** - Local setup, architecture, and contributing
- **Reference** - Technical specifications and API documentation
- **CLI Tools** - External OpenFrame CLI documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🚀 Roadmap

- [x] Core microservices architecture
- [x] GraphQL API with authentication  
- [x] Real-time stream processing
- [x] Cross-platform Rust agent
- [x] **Multi-tenant support** *(Q2 2025)*
- [x] **Advanced AI/ML integrations** *(Q3 2025)*
- [ ] **Edge computing capabilities** *(Q4 2025)*
- [ ] **Mobile companion app** *(2026)*

## 💡 Screenshots

### Dashboard Overview
<img src="docs/assets/1.%20dashboard.png" alt="Dashboard Overview" width="100%">

### Device Management
<img src="docs/assets/2.%20deviecs.png" alt="Devices" width="100%">

### Policies & Compliance
<img src="docs/assets/5.%20policies.png" alt="Policies & Compliance" width="100%">

## 🌐 Community

Join the OpenMSP community for support and collaboration:

- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [OpenMSP.ai](https://www.openmsp.ai/)
- **OpenFrame**: [openframe.ai](https://openframe.ai)
- **Flamingo Platform**: [flamingo.run](https://flamingo.run)

> **Note**: We manage all development coordination through our OpenMSP Slack community rather than GitHub Issues or Discussions.

## 📋 License

This project is licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Apache Kafka, and many more
- Special thanks to the broader open-source community

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>