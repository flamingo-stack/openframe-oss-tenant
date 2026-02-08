# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame** - the AI-powered MSP platform that unifies data, APIs, automation, and intelligent assistance into a single, scalable solution.

## 📚 Table of Contents

### Getting Started
New to OpenFrame? Start here to get up and running quickly:

- [Introduction](./getting-started/introduction.md) - Overview and core concepts
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and setup checklist  
- [Quick Start](./getting-started/quick-start.md) - Get OpenFrame running in minutes
- [First Steps](./getting-started/first-steps.md) - Configure your organization and basic setup

### Development
Development guides for building, extending, and contributing to OpenFrame:

- [Development Overview](./development/README.md) - Development introduction and workflows
- [Environment Setup](./development/setup/environment.md) - Configure your development environment
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally for development
- [Architecture Overview](./development/architecture/overview.md) - System architecture and design principles
- [Testing Overview](./development/testing/overview.md) - Testing strategies and guidelines
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to the project

### Reference Documentation
Technical reference documentation for OpenFrame's architecture and services:

#### Core Architecture
- [System Overview](./reference/architecture/overview.md) - High-level platform architecture

#### Services
- [API Service Core](./reference/architecture/api_service_core/api_service_core.md) - Internal system-of-record APIs
- [Authorization Server Core](./reference/architecture/authorization_server_core/authorization_server_core.md) - Tenant-aware OAuth2/OIDC issuer
- [Gateway Service Core](./reference/architecture/gateway_service_core/gateway_service_core.md) - Unified ingress and security perimeter
- [External API Service Core](./reference/architecture/external_api_service_core/external_api_service_core.md) - Public integration APIs
- [Client Agent Service Core](./reference/architecture/client_agent_service_core/client_agent_service_core.md) - Agent lifecycle management
- [Stream Service Core](./reference/architecture/stream_service_core/stream_service_core.md) - Real-time event processing
- [Management Service Core](./reference/architecture/management_service_core/management_service_core.md) - Platform orchestration

#### Data Layer
- [Data Layer Overview](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/data_layer_mongo_redis_kafka_pinot_cassandra.md) - Multi-model data architecture
- [MongoDB](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/Mongo.md) - Document database integration
- [Redis](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/Redis.md) - Caching and session management
- [Apache Kafka](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/Kafka.md) - Event streaming platform
- [Apache Pinot](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/Pinot.md) - Real-time analytics database
- [Cassandra](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/Cassandra.md) - Time-series data storage

#### Frontend & Clients
- [Frontend App](./reference/architecture/frontend_app_openframe_frontend/frontend_app_openframe_frontend.md) - Vue.js web application
- [Chat Client](./reference/architecture/chat_client_openframe_chat/chat_client_openframe_chat.md) - Conversational AI interface

#### Infrastructure
- [Service Entrypoints](./reference/architecture/service_entrypoints/service_entrypoints.md) - Spring Boot service configuration
- [Security & OAuth](./reference/architecture/security_oauth_core/security_oauth_core.md) - Authentication and authorization
- [API Libraries](./reference/architecture/api_lib_contracts_and_services/api_lib_contracts_and_services.md) - Shared contracts and services

### Architecture Diagrams
Visual documentation showing OpenFrame's system design and data flow:

The following Mermaid diagrams provide detailed visual representations of OpenFrame's architecture:

#### System Overview
- [Platform Overview Diagrams](./diagrams/architecture/) - High-level system architecture visualizations

#### Service-Specific Diagrams  
- **Core Services**: API, Gateway, Authorization, Management service architectures
- **Data Flow**: Stream processing, event sourcing, and data layer interactions
- **Client Architecture**: Frontend components, chat interface, and agent communication
- **Infrastructure**: Service deployment, security models, and integration patterns

**Note**: All diagrams are created using Mermaid and can be viewed directly in GitHub or any Mermaid-compatible viewer.

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository for easy distribution and updates:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation Guide**: [CLI Installation](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)
- **Command Reference**: [CLI Commands](https://github.com/flamingo-stack/openframe-cli/tree/main/docs/commands)

**Important**: CLI tools are **not** located in this repository. Always refer to the external repository for installation, updates, and usage instructions.

### External Resources

#### Community & Support
- **OpenMSP Community**: [Join our Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - Primary community hub
- **Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base) - Official documentation
- **Website**: [flamingo.run](https://www.flamingo.run) - Flamingo platform overview

#### Related Projects
- **OpenFrame CLI**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli) - Command-line interface
- **OpenFrame Docs**: [flamingo.run/openframe](https://www.flamingo.run/openframe) - Product documentation

## 🚀 Quick Navigation

### For New Users
1. **Start Here**: [Introduction](./getting-started/introduction.md) to understand what OpenFrame is
2. **Setup**: Follow [Prerequisites](./getting-started/prerequisites.md) and [Quick Start](./getting-started/quick-start.md)
3. **Learn**: Complete [First Steps](./getting-started/first-steps.md) tutorial
4. **Explore**: Browse [Architecture Overview](./reference/architecture/overview.md)

### For Developers  
1. **Environment**: Set up [Development Environment](./development/setup/environment.md)
2. **Architecture**: Study [System Architecture](./development/architecture/overview.md)
3. **Contributing**: Read [Contributing Guidelines](./development/contributing/guidelines.md)
4. **APIs**: Explore [API Service Documentation](./reference/architecture/api_service_core/api_service_core.md)

### For Administrators
1. **Deployment**: Review [Management Service](./reference/architecture/management_service_core/management_service_core.md)
2. **Security**: Understand [Authorization Server](./reference/architecture/authorization_server_core/authorization_server_core.md)
3. **Monitoring**: Configure observability with [Data Layer](./reference/architecture/data_layer_mongo_redis_kafka_pinot_cassandra/data_layer_mongo_redis_kafka_pinot_cassandra.md)
4. **CLI Tools**: Use [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli) for operations

## 📖 Additional Resources

### Quick Links
- [Project README](../README.md) - Main project overview and features
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to OpenFrame
- [License](../LICENSE.md) - Licensing information and terms

### Community
- [OpenMSP Slack](https://www.openmsp.ai/) - Join our vibrant community
- [LinkedIn](https://www.linkedin.com/showcase/openframemsp/about/) - Follow OpenFrame updates
- [GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues) - Report bugs and request features

**Note**: We primarily coordinate development activities on our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) rather than GitHub Issues. Join Slack for real-time collaboration and support!

## 🔄 Documentation Updates

This documentation is continuously updated as OpenFrame evolves. Key information:

- **Last Updated**: Generated by OpenFrame Doc Orchestrator
- **Version Tracking**: Documentation versions match OpenFrame releases  
- **Contributions**: Help us improve the docs via [GitHub contributions](../CONTRIBUTING.md)
- **Feedback**: Share suggestions in our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*