# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the reference multi-tenant implementation of the OpenFrame platform.

## 📚 Table of Contents

### Getting Started

New to OpenFrame? Start here for quick setup and basic concepts:

- [Introduction](./getting-started/introduction.md) - Overview and core concepts
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies  
- [Quick Start](./getting-started/quick-start.md) - Get OpenFrame running quickly
- [First Steps](./getting-started/first-steps.md) - Initial configuration and basic usage

### Development

Development guides, setup instructions, and contribution guidelines:

- [Development Overview](./development/README.md) - Development environment overview
- [Environment Setup](./development/setup/environment.md) - Local development environment
- [Local Development](./development/setup/local-development.md) - Running services locally
- [Architecture Overview](./development/architecture/overview.md) - System architecture and design
- [Testing Overview](./development/testing/overview.md) - Testing strategies and tools
- [Security Overview](./development/security/overview.md) - Security implementation details
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to the project

### Reference

Technical reference documentation for all OpenFrame services and components:

- [Platform Overview](./architecture/overview.md) - Complete system architecture
- [API Service Core](./architecture/api_service_core/api_service_core.md) - Central business API layer
- [Authorization Server Core](./architecture/authorization_server_core/authorization_server_core.md) - Multi-tenant OAuth2/OIDC identity
- [Gateway Service Core](./architecture/gateway_service_core/gateway_service_core.md) - Reactive edge routing
- [External API Service Core](./architecture/external_api_service_core/external_api_service_core.md) - Public API surface
- [Client Agent Service Core](./architecture/client_agent_service_core/client_agent_service_core.md) - Endpoint agent management
- [Stream Processing Service Core](./architecture/stream_processing_service_core/stream_processing_service_core.md) - Event processing engine
- [Management Service Core](./architecture/management_service_core/management_service_core.md) - Operational control plane
- [Config Service Core](./architecture/config_service_core/config_service_core.md) - Configuration management
- [Data Persistence and Messaging Core](./architecture/data_persistence_and_messaging_core/data_persistence_and_messaging_core.md) - Infrastructure layer
- [Frontend Tenant App Core](./architecture/frontend_tenant_app_core/frontend_tenant_app_core.md) - React-based tenant UI
- [Chat Client Core](./architecture/chat_client_core/chat_client_core.md) - Tauri desktop chat runtime

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🚀 Quick Navigation

### For New Users
1. Start with [Introduction](./getting-started/introduction.md) to understand OpenFrame
2. Check [Prerequisites](./getting-started/prerequisites.md) for system requirements
3. Follow the [Quick Start](./getting-started/quick-start.md) guide to get running

### For Developers
1. Set up your [Development Environment](./development/setup/environment.md)
2. Read the [Architecture Overview](./development/architecture/overview.md)
3. Review [Contributing Guidelines](./development/contributing/guidelines.md)
4. Explore the [Reference Documentation](./architecture/overview.md)

### For System Administrators
1. Review [Security Overview](./development/security/overview.md)
2. Understand the [Platform Architecture](./architecture/overview.md)
3. Check service-specific documentation in the Reference section

## 🏗️ Architecture at a Glance

OpenFrame OSS Tenant implements a modern microservices architecture with:

- **🔐 Multi-tenant OAuth2/OIDC** identity with per-tenant signing keys
- **⚡ Reactive Gateway** using Spring WebFlux for high-performance routing
- **📊 Event-Driven Processing** with Kafka + Debezium for real-time data streams
- **🎯 GraphQL + REST APIs** with Netflix DGS for flexible data access
- **💬 Desktop Chat Runtime** built with Tauri for cross-platform AI interactions
- **🔧 Agent Management** for endpoint lifecycle and tool integrations

## 🛠️ Core Technologies

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Next.js 15, TypeScript 5.8 |
| **Backend** | Spring Boot 3.3, Java 21, Netflix DGS |
| **Chat Client** | Tauri, Rust, TypeScript |
| **Gateway** | Spring WebFlux, JWT validation |
| **Messaging** | Apache Kafka, Debezium CDC |
| **Databases** | MongoDB, Apache Pinot, Redis |
| **Identity** | OAuth2/OIDC, PKCE, JWT |

## 📖 Quick Links

- [Project README](../README.md) - Main project information and quick start
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [License](../LICENSE.md) - License information and terms

## 🤝 Community & Support

- **Community**: Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
- **Security**: Report security issues to security@flamingo.run
- **Website**: [Flamingo Platform](https://www.flamingo.run)

## 📋 Documentation Status

This documentation is actively maintained and updated with each release. If you find any outdated information or have suggestions for improvement, please:

1. Open an issue on GitHub
2. Submit a pull request with corrections
3. Ask questions in our Slack community

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*