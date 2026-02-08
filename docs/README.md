# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for OpenFrame OSS Tenant - the reference multi-tenant OpenFrame distribution that assembles all service cores, shared libraries, and applications into a production-ready platform.

## 📚 Table of Contents

### Getting Started
Comprehensive guides to get you up and running with OpenFrame:

- [Introduction](./getting-started/introduction.md) - What is OpenFrame and core concepts
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies
- [Quick Start](./getting-started/quick-start.md) - 5-minute setup guide
- [First Steps](./getting-started/first-steps.md) - Essential configuration after installation

### Development
Development guides for contributing to OpenFrame:

- [Development Overview](./development/README.md) - Development environment overview
- [Environment Setup](./development/setup/environment.md) - Local development environment configuration
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally
- [Architecture Overview](./development/architecture/overview.md) - Comprehensive system architecture documentation
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to the project
- [Testing Overview](./development/testing/overview.md) - Testing strategies and practices

### Reference
Technical reference documentation for the OpenFrame architecture:

- [Architecture Overview](./reference/overview.md) - High-level system architecture and design principles
- [API Service Core](./reference/api_service_core/api_service_core.md) - Internal APIs and GraphQL implementation
- [Authorization Service Core](./reference/authorization_service_core/authorization_service_core.md) - OAuth2/OIDC authentication system
- [Gateway Service Core](./reference/gateway_service_core/gateway_service_core.md) - API gateway and traffic management
- [Stream Service Core](./reference/stream_service_core/stream_service_core.md) - Event processing and real-time data handling
- [Management Service Core](./reference/management_service_core/management_service_core.md) - System administration and automation
- [External API Service Core](./reference/external_api_service_core/external_api_service_core.md) - External tool integrations
- [Client Agent Service Core](./reference/client_agent_service_core/client_agent_service_core.md) - Device and agent lifecycle management
- [Frontend App OpenFrame](./reference/frontend_app_openframe/frontend_app_openframe.md) - Web UI application architecture
- [Frontend Chat Client](./reference/frontend_chat_client/frontend_chat_client.md) - Desktop chat client implementation
- [Data Layer (Mongo/Redis/Kafka)](./reference/data_layer_mongo_redis_kafka/data_layer_mongo_redis_kafka.md) - Data persistence and messaging infrastructure
- [Security OAuth Shared](./reference/security_oauth_shared/security_oauth_shared.md) - Shared security utilities and OAuth implementation
- [Service Entrypoints](./reference/service_entrypoints/service_entrypoints.md) - Deployable service applications

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository and provide essential deployment and management capabilities:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage instructions.

## 🔍 What You'll Learn

This documentation covers:

- **System Architecture** - How OpenFrame components work together
- **Development Setup** - Getting your development environment ready
- **Service Architecture** - Deep dive into each microservice
- **Multi-Tenant Design** - How tenant isolation works across all layers
- **Event-Driven Architecture** - Kafka-based event processing
- **Security Model** - OAuth2/OIDC implementation and multi-tenant security
- **Frontend Architecture** - React/Next.js web application and Tauri desktop client
- **Agent Architecture** - Cross-platform Rust agent implementation

## 🏗️ Repository Structure

Understanding how this repository is organized:

```text
openframe-oss-tenant/
├── openframe/
│   ├── services/          # Service entrypoints (deployable apps)
│   └── shared/            # Shared configurations
├── client/                # Rust agent source code
├── docs/                  # This documentation
├── scripts/               # Build and deployment scripts
└── docker/                # Docker configurations
```

## 🚀 Key Concepts

### Multi-Tenant Architecture
OpenFrame is built with multi-tenancy at its core:
- Tenant isolation across all data stores
- Security context propagation
- Separate resource allocation per tenant

### Gateway-First Security
All traffic flows through the API Gateway:
- Authentication and authorization
- Rate limiting and CORS handling
- Tenant context enforcement

### Event-Driven Design
Kafka powers real-time processing:
- Event sourcing patterns
- Stream processing with enrichment
- Cross-service communication

### Microservices Architecture
Thin services with strong cores:
- Service entrypoints for deployment
- Business logic in service cores
- Shared infrastructure layers

## 📖 Quick Navigation

| I Want To... | Go To |
|--------------|-------|
| **Get OpenFrame running quickly** | [Quick Start](./getting-started/quick-start.md) |
| **Understand the system design** | [Architecture Overview](./development/architecture/overview.md) |
| **Set up development environment** | [Environment Setup](./development/setup/environment.md) |
| **Learn about specific services** | [Reference Documentation](./reference/overview.md) |
| **Contribute to the project** | [Contributing Guidelines](./development/contributing/guidelines.md) |
| **Use CLI tools** | [OpenFrame CLI Repository](https://github.com/flamingo-stack/openframe-cli) |

## 🎯 Documentation Goals

This documentation aims to:

1. **Enable rapid onboarding** - Get developers productive quickly
2. **Provide comprehensive reference** - Deep technical details for all components
3. **Explain design decisions** - Why OpenFrame is architected this way
4. **Support operations** - Help with deployment and maintenance
5. **Foster contribution** - Make it easy to contribute to OpenFrame

## 🤝 Community and Support

OpenFrame is developed by the OpenMSP community:

- 🗣️ **OpenMSP Slack**: [https://www.openmsp.ai/](https://www.openmsp.ai/)
- 💬 **Join Community**: [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

**Slack Channels**:
- `#general` - General discussions
- `#development` - Development coordination  
- `#architecture` - Technical architecture discussions
- `#help` - Getting help and support

> **Note**: We don't use GitHub Issues or GitHub Discussions. All coordination happens in the OpenMSP Slack community.

## 🔄 Documentation Updates

This documentation is continuously updated as OpenFrame evolves. If you find gaps or outdated information:

1. Check the [OpenMSP Slack](https://www.openmsp.ai/) for the latest discussions
2. Contribute improvements via pull requests
3. Ask questions in the `#development` channel

## 📄 Quick Links

- [Project README](../README.md) - Main project README with overview and quick start
- [Contributing](../CONTRIBUTING.md) - Comprehensive contribution guide
- [License](../LICENSE.md) - Flamingo AI Unified License v1.0
- [Flamingo Website](https://www.flamingo.run/) - Learn more about the company behind OpenFrame
- [OpenFrame Product Page](https://www.flamingo.run/openframe) - Product information and features

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

**Ready to dive deeper?** Start with the [Introduction](./getting-started/introduction.md) to understand OpenFrame's core concepts, then follow the [Quick Start Guide](./getting-started/quick-start.md) to get your first installation running.