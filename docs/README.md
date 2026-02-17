# OpenFrame Documentation

Welcome to the comprehensive documentation for **OpenFrame** - the unified AI-powered MSP platform that replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation.

## 📚 Table of Contents

### Getting Started

Step-by-step guides to get you up and running with OpenFrame:

- **[Introduction](./getting-started/introduction.md)** - What is OpenFrame and why use it
- **[Prerequisites](./getting-started/prerequisites.md)** - System requirements and dependencies  
- **[Quick Start](./getting-started/quick-start.md)** - Get running in 5 minutes
- **[First Steps](./getting-started/first-steps.md)** - Explore key features and initial configuration

### Development

Comprehensive guides for developers and contributors:

- **[Development Overview](./development/README.md)** - Development section introduction and navigation
- **[Environment Setup](./development/setup/environment.md)** - IDE configuration and development tools
- **[Local Development](./development/setup/local-development.md)** - Running OpenFrame locally for development
- **[Architecture Overview](./development/architecture/README.md)** - System architecture and design patterns
- **[Security Best Practices](./development/security/README.md)** - Authentication, authorization, and security implementation
- **[Testing Guide](./development/testing/README.md)** - Testing strategies and running tests
- **[Contributing Guidelines](./development/contributing/guidelines.md)** - Code standards, PR process, and contribution workflow

### Reference Documentation

Technical reference documentation for all OpenFrame services and components:

- **[Repository Overview](./architecture/README.md)** - Complete system architecture and component relationships
- **[API Service Core](./architecture/api-service-core/api-service-core.md)** - Primary internal API layer with REST and GraphQL
- **[Authorization Server Core](./architecture/authorization-server-core/authorization-server-core.md)** - Multi-tenant OAuth2/OIDC identity provider
- **[Gateway Service Core](./architecture/gateway-service-core/gateway-service-core.md)** - Reactive API gateway with security enforcement
- **[External API Service Core](./architecture/external-api-service-core/external-api-service-core.md)** - Public REST API for third-party integrations
- **[Client Service Core](./architecture/client-service-core/client-service-core.md)** - Agent control plane and device management
- **[Management Service Core](./architecture/management-service-core/management-service-core.md)** - Operational control plane and orchestration
- **[Stream Service Core](./architecture/stream-service-core/stream-service-core.md)** - Event ingestion, normalization, and processing
- **[Data Access - MongoDB](./architecture/data-access-mongo/data-access-mongo.md)** - MongoDB persistence layer and repositories
- **[Data Access - Kafka](./architecture/data-access-kafka/data-access-kafka.md)** - Kafka integration for event streaming
- **[Security Core & OAuth BFF](./architecture/security-core-and-oauth-bff/security-core-and-oauth-bff.md)** - Frontend OAuth orchestration and security
- **[Service Applications](./architecture/service-applications/service-applications.md)** - Deployable Spring Boot service configurations
- **[Tenant Frontend App Core](./architecture/tenant-frontend-app-core/tenant-frontend-app-core.md)** - Browser-based SaaS tenant interface
- **[API Lib - Contracts and Services](./architecture/api-lib-contracts-and-services/api-lib-contracts-and-services.md)** - Shared DTOs, contracts, and service interfaces

### Diagrams

Visual architecture documentation and system diagrams:

- **Location**: `./architecture/diagrams/`
- **Format**: Mermaid diagrams (`.mmd` files)
- **Coverage**: Component relationships, data flow, sequence diagrams, and system interactions

View Mermaid diagrams in any Markdown viewer or GitHub for detailed visual representations of:
- Service interactions and dependencies
- Authentication and authorization flows  
- Data processing pipelines
- Event streaming architectures
- Multi-tenant isolation patterns

### CLI Tools

The **OpenFrame CLI** is maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage instructions.

## 🎯 Documentation Organization

### By User Type

**🚀 New Users**
1. Start with [Introduction](./getting-started/introduction.md)
2. Check [Prerequisites](./getting-started/prerequisites.md)
3. Follow [Quick Start](./getting-started/quick-start.md)
4. Explore [First Steps](./getting-started/first-steps.md)

**👩‍💻 Developers**
1. Review [Development Overview](./development/README.md)
2. Set up [Local Development Environment](./development/setup/local-development.md)
3. Understand [Architecture](./development/architecture/README.md)
4. Read [Contributing Guidelines](./development/contributing/guidelines.md)

**🏗️ Architects & Engineers**
1. Study [Repository Overview](./architecture/README.md)
2. Explore individual service documentation in Reference section
3. Review architecture diagrams for visual understanding
4. Examine security and data access patterns

### By Component

**Frontend Development**
- [Tenant Frontend App Core](./architecture/tenant-frontend-app-core/tenant-frontend-app-core.md)
- [Security Core & OAuth BFF](./architecture/security-core-and-oauth-bff/security-core-and-oauth-bff.md)
- [Local Development Setup](./development/setup/local-development.md)

**Backend Services**
- [API Service Core](./architecture/api-service-core/api-service-core.md) - Main REST/GraphQL APIs
- [Gateway Service Core](./architecture/gateway-service-core/gateway-service-core.md) - Request routing and security
- [Authorization Server Core](./architecture/authorization-server-core/authorization-server-core.md) - Authentication
- [Service Applications](./architecture/service-applications/service-applications.md) - Deployment configurations

**Data & Events**
- [Data Access - MongoDB](./architecture/data-access-mongo/data-access-mongo.md) - Primary storage
- [Data Access - Kafka](./architecture/data-access-kafka/data-access-kafka.md) - Event streaming
- [Stream Service Core](./architecture/stream-service-core/stream-service-core.md) - Event processing

**Infrastructure & Operations**
- [Management Service Core](./architecture/management-service-core/management-service-core.md) - System orchestration
- [Client Service Core](./architecture/client-service-core/client-service-core.md) - Agent management
- [External API Service Core](./architecture/external-api-service-core/external-api-service-core.md) - Public APIs

## 🛠️ Technology Stack

OpenFrame is built on modern, enterprise-grade technologies:

### Backend Technologies
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Java | 21+ | Application runtime environment |
| **Framework** | Spring Boot | 3.3.0 | Microservices framework |
| **Build Tool** | Maven | 3.8+ | Dependency management and builds |
| **Architecture** | Microservices | Event-driven | Scalable, distributed system design |

### Frontend Technologies  
| Component | Technology | Purpose |
|-----------|------------|---------|
| **AI Core** | VoltAgent Core | AI agent functionality and LLM integration |
| **Validation** | Zod | Runtime type checking and schema validation |
| **File Operations** | Glob | File pattern matching and operations |
| **AI Integration** | Anthropic SDK | Claude AI integration for intelligent features |

### Infrastructure Components
| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Database** | MongoDB | 5.0+ | Primary application data storage |
| **Audit Storage** | Apache Cassandra | 4.0+ | Immutable audit logs and compliance data |
| **Caching** | Redis | 6.0+ | Session storage and performance optimization |
| **Event Streaming** | Apache Kafka | 3.6.0+ | Durable event streaming and processing |
| **Real-time Messaging** | NATS JetStream | 2.9+ | Real-time agent communication |

### Agent Technology
| Component | Technology | Platform |
|-----------|------------|----------|
| **Language** | Rust | Cross-platform agent development |
| **Supported OS** | Windows, macOS, Linux | Universal device support |

## 🏛️ Architectural Principles

OpenFrame follows these key architectural principles:

### 🔄 Event-Driven Architecture
- **Asynchronous Communication**: Services communicate via events, not direct calls
- **Event Sourcing**: Complete audit trail of all system changes
- **Real-time Updates**: Live notifications via NATS JetStream
- **Durable Streaming**: Kafka for reliable event processing and replay

### 🏢 Multi-Tenant Design
- **Tenant Isolation**: Complete data segregation between tenants
- **Per-Tenant Configuration**: Customizable settings and branding per tenant
- **Scalable Provisioning**: Dynamic tenant creation and resource allocation
- **Security Boundaries**: Authentication and authorization respect tenant boundaries

### 🔐 Security-First Approach
- **Zero-Trust Architecture**: Every request is authenticated and authorized
- **OAuth2/OIDC Standards**: Industry-standard authentication protocols
- **JWT-Based Authorization**: Stateless, scalable token-based security
- **Role-Based Access Control (RBAC)**: Granular permissions and policy enforcement

### 🧩 Microservices Pattern
- **Domain-Driven Design**: Services organized around business capabilities
- **API-First**: All services expose well-defined REST and GraphQL APIs
- **Independent Deployment**: Services can be deployed and scaled independently
- **Resilient Design**: Circuit breakers, retries, and graceful degradation

## 🚀 Getting Started Paths

Choose your journey based on your goals:

### For Platform Evaluation
1. **[Introduction](./getting-started/introduction.md)** - Understand OpenFrame's value proposition
2. **[Quick Start](./getting-started/quick-start.md)** - Get a demo running quickly
3. **[First Steps](./getting-started/first-steps.md)** - Explore key capabilities

### For Development & Contribution
1. **[Prerequisites](./getting-started/prerequisites.md)** - Ensure your environment is ready
2. **[Development Environment](./development/setup/environment.md)** - Set up your IDE and tools
3. **[Local Development](./development/setup/local-development.md)** - Run OpenFrame locally
4. **[Contributing Guidelines](./development/contributing/guidelines.md)** - Learn our development workflow

### For Architecture Understanding
1. **[Repository Overview](./architecture/README.md)** - High-level system architecture
2. **Service-specific documentation** - Deep dive into individual components
3. **[Architecture diagrams](./architecture/diagrams/)** - Visual system representations
4. **[Development Architecture](./development/architecture/README.md)** - Design patterns and principles

### For Integration & API Usage
1. **[External API Service Core](./architecture/external-api-service-core/external-api-service-core.md)** - Public API documentation
2. **[API Service Core](./architecture/api-service-core/api-service-core.md)** - Internal APIs (REST + GraphQL)
3. **[Client Service Core](./architecture/client-service-core/client-service-core.md)** - Agent integration patterns
4. **[CLI Tools](https://github.com/flamingo-stack/openframe-cli)** - Command-line interface

## 📖 Quick Links

### Essential Documentation
- **[Project README](../README.md)** - Main project overview and quick start
- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute to the project
- **[License Information](../LICENSE.md)** - Flamingo AI Unified License v1.0

### External Resources
- **[OpenFrame Website](https://openframe.ai)** - Official product website
- **[Flamingo Platform](https://flamingo.run)** - Parent platform and ecosystem
- **[OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Slack community for support and discussions

### Development Resources
- **[GitHub Repository](https://github.com/flamingo-stack/openframe-oss-tenant)** - Source code and issue tracking
- **[CLI Repository](https://github.com/flamingo-stack/openframe-cli)** - Command-line tools
- **[Development Slack Channel](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - #development channel for technical discussions

## 🤝 Community & Support

### Getting Help
- **Community Support**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - Join our community for help and discussions
- **Documentation Issues**: GitHub Issues for documentation bugs or requests
- **Feature Requests**: Discuss new ideas in Slack before creating GitHub issues

### Contributing Back
- **Code Contributions**: See [Contributing Guidelines](../CONTRIBUTING.md)
- **Documentation**: Help improve these docs - every improvement matters!
- **Community**: Answer questions, share knowledge, help onboard new users
- **Feedback**: Share your experience and suggestions for improvements

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*

**Last Updated**: Generated from CodeWiki analysis of OpenFrame OSS Tenant repository