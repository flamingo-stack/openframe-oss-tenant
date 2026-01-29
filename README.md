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

OpenFrame is the unified AI-powered MSP platform that replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation. Part of the [Flamingo](https://flamingo.run) ecosystem, OpenFrame integrates multiple MSP tools into a single AI-driven interface, automating IT support operations across the entire technology stack.

## 🎥 Platform Overview

Watch our comprehensive product preview to see OpenFrame in action:

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

## ✨ Key Features

- **🔧 Unified Dashboard** - Single interface for managing all services and workflows with real-time monitoring
- **🤖 Smart Automation** - AI-powered deployment, monitoring, and intelligent assistants (Mingo AI for technicians, Fae for clients)
- **🔒 Enterprise Security** - OAuth 2.0 + JWT authentication, AES-256 encryption, multi-tenant isolation
- **⚡ High Performance** - Handles 100,000+ events/second with sub-500ms latency using modern microservices
- **📊 AI-Powered Insights** - Real-time anomaly detection, predictive analytics, and proactive issue identification
- **🔌 Tool Integration** - Native support for TacticalRMM, Fleet MDM, MeshCentral, Authentik, and custom integrations

## 🚀 Quick Start

Get OpenFrame running locally in minutes:

### CLI Installation

```bash
# Linux
./cli/openframe-linux-amd64 bootstrap
./cli/openframe-linux-amd64 bootstrap --non-interactive --verbose

# Windows  
./cli/openframe-windows-amd64.exe bootstrap
./cli/openframe-windows-amd64.exe bootstrap --non-interactive --verbose

# macOS
./cli/openframe bootstrap
./cli/openframe bootstrap --non-interactive --verbose
```

Once started, OpenFrame will be available at:
- **UI Dashboard:** https://localhost

For detailed installation, CLI commands, and configuration options, see our [Quick Start Guide](./docs/getting-started/quick-start.md).

## 🏗 Architecture Overview

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

## 🛠 Technology Stack

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

## 🎯 Benefits for MSPs

### 💰 Cost Reduction
- Replace expensive per-seat licensing with open-source tools
- Eliminate vendor lock-in and reduce dependency on proprietary solutions
- Lower total cost of ownership through intelligent automation

### ⚡ Operational Efficiency
- Unified interface reduces context switching between tools
- Automated workflows minimize repetitive manual tasks
- AI assistance accelerates problem resolution and decision-making

### 🚀 Scalability
- Multi-tenant architecture supports organic business growth
- API-driven integrations adapt to changing client needs
- Cloud-native design ensures reliable horizontal scaling

## 🔧 Development Setup

### Prerequisites
- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Rust:** 1.70+ with Cargo
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+

### Local Development

> **Note:** This project depends on `openframe-oss-lib` (version defined in `pom.xml` as `<openframe.libs.version>`). Maven authentication via GitHub Packages is required - set `GITHUB_ACTOR` and `GITHUB_TOKEN` environment variables before building.

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication
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

### Running Tests
```bash
# Java tests
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm run type-check

# Rust tests  
cd client
cargo test
```

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides, architecture details, and API references.

### Quick Links
| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started/introduction.md) | Quick start guide and basic concepts |
| [Architecture](./docs/development/architecture/overview.md) | System design and components |
| [Development Setup](./docs/development/setup/environment.md) | Local development environment |
| [Contributing](./docs/development/contributing/guidelines.md) | How to contribute code |
| [API Reference](./docs/api/README.md) | GraphQL schema and endpoints |

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🌐 Community and Support

OpenFrame is part of the broader OpenMSP community:

- **🗨️ OpenMSP Slack Community**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **🌐 Platform Website**: https://www.flamingo.run/openframe  
- **🏠 OpenMSP Hub**: https://www.openmsp.ai/

> 🔗 **Note**: We don't use GitHub Issues or GitHub Discussions. All support, feature requests, and community discussions happen in our OpenMSP Slack workspace.

## 🔒 Security

OpenFrame takes security seriously with enterprise-grade protection:

- **OAuth 2.0 + JWT** authentication with HTTP-only cookies
- **AES-256** encryption for data at rest
- **Comprehensive** audit logging across all services
- **Multi-tenant** isolation and data segregation
- **Rate limiting** and circuit breakers for API protection
- **Real-time** security monitoring and threat detection

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## 📈 Roadmap

- [x] Core microservices architecture
- [x] GraphQL API with authentication  
- [x] Real-time stream processing
- [x] Cross-platform Rust agent
- [x] **Multi-tenant support** *(Q2 2025)*
- [x] **Advanced AI/ML integrations** *(Q3 2025)*
- [ ] **Edge computing capabilities** *(Q4 2025)*
- [ ] **Mobile companion app** *(2026)*

## 📄 License

This project is licensed under the [The Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Apache Kafka, Vue.js, and many more
- Special thanks to the broader open-source community for their continued support

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>