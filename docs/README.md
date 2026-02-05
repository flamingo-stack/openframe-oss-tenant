# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame**, the unified platform that integrates multiple MSP tools into a single AI-driven interface, automating IT support operations across the stack.

OpenFrame is the tenant-aware, open-source core of Flamingo's AI-powered MSP platform, providing a distributed platform that creates a unified layer for data, APIs, automation, and AI on top of carefully selected open-source projects.

## 📚 Table of Contents

### Getting Started
Start here if you're new to OpenFrame:

- **[Introduction](./getting-started/introduction.md)** - What is OpenFrame? Core concepts and features
- **[Prerequisites](./getting-started/prerequisites.md)** - System requirements and dependencies  
- **[Quick Start](./getting-started/quick-start.md)** - Get running in 5 minutes
- **[First Steps](./getting-started/first-steps.md)** - Essential configuration and exploration

### Development
For contributors and developers:

- **[Development Overview](./development/README.md)** - Development section index and overview
- **[Environment Setup](./development/setup/environment.md)** - Set up your development environment
- **[Local Development](./development/setup/local-development.md)** - Run OpenFrame locally for development
- **[Architecture Overview](./development/architecture/overview.md)** - System architecture and design principles
- **[Microservices Architecture](./development/architecture/microservices.md)** - Service decomposition and interactions
- **[Data Flow](./development/architecture/data-flow.md)** - How data flows through the system
- **[Integration Architecture](./development/architecture/integration.md)** - External tool integration patterns
- **[Security Architecture](./development/architecture/security.md)** - Security design and implementation
- **[Testing Overview](./development/testing/overview.md)** - Testing strategies and guidelines
- **[Contributing Guidelines](./development/contributing/guidelines.md)** - How to contribute to the project
- **[Code Style](./development/contributing/code-style.md)** - Coding standards and conventions
- **[Client Agent Development](./development/client-agent/rust-development.md)** - Rust client development guide
- **[Development Tools](./development/tools/scripts.md)** - Scripts and utilities for development

### Reference
Technical reference documentation:

- **[Architecture Overview](./reference/architecture/overview.md)** - High-level system architecture
- **[Authorization Server](./reference/architecture/authorization-server.md)** - OAuth2/OIDC implementation
- **[Gateway Service](./reference/architecture/gateway-service.md)** - API Gateway implementation
- **[Gateway Security](./reference/architecture/gateway-security.md)** - Gateway security features
- **[Gateway API Key](./reference/architecture/gateway-api-key.md)** - API key management
- **[Gateway WebSocket](./reference/architecture/gateway-websocket.md)** - WebSocket support
- **[OpenFrame API Service](./reference/architecture/openframe-api-service.md)** - Core API service
- **[External API Service](./reference/architecture/external-api-service.md)** - External integration APIs
- **[Stream Service](./reference/architecture/stream-service.md)** - Real-time event processing
- **[Management Service](./reference/architecture/management-service.md)** - Platform management
- **[Device Architecture](./reference/architecture/devices.md)** - Device management system
- **[Data Layer - MongoDB](./reference/architecture/data-layer-mongo.md)** - MongoDB integration
- **[MongoDB Documents](./reference/architecture/data-layer-mongo-documents.md)** - Document schemas
- **[MongoDB Repositories](./reference/architecture/data-layer-mongo-repositories.md)** - Data access layer
- **[Data Layer - Kafka](./reference/architecture/data-layer-kafka.md)** - Kafka event streaming
- **[Data Layer - Multi-Store](./reference/architecture/data-layer-kafka-redis-cassandra-pinot.md)** - Redis, Cassandra, Pinot
- **[Security Core](./reference/architecture/security-core.md)** - Core security components
- **[Security OAuth BFF](./reference/architecture/security-oauth-bff.md)** - Backend-for-frontend OAuth
- **[Core Shared Utils](./reference/architecture/core-shared-utils.md)** - Shared utilities and helpers

## 🛠️ CLI Tools

The OpenFrame CLI tools are maintained in a separate repository and provide the fastest way to get started:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)  
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are **NOT** located in this repository. Always refer to the external repository for installation and usage.

### Quick CLI Usage

```bash
# Linux
./openframe-linux-amd64 bootstrap

# Windows  
./openframe-windows-amd64.exe bootstrap

# macOS
./openframe bootstrap
```

## 🏗️ Architecture Overview

OpenFrame follows a distributed microservices architecture with these key layers:

### Gateway Layer
- **API Gateway** - Unified ingress point with authentication and routing
- **Authorization Server** - Multi-tenant OAuth2/OIDC provider

### Processing Layer  
- **Stream Processing** - Real-time event processing with Kafka
- **API Services** - GraphQL and REST APIs for frontend and integrations

### Data Layer
- **MongoDB** - Primary database for configuration and metadata
- **Apache Pinot** - Real-time analytics and querying
- **Cassandra** - Scalable time-series data storage
- **Redis** - High-performance caching and sessions

### Infrastructure Layer
- **Monitoring** - Prometheus, Grafana, and Loki stack
- **Service Discovery** - Kubernetes-native service discovery

## 🚀 Key Features

- **🤖 AI-Powered Automation** - Intelligent agents for infrastructure management
- **🔧 Unified Management** - Single interface for all MSP tools
- **📊 Real-Time Analytics** - Event streaming with Apache Kafka and Pinot
- **🔒 Enterprise Security** - Multi-tenant OAuth2 with per-tenant isolation
- **⚡ High Performance** - Sub-500ms latency with 100,000+ events/second
- **🌐 Multi-Tenant** - Secure tenant isolation and management

## 🎯 Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Java 21, Spring Boot 3.3, Netflix DGS GraphQL |
| **Frontend** | Vue 3, TypeScript 5.0, PrimeVue |
| **Client** | Rust, Tokio, Cross-platform agent |
| **Data** | MongoDB, Apache Pinot, Cassandra, Redis |
| **Streaming** | Apache Kafka, Kafka Streams |
| **Infrastructure** | Docker, Kubernetes, Helm |
| **Monitoring** | Prometheus, Grafana, Loki |

## 📖 Quick Links

- **[Project README](../README.md)** - Main project overview and quick start
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to OpenFrame
- **[License](../LICENSE.md)** - License information and terms

### External Resources

- **[OpenFrame Website](https://openframe.ai)** - Official website  
- **[Flamingo Platform](https://flamingo.run)** - Parent platform
- **[Knowledge Base](https://www.flamingo.run/knowledge-base)** - Additional documentation
- **[OpenMSP Community](https://www.openmsp.ai/)** - Community portal
- **[Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Join discussions

## 🤝 Community Support

We coordinate all development and support through our OpenMSP Slack community:

- **Technical Questions** - Ask in the appropriate channels
- **Feature Requests** - Discuss ideas with the community  
- **Bug Reports** - Report issues for investigation
- **Contributions** - Coordinate development efforts

> **Note**: We don't use GitHub Issues or Discussions. All community interaction happens on Slack.

## 🔄 Documentation Updates

This documentation is continuously updated as OpenFrame evolves. If you find outdated information or want to contribute improvements:

1. Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. Discuss the changes in the `#documentation` channel
3. Submit a pull request with your improvements

## 🎯 What's Next?

Choose your path based on your goals:

- **👋 New to OpenFrame?** → Start with [Introduction](./getting-started/introduction.md)
- **🚀 Want to get running quickly?** → Go to [Quick Start](./getting-started/quick-start.md)  
- **💻 Planning to contribute?** → Check [Development Overview](./development/README.md)
- **🔧 Need technical details?** → Browse [Reference Documentation](./reference/architecture/overview.md)
- **❓ Have questions?** → Join our [Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

**Built with 💛 by the [Flamingo](https://www.flamingo.run/about) team**