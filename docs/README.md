# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame** - the AI-powered MSP platform that unifies multiple tools into a single intelligent interface.

This documentation will guide you through everything from getting started with OpenFrame to developing advanced integrations and understanding the platform architecture.

## 📚 Table of Contents

### Getting Started
New to OpenFrame? Start here to understand the platform and get it running:

- [Introduction](./getting-started/introduction.md) - What is OpenFrame and how it works
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies
- [Quick Start](./getting-started/quick-start.md) - Get OpenFrame running in 5 minutes
- [First Steps](./getting-started/first-steps.md) - Initial configuration and exploration

### Development
Everything you need to contribute to OpenFrame or customize it for your needs:

- [Environment Setup](./development/setup/environment.md) - Development environment configuration
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally
- [Architecture Overview](./development/architecture/README.md) - System design and patterns
- [Testing Strategy](./development/testing/README.md) - Testing approach and tools
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to the project
- [Security Documentation](./development/security/README.md) - Authentication and authorization

### Reference Documentation
Technical reference for APIs, services, and architecture components:

- [API Service Core Runtime and Security](./architecture/api_service_core_runtime_and_security/api_service_core_runtime_and_security.md) - Core runtime configuration and security setup
- [API Service Core REST Controllers](./architecture/api_service_core_rest_controllers/api_service_core_rest_controllers.md) - REST API endpoints and controllers
- [API Service Core GraphQL Fetchers and Loaders](./architecture/api_service_core_graphql_fetchers_and_loaders/api_service_core_graphql_fetchers_and_loaders.md) - GraphQL implementation
- [API Service Core Domain Services Processors](./architecture/api_service_core_domain_services_processors/api_service_core_domain_services_processors.md) - Business logic and domain services
- [API Contracts DTOs and Mappers](./architecture/api_contracts_dtos_and_mappers/api_contracts_dtos_and_mappers.md) - Data transfer objects and mapping
- [Authorization Server Core](./architecture/authorization_server_core/authorization_server_core.md) - OAuth2/OIDC implementation
- [Gateway Service Core](./architecture/gateway_service_core/gateway_service_core.md) - API Gateway and routing
- [External API Service Core](./architecture/external_api_service_core/external_api_service_core.md) - Public API for third-party integrations
- [Management Service Core](./architecture/management_service_core/management_service_core.md) - Operational control plane
- [Stream Processing Service Core](./architecture/stream_processing_service_core/stream_processing_service_core.md) - Event streaming and processing
- [Client Agent Service Core](./architecture/client_agent_service_core/client_agent_service_core.md) - Client agent communication
- [Chat Client OpenFrame Chat](./architecture/chat_client_openframe_chat/chat_client_openframe_chat.md) - Desktop chat application
- [Frontend OpenFrame App Core Clients and Mingo](./architecture/frontend_openframe_app_core_clients_and_mingo/frontend_openframe_app_core_clients_and_mingo.md) - Frontend application architecture
- [Service Entrypoints Applications](./architecture/service_entrypoints_applications/service_entrypoints_applications.md) - Service deployment configurations
- [Shared Security OAuth Client Support](./architecture/shared_security_oauth_client_support/shared_security_oauth_client_support.md) - Shared security utilities
- [Data Layer MongoDB Models and Repositories](./architecture/data_layer_mongo_models_and_repositories/data_layer_mongo_models_and_repositories.md) - Database models and repositories
- [Data Layer Core Datastores and Pinot](./architecture/data_layer_core_datastores_and_pinot/data_layer_core_datastores_and_pinot.md) - Analytics and data storage
- [Data Layer Kafka](./architecture/data_layer_kafka/data_layer_kafka.md) - Event streaming infrastructure
- [Data Layer Redis Cache](./architecture/data_layer_redis_cache/data_layer_redis_cache.md) - Caching layer

### Architecture Diagrams
Visual documentation of system components and interactions:

Architecture diagrams are available in the `./architecture/diagrams/` directory, including detailed Mermaid diagrams for:
- Service interactions and data flow
- Security model and authentication flows
- Event processing pipelines
- Frontend application architecture
- Database relationships and data models

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🚀 Quick Navigation

### For First-Time Users
1. Start with [Introduction](./getting-started/introduction.md) to understand what OpenFrame is
2. Check [Prerequisites](./getting-started/prerequisites.md) to ensure your system is ready
3. Follow the [Quick Start Guide](./getting-started/quick-start.md) to get running
4. Explore [First Steps](./getting-started/first-steps.md) for initial configuration

### For Developers
1. Set up your [Development Environment](./development/setup/environment.md)
2. Get familiar with [Local Development](./development/setup/local-development.md) workflow
3. Understand the [Architecture Overview](./development/architecture/README.md)
4. Read [Contributing Guidelines](./development/contributing/guidelines.md) before making changes

### For System Administrators
1. Review [Security Documentation](./development/security/README.md) for deployment security
2. Check [API Service Runtime Configuration](./architecture/api_service_core_runtime_and_security/api_service_core_runtime_and_security.md)
3. Understand [Gateway Service](./architecture/gateway_service_core/gateway_service_core.md) for edge routing
4. Review [Management Service](./architecture/management_service_core/management_service_core.md) for operations

### For API Integrators
1. Start with [External API Service](./architecture/external_api_service_core/external_api_service_core.md) for public APIs
2. Review [API Contracts](./architecture/api_contracts_dtos_and_mappers/api_contracts_dtos_and_mappers.md) for data models
3. Check [Authorization Server](./architecture/authorization_server_core/authorization_server_core.md) for authentication
4. Use the [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli) for API testing

## 🔍 Documentation Structure

This documentation is organized into four main sections:

### 1. **Getting Started** (`./getting-started/`)
Step-by-step guides for new users to understand and deploy OpenFrame. These documents assume no prior knowledge and provide complete setup instructions.

### 2. **Development** (`./development/`)
Comprehensive guides for developers who want to contribute to OpenFrame or customize it for their needs. Includes environment setup, testing strategies, and contribution workflows.

### 3. **Reference** (`./architecture/`)
Detailed technical documentation for each service, component, and module in the OpenFrame platform. Generated from source code analysis and maintained by the development team.

### 4. **Diagrams** (`./architecture/diagrams/`)
Visual representations of system architecture, data flows, and component relationships using Mermaid diagrams.

## 📖 Quick Links

- **[Project README](../README.md)** - Main project overview and quick start
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute to OpenFrame
- **[License](../LICENSE.md)** - License information and terms

## 🌐 External Resources

- **[OpenFrame Website](https://openframe.ai)** - Product information and live demos
- **[Flamingo Platform](https://flamingo.run)** - The company behind OpenFrame
- **[OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Join our Slack community for support
- **[OpenFrame CLI Repository](https://github.com/flamingo-stack/openframe-cli)** - Command-line tools

## 🆘 Getting Help

### For Questions and Support
- **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Join our community for real-time support and discussions
- **[GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)**: Report bugs or request features
- **[GitHub Discussions](https://github.com/flamingo-stack/openframe-oss-tenant/discussions)**: Technical discussions and Q&A

### For Contributors
- **[Contributing Guidelines](../CONTRIBUTING.md)**: Complete guide to contributing
- **[Development Setup](./development/setup/local-development.md)**: Get your development environment ready
- **[Architecture Documentation](./architecture/)**: Understand the codebase structure

> **Note**: We primarily use our OpenMSP Slack community for support and discussions. GitHub Issues are mainly for bug reports and feature requests.

## 📝 Documentation Updates

This documentation is continuously updated as OpenFrame evolves. Each section is maintained by:

- **Getting Started & Development**: Community contributors and maintainers
- **Reference Documentation**: Auto-generated from source code analysis
- **Architecture Diagrams**: Generated from codebase structure and relationships

To suggest improvements or report documentation issues:
1. Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) community
2. Create an issue on [GitHub](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
3. Submit a pull request with your improvements

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

**Last Updated**: Auto-generated from latest codebase analysis  
**Version**: OpenFrame v0.5.2+