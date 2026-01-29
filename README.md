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

**The unified platform that integrates multiple MSP tools into a single AI-driven interface, automating IT support operations across your entire technology stack.**

OpenFrame is an AI-powered MSP (Managed Service Provider) platform that consolidates your IT management tools into one intelligent dashboard. Built by [Flamingo](https://flamingo.run), OpenFrame replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation (Mingo AI for technicians, Fae for clients).

[![OpenFrame Product Walkthrough (Beta Access)](https://img.youtube.com/vi/awc-yAnkhIo/maxresdefault.jpg)](https://www.youtube.com/watch?v=awc-yAnkhIo)

## ✨ Key Features

- **🎯 Unified Management** - Single interface for all your IT infrastructure
- **🤖 AI Automation** - Mingo AI for technicians, Fae for clients  
- **🔧 Open Source Foundation** - Built on proven open-source technologies
- **💰 Cost Reduction** - Replace expensive vendor licenses with one platform
- **📊 Real-time Monitoring** - Live dashboards and proactive alerts
- **🏢 Multi-Tenant Architecture** - Serve multiple clients efficiently
- **🔒 Security & Compliance** - Built-in security scanning and compliance tracking
- **🔗 Tool Integration** - Connect existing tools like TacticalRMM, FleetMDM, MeshCentral

## 🚀 Quick Start

Get OpenFrame running locally in minutes:

### Prerequisites
- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+

### CLI Usage

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

Once started, OpenFrame will be available at **https://localhost**

For detailed CLI documentation and all available commands, see [CLI Documentation](docs/cli/README.md).

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication (required for Maven packages)
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

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

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

## 🛠️ Technology Stack

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

## 🔗 External Tool Integrations

OpenFrame seamlessly integrates with your existing MSP tools:

- **TacticalRMM** - Remote monitoring and management
- **FleetMDM** - Mobile device management  
- **MeshCentral** - Remote access and control
- **Authentik** - Identity and access management

## 🧪 Running Tests

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

📚 See the [Documentation](./docs/README.md) for comprehensive guides including:

- **Getting Started** - Quick start guide and basic concepts
- **Development** - Environment setup and contributing guidelines  
- **Architecture** - System design and technical deep-dive
- **Reference** - API documentation and configuration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code of conduct and community guidelines
- Development setup and workflow
- Code style and testing requirements
- Pull request process

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

OpenFrame takes security seriously with:

- **OAuth 2.0 + JWT** authentication
- **AES-256** encryption for data at rest
- **Multi-tenant** isolation
- **Real-time** security monitoring
- **Comprehensive** audit logging

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## 📄 License

This project is licensed under the [The Flamingo AI Unified License v1.0](LICENSE.md).

## 💬 Community & Support

- **OpenMSP Community**: Join our Slack at https://www.openmsp.ai/
- **Documentation**: https://www.flamingo.run/knowledge-base  
- **Website**: https://openframe.ai

> **Note**: We don't use GitHub Issues or Discussions. All support and development discussions happen in our OpenMSP Slack community.

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Apache Kafka, MongoDB, and many more
- Special thanks to the broader open-source community

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>