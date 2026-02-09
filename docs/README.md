# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** — the multi-tenant, open-source backbone of the OpenFrame platform.

This documentation covers everything you need to understand, deploy, develop, and extend OpenFrame's core services, APIs, and infrastructure.

## 📚 Table of Contents

### Getting Started

New to OpenFrame? Start here to understand the platform and get up and running quickly:

- [Introduction](./getting-started/introduction.md) — Platform overview and core concepts
- [Prerequisites](./getting-started/prerequisites.md) — System requirements and dependencies  
- [Quick Start](./getting-started/quick-start.md) — 5-minute setup and first login
- [First Steps](./getting-started/first-steps.md) — Essential configuration and initial exploration

### Development

Resources for developers working on OpenFrame or building integrations:

- [Development Guide](./development/README.md) — Complete development overview
- [Environment Setup](./development/setup/environment.md) — Local development environment configuration
- [Local Development](./development/setup/local-development.md) — Running OpenFrame locally
- [Architecture Overview](./development/architecture/overview.md) — System design and architectural principles
- [Contributing Guidelines](./development/contributing/guidelines.md) — How to contribute to the project
- [Testing Guide](./development/testing/overview.md) — Testing strategies and requirements

### Reference Documentation

Technical reference documentation for OpenFrame's core services and components:

- [System Overview](./reference/architecture/overview.md) — High-level platform architecture
- [API Service Core](./reference/architecture/api_service_core/api_service_core.md) — Internal GraphQL APIs
- [Gateway Service Core](./reference/architecture/gateway_service_core/gateway_service_core.md) — Request routing and security
- [Authorization Service Core](./reference/architecture/authorization_service_core/authorization_service_core.md) — OAuth2, OIDC, and tenant management
- [External API Service Core](./reference/architecture/external_api_service_core/external_api_service_core.md) — Public API endpoints
- [Stream Processing Service Core](./reference/architecture/stream_processing_service_core/stream_processing_service_core.md) — Event processing and analytics
- [Management Service Core](./reference/architecture/management_service_core/management_service_core.md) — Platform initialization and control
- [Service Entrypoints](./reference/architecture/service_entrypoints/service_entrypoints.md) — Deployable Spring Boot services
- [API Lib Contracts](./reference/architecture/api_lib_contracts/api_lib_contracts.md) — Shared DTOs and data contracts
- [Data Persistence Mongo](./reference/architecture/data_persistence_mongo/data_persistence_mongo.md) — MongoDB schema and repositories
- [Data Platform Services and Pinot](./reference/architecture/data_platform_services_and_pinot/data_platform_services_and_pinot.md) — Analytics and real-time querying
- [Data Infra Kafka and Topics](./reference/architecture/data_infra_kafka_and_topics/data_infra_kafka_and_topics.md) — Event streaming backbone
- [Data Infra Redis Cache](./reference/architecture/data_infra_redis_cache/data_infra_redis_cache.md) — High-performance caching
- [Security OAuth Support](./reference/architecture/security_oauth_support/security_oauth_support.md) — OAuth2 and JWT security primitives
- [Security OAuth BFF](./reference/architecture/security_oauth_bff/security_oauth_bff.md) — Browser-friendly OAuth flows
- [Config Service Core](./reference/architecture/config_service_core/config_service_core.md) — Centralized configuration management
- [IDP Configuration](./reference/architecture/idp_configuration/idp_configuration.md) — Identity provider setup
- [Core Shared Utilities](./reference/architecture/core_shared_utilities/core_shared_utilities.md) — Common utilities and helpers
- [Notification Mail](./reference/architecture/notification_mail/notification_mail.md) — Email delivery and templates
- [Frontend Chat Core Types](./reference/architecture/frontend_chat_core_types/frontend_chat_core_types.md) — Chat system type definitions
- [Chat Client Services](./reference/architecture/chat_client_services/chat_client_services.md) — Client-side chat functionality

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

### Architecture Diagrams

Visual documentation to understand OpenFrame's system architecture:

Architecture diagrams are being generated. Check back soon.

## 🚀 Quick Navigation

### For New Users
1. Start with [Introduction](./getting-started/introduction.md) to understand what OpenFrame is
2. Review [Prerequisites](./getting-started/prerequisites.md) to ensure your system is ready
3. Follow [Quick Start](./getting-started/quick-start.md) to get OpenFrame running
4. Explore [First Steps](./getting-started/first-steps.md) for initial configuration

### For Developers
1. Read [Architecture Overview](./development/architecture/overview.md) to understand the system
2. Set up your [Development Environment](./development/setup/environment.md)
3. Review [Contributing Guidelines](./development/contributing/guidelines.md)
4. Explore the [Reference Documentation](./reference/architecture/overview.md) for detailed technical specs

### For Integrators
1. Review [API Service Core](./reference/architecture/api_service_core/api_service_core.md) for internal APIs
2. Check [External API Service Core](./reference/architecture/external_api_service_core/external_api_service_core.md) for public APIs
3. Understand [Authorization Service](./reference/architecture/authorization_service_core/authorization_service_core.md) for security
4. Explore [Data Platform Services](./reference/architecture/data_platform_services_and_pinot/data_platform_services_and_pinot.md) for analytics

### For System Administrators
1. Review [Service Entrypoints](./reference/architecture/service_entrypoints/service_entrypoints.md) for deployment
2. Understand [Gateway Service](./reference/architecture/gateway_service_core/gateway_service_core.md) for routing
3. Configure [Security OAuth Support](./reference/architecture/security_oauth_support/security_oauth_support.md)
4. Set up [Data Infrastructure](./reference/architecture/data_infra_kafka_and_topics/data_infra_kafka_and_topics.md)

## 📖 External Resources

- **[Project README](../README.md)** — Main project overview and quick start
- **[Contributing Guide](../CONTRIBUTING.md)** — How to contribute to OpenFrame
- **[License](../LICENSE.md)** — Licensing information and terms
- **[OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli)** — Command-line tools (external repository)
- **[Flamingo Knowledge Base](https://www.flamingo.run/knowledge-base)** — Comprehensive guides and tutorials
- **[OpenMSP Community](https://www.openmsp.ai/)** — Community resources and support

## 🤝 Community and Support

- **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** — Real-time community support and discussion
- **[GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)** — Bug reports and feature requests
- **[Flamingo Platform](https://www.flamingo.run)** — Enterprise support and hosted services

## 📝 Documentation Standards

This documentation follows the [Flamingo Markdown Guidelines](https://www.flamingo.run/knowledge-base/markdown-guidelines) for consistent formatting and enhanced readability across platforms.

All documentation is written to work seamlessly on both GitHub and the Flamingo platform, ensuring accessibility regardless of where you're reading.

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*