# Development Documentation

Welcome to the OpenFrame OSS Tenant development documentation! This section provides comprehensive guides for developers who want to understand, extend, or contribute to the platform.

## Overview

OpenFrame OSS Tenant is a sophisticated multi-tenant, microservices-based platform built with modern technologies and architectural patterns. Whether you're looking to customize the platform for your needs, integrate new tools, or contribute to the project, this documentation will guide you through the development process.

## Documentation Structure

### 🛠️ **Setup & Environment**
Get your development environment configured and ready for productive work.

| Guide | Description |
|-------|-------------|
| **[Environment Setup](setup/environment.md)** | IDE configuration, development tools, and environment setup |
| **[Local Development](setup/local-development.md)** | Running services locally, debugging, and hot reload |

### 🏗️ **Architecture**
Deep dive into the platform's architecture and design decisions.

| Guide | Description |
|-------|-------------|
| **[Architecture Overview](architecture/README.md)** | High-level architecture, core components, and data flow |

### 🔒 **Security**
Understand and implement security best practices.

| Guide | Description |
|-------|-------------|
| **[Security Best Practices](security/README.md)** | Authentication, authorization, data protection, and security testing |

### 🧪 **Testing**
Comprehensive testing strategies and implementation.

| Guide | Description |
|-------|-------------|
| **[Testing Overview](testing/README.md)** | Test structure, running tests, and writing new tests |

### 🤝 **Contributing**
Guidelines for contributing to the OpenFrame OSS Tenant project.

| Guide | Description |
|-------|-------------|
| **[Contributing Guidelines](contributing/guidelines.md)** | Code style, PR process, and contribution standards |

## Quick Navigation

### For New Developers
1. **Start here:** [Environment Setup](setup/environment.md)
2. **Then:** [Local Development](setup/local-development.md)  
3. **Understand:** [Architecture Overview](architecture/README.md)

### For Existing Contributors
- **Security:** [Security Best Practices](security/README.md)
- **Testing:** [Testing Overview](testing/README.md)
- **Guidelines:** [Contributing Guidelines](contributing/guidelines.md)

### For Integration Developers
- **Architecture:** [Architecture Overview](architecture/README.md) 
- **APIs:** Check the GraphQL and REST API documentation
- **Security:** [Security Best Practices](security/README.md) for secure integrations

## Technology Stack Overview

### Backend Services
- **Spring Boot 3.3.0** with Java 21
- **OAuth2 Authorization Server** with per-tenant RSA keys
- **GraphQL** (Netflix DGS) and REST APIs
- **Maven** for build and dependency management

### Data & Streaming
- **MongoDB** for document persistence
- **Redis** for caching and distributed locking
- **Apache Kafka** for event streaming
- **Cassandra** for time-series data storage

### Frontend & Clients
- **React/TypeScript** for the web application
- **Rust** with Tauri for desktop clients
- **Node.js** ecosystem for frontend tooling

### Infrastructure & DevOps
- **Docker** for containerization
- **NATS** for messaging
- **Apache Pinot** for analytics
- **Debezium** for Change Data Capture

## Development Philosophy

### Core Principles

**Multi-Tenancy First**
- Every feature must support complete tenant isolation
- Per-tenant configuration and customization
- Scalable tenant onboarding

**Event-Driven Architecture**
- Reactive programming patterns
- CDC-based data synchronization
- Eventual consistency where appropriate

**Security by Design**
- Zero-trust security model
- Comprehensive audit logging
- Role-based access control

**API-First Development**
- Well-defined contracts
- Comprehensive API documentation
- Backward compatibility considerations

## Getting Started Checklist

Before diving into development, ensure you have:

- [ ] Completed the [Prerequisites](../getting-started/prerequisites.md)
- [ ] Successfully run the [Quick Start](../getting-started/quick-start.md)
- [ ] Configured your [Development Environment](setup/environment.md)
- [ ] Read the [Architecture Overview](architecture/README.md)
- [ ] Reviewed [Security Best Practices](security/README.md)

## Development Workflows

### Common Development Tasks

**Adding a New Service:**
1. Create Spring Boot application in `openframe/services/`
2. Configure Maven build and dependencies
3. Implement health checks and actuator endpoints
4. Add service to gateway routing
5. Update documentation

**Extending APIs:**
1. Define GraphQL schema or REST endpoints
2. Implement data fetchers/controllers
3. Add appropriate security annotations
4. Write comprehensive tests
5. Update API documentation

**Adding Integrations:**
1. Create SDK in `deps/openframe-oss-lib/sdk/`
2. Implement tool-specific data models
3. Add CDC processing in stream service
4. Create frontend components
5. Test end-to-end integration

### Code Organization

```text
openframe-oss-tenant/
├── openframe/services/          # Deployable Spring Boot applications
├── deps/openframe-oss-lib/      # Shared libraries and SDKs
├── clients/                     # Desktop and mobile clients
├── integrated-tools/            # Tool-specific configurations
├── manifests/                   # Deployment manifests
└── docs/                       # Documentation
```

## Best Practices

### Code Quality
- **Follow Java coding standards** with consistent formatting
- **Write comprehensive tests** with good coverage
- **Use meaningful commit messages** following conventional commits
- **Document public APIs** with clear examples

### Architecture
- **Maintain service boundaries** - avoid tight coupling
- **Use proper error handling** with structured logging
- **Implement circuit breakers** for external dependencies
- **Follow 12-factor app principles**

### Security
- **Never hardcode secrets** - use proper configuration management
- **Validate all inputs** at API boundaries
- **Implement proper authentication** for all endpoints
- **Follow least privilege principle** for access control

## Resources

### Internal Documentation
- **API Reference:** Generated from GraphQL schemas and OpenAPI specs
- **Architecture Docs:** Detailed technical documentation in the repository
- **Code Examples:** Sample implementations in the codebase

### External Resources
- **Spring Boot Documentation:** [https://spring.io/projects/spring-boot](https://spring.io/projects/spring-boot)
- **Netflix DGS:** [https://netflix.github.io/dgs/](https://netflix.github.io/dgs/)
- **OAuth2/OIDC:** [https://oauth.net/2/](https://oauth.net/2/)

### Community
- **OpenMSP Slack:** [Join the Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Project Website:** [https://openframe.ai](https://openframe.ai)
- **Flamingo Platform:** [https://www.flamingo.run/openframe](https://www.flamingo.run/openframe)

## Support

### Getting Help
- **Technical Questions:** Use the OpenMSP Slack community
- **Bug Reports:** Report issues through the Slack channels
- **Feature Requests:** Discuss in the community before implementation
- **Documentation Issues:** Contribute improvements via pull requests

### Contributing Back
We welcome contributions! Please review the [Contributing Guidelines](contributing/guidelines.md) before submitting pull requests.

---

**Ready to start developing?** Begin with the [Environment Setup](setup/environment.md) guide to configure your development environment.