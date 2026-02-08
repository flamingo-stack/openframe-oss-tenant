# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the tenant-scoped runtime distribution that transforms OpenFrame OSS core libraries into a fully deployable, multi-tenant MSP platform.

## 📚 Table of Contents

### Getting Started
New to OpenFrame? Start here to understand the platform and get up and running quickly.

- **[Introduction](./getting-started/introduction.md)** - What is OpenFrame and how it solves MSP challenges
- **[Prerequisites](./getting-started/prerequisites.md)** - System requirements and setup preparation
- **[Quick Start](./getting-started/quick-start.md)** - Get OpenFrame running in under 5 minutes
- **[First Steps](./getting-started/first-steps.md)** - Explore key features and configuration options

### Development
For developers working with OpenFrame - from local setup to advanced architecture concepts.

- **[Development Overview](./development/README.md)** - Development environment and workflow overview
- **[Environment Setup](./development/setup/environment.md)** - Detailed local development environment setup
- **[Local Development](./development/setup/local-development.md)** - Day-to-day development workflow and tools
- **[Architecture Overview](./development/architecture/overview.md)** - Comprehensive system architecture guide
- **[Testing Overview](./development/testing/overview.md)** - Testing strategies and best practices
- **[Contributing Guidelines](./development/contributing/guidelines.md)** - Contribution workflow and standards

### Reference Documentation
Technical reference documentation for OpenFrame components and services.

#### Core Architecture
- **[System Overview](./reference/overview.md)** - High-level architecture and component relationships

#### Service Layer
- **[Service Entrypoints](./reference/service_entrypoints/service_entrypoints.md)** - Executable Spring Boot applications
- **[API Service Core](./reference/api_service_core/api_service_core.md)** - GraphQL and REST API implementation
- **[Gateway Service Core](./reference/gateway_service_core/gateway_service_core.md)** - API gateway and routing
- **[External API Service Core](./reference/external_api_service_core/external_api_service_core.md)** - Public API endpoints
- **[Client Service Core](./reference/client_service_core/client_service_core.md)** - Agent management and communication
- **[Management Service Core](./reference/management_service_core/management_service_core.md)** - Platform orchestration and management
- **[Stream Processing Core](./reference/stream_processing_core/stream_processing_core.md)** - Event streaming and real-time processing

#### Security & Authentication
- **[Security JWT Core](./reference/security_jwt_core/security_jwt_core.md)** - JWT token management and validation
- **[Security OAuth BFF](./reference/security_oauth_bff/security_oauth_bff.md)** - OAuth Backend-for-Frontend pattern

#### Data Platform
- **[Data Platform Core](./reference/data_platform_core/data_platform_core.md)** - Unified data access layer
- **[Data Persistence MongoDB](./reference/data_persistence_mongo/data_persistence_mongo.md)** - MongoDB integration and schemas
- **[Data Infrastructure Redis](./reference/data_infrastructure_redis/data_infrastructure_redis.md)** - Redis caching and session management
- **[Data Infrastructure Kafka](./reference/data_infrastructure_kafka/data_infrastructure_kafka.md)** - Apache Kafka event streaming

#### Frontend Components
- **[Tenant Frontend Core API Clients](./reference/tenant_frontend_core_api_clients/tenant_frontend_core_api_clients.md)** - Frontend API client libraries
- **[Tenant Frontend Auth Hooks](./reference/tenant_frontend_auth_hooks/tenant_frontend_auth_hooks.md)** - Authentication and authorization hooks
- **[Tenant Frontend Mingo Chat](./reference/tenant_frontend_mingo_chat/tenant_frontend_mingo_chat.md)** - AI assistant chat interface

#### API Client Libraries
- **[API Client Base](./reference/tenant_frontend_core_api_clients/ApiClient.md)** - Base API client implementation
- **[Auth API Client](./reference/tenant_frontend_core_api_clients/AuthApiClient.md)** - Authentication API client
- **[Fleet API Client](./reference/tenant_frontend_core_api_clients/FleetApiClient.md)** - Fleet MDM API integration
- **[Tactical API Client](./reference/tenant_frontend_core_api_clients/TacticalApiClient.md)** - Tactical RMM API integration

#### Domain Services
- **[API Contracts & Domain Services](./reference/api_lib_contracts_and_domain_services/api_lib_contracts_and_domain_services.md)** - Service contracts and domain logic

### Architecture Diagrams
Visual documentation providing system overview and component interactions.

The OpenFrame architecture is documented through comprehensive Mermaid diagrams organized by domain:

#### System Overview
- **[System Overview Diagrams](./diagrams/architecture/)** - Complete system architecture visualizations

#### Service Architecture  
- **[Service Entrypoints](./diagrams/architecture/service_entrypoints.mmd)** - Service deployment and communication patterns
- **[API Service](./diagrams/architecture/api_service_core.mmd)** - GraphQL API and business logic flow
- **[Gateway Service](./diagrams/architecture/gateway_service_core.mmd)** - Request routing and security enforcement
- **[Stream Processing](./diagrams/architecture/stream_processing_core.mmd)** - Event streaming and data processing
- **[Management Service](./diagrams/architecture/management_service_core.mmd)** - Platform orchestration flows

#### Data Architecture
- **[Data Platform](./diagrams/architecture/data_platform_core.mmd)** - Unified data access patterns
- **[MongoDB Integration](./diagrams/architecture/data_persistence_mongo.mmd)** - Document storage and queries
- **[Kafka Streaming](./diagrams/architecture/data_infrastructure_kafka.mmd)** - Event streaming architecture
- **[Redis Caching](./diagrams/architecture/data_infrastructure_redis.mmd)** - Caching and session patterns

#### Security Architecture
- **[JWT Security](./diagrams/architecture/security_jwt_core.mmd)** - Token-based authentication flows
- **[OAuth BFF](./diagrams/architecture/security_oauth_bff.mmd)** - OAuth Backend-for-Frontend patterns

#### Frontend Architecture
- **[API Clients](./diagrams/architecture/tenant_frontend_core_api_clients.mmd)** - Frontend-to-backend communication
- **[Authentication Hooks](./diagrams/architecture/tenant_frontend_auth_hooks.mmd)** - Frontend authentication patterns
- **[Mingo Chat](./diagrams/architecture/tenant_frontend_mingo_chat.mmd)** - AI assistant interaction flows

### CLI Tools

The **OpenFrame CLI** provides essential tools for platform management and is maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [CLI Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)  
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Important**: CLI tools are NOT located in this repository. Always refer to the external repository for installation, usage instructions, and support.

## 📖 Quick Navigation

| Need Help With | Go To |
|----------------|-------|
| **Getting started** | [Introduction](./getting-started/introduction.md) → [Quick Start](./getting-started/quick-start.md) |
| **Setting up development** | [Prerequisites](./getting-started/prerequisites.md) → [Environment Setup](./development/setup/environment.md) |
| **Understanding architecture** | [Architecture Overview](./development/architecture/overview.md) → [System Diagrams](./diagrams/architecture/) |
| **API integration** | [API Service Core](./reference/api_service_core/api_service_core.md) → [API Clients](./reference/tenant_frontend_core_api_clients/tenant_frontend_core_api_clients.md) |
| **Contributing code** | [Contributing Guidelines](./development/contributing/guidelines.md) → [Testing Overview](./development/testing/overview.md) |
| **Security implementation** | [JWT Security](./reference/security_jwt_core/security_jwt_core.md) → [OAuth BFF](./reference/security_oauth_bff/security_oauth_bff.md) |

## 🛠️ Developer Quick Links

- **[Project README](../README.md)** - Main project overview and quick start
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to OpenFrame
- **[License](../LICENSE.md)** - Flamingo AI Unified License v1.0

## 🤝 Community & Support

- **💬 OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **📖 Knowledge Base**: [Flamingo Documentation](https://www.flamingo.run/knowledge-base)
- **🐛 Issues**: [Report bugs or request features](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
- **💼 Enterprise Support**: Contact [Flamingo](https://www.flamingo.run) for commercial support

## 📋 Documentation Status

This documentation covers the complete OpenFrame OSS Tenant platform. All sections include:

- ✅ **Reference Documentation** - Complete API and component documentation
- ✅ **Getting Started Guides** - Step-by-step tutorials and setup instructions  
- ✅ **Development Guides** - Architecture, testing, and contribution workflows
- ✅ **Architecture Diagrams** - Visual system documentation with Mermaid diagrams

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant) • Last updated: $(date)*