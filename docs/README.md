# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the open-source, multi-tenant implementation of Flamingo's unified AI-powered MSP platform.

## 📚 Table of Contents

### 🚀 Getting Started
Perfect starting point for new users and developers:

- **[Introduction](./getting-started/introduction.md)** - What is OpenFrame and why use it?
- **[Prerequisites](./getting-started/prerequisites.md)** - System requirements and dependencies
- **[Quick Start](./getting-started/quick-start.md)** - Get OpenFrame running in 5 minutes
- **[First Steps](./getting-started/first-steps.md)** - Essential configuration and initial setup

### 🛠️ Development
Comprehensive guides for contributors and developers:

- **[Development Overview](./development/README.md)** - Development section index and overview
- **[Environment Setup](./development/setup/environment.md)** - Set up your development environment
- **[Local Development](./development/setup/local-development.md)** - Run OpenFrame locally for development
- **[Architecture Overview](./development/architecture/overview.md)** - System architecture and design principles
- **[Microservices](./development/architecture/microservices.md)** - Service-oriented architecture details
- **[Security Architecture](./development/architecture/security.md)** - Authentication, authorization, and security patterns
- **[Data Flow](./development/architecture/data-flow.md)** - How data moves through the system
- **[Integration Patterns](./development/architecture/integration.md)** - External system integration approaches
- **[Event Streaming Pipeline](./development/architecture/integrated-tools-event-streaming-pipeline.md)** - Kafka-based event processing
- **[Testing Overview](./development/testing/overview.md)** - Testing strategies and frameworks
- **[Contributing Guidelines](./development/contributing/guidelines.md)** - How to contribute to OpenFrame
- **[Code Style Guide](./development/contributing/code-style.md)** - Coding standards and best practices
- **[Rust Client Development](./development/client-agent/rust-development.md)** - Developing the cross-platform client agent
- **[Development Tools](./development/tools/scripts.md)** - Scripts and utilities for development

### 📖 Reference
Technical reference documentation and architecture deep-dives:

- **[Architecture Overview](./reference/architecture/overview.md)** - Complete technical architecture reference
- **[Shared Services](./reference/architecture/shared-services.md)** - Common services and utilities
- **[API Service Core](./reference/architecture/openframe-api-service-core-lib.md)** - Core API service library
- **[API DTOs and Mappers](./reference/architecture/openframe-api-lib-dtos-and-mappers.md)** - Data transfer objects and mapping
- **[Gateway Service Core](./reference/architecture/gateway-service-core-lib.md)** - API gateway implementation
- **[Gateway API Keys & Rate Limiting](./reference/architecture/gateway-api-key-and-rate-limiting.md)** - Gateway security features
- **[Authorization Service Core](./reference/architecture/authorization-service-core-lib.md)** - OAuth2/OIDC implementation
- **[Security & OAuth BFF](./reference/architecture/security-core-and-oauth-bff.md)** - Backend-for-frontend security
- **[Authentication](./reference/architecture/auth.md)** - Authentication mechanisms and flows
- **[Stream Service Core](./reference/architecture/stream-service-core-lib.md)** - Event streaming implementation
- **[Management Service Core](./reference/architecture/management-service-core-lib.md)** - Platform management service
- **[External API Service Core](./reference/architecture/external-api-service-core-lib.md)** - External API integration
- **[Client Core Library](./reference/architecture/client-core-lib.md)** - Client agent core functionality
- **[Config Core Library](./reference/architecture/config-core-lib.md)** - Configuration management
- **[Data Access & Models](./reference/architecture/data-access-and-model-core.md)** - Data layer and domain models
- **[MongoDB Persistence](./reference/architecture/mongo-persistence-layer.md)** - MongoDB integration and repositories
- **[Redis Cache Layer](./reference/architecture/redis-cache-layer.md)** - Redis caching implementation
- **[Redis Configuration](./reference/architecture/redis-configuration.md)** - Redis setup and configuration
- **[Redis Key Management](./reference/architecture/redis-key-management.md)** - Redis key patterns and management
- **[Cache Configuration](./reference/architecture/cache-configuration.md)** - Caching strategies and configuration
- **[Kafka Integration](./reference/architecture/kafka-integration-lib.md)** - Apache Kafka integration library
- **[IDP Configuration Scheduler](./reference/architecture/idp-configuration-scheduler-lib.md)** - Identity provider scheduling
- **[Frontend Web App Integrations](./reference/architecture/frontend-web-app-core-integrations.md)** - Frontend service integrations
- **[API Clients](./reference/architecture/api-clients.md)** - Client libraries and SDKs
- **[Extension Points](./reference/architecture/extension-points.md)** - Customization and extension mechanisms
- **[Core Shared Utilities](./reference/architecture/core-shared-utilities.md)** - Common utilities and helpers

### 📊 Visual Documentation
Architecture diagrams and visual guides:

*Note: Mermaid diagrams are embedded throughout the documentation above. Dedicated diagram files will be listed here as they are created.*

### 🔧 CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Important**: CLI tools are NOT located in this repository. Always refer to the external repository for installation, usage, and documentation.

## 🗂️ Documentation Structure

Our documentation is organized into logical sections:

- **Getting Started**: For new users who want to quickly understand and use OpenFrame
- **Development**: For contributors and developers working on the OpenFrame platform
- **Reference**: Technical deep-dives and architecture documentation for advanced users
- **CLI Tools**: External repository with command-line utilities

## 📖 Quick Links

- **[Project README](../README.md)** - Main project overview and features
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to OpenFrame
- **[License](../LICENSE.md)** - Flamingo AI Unified License v1.0

## 🌟 Key Resources

### For New Users
1. Start with [Introduction](./getting-started/introduction.md) to understand OpenFrame
2. Check [Prerequisites](./getting-started/prerequisites.md) for system requirements
3. Follow [Quick Start](./getting-started/quick-start.md) to get running quickly

### For Developers  
1. Review [Development Overview](./development/README.md) for contribution guidelines
2. Set up your environment with [Environment Setup](./development/setup/environment.md)
3. Understand the [Architecture Overview](./development/architecture/overview.md)

### For System Architects
1. Study [Architecture Overview](./reference/architecture/overview.md) for technical details
2. Review [Security Architecture](./development/architecture/security.md) for security patterns
3. Examine [Event Streaming Pipeline](./development/architecture/integrated-tools-event-streaming-pipeline.md) for data flow

## 🤝 Community & Support

- **💬 Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support and discussion
- **📚 Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base)
- **🌐 Main Website**: [flamingo.run](https://www.flamingo.run) and [openframe.ai](https://openframe.ai)

## 📝 Contributing to Documentation

Found an error or want to improve the documentation? We welcome contributions!

1. Follow our [Contributing Guidelines](./development/contributing/guidelines.md)
2. Check our [Code Style Guide](./development/contributing/code-style.md) for markdown standards
3. Submit a pull request with your improvements

## 🔍 Search and Navigation

- Use your browser's find function (Ctrl+F / Cmd+F) to search within pages
- Each section has cross-references to related topics
- All headings are linkable for easy sharing and bookmarking

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant) - keeping docs fresh and comprehensive!* 🚀