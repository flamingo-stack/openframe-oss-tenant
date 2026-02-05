# Development Documentation

Welcome to the OpenFrame development documentation. This section provides comprehensive guides for developers who want to contribute to OpenFrame, build custom integrations, or deploy the platform in their own environments.

## What You'll Find Here

The development documentation is organized into several key areas:

### 🛠️ Setup and Environment
- **[Environment Setup](setup/environment.md)** - IDE configuration, development tools, and environment variables
- **[Local Development](setup/local-development.md)** - Running OpenFrame locally with hot reload and debugging

### 🏗️ Architecture and Design
- **[Architecture Overview](architecture/overview.md)** - High-level system design, microservices architecture, and data flow
- **[Design Decisions](architecture/overview.md#key-design-decisions)** - Understanding the "why" behind architectural choices

### 🧪 Testing and Quality
- **[Testing Overview](testing/overview.md)** - Test structure, running tests, and writing new tests
- **[Code Quality Standards](testing/overview.md#code-quality)** - Coding standards and quality gates

### 🤝 Contributing
- **[Contributing Guidelines](contributing/guidelines.md)** - How to contribute code, documentation, and report issues

## Technology Stack

OpenFrame is built with modern, enterprise-grade technologies:

| Component | Technology | Version |
|-----------|------------|---------|
| **Backend Runtime** | Java | 21 LTS |
| **Framework** | Spring Boot | 3.3.0 |
| **API Layer** | GraphQL (Netflix DGS) | 7.0.0 |
| **Security** | Spring Security + JWT | 6.2.0 |
| **Data Storage** | MongoDB, Cassandra, Pinot | 7.0+, 4.1+, 1.2.0+ |
| **Event Streaming** | Apache Kafka | 3.6.0 |
| **Frontend** | Next.js + React + TypeScript | 14.0+ |
| **System Agent** | Rust | 1.75+ |
| **Orchestration** | Kubernetes + Helm | 1.28+ |
| **Build Tools** | Maven, npm, cargo | Latest |

## Quick Development Setup

Get started with development in under 10 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start development infrastructure
docker-compose -f docker-compose.dev.yml up -d

# 3. Build the platform
mvn clean install -DskipTests

# 4. Start services with hot reload
./scripts/dev-start.sh

# 5. Start frontend development server
cd openframe/services/openframe-frontend
npm run dev
```

Access the development environment:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **GraphQL Playground**: http://localhost:8080/graphql
- **API Documentation**: http://localhost:8080/swagger-ui

## Development Workflows

### Backend Development

```bash
# Hot reload Java services
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run specific service tests
mvn test -pl openframe-api-service-core

# Debug with remote JVM
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### Frontend Development

```bash
# Start with hot reload
npm run dev

# Type checking
npm run type-check

# Linting and formatting
npm run lint
npm run format

# Build for production
npm run build
```

### Rust Agent Development

```bash
# Build and run agent locally
cd client
cargo build --release
cargo run -- --config dev.toml

# Run agent tests
cargo test

# Cross-compile for different platforms
cargo build --target x86_64-pc-windows-gnu
```

## Project Structure Overview

```text
openframe-oss-tenant/
├── openframe/                    # Java services and libraries
│   ├── services/                # Microservices
│   │   ├── openframe-api/       # GraphQL API service
│   │   ├── openframe-gateway/   # API gateway
│   │   ├── openframe-management/ # Background tasks
│   │   ├── openframe-stream/    # Event processing
│   │   ├── openframe-client/    # Agent management
│   │   ├── openframe-frontend/  # Web frontend
│   │   └── ...                 # Other services
│   └── libs/                    # Shared libraries
│       ├── openframe-core/      # Core utilities
│       ├── openframe-data/      # Data layer
│       ├── openframe-security/  # Security components
│       └── ...                 # Other libraries
├── clients/                     # Client applications
│   ├── openframe-client/       # Rust system agent
│   └── openframe-chat/         # AI chat application
├── integrated-tools/           # Docker configs for external tools
├── manifests/                  # Kubernetes deployment
├── scripts/                    # Development scripts
└── docs/                      # Documentation
```

## Core Development Concepts

### Microservices Architecture

OpenFrame follows a microservices pattern with:
- **Gateway-first security** - Single point of authentication
- **Event-driven communication** - Kafka for async messaging
- **Database per service** - Domain-specific data stores
- **API-first design** - GraphQL and REST APIs

### Multi-Tenant Design

Every component is built with multi-tenancy in mind:
- **Tenant isolation** - Data and resources are tenant-scoped
- **Shared infrastructure** - Efficient resource utilization
- **Dynamic configuration** - Per-tenant customization

### Security-First Approach

Security is built into every layer:
- **JWT-based authentication** - Stateless token authentication
- **Role-based authorization** - Fine-grained permissions
- **End-to-end encryption** - Data protection in transit and at rest
- **Audit logging** - Comprehensive activity tracking

## Common Development Tasks

### Adding a New Feature

1. **Design**: Create technical design document
2. **API**: Define GraphQL schema or REST endpoints
3. **Backend**: Implement service layer and data access
4. **Frontend**: Build UI components and state management
5. **Tests**: Write comprehensive test coverage
6. **Documentation**: Update relevant documentation

### Debugging Issues

1. **Logs**: Check service logs for errors
2. **Health**: Verify service health endpoints
3. **Database**: Inspect data consistency
4. **Network**: Test service-to-service communication
5. **Frontend**: Use browser developer tools

### Performance Optimization

1. **Profiling**: Use Java profilers for backend services
2. **Database**: Optimize queries and indexes
3. **Caching**: Implement Redis caching strategies
4. **Frontend**: Bundle optimization and lazy loading

## Development Guidelines

### Code Style

- **Java**: Follow Google Java Style Guide
- **TypeScript**: Use ESLint + Prettier configuration
- **Rust**: Follow official Rust formatting guidelines

### Git Workflow

- **Feature branches**: Create branches for new features
- **Pull requests**: All changes reviewed via PRs
- **Conventional commits**: Use conventional commit messages
- **Testing**: All tests must pass before merging

### Security Guidelines

- **Input validation**: Validate all user inputs
- **SQL injection**: Use parameterized queries
- **XSS prevention**: Sanitize output and use CSP
- **CSRF protection**: Implement CSRF tokens

## Getting Help

### Documentation Links

- **[Environment Setup](setup/environment.md)** - Get your development environment ready
- **[Local Development](setup/local-development.md)** - Run and debug locally
- **[Architecture Overview](architecture/overview.md)** - Understand the system design
- **[Testing Guide](testing/overview.md)** - Write and run tests
- **[Contributing Guide](contributing/guidelines.md)** - Contribute to the project

### Community Support

- **Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Wiki**: Community-maintained documentation

### Professional Support

For enterprise development needs:
- **Training**: OpenFrame development workshops
- **Consulting**: Architecture and implementation guidance
- **Support**: Priority support for development issues
- **Custom Development**: Flamingo professional services

---

Ready to start developing? Begin with the [Environment Setup](setup/environment.md) guide to configure your development environment.