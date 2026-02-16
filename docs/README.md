# OpenFrame Documentation

Welcome to the comprehensive documentation for OpenFrame - the AI-powered open-source MSP platform that transforms IT support operations with intelligent automation and unified tool integration.

## 📚 Table of Contents

### Getting Started
Quick start guides to get you up and running with OpenFrame:

- [Introduction](./getting-started/introduction.md) - Overview of OpenFrame and its capabilities
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and preparation
- [Quick Start Guide](./getting-started/quick-start.md) - Get OpenFrame running in 5 minutes
- [First Steps](./getting-started/first-steps.md) - Essential tasks after installation

### Development
Comprehensive guides for developers who want to customize, extend, or contribute to OpenFrame:

- [Development Overview](./development/README.md) - Complete development documentation
- [Environment Setup](./development/setup/environment.md) - IDE configuration and tools
- [Local Development](./development/setup/local-development.md) - Clone, build, and run locally
- [Architecture Guide](./development/architecture/README.md) - System design and patterns
- [Security Best Practices](./development/security/README.md) - Authentication and authorization
- [Testing Strategy](./development/testing/README.md) - Unit, integration, and E2E testing
- [Contributing Guidelines](./development/contributing/guidelines.md) - Code style and PR process

### Reference Documentation
Technical reference documentation for OpenFrame's architecture and components:

- [Platform Overview](./architecture/README.md) - Complete architecture documentation
- [API Service Core](./architecture/api_service_core/api_service_core.md) - GraphQL and REST API layer
- [Authorization Server Core](./architecture/authorization_server_core/authorization_server_core.md) - Multi-tenant OAuth2/OIDC
- [Gateway Service Core](./architecture/gateway_service_core/gateway_service_core.md) - API gateway and routing
- [External API Service Core](./architecture/external_api_service_core/external_api_service_core.md) - Public API façade
- [Management Service Core](./architecture/management_service_core/management_service_core.md) - System operations
- [Stream Processing Core](./architecture/stream_processing_core/stream_processing_core.md) - Real-time event processing
- [Chat Client Core](./architecture/chat_client_core/chat_client_core.md) - Desktop chat application
- [Frontend App Core Clients](./architecture/frontend_app_core_clients/frontend_app_core_clients.md) - HTTP client layer
- [Data Persistence Mongo](./architecture/data_persistence_mongo/data_persistence_mongo.md) - MongoDB integration
- [Data Infrastructure Kafka](./architecture/data_infrastructure_kafka/data_infrastructure_kafka.md) - Kafka messaging
- [Platform Security & OAuth](./architecture/platform_security_and_oauth/platform_security_and_oauth.md) - Security framework
- [API Contracts & Mapping](./architecture/api_contracts_and_mapping/api_contracts_and_mapping.md) - API specifications
- [Service Entrypoints](./architecture/service_entrypoints/service_entrypoints.md) - Deployable microservices

### Architecture Diagrams
Visual documentation showing system design and component interactions:

- **Core Services**: [API Service](./architecture/diagrams/api_service_core.mmd), [Gateway](./architecture/diagrams/gateway_service_core.mmd), [Authorization](./architecture/diagrams/authorization_server_core.mmd)
- **Client Applications**: [Chat Client](./architecture/diagrams/chat_client_core.mmd), [Frontend Clients](./architecture/diagrams/frontend_app_core_clients.mmd)
- **Data Layer**: [MongoDB Persistence](./architecture/diagrams/data_persistence_mongo.mmd), [Kafka Infrastructure](./architecture/diagrams/data_infrastructure_kafka.mmd)
- **Business Services**: [Management](./architecture/diagrams/management_service_core.mmd), [Stream Processing](./architecture/diagrams/stream_processing_core.mmd), [External API](./architecture/diagrams/external_api_service_core.mmd)
- **Foundation**: [Security & OAuth](./architecture/diagrams/platform_security_and_oauth.mmd), [Service Entrypoints](./architecture/diagrams/service_entrypoints.mmd)

*View all diagrams in the [architecture/diagrams/](./architecture/diagrams/) directory*

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🚀 Quick Navigation

### For New Users
1. **[Introduction](./getting-started/introduction.md)** - Understand what OpenFrame is and how it helps MSPs
2. **[Quick Start](./getting-started/quick-start.md)** - Get OpenFrame running in 5 minutes
3. **[First Steps](./getting-started/first-steps.md)** - Essential configuration after installation

### For Developers
1. **[Development Overview](./development/README.md)** - Complete development guide
2. **[Environment Setup](./development/setup/environment.md)** - Configure your development environment
3. **[Contributing](./development/contributing/guidelines.md)** - Join the OpenFrame development community

### For Architects
1. **[Platform Overview](./architecture/README.md)** - Complete system architecture
2. **[Architecture Diagrams](./architecture/diagrams/)** - Visual system documentation
3. **[Security Framework](./architecture/platform_security_and_oauth/platform_security_and_oauth.md)** - Multi-tenant security design

## 🎯 Key Features Documented

### 🤖 AI-Powered Automation
- **Mingo AI Assistant**: Intelligent support for MSP technicians
- **Autonomous Issue Resolution**: AI agents that fix infrastructure problems
- **Smart Analytics**: AI-driven insights and recommendations

### 🛡️ Enterprise Security
- **Multi-Tenant Architecture**: Complete tenant isolation and data separation
- **OAuth2/OIDC Integration**: Secure authentication with SSO support
- **API Security**: JWT validation and API key management

### 🔧 MSP Tool Integration
- **Fleet MDM**: Device management and compliance
- **Tactical RMM**: Remote monitoring capabilities
- **MeshCentral**: Remote desktop and file management
- **Extensible Architecture**: Easy integration of additional tools

### 📊 Real-Time Operations
- **Event Streaming**: Apache Kafka for real-time data processing
- **Analytics Engine**: Apache Pinot for fast queries
- **Live Monitoring**: Real-time device status and alerts

## 📖 Documentation Standards

Our documentation follows these principles:
- **Complete**: Covers all aspects from setup to advanced customization
- **Current**: Kept up-to-date with the latest platform changes
- **Clear**: Written for both technical and non-technical audiences
- **Practical**: Includes working examples and step-by-step instructions

## 🤝 Community & Support

- **GitHub**: [OpenFrame OSS Tenant](https://github.com/flamingo-stack/openframe-oss-tenant)
- **Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [flamingo.run](https://flamingo.run)
- **OpenFrame Hub**: [openframe.ai](https://openframe.ai)

### Getting Help
- **Technical Questions**: Ask in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Bug Reports**: Use [GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
- **Feature Requests**: Discuss in Slack `#feature-requests` channel

### Contributing to Documentation
Found an issue or want to improve the documentation?
1. Fork the repository
2. Make your improvements
3. Submit a pull request
4. Follow our [Contributing Guidelines](../CONTRIBUTING.md)

## 🎬 Video Resources

Watch these videos to understand OpenFrame's capabilities:

- **Platform Overview**: [OpenFrame v0.5.2 Live Demo](https://www.youtube.com/watch?v=a45pzxtg27k)
- **Getting Started**: [5-Minute Quick Start Tutorial](https://www.youtube.com/watch?v=jEkFcS4AcQ4)
- **Product Preview**: [Complete Product Walkthrough](https://www.youtube.com/watch?v=bINdW0CQbvY)

## 📊 Project Status

OpenFrame is actively developed and maintained by the Flamingo team and community contributors. The platform is production-ready for MSP operations with continuous improvements and new features being added regularly.

**Current Version**: Latest stable release
**License**: Flamingo AI Unified License v1.0
**Maintained By**: [Flamingo Stack](https://www.flamingo.run/about)

---

## 📖 Quick Links
- [Project README](../README.md) - Main project overview
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute
- [License](../LICENSE.md) - License information
- [OpenFrame Website](https://openframe.ai) - Product information

---
*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*