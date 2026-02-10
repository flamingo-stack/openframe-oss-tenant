# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the unified AI-driven MSP platform that transforms expensive proprietary software into intelligent, open-source alternatives.

OpenFrame is the tenant-scoped runtime that assembles Flamingo's open‑source service cores into a deployable, multi-tenant MSP platform, powering the next generation of AI-assisted IT operations.

## 📚 Table of Contents

### Getting Started
New to OpenFrame? Start here to get up and running quickly:

- [Introduction](./getting-started/introduction.md) - What is OpenFrame and why use it?
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies
- [Quick Start](./getting-started/quick-start.md) - Get OpenFrame running in 5 minutes
- [First Steps](./getting-started/first-steps.md) - Essential configuration walkthrough

### Development
Everything you need to contribute to and extend OpenFrame:

- [Development Overview](./development/README.md) - Development environment overview
- [Environment Setup](./development/setup/environment.md) - Complete development environment configuration
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally
- [Architecture Overview](./development/architecture/overview.md) - System design and components
- [Testing Guide](./development/testing/overview.md) - Testing strategies and best practices
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to OpenFrame

### Reference Documentation
Technical reference documentation and architecture details:

- [Architecture Overview](./reference/architecture/overview.md) - High-level system architecture
- [API Service Core](./reference/architecture/api_service_core/api_service_core.md) - Internal REST + GraphQL APIs
- [Authorization Server Core](./reference/architecture/authorization_server_core/authorization_server_core.md) - OAuth2/OIDC identity management
- [Gateway Service Core](./reference/architecture/gateway_service_core/gateway_service_core.md) - Traffic routing and security
- [External API Service Core](./reference/architecture/external_api_service_core/external_api_service_core.md) - Public API-key based APIs
- [Client Service Core](./reference/architecture/client_service_core/client_service_core.md) - Agent authentication and telemetry
- [Stream Processing Service Core](./reference/architecture/stream_processing_service_core/stream_processing_service_core.md) - Real-time event processing
- [Frontend Tenant API Clients](./reference/architecture/frontend_tenant_api_clients_and_chat/frontend_tenant_api_clients_and_chat.md) - Frontend integration and AI chat
- [Service Entrypoints](./reference/architecture/service_entrypoints/service_entrypoints.md) - Deployable service configurations
- [Data Persistence MongoDB](./reference/architecture/data_persistence_mongo/data_persistence_mongo.md) - Document storage and repositories
- [Data Platform Kafka](./reference/architecture/data_platform_kafka/data_platform_kafka.md) - Event streaming configuration
- [Data Platform Redis Cache](./reference/architecture/data_platform_redis_cache/data_platform_redis_cache.md) - Caching and ephemeral state
- [Security Core & OAuth BFF](./reference/architecture/security_core_and_oauth_bff/security_core_and_oauth_bff.md) - Authentication flows and JWT handling
- [API Contracts and Mappers](./reference/architecture/api_contracts_and_mappers/api_contracts_and_mappers.md) - Data contracts and transformations

### Diagrams
Visual documentation and architecture diagrams are available in the diagrams directory. View Mermaid diagrams directly in the documentation or through supported diagram viewers.

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage instructions.

## 🎯 Documentation Highlights

### For New Users
- **Start with [Introduction](./getting-started/introduction.md)** to understand OpenFrame's value proposition
- **Follow [Quick Start](./getting-started/quick-start.md)** to get running in 5 minutes
- **Review [Prerequisites](./getting-started/prerequisites.md)** to ensure your environment is ready

### For Developers  
- **Set up your environment** with [Environment Setup](./development/setup/environment.md)
- **Understand the architecture** in [Architecture Overview](./development/architecture/overview.md)
- **Learn contribution workflows** in [Contributing Guidelines](./development/contributing/guidelines.md)

### For System Architects
- **Study the [Reference Documentation](./reference/architecture/overview.md)** for technical depth
- **Review service interactions** in individual service core documents
- **Understand data flows** through stream processing and data platform docs

## 🚀 Quick Navigation

| I want to... | Go to |
|---------------|-------|
| **Get started quickly** | [Quick Start](./getting-started/quick-start.md) |
| **Set up development** | [Environment Setup](./development/setup/environment.md) |
| **Understand architecture** | [Architecture Overview](./reference/architecture/overview.md) |
| **Contribute code** | [Contributing Guidelines](./development/contributing/guidelines.md) |
| **Use the CLI** | [CLI Repository](https://github.com/flamingo-stack/openframe-cli) |
| **Deploy in production** | [Reference Documentation](./reference/architecture/) |

## 📖 Quick Links

- [Project README](../README.md) - Main project overview and features
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to OpenFrame
- [License](../LICENSE.md) - Flamingo AI Unified License v1.0

## 🤝 Community & Support

### Get Help
- **OpenMSP Slack**: [Join the community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time support
- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Design discussions and Q&A

### Stay Updated
- **Website**: [flamingo.run](https://www.flamingo.run)
- **Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base)
- **LinkedIn**: [OpenFrame MSP](https://www.linkedin.com/showcase/openframemsp/about/)

## 🛠️ Contributing to Documentation

Found an error or want to improve the documentation? We welcome contributions!

1. **Small fixes**: Edit directly on GitHub and submit a PR
2. **Major changes**: Follow the [Contributing Guidelines](./development/contributing/guidelines.md)
3. **New sections**: Discuss in [GitHub Discussions](https://github.com/flamingo-stack/openframe-oss-tenant/discussions) first

### Documentation Standards
- Use clear, concise language
- Include code examples where helpful
- Follow the established structure and formatting
- Test all links and code snippets
- Keep content up-to-date with the latest release

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

**Last Updated**: Generated dynamically  
**Version**: Latest  
**Maintained by**: Flamingo Stack Team