# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the complete multi-tenant AI-powered MSP platform that replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation.

## 📚 Table of Contents

### Getting Started
New to OpenFrame? Start here to get up and running quickly:

- [Introduction](./getting-started/introduction.md) - What is OpenFrame and why use it?
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies
- [Quick Start](./getting-started/quick-start.md) - Get OpenFrame running in 5 minutes
- [First Steps](./getting-started/first-steps.md) - Essential features and workflows

### Development
Everything you need for contributing to OpenFrame:

- [Development Overview](./development/README.md) - Development environment and workflow
- [Environment Setup](./development/setup/environment.md) - Configure your local development environment
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally for development
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute code, tests, and documentation
- [Testing Guide](./development/testing/README.md) - Testing frameworks, standards, and best practices
- [Security Guidelines](./development/security/README.md) - Security requirements and best practices
- [Architecture Documentation](./development/architecture/README.md) - Development architecture guidelines

### Reference Documentation
Technical reference documentation for all OpenFrame components:

- [API Service Core (REST + GraphQL)](./architecture/api_service_core_rest_graphql/api_service_core_rest_graphql.md) - Internal GraphQL and REST API services
- [API Libraries (DTOs, Mappers, Domain Services)](./architecture/api_lib_dtos_mappers_domain_services/api_lib_dtos_mappers_domain_services.md) - Shared DTOs, mappers, and domain services
- [Authorization Server Core](./architecture/authorization_server_core/authorization_server_core.md) - OAuth2/OIDC authorization server
- [Client Service Core](./architecture/client_service_core/client_service_core.md) - Agent registration and lifecycle management
- [Data Kafka Integration](./architecture/data_kafka_integration/data_kafka_integration.md) - Kafka infrastructure and messaging
- [Data MongoDB Documents & Repositories](./architecture/data_mongo_documents_repositories/data_mongo_documents_repositories.md) - MongoDB data layer
- [Data Platform Config (Pinot, Cassandra & Repos)](./architecture/data_platform_config_pinot_cassandra_and_repos/data_platform_config_pinot_cassandra_and_repos.md) - Analytics and distributed storage
- [External API Service Core](./architecture/external_api_service_core/external_api_service_core.md) - Public API with API key authentication
- [Gateway Service Core](./architecture/gateway_service_core/gateway_service_core.md) - Edge security, routing, and validation
- [Management Service Core (Initialization & Scheduling)](./architecture/management_service_core_initialization_scheduling/management_service_core_initialization_scheduling.md) - Infrastructure management and distributed scheduling
- [Security OAuth Shared](./architecture/security_oauth_shared/security_oauth_shared.md) - Shared security utilities and OAuth components
- [Service Entrypoints](./architecture/service_entrypoints/service_entrypoints.md) - Service startup and configuration
- [Stream Processing Core](./architecture/stream_processing_core/stream_processing_core.md) - Real-time event processing and analytics
- [Tenant Frontend Service Core (Clients & Stores)](./architecture/tenant_frontend_service_core_clients_and_stores/tenant_frontend_service_core_clients_and_stores.md) - Frontend application architecture

### Architecture Diagrams
Visual documentation and system architecture:

- [System Architecture Diagrams](./architecture/diagrams/) - Mermaid diagrams showing service relationships, data flows, and system architecture

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🎯 Documentation Structure

This documentation is organized into four main sections:

### 1. **Getting Started** 🚀
Perfect for new users, MSP teams evaluating OpenFrame, or developers getting their first instance running. Covers installation, basic concepts, and essential workflows.

### 2. **Development** 🛠️
For contributors and developers working on OpenFrame itself. Includes environment setup, coding standards, testing guidelines, and contribution processes.

### 3. **Reference** 📖
Detailed technical documentation for each OpenFrame service and component. Generated from actual source code analysis, this section provides comprehensive API documentation, configuration options, and architectural details.

### 4. **Architecture Diagrams** 🏗️
Visual documentation showing system architecture, service relationships, data flows, and component interactions. All diagrams are generated from the actual system structure.

## 🔍 What is OpenFrame?

OpenFrame is a **complete multi-tenant MSP platform** that provides:

- **🤖 AI-Powered Automation**: Mingo AI for technicians, Fae for clients
- **🔧 Unified Tool Integration**: Replace multiple expensive tools with one platform
- **🏢 Multi-Tenant Architecture**: Support multiple clients from a single deployment  
- **🔒 Enterprise Security**: OAuth2/OIDC with JWT-based authentication
- **📊 Real-Time Analytics**: Apache Pinot for instant insights
- **⚡ Event-Driven Processing**: Kafka-based real-time data pipeline

## 🚀 Quick Navigation

**I want to...**

- **Try OpenFrame quickly** → [Quick Start Guide](./getting-started/quick-start.md)
- **Learn what OpenFrame does** → [Introduction](./getting-started/introduction.md)
- **Set up for development** → [Environment Setup](./development/setup/environment.md)
- **Contribute code** → [Contributing Guidelines](./development/contributing/guidelines.md)
- **Understand the architecture** → [Reference Documentation](./architecture/)
- **Use the CLI tools** → [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli)

## 📖 Quick Links

- [Project README](../README.md) - Main project overview and features
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute to OpenFrame
- [License](../LICENSE.md) - Flamingo AI Unified License v1.0
- [Community Support](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - Join our Slack community

## 🤝 Community & Support

- **Community**: [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [OpenFrame Platform](https://www.flamingo.run/openframe)
- **Main Platform**: [Flamingo](https://flamingo.run)

---
*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*