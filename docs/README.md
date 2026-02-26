# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame** - the AI-powered, multi-tenant MSP platform that integrates multiple tools into a single intelligent interface.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## 📚 Table of Contents

### Getting Started
New to OpenFrame? Start here to get up and running quickly:

- [Introduction](getting-started/introduction.md) - What is OpenFrame and key features
- [Prerequisites](getting-started/prerequisites.md) - System requirements and setup
- [Quick Start](getting-started/quick-start.md) - Get OpenFrame running in 5 minutes
- [First Steps](getting-started/first-steps.md) - Explore key features and workflows

### Development
Guides for developers contributing to or extending OpenFrame:

- [Development Overview](development/README.md) - Development workflow and environment
- [Local Development Setup](development/setup/local-development.md) - Configure your development environment
- [Environment Configuration](development/setup/environment.md) - Environment variables and configuration
- [Testing Guide](development/testing/README.md) - Comprehensive testing practices
- [Contributing Guidelines](development/contributing/guidelines.md) - How to contribute to the project
- [Security Best Practices](development/security/README.md) - Security requirements and guidelines
- [Architecture Guide](development/architecture/README.md) - System design and architectural principles

### Reference Documentation
Technical reference documentation for all OpenFrame components:

**API Layer**
- [API Service Core Config And Security](./architecture/api-service-core-config-and-security/api-service-core-config-and-security.md) - Core API configuration and security setup
- [API Service Core REST Controllers](./architecture/api-service-core-rest-controllers/api-service-core-rest-controllers.md) - REST endpoint implementations
- [API Service Core GraphQL Fetchers And Dataloaders](./architecture/api-service-core-graphql-fetchers-and-dataloaders/api-service-core-graphql-fetchers-and-dataloaders.md) - GraphQL implementation
- [API Lib DTO And Mapping](./architecture/api-lib-dto-and-mapping/api-lib-dto-and-mapping.md) - Data transfer objects and mapping
- [API Lib Domain Services](./architecture/api-lib-domain-services/api-lib-domain-services.md) - Business logic services

**Authorization & Security**
- [Authorization Server Core And Tenant Context](./architecture/authorization-server-core-and-tenant-context/authorization-server-core-and-tenant-context.md) - Multi-tenant authorization core
- [Authorization Server REST Controllers](./architecture/authorization-server-rest-controllers/authorization-server-rest-controllers.md) - OAuth2/OIDC endpoints
- [Authorization Server Keys And Persistence](./architecture/authorization-server-keys-and-persistence/authorization-server-keys-and-persistence.md) - Key management and storage
- [Authorization Server SSO And Registration Flow](./architecture/authorization-server-sso-and-registration-flow/authorization-server-sso-and-registration-flow.md) - SSO integration flows
- [Security OAuth BFF And Shared JWT](./architecture/security-oauth-bff-and-shared-jwt/security-oauth-bff-and-shared-jwt.md) - Shared security infrastructure

**Gateway & Routing**
- [Gateway Core Security And Websocket Proxy](./architecture/gateway-core-security-and-websocket-proxy/gateway-core-security-and-websocket-proxy.md) - Gateway security and WebSocket proxying
- [Gateway REST Controllers](./architecture/gateway-rest-controllers/gateway-rest-controllers.md) - Gateway endpoint implementations

**External API**
- [External API Service Core REST And DTO](./architecture/external-api-service-core-rest-and-dto/external-api-service-core-rest-and-dto.md) - Public API endpoints

**Streaming & Events**
- [Stream Service Core Kafka Streams And Deserialization](./architecture/stream-service-core-kafka-streams-and-deserialization/stream-service-core-kafka-streams-and-deserialization.md) - Kafka Streams processing
- [Stream Service Core Message Handling And Enrichment](./architecture/stream-service-core-message-handling-and-enrichment/stream-service-core-message-handling-and-enrichment.md) - Message processing and enrichment
- [Data Streaming Kafka Config And Models](./architecture/data-streaming-kafka-config-and-models/data-streaming-kafka-config-and-models.md) - Kafka configuration and data models

**Data Layer**
- [Data Mongo Core And Documents](./architecture/data-mongo-core-and-documents/data-mongo-core-and-documents.md) - MongoDB integration and document models
- [Data Mongo Repositories](./architecture/data-mongo-repositories/data-mongo-repositories.md) - MongoDB repository implementations
- [Data Platform Config And Health](./architecture/data-platform-config-and-health/data-platform-config-and-health.md) - Data platform configuration
- [Data Pinot Repositories And Models](./architecture/data-pinot-repositories-and-models/data-pinot-repositories-and-models.md) - Apache Pinot integration

**Client Services**
- [Client Service Core Http And Listeners](./architecture/client-service-core-http-and-listeners/client-service-core-http-and-listeners.md) - Agent communication and lifecycle management

**Frontend & AI**
- [Frontend Tenant Api Clients And Mingo](./architecture/frontend-tenant-api-clients-and-mingo/frontend-tenant-api-clients-and-mingo.md) - Frontend API integration and Mingo AI
- [Chat Client Services And Debug](./architecture/chat-client-services-and-debug/chat-client-services-and-debug.md) - Desktop chat client

**Service Applications**
- [Service Applications Entrypoints](./architecture/service-applications-entrypoints/service-applications-entrypoints.md) - Microservice application entry points

### Diagrams
Visual documentation and architecture diagrams:
- **Architecture Diagrams** - View detailed Mermaid diagrams in: `./architecture/diagrams/`
- **Component Interactions** - Service communication and data flow diagrams
- **Security Models** - Authentication and authorization flow diagrams
- **Data Pipelines** - Streaming and batch processing visualizations

### CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)  
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🔍 Finding What You Need

### By Use Case

**Setting up OpenFrame:**
1. Start with [Prerequisites](getting-started/prerequisites.md)
2. Follow [Quick Start](getting-started/quick-start.md)
3. Complete [First Steps](getting-started/first-steps.md)

**Understanding the Architecture:**
1. Read the [main README architecture overview](../README.md#architecture)  
2. Study [Service Applications Entrypoints](./architecture/service-applications-entrypoints/service-applications-entrypoints.md)
3. Review specific service documentation for detailed component understanding

**Contributing Code:**
1. Review [Contributing Guidelines](development/contributing/guidelines.md)
2. Set up [Local Development](development/setup/local-development.md)
3. Read [Security Best Practices](development/security/README.md)

**Integrating with OpenFrame:**
1. Review [External API Service](./architecture/external-api-service-core-rest-and-dto/external-api-service-core-rest-and-dto.md) for public APIs
2. Study [Frontend API Clients](./architecture/frontend-tenant-api-clients-and-mingo/frontend-tenant-api-clients-and-mingo.md) for frontend integration
3. Check [Authorization Server](./architecture/authorization-server-core-and-tenant-context/authorization-server-core-and-tenant-context.md) for authentication

### By Technology

**Spring Boot Services:**
- API, Authorization, Gateway, Stream, Client service documentation

**Data Technologies:**
- MongoDB, Cassandra, Apache Pinot, Kafka documentation

**Frontend & AI:**
- React/TypeScript frontend, Mingo AI, Chat client documentation

**Security & Multi-tenancy:**
- OAuth2/OIDC, JWT, tenant isolation documentation

## 🆘 Support and Community

### Getting Help

**Community Channels:**
- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
  - `#general` - General discussion
  - `#dev-help` - Development questions
  - `#documentation` - Documentation feedback

**Official Resources:**
- **Company**: [Flamingo Platform](https://flamingo.run)
- **Product**: [OpenFrame](https://www.flamingo.run/openframe)
- **Community**: [OpenMSP](https://www.openmsp.ai/)

### Contributing to Documentation

Documentation improvements are always welcome! To contribute:

1. **For Quick Fixes**: Edit files directly and submit a pull request
2. **For Major Changes**: Discuss in Slack `#documentation` channel first
3. **Follow Guidelines**: Use our [Contributing Guidelines](development/contributing/guidelines.md)

### Reporting Issues

If you find issues with the documentation:
1. Check if the issue already exists in GitHub Issues
2. Create a new issue with the `documentation` label
3. Provide clear details about what's wrong or missing

## 📖 Quick Links

- [Project README](../README.md) - Main project overview and quick start
- [Contributing](../CONTRIBUTING.md) - How to contribute to OpenFrame
- [License](../LICENSE.md) - Project license information

---

## 🏗️ Architecture Overview

OpenFrame is built as a **multi-tenant, event-driven microservice platform** with the following key characteristics:

**Multi-Tenant by Design:**
- Complete tenant isolation across all services
- Tenant-scoped OAuth2 clients and JWT tokens  
- Database-level tenant separation
- RSA key management per tenant

**AI-Powered Automation:**
- **Mingo AI** - Intelligent technician assistant
- **Fae** - AI client interface
- Real-time dialog orchestration
- Streaming message processing

**Event-Driven Architecture:**
- Kafka Streams for real-time event processing
- NATS/JetStream for agent communication
- CDC (Change Data Capture) integration
- Message enrichment and normalization

**Microservice Foundation:**
- Spring Boot 3.3.0 with Java 21
- Reactive gateway with Spring WebFlux
- GraphQL + REST API support
- Service discovery and configuration management

For a complete architectural overview, see the [main README](../README.md#architecture).

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*