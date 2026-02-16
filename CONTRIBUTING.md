# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This document provides guidelines for contributing to the OpenFrame OSS Tenant repository.

## 🤝 Community First

We believe in community-driven development. All discussions, bug reports, feature requests, and coordination happen in our **OpenMSP Slack community**.

**📢 Join the Community:**
- **Slack Workspace**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Community Hub**: [openmsp.ai](https://www.openmsp.ai/)

> **Important**: We do NOT use GitHub Issues or GitHub Discussions. All communication and project coordination happens on Slack.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java 21+** - Required for Spring Boot 3.x development
- **Docker & Docker Compose** - For local infrastructure setup
- **Git** - Version control
- **IDE** - IntelliJ IDEA or VS Code recommended

### Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set Up Infrastructure**
   ```bash
   # Start required services with Docker Compose
   docker-compose up -d mongodb redis kafka
   ```

3. **Join the Slack Community**
   - Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
   - Introduce yourself in #introductions
   - Ask questions in #openframe-dev

## 🔧 Development Workflow

### 1. Discuss Before You Code

- **Always start with Slack discussion** - Post your idea in #openframe-dev
- **Get community feedback** - Ensure your contribution aligns with project goals
- **Coordinate with maintainers** - Avoid duplicate work

### 2. Development Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow our coding standards (see below)
   - Write tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   - Run unit tests: `./gradlew test`
   - Test with local infrastructure
   - Verify no regressions

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add OAuth2 device flow support"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create Pull Request on GitHub
   - Link to Slack discussion in PR description

### 3. Code Review Process

- **Community review first** - Share in #openframe-dev for initial feedback
- **Maintainer review** - Core team will review technical implementation
- **Iterate based on feedback** - Address comments and suggestions
- **Merge** - Maintainers will merge approved contributions

## 📋 Coding Standards

### Java/Spring Boot

- **Java 21+** language features
- **Spring Boot 3.x** patterns and conventions
- **Clean Architecture** - Controller → Service → Repository layers
- **Dependency Injection** via constructor injection
- **Immutable DTOs** where possible
- **Comprehensive JavaDoc** for public APIs

### Code Style

- **Google Java Style** with 4-space indentation
- **Meaningful names** for classes, methods, and variables
- **Single Responsibility Principle** for classes and methods
- **Consistent error handling** with proper exception types

### Testing

- **Unit tests** for service layer logic
- **Integration tests** for repository layers
- **MockMvc tests** for REST controllers
- **GraphQL tests** for GraphQL resolvers
- **Minimum 80% test coverage** for new code

### Documentation

- **Inline code documentation** for complex logic
- **README updates** for new features or setup changes
- **API documentation** for new endpoints
- **Architecture decisions** documented in Slack discussions

## 🏗️ Architecture Guidelines

### Microservice Principles

- **Single Responsibility** - Each service has a focused domain
- **Database per Service** - No shared databases between services
- **API-First Design** - Well-defined service contracts
- **Event-Driven Communication** - Async messaging via Kafka/NATS

### Multi-Tenancy

- **Tenant Isolation** - All data scoped by tenant
- **Security First** - JWT-based authentication with tenant validation
- **Per-Tenant Configuration** - Isolated settings and keys

### Performance

- **Cursor-Based Pagination** - Consistent pagination across all APIs
- **Reactive Programming** - WebFlux for high-throughput services
- **Caching Strategy** - Redis for frequently accessed data
- **Database Indexing** - Proper indexes for query performance

## 🎯 Contribution Areas

We welcome contributions in these areas:

### Core Platform
- **Authentication & Authorization** - OAuth2/OIDC enhancements
- **API Development** - REST and GraphQL endpoint improvements
- **Event Processing** - Kafka/NATS message handling
- **Data Layer** - Repository and query optimizations

### Infrastructure
- **Docker & Kubernetes** - Deployment and orchestration
- **Monitoring & Observability** - Metrics and logging
- **Security Hardening** - Vulnerability fixes and improvements
- **Performance Optimization** - Scalability improvements

### Documentation
- **API Documentation** - OpenAPI/GraphQL schema docs
- **Architecture Guides** - System design and patterns
- **Developer Guides** - Setup and development workflows
- **User Documentation** - Feature usage and configuration

### Frontend
- **React Components** - UI improvements for chat client
- **TypeScript** - Type safety and development experience
- **Desktop App** - Tauri application enhancements

## 🐛 Bug Reports

To report bugs:

1. **Check Slack first** - Search #openframe-dev for existing discussions
2. **Post in #bug-reports** - Provide detailed reproduction steps
3. **Include environment details** - OS, Java version, Docker setup
4. **Share logs** - Relevant application logs and error messages

## 💡 Feature Requests

For new features:

1. **Start discussion in #feature-requests** - Describe the use case
2. **Gather community feedback** - Get input from other users
3. **Design discussion** - Work with maintainers on approach
4. **Implementation plan** - Break down into manageable tasks

## 🚦 Release Process

- **Semantic Versioning** - Major.Minor.Patch versioning
- **Release Candidates** - Beta testing with community
- **Release Notes** - Comprehensive changelog
- **Migration Guides** - Breaking change documentation

## 📞 Getting Help

**Need help?** Here's how to get support:

1. **Slack #help** - General questions and support
2. **Slack #openframe-dev** - Development-specific questions  
3. **Slack #architecture** - System design discussions
4. **Community Wiki** - Documentation and guides

## 🙏 Recognition

We appreciate all contributions! Contributors will be:

- **Credited in release notes**
- **Recognized in Slack community**
- **Added to contributor lists**
- **Invited to contributor-only channels**

## 📜 Code of Conduct

We're committed to fostering an inclusive and welcoming community. All participants must:

- **Be respectful** - Treat all community members with respect
- **Be inclusive** - Welcome newcomers and diverse perspectives  
- **Be collaborative** - Work together constructively
- **Be professional** - Maintain professional communication

Violations should be reported to maintainers via direct message on Slack.

## 🎉 Thank You!

Your contributions make OpenFrame better for the entire MSP community. Whether you're fixing bugs, adding features, improving documentation, or helping other users, every contribution matters.

**Ready to contribute?** Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and say hello in #introductions!

---

*For commercial support and services, visit [flamingo.run](https://flamingo.run)*