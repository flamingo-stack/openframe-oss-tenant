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

**A distributed platform that creates a unified layer for data, APIs, automation, and AI on top of carefully selected open-source projects. We simplify IT and security operations through a single, cohesive MSP platform.**

OpenFrame is the AI-powered MSP (Managed Service Provider) platform that replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation. Developed by [Flamingo](https://www.flamingo.run), OpenFrame combines multiple MSP tools into a single AI-driven interface with Mingo AI for technicians and Fae for clients.

## 🎥 Platform Demo

[![OpenFrame Preview Webinar](https://img.youtube.com/vi/bINdW0CQbvY/maxresdefault.jpg)](https://www.youtube.com/watch?v=bINdW0CQbvY)

## 🚀 Key Features

### 🤖 AI-Powered Automation
- **Mingo AI**: Intelligent assistant for IT technicians with tool execution capabilities
- **Fae**: Client-facing AI assistant for support ticket management
- Automated incident detection and resolution
- Intelligent device monitoring and alerting

### 🔧 Integrated MSP Tools
- **TacticalRMM**: Complete remote monitoring and management
- **MeshCentral**: Secure remote access and file management
- **Fleet MDM**: Mobile device management and compliance
- **Authentik**: Identity and access management

### 🏗️ Modern Architecture
- **Microservices**: Distributed Java/Spring Boot services with GraphQL API
- **Real-time**: WebSocket-based live updates and event streaming
- **Scalable**: Kubernetes-native with Helm charts, handles 100,000+ events/second
- **Secure**: JWT-based authentication with OAuth2/OIDC and AES-256 encryption

### 💻 Cross-Platform Support
- **Backend**: Java 21 with Spring Boot 3.x
- **Frontend**: Vue 3 + TypeScript with modern UI
- **Client Agent**: Rust-based cross-platform agent
- **Deployment**: Docker, Kubernetes, cloud-ready

## 🏛️ System Architecture

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

Get OpenFrame running locally in under 10 minutes:

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

### Manual Setup

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

Once started, OpenFrame will be available at **https://localhost**

## 💡 Benefits

### Cost Reduction
- Replace expensive proprietary MSP tools with open-source alternatives
- Reduce licensing costs by up to 80% compared to traditional solutions
- Eliminate vendor lock-in with open standards

### AI Enhancement
- Automate routine support tasks with intelligent assistants
- Improve response times with automated incident detection
- Enhance client satisfaction with 24/7 AI support

### Unified Management
- Single dashboard for all MSP tools and services
- Consistent user experience across different platforms
- Streamlined workflows and reduced training time

## 🛠️ Technology Stack

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

## 📊 Screenshots

### Dashboard Overview
<img src="docs/assets/1.%20dashboard.png" alt="Dashboard Overview" width="100%">

### Device Management
<img src="docs/assets/2.%20deviecs.png" alt="Devices" width="100%">

### Policies & Compliance
<img src="docs/assets/5.%20policies.png" alt="Policies & Compliance" width="100%">

## 📚 Documentation

📚 See the [Documentation](./docs/README.md) for comprehensive guides including:

- **Getting Started**: Quick start guides and basic concepts
- **Development**: Environment setup and contribution guidelines
- **Architecture**: System design and technical specifications
- **API Reference**: GraphQL schema and endpoints

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

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contributing Steps:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

OpenFrame takes security seriously. We implement:

- **OAuth 2.0 + JWT** authentication with HTTP-only cookies
- **AES-256** encryption for data at rest
- **Comprehensive** audit logging and monitoring
- **Multi-tenant** isolation with RBAC
- **Rate limiting** and circuit breakers
- **Real-time** security event detection

Found a security issue? Please email security@flamingo.run instead of opening a public issue.

## 📜 License

This project is licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Acknowledgments

- Thanks to all our [contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- Built with amazing open-source projects: Spring Boot, Apache Kafka, Vue.js, and many more
- Special thanks to the broader open-source community

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>