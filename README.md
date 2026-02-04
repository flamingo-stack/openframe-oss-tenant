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

**The open-source, multi-tenant implementation of OpenFrame** - Flamingo's unified AI-powered MSP platform that replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation (Mingo AI for technicians, Fae for clients).

This repository contains the complete OpenFrame platform, bringing together all runtime services (API, Gateway, Authorization, Stream, Management, Client, Config, External API) and their shared core libraries into a single, cohesive codebase designed for production-ready, multi-tenant MSP operations.

## 🎥 Product Overview

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

[![Autonomous AI Agents That Actually Fix Your Infrastructure | OpenFrame v0.5.2](https://img.youtube.com/vi/jEkFcS4AcQ4/maxresdefault.jpg)](https://www.youtube.com/watch?v=jEkFcS4AcQ4)

## ✨ Key Features

- **🤖 AI-Powered Automation** - Mingo AI for technicians and Fae for clients provide contextual guidance and automate routine tasks
- **💰 Cost Reduction** - Replace expensive proprietary MSP tools with open-source alternatives, eliminating per-device/per-user licensing
- **🔧 Unified MSP Stack** - Integrate Fleet MDM, Tactical RMM, MeshCentral, and Authentik SSO into a single platform
- **📊 Single Dashboard** - Manage all services and workflows through one unified interface
- **🏢 Multi-Tenant Architecture** - Secure tenant isolation with enterprise-grade security controls
- **⚡ High Performance** - Handle 100,000+ events/second with sub-500ms latency
- **🔒 Enterprise Security** - OAuth 2.0 + JWT authentication, AES-256 encryption, and comprehensive audit logging
- **🌐 Event-Driven Streaming** - Real-time data processing via Apache Kafka and Debezium CDC

## 🚀 Quick Start

### Using OpenFrame CLI

The OpenFrame CLI tools are maintained in a separate repository. For installation and usage:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation Guide**: [CLI Installation](https://github.com/flamingo-stack/openframe-cli#installation)  
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

```bash
# Bootstrap OpenFrame (non-interactive mode)
./openframe bootstrap --non-interactive --verbose

# Start services
./openframe start

# Access dashboard at https://localhost
```

### Development Setup

```bash
# Clone and setup
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Configure GitHub authentication for dependencies
export GITHUB_ACTOR=your-github-username  
export GITHUB_TOKEN=your-github-token

# Build backend services
mvn clean install

# Start frontend development server
cd openframe/services/openframe-frontend
npm install && npm run dev

# Build Rust client agent
cd ../../client
cargo build --release
```

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
| **API Service** | Core REST & GraphQL APIs | Spring Boot 3.3 + Netflix DGS |
| **Gateway Service** | Edge security, routing, WebSockets | Spring Boot + Redis |
| **Authorization Server** | OAuth2/OIDC, multi-tenant auth | Spring Authorization Server |
| **Stream Service** | Event ingestion and processing | Kafka + Cassandra + Pinot |
| **Management Service** | Control plane orchestration | Spring Boot + MongoDB |
| **Client Service** | Agent and machine APIs | Spring Boot + NATS |
| **External API Service** | API-key based integrations | Spring Boot + REST |
| **Frontend App** | Web interface | Next.js 15 + React 19 + TypeScript |

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | Spring Boot 3.3 + Java 21 | Core runtime & APIs |
| **Frontend** | Next.js 15 + React 19 + TypeScript 5.8 | Modern web interface |
| **Client Agent** | Rust + Tokio | Cross-platform system agent |
| **API Layer** | GraphQL + Netflix DGS | Unified data access |
| **Message Queue** | Apache Kafka 3.6 | Event streaming |
| **Databases** | MongoDB + Cassandra + Pinot | Multi-model data storage |
| **Cache** | Redis | High-performance caching |
| **Monitoring** | Prometheus + Grafana + Loki | Observability stack |

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides including:

- **Getting Started** - Introduction, prerequisites, and quick start
- **Development** - Architecture, setup, and contribution guidelines
- **Reference** - Technical documentation and API references
- **Operations** - Deployment and monitoring guides

### Screenshots

#### Dashboard Overview
<img src="docs/assets/1.%20dashboard.png" alt="Dashboard Overview" width="100%">

#### Device Management
<img src="docs/assets/2.%20deviecs.png" alt="Device Management" width="100%">

#### Policies & Compliance
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

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development environment setup
- Code style and standards  
- Pull request process
- Community guidelines

### Quick Contributing Steps

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💬 Community & Support

- **💬 Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support and discussion
- **📚 Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base)
- **🌐 Website**: [flamingo.run](https://www.flamingo.run) and [openframe.ai](https://openframe.ai)
- **🔒 Security**: Email security@flamingo.run for security issues

## ❓ FAQ

<details>
<summary><strong>How does OpenFrame compare to other MSP platforms?</strong></summary>

OpenFrame uniquely combines AI-powered automation, open-source cost savings, and unified tool integration, while most alternatives focus on just one area or require expensive proprietary licensing.
</details>

<details>
<summary><strong>What are the minimum system requirements?</strong></summary>

For development: 8GB RAM, 4 CPU cores, 20GB storage. For production: 16GB RAM, 8 CPU cores, 100GB storage minimum.
</details>

<details>
<summary><strong>Can OpenFrame integrate with existing MSP tools?</strong></summary>

Yes! OpenFrame is designed to integrate with existing systems through its flexible API layer, standard protocols, and extensive webhook support.
</details>

<details>
<summary><strong>Is commercial support available?</strong></summary>

Yes, enterprise support and managed services are available through [Flamingo](https://www.flamingo.run). Contact us for details.
</details>

## 🔒 Security

OpenFrame takes security seriously with:

- **OAuth 2.0 + JWT** authentication with multi-tenant isolation
- **AES-256** encryption for data at rest and in transit
- **Comprehensive** audit logging and compliance tracking
- **Rate limiting** and circuit breakers for DDoS protection
- **Real-time** security monitoring and alerting

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## 📄 License

This project is licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built on amazing open-source projects: Spring Boot, Apache Kafka, React, Rust, and many more
- Special thanks to the broader open-source and MSP community

---
<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>