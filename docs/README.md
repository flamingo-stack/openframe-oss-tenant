# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** — the complete open-source, multi-tenant backend and frontend stack that powers Flamingo's unified AI-driven MSP platform.

## 📚 Table of Contents

### 🚀 Getting Started

New to OpenFrame? Start here to understand the platform and get it running:

- [Introduction](./getting-started/introduction.md) - What is OpenFrame and key concepts
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies  
- [Quick Start](./getting-started/quick-start.md) - 5-minute setup guide
- [First Steps](./getting-started/first-steps.md) - Essential configuration and initial setup

### 🛠️ Development

Everything you need to develop, test, and contribute to OpenFrame:

- [Development Overview](./development/README.md) - Development environment and workflows
- [Environment Setup](./development/setup/environment.md) - Local development environment configuration
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally
- [Architecture Overview](./development/architecture/overview.md) - System design and architectural decisions
- [Testing Overview](./development/testing/overview.md) - Testing strategies and guidelines
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to the project

### 🏗️ Reference Documentation

Technical reference documentation covering all modules and services:

**Core Architecture:**
- [System Overview](./architecture/overview.md) - Complete system architecture and data flow

**Service Architecture:**
- [API Service Core - GraphQL REST](./architecture/api-service_core_graphql_rest/api-service_core_graphql_rest.md) - REST controllers and GraphQL APIs
- [API Service Core - DTOs](./architecture/api-service_core_dtos/api-service_core_dtos.md) - Data transfer objects and contracts
- [API Service Core - Business Services](./architecture/api-service_core_business_services/api-service_core_business_services.md) - Core business logic
- [Authorization Server](./architecture/authorization-server_core_tenant_sso_registration/authorization-server_core_tenant_sso_registration.md) - OAuth2 + OIDC multi-tenant identity
- [Gateway Service](./architecture/gateway_service_security_websocket_proxy/gateway_service_security_websocket_proxy.md) - Edge security, routing, and WebSocket proxy
- [External API Service](./architecture/external-api_service_rest/external-api_service_rest.md) - API key protected REST endpoints
- [Client Service](./architecture/client_service_agent_ingest/client_service_agent_ingest.md) - Agent ingest and device lifecycle
- [Stream Service](./architecture/stream_service_kafka_debezium_enrichment/stream_service_kafka_debezium_enrichment.md) - Kafka CDC and enrichment
- [Management Service](./architecture/management_service_initializers_schedulers/management_service_initializers_schedulers.md) - System initialization and scheduling
- [Frontend Service](./architecture/frontend_service_api_clients_and_mingo/frontend_service_api_clients_and_mingo.md) - React UI and Mingo AI chat
- [Chat Client Services](./architecture/chat_client_services/chat_client_services.md) - AI chat infrastructure

**Data Architecture:**
- [MongoDB Documents & Repositories](./architecture/data_mongo_documents_and_repositories/data_mongo_documents_and_repositories.md) - MongoDB persistence layer
- [Cassandra Pinot & Models](./architecture/data_core_cassandra_pinot_and_models/data_core_cassandra_pinot_and_models.md) - Analytics data layer
- [Kafka Tenant Autoconfig](./architecture/data_kafka_tenant_autoconfig/data_kafka_tenant_autoconfig.md) - Event streaming configuration
- [Redis Cache Config](./architecture/data_redis_cache_config/data_redis_cache_config.md) - Distributed caching

**Security & Infrastructure:**
- [Security OAuth JWT BFF](./architecture/security_oauth_jwt_bff/security_oauth_jwt_bff.md) - Backend for frontend security pattern
- [Service Applications Entrypoints](./architecture/service_applications_entrypoints/service_applications_entrypoints.md) - Spring Boot service configurations
- [API Library Contracts](./architecture/api-lib_contracts_mappers_services/api-lib_contracts_mappers_services.md) - Shared contracts and mappers

### 📊 Architecture Diagrams

Visual documentation and system diagrams:

**System Diagrams:**
- [./architecture/diagrams/overview.mmd](./architecture/diagrams/overview.mmd) - Complete system overview
- [./architecture/diagrams/service_applications_entrypoints.mmd](./architecture/diagrams/service_applications_entrypoints.mmd) - Service deployment architecture

**Service-Specific Diagrams:**
- [./architecture/diagrams/api-service_core_graphql_rest.mmd](./architecture/diagrams/api-service_core_graphql_rest.mmd) - API service architecture
- [./architecture/diagrams/authorization-server_core_tenant_sso_registration.mmd](./architecture/diagrams/authorization-server_core_tenant_sso_registration.mmd) - Authorization flows
- [./architecture/diagrams/gateway_service_security_websocket_proxy.mmd](./architecture/diagrams/gateway_service_security_websocket_proxy.mmd) - Gateway security patterns
- [./architecture/diagrams/stream_service_kafka_debezium_enrichment.mmd](./architecture/diagrams/stream_service_kafka_debezium_enrichment.mmd) - Stream processing flows
- [./architecture/diagrams/frontend_service_api_clients_and_mingo.mmd](./architecture/diagrams/frontend_service_api_clients_and_mingo.mmd) - Frontend architecture
- [./architecture/diagrams/client_service_agent_ingest.mmd](./architecture/diagrams/client_service_agent_ingest.mmd) - Client agent workflows

**Data Flow Diagrams:**
- [./architecture/diagrams/data_mongo_documents_and_repositories.mmd](./architecture/diagrams/data_mongo_documents_and_repositories.mmd) - MongoDB data patterns
- [./architecture/diagrams/data_core_cassandra_pinot_and_models.mmd](./architecture/diagrams/data_core_cassandra_pinot_and_models.mmd) - Analytics data flow
- [./architecture/diagrams/data_kafka_tenant_autoconfig.mmd](./architecture/diagrams/data_kafka_tenant_autoconfig.mmd) - Kafka configuration
- [./architecture/diagrams/security_oauth_jwt_bff.mmd](./architecture/diagrams/security_oauth_jwt_bff.mmd) - Security flows

### 🔧 CLI Tools

OpenFrame CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🔗 Quick Navigation

### Key Resources
- [Project README](../README.md) - Main project overview and quick start
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to OpenFrame
- [License](../LICENSE.md) - Flamingo AI Unified License v1.0

### External Links  
- 🌐 **Website**: [flamingo.run/openframe](https://www.flamingo.run/openframe)
- 💬 **Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📧 **Community Hub**: [openmsp.ai](https://www.openmsp.ai/)

### Video Resources
- 🎥 **Product Overview**: [OpenFrame Preview Webinar](https://www.youtube.com/watch?v=bINdW0CQbvY)
- 🚀 **Live Demo**: [OpenFrame v0.5.2 Walkthrough](https://www.youtube.com/watch?v=a45pzxtg27k)

## 🏗️ Documentation Structure

```text
docs/
├── README.md                     # This file - master documentation index
├── getting-started/              # New user onboarding guides
├── development/                  # Developer resources and workflows  
├── architecture/                 # Technical reference documentation
│   ├── *.md                     # Service and module documentation
│   └── diagrams/                # Mermaid architecture diagrams
└── assets/                      # Images, logos, and media files
```

## 🤝 Contributing to Documentation

Found an error or want to improve the docs? We welcome contributions!

1. **Documentation Issues**: Report on our [Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Content Updates**: Follow our [Contributing Guidelines](../CONTRIBUTING.md)
3. **Architecture Diagrams**: Mermaid diagrams are auto-generated from code documentation

## 📝 Documentation Standards

Our documentation follows these standards:

- **Clear Navigation**: Every page should be reachable from this index
- **Up-to-Date Content**: Documentation is versioned with the codebase
- **Visual Aids**: Architecture diagrams for complex concepts
- **Practical Examples**: Code samples and configuration examples
- **Cross-References**: Links between related topics

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>