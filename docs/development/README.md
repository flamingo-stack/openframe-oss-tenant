# Development Documentation

Welcome to the OpenFrame development documentation. This section provides comprehensive guides for developers working on the OpenFrame platform, whether you're contributing to the core project or building custom extensions.

## 📚 Documentation Structure

### Setup and Environment
- **[Environment Setup](setup/environment.md)** - Development environment configuration
- **[Local Development](setup/local-development.md)** - Running OpenFrame locally for development

### Architecture and Design
- **[Architecture Overview](architecture/overview.md)** - High-level system architecture and design patterns
- **[Component Relationships](architecture/overview.md#component-relationships)** - How services interact

### Testing and Quality
- **[Testing Overview](testing/overview.md)** - Testing strategy, tools, and best practices
- **[Running Tests](testing/overview.md#running-tests)** - How to execute different test suites

### Contributing
- **[Contributing Guidelines](contributing/guidelines.md)** - How to contribute to the OpenFrame project
- **[Code Standards](contributing/guidelines.md#code-standards)** - Coding conventions and style guides

## 🚀 Quick Navigation

### For New Contributors
1. Start with [Environment Setup](setup/environment.md)
2. Follow [Local Development](setup/local-development.md)
3. Review [Architecture Overview](architecture/overview.md)
4. Read [Contributing Guidelines](contributing/guidelines.md)

### For Core Developers
- [Testing Procedures](testing/overview.md)
- [Architecture Deep Dive](architecture/overview.md)
- [Code Review Process](contributing/guidelines.md#code-review-process)

### For Platform Integrators
- [API Documentation](architecture/overview.md#api-architecture)
- [Extension Points](architecture/overview.md#extension-points)
- [Custom Tool Integration](contributing/guidelines.md#custom-integrations)

## 🏗️ Technology Stack

### Backend Services
| Technology | Version | Purpose |
|------------|---------|---------|
| **Java** | 21 (LTS) | Primary backend language |
| **Spring Boot** | 3.3.0 | Microservices framework |
| **Spring Cloud** | 2023.0.3 | Service coordination |
| **Netflix DGS** | 7.0.0 | GraphQL implementation |

### Frontend Applications  
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue.js** | 3.x | Primary UI framework |
| **TypeScript** | 5.x | Type safety |
| **React** | 18.x | Chat UI framework |
| **Tauri** | 1.x | Desktop app wrapper |

### Data and Messaging
| Technology | Version | Purpose |
|------------|---------|---------|
| **MongoDB** | 7.x | Document database |
| **Apache Cassandra** | 4.x | Time-series data |
| **Apache Pinot** | 1.2.0 | Analytics engine |
| **Apache Kafka** | 3.6.0 | Event streaming |
| **Redis** | 7.0 | Caching and sessions |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | 24.0+ | Containerization |
| **Kubernetes** | 1.28+ | Orchestration |
| **Helm** | 3.12+ | Package management |

## 🔧 Development Workflow

### 1. Initial Setup
```bash
# Clone repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up development environment
./dev/setup-dev-environment.sh
```

### 2. Daily Development
```bash
# Start infrastructure services
docker compose -f dev/docker-compose.dev.yml up -d

# Run in development mode
./scripts/run-dev.sh

# Run tests
mvn test
```

### 3. Code Contribution
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
# ... development work ...

# Run full test suite
mvn clean test
npm test

# Submit pull request
```

## 📂 Project Structure

```
openframe-oss-tenant/
├── openframe/                          # Java services
│   ├── services/                      # Microservices
│   │   ├── openframe-api/            # GraphQL API service
│   │   ├── openframe-gateway/        # API Gateway
│   │   ├── openframe-auth/           # Authorization server
│   │   └── ...
│   └── libs/                         # Shared libraries
├── clients/                          # Client applications
│   ├── openframe-chat/              # Desktop chat app
│   └── openframe-client/            # Rust system agent
├── integrated-tools/                # External tool configs
├── manifests/                       # Kubernetes manifests
├── scripts/                         # Build and deployment scripts
└── dev/                            # Development utilities
```

## 🎯 Development Principles

### Code Quality
- **Type Safety**: Use TypeScript for frontend, strong typing in Java
- **Testing**: Comprehensive unit, integration, and e2e test coverage
- **Documentation**: Code should be self-documenting with clear comments
- **Security**: Security-first approach with proper authentication and authorization

### Architecture Patterns
- **Microservices**: Loosely coupled, independently deployable services
- **Event-Driven**: Kafka-based event streaming for service communication
- **API-First**: GraphQL and REST APIs with comprehensive schemas
- **Multi-Tenant**: Tenant isolation at all layers

### Performance
- **Scalability**: Horizontal scaling capabilities
- **Caching**: Redis-based caching strategies
- **Asynchronous**: Non-blocking operations where possible
- **Monitoring**: Comprehensive metrics and logging

## 🤝 Community and Support

### Getting Help
- **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Community Hub**: https://www.openmsp.ai/

### Contributing
- All community interaction happens on OpenMSP Slack
- We don't use GitHub Issues or Discussions
- Follow our [Contributing Guidelines](contributing/guidelines.md)

### Code of Conduct
We are committed to fostering an open and welcoming environment. Please read and follow our community guidelines available in the OpenMSP Slack workspace.

## 📊 Development Metrics

### Build Status
- **Continuous Integration**: GitHub Actions
- **Test Coverage**: Target >80% for all modules
- **Security Scanning**: Automated vulnerability checks
- **Performance Testing**: Automated performance regression testing

### Release Process
- **Semantic Versioning**: Following semver for all releases
- **Release Cadence**: Bi-weekly releases
- **Hotfix Process**: Critical fixes released as needed
- **Changelog**: Comprehensive release notes

---

Ready to start developing? Begin with the [Environment Setup](setup/environment.md) guide to configure your development environment.