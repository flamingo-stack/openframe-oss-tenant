# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the complete, production-grade multi-tenant backend stack for the OpenFrame platform.

## 📚 Table of Contents

### Getting Started
Quick setup and introduction guides to get you running with OpenFrame:

- [Introduction](./getting-started/introduction.md) - Platform overview and key concepts
- [Prerequisites](./getting-started/prerequisites.md) - Development environment setup requirements
- [Quick Start](./getting-started/quick-start.md) - Get OpenFrame running in under 5 minutes
- [First Steps](./getting-started/first-steps.md) - Initial configuration and feature exploration

### Development
Development workflows, environment setup, and contribution guidelines:

- [README](./development/README.md) - Development documentation overview
- [Environment Setup](./development/setup/environment.md) - IDE and development tools configuration
- [Local Development](./development/setup/local-development.md) - Running OpenFrame locally for development
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute to the project
- [Architecture Overview](./development/architecture/README.md) - Development architecture patterns
- [Security Guidelines](./development/security/README.md) - Security best practices for development
- [Testing Overview](./development/testing/README.md) - Testing strategies and frameworks

### Reference
Technical reference documentation for each service and component:

- [Architecture Overview](./architecture/README.md) - Complete system architecture documentation
- [API Service Core](./architecture/api-service-core/api-service-core.md) - GraphQL and REST API service
- [API Lib Contracts and Services](./architecture/api-lib-contracts-and-services/api-lib-contracts-and-services.md) - Shared contracts and service interfaces
- [Authorization Service Core](./architecture/authorization-service-core/authorization-service-core.md) - Multi-tenant OAuth2/OIDC identity management
- [Gateway Service Core](./architecture/gateway-service-core/gateway-service-core.md) - Edge routing, JWT validation, and API gateway
- [Stream Service Core](./architecture/stream-service-core/stream-service-core.md) - Kafka event processing and real-time streaming
- [External API Service Core](./architecture/external-api-service-core/external-api-service-core.md) - Public REST API with rate limiting
- [Management Service Core](./architecture/management-service-core/management-service-core.md) - Tool lifecycle and infrastructure management
- [Data Layer Core](./architecture/data-layer-core/data-layer-core.md) - Core data structures and repository patterns
- [Data Layer Mongo](./architecture/data-layer-mongo/data-layer-mongo.md) - MongoDB integration and multi-tenant data access
- [Data Layer Kafka](./architecture/data-layer-kafka/data-layer-kafka.md) - Kafka integration and stream processing
- [Service Applications](./architecture/service-applications/service-applications.md) - Executable Spring Boot microservices

### Diagrams
Visual architecture documentation and system diagrams:

Architecture diagrams are available in Mermaid format at:
- **Diagram Directory**: `./architecture/diagrams/`
- **Main Architecture Diagram**: [README.mmd](./architecture/diagrams/README.mmd)

**Service-Specific Diagrams:**
- API Service Core diagrams
- Authorization Service Core diagrams  
- Gateway Service Core diagrams
- Stream Service Core diagrams
- Data Layer diagrams
- Management Service Core diagrams
- External API Service Core diagrams

> **Note**: Diagrams can be viewed in any Mermaid-compatible viewer or rendered directly in GitHub.

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🚀 Quick Links

- [Project README](../README.md) - Main project overview and quick start
- [Contributing](../CONTRIBUTING.md) - Comprehensive contribution guidelines
- [License](../LICENSE.md) - License information and terms

## 🏗️ Architecture Quick Reference

OpenFrame follows a modern microservices architecture with these core components:

### Core Services
- **Gateway Service** (Port 8443) - Edge routing, JWT validation, API key enforcement
- **Authorization Server** (Port 9000) - Multi-tenant OAuth2 + OIDC identity management
- **API Service** (Port 8080) - Internal GraphQL + REST API orchestration
- **External API Service** (Port 8084) - Public REST interface with rate limiting
- **Management Service** (Port 8082) - Tool lifecycle + infrastructure initialization
- **Stream Service** (Port 8083) - Kafka-based real-time processing & event enrichment

### Data Persistence
- **MongoDB** - Operational data storage with multi-tenant isolation
- **Apache Kafka** - Event streaming and Change Data Capture (CDC)
- **Apache Pinot** - Real-time analytics and OLAP queries
- **Apache Cassandra** - Time-series data and high-volume writes
- **NATS JetStream** - Messaging and job coordination

### Key Features
- 🏢 **Multi-Tenant Architecture** with complete tenant isolation
- 🔐 **Enterprise Security** via OAuth2/OIDC and JWT validation
- 🌊 **Event-Driven Processing** with Kafka streams and real-time analytics
- 🤖 **AI Integration** with Anthropic Claude and VoltAgent Core
- 🔌 **Extensible Design** with plugin architecture for MSP tool integrations

## 📖 Documentation Conventions

### Service Documentation Structure
Each service follows a consistent documentation pattern:

```text
service-name/
├── service-name.md          # Main service documentation
├── README.md               # Service overview (if applicable)
└── diagrams/               # Service-specific Mermaid diagrams
```

### Code Examples
Code examples follow these conventions:
- **Java**: Spring Boot 3.3.0 with Java 21 syntax
- **Configuration**: YAML format for Spring configuration
- **API Examples**: cURL commands with realistic examples
- **Docker**: Docker Compose for service orchestration

### Getting Started Path

New to OpenFrame? Follow this recommended learning path:

1. **[Introduction](./getting-started/introduction.md)** - Understand what OpenFrame is and its key concepts
2. **[Prerequisites](./getting-started/prerequisites.md)** - Set up your development environment
3. **[Quick Start](./getting-started/quick-start.md)** - Get the platform running locally
4. **[Architecture Overview](./architecture/README.md)** - Learn the system design
5. **[API Service Core](./architecture/api-service-core/api-service-core.md)** - Understand the API layer
6. **[Development Environment](./development/setup/environment.md)** - Configure for development

## 🎯 Common Use Cases

### For MSP Developers
- **Building integrations** - See [API Service Core](./architecture/api-service-core/api-service-core.md) and [External API Service](./architecture/external-api-service-core/external-api-service-core.md)
- **Adding new MSP tools** - Check [Management Service Core](./architecture/management-service-core/management-service-core.md)
- **Custom authentication** - Review [Authorization Service Core](./architecture/authorization-service-core/authorization-service-core.md)

### For Platform Engineers
- **Deployment strategies** - See [Service Applications](./architecture/service-applications/service-applications.md)
- **Scaling considerations** - Review architecture diagrams and [Stream Service Core](./architecture/stream-service-core/stream-service-core.md)
- **Data persistence** - Check [Data Layer documentation](./architecture/data-layer-core/data-layer-core.md)

### For Contributors
- **Code standards** - See [Contributing Guidelines](./development/contributing/guidelines.md)
- **Testing practices** - Review [Testing Overview](./development/testing/README.md)
- **Security requirements** - Check [Security Guidelines](./development/security/README.md)

## 💬 Community & Support

### Primary Community Hub
- **OpenMSP Slack**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

### Important Note
> **All project management, feature discussions, bug reports, and support happen in our OpenMSP Slack community.** We don't use GitHub Issues or GitHub Discussions - join Slack for the most active and responsive community support!

### Useful Channels
- `#general` - General OpenFrame discussions and announcements
- `#development` - Technical development discussions and architecture
- `#help` - Support, troubleshooting, and getting started assistance  
- `#contributions` - Contribution coordination and code reviews

## 🔄 Frequently Updated Sections

The following documentation sections are updated frequently and should be checked for the latest information:

- **[Quick Start Guide](./getting-started/quick-start.md)** - Setup procedures and commands
- **[API Service Core](./architecture/api-service-core/api-service-core.md)** - GraphQL schema and REST endpoints
- **[Contributing Guidelines](./development/contributing/guidelines.md)** - Development workflows and standards
- **[Architecture Diagrams](./architecture/diagrams/)** - System design visualization

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

**Questions or suggestions for improving this documentation?** Join our [OpenMSP Slack community](https://www.openmsp.ai/) and let us know in the `#general` channel!