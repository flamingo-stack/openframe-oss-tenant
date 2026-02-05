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

OpenFrame is the multi-tenant, open-source backbone of Flamingo's AI-powered MSP stack. It assembles reusable OSS core libraries and service applications into a production-grade, tenant-aware microservice platform for IT operations, automation, and integrations.

## 🎬 Product Overview

See OpenFrame in action and discover how we're revolutionizing MSP operations with AI automation:

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

[![Autonomous AI Agents That Actually Fix Your Infrastructure | OpenFrame v0.5.2](https://img.youtube.com/vi/jEkFcS4AcQ4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jEkFcS4AcQ4)

## ✨ Key Features

- **🔄 Unified Dashboard** - Single interface for managing all services and workflows  
- **🤖 AI-Powered Automation** - Mingo AI for technicians, Fae AI for clients with autonomous incident resolution
- **🔒 Enterprise Security** - Multi-tenant OAuth2/OIDC with JWT authentication and role-based access control
- **⚡ High Performance** - Handles 100,000+ events/second with sub-500ms latency via reactive microservices
- **📊 Real-Time Processing** - Apache Kafka-based event streaming for instant notifications and live updates
- **🏗️ Microservices Architecture** - Built on proven Spring Boot, MongoDB, and cloud-native principles
- **🔗 External Integrations** - Secure API-key based access for external tools and third-party systems
- **📈 Smart Analytics** - Real-time anomaly detection and intelligent insights powered by stream processing

## 🏛️ Architecture Overview

OpenFrame implements a modern microservices architecture with four key layers:

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

### Core Service Components

| Service | Purpose | Technology Stack |
|---------|---------|------------------|
| **Gateway Service** | Secure edge gateway, routing, authentication | Spring WebFlux, JWT |
| **API Service** | GraphQL/REST APIs for core domains | Spring Boot, Netflix DGS |
| **Authorization Server** | Multi-tenant OAuth2/OIDC identity server | Spring Authorization Server |
| **Stream Service** | Real-time event processing and enrichment | Spring Kafka, Reactive Streams |
| **External API Service** | Public API-key secured REST endpoints | Spring WebFlux, OpenAPI |

## 🚀 Quick Start

Get OpenFrame running locally in minutes:

### Prerequisites

- **Java 21** (OpenJDK 21.0.1+)
- **Docker & Docker Compose** (24.0+)  
- **Maven 3.9+**
- **Git 2.42+**

### CLI Bootstrap (Recommended)

The fastest way to get started is with the OpenFrame CLI:

```bash
# Download and run bootstrap
curl -fsSL https://raw.githubusercontent.com/flamingo-stack/openframe-cli/main/install.sh | sh
openframe bootstrap

# Or with options
openframe bootstrap --non-interactive --verbose
```

> **📖 CLI Documentation**: The OpenFrame CLI is maintained in a separate repository at [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli). See the [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation) and [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs).

### Manual Development Setup

For development and customization:

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication (required for openframe-oss-lib dependency)
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Build and start services
mvn clean install
docker-compose up -d

# Start frontend (optional)
cd openframe/services/openframe-frontend
npm install && npm run dev
```

Once started, OpenFrame will be available at:
- **UI Dashboard:** https://localhost:8080
- **GraphQL Playground:** https://localhost:8080/graphql
- **API Documentation:** https://localhost:8080/swagger-ui.html

## 🖼️ Platform Screenshots

### Dashboard Overview
<img src="docs/assets/1.%20dashboard.png" alt="Dashboard Overview" width="100%">

### Device Management
<img src="docs/assets/2.%20deviecs.png" alt="Device Management" width="100%">

### Policies & Compliance
<img src="docs/assets/5.%20policies.png" alt="Policies & Compliance" width="100%">

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.3 + Java 21 | Core runtime & APIs |
| **Frontend** | Next.js 15 + React 19 + TypeScript 5.8 | Modern web interface |
| **Client** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Apache Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides and technical references.

### Quick Links

| Resource | Description |
|----------|-------------|
| [Getting Started](./docs/getting-started/introduction.md) | Introduction to OpenFrame and basic concepts |
| [Quick Start](./docs/getting-started/quick-start.md) | Get running in 5 minutes |
| [Development Setup](./docs/development/setup/environment.md) | Set up your development environment |
| [Architecture Guide](./docs/development/architecture/overview.md) | System design and components |
| [Contributing Guidelines](./docs/development/contributing/guidelines.md) | How to contribute to OpenFrame |

## 🗺️ Roadmap

- [x] Core microservices architecture with Spring Boot 3.3
- [x] GraphQL API with Netflix DGS and authentication  
- [x] Real-time stream processing with Apache Kafka
- [x] Cross-platform Rust client agent
- [x] **Multi-tenant support** *(Q2 2025)*
- [x] **Advanced AI/ML integrations** *(Q3 2025)*
- [ ] **Edge computing capabilities** *(Q4 2025)*
- [ ] **Mobile companion app** *(2026)*

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💬 Community & Support

Join the OpenMSP community for support, discussions, and updates:

- **OpenMSP Slack**: [Join Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [flamingo.run](https://flamingo.run)
- **OpenFrame Platform**: [openframe.ai](https://openframe.ai)
- **Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base)

> **Note**: We don't use GitHub Issues or Discussions. All support, feature requests, and discussions happen in our OpenMSP Slack community.

## 🔒 Security

OpenFrame implements enterprise-grade security:

- **OAuth 2.0 + JWT** authentication with multi-tenant support
- **AES-256** encryption for data at rest
- **Comprehensive** audit logging and compliance tracking
- **Multi-tenant** isolation and data segregation
- **Rate limiting** and circuit breakers for DDoS protection
- **Real-time** security monitoring and alerting

Found a security issue? Please email **security@flamingo.run** instead of opening a public issue.

## 📄 License

This project is licensed under the [The Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built on amazing open-source projects: Spring Boot, Apache Kafka, MongoDB, and many more
- Special thanks to the broader open-source community for their continuous innovation

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>