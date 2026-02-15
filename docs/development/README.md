# Development Documentation

Welcome to the OpenFrame development documentation! This section provides comprehensive guides for developers who want to contribute to, customize, or extend the OpenFrame platform.

## Development Documentation Overview

OpenFrame is a sophisticated microservices platform built with modern technologies. Whether you're looking to contribute to the open-source project, customize the platform for your organization, or integrate with external systems, these guides will help you get started.

### 🚀 Getting Started with Development

Start here if you're new to OpenFrame development:

- **[Environment Setup](setup/environment.md)** - Configure your development environment with IDEs, tools, and extensions
- **[Local Development](setup/local-development.md)** - Clone, build, and run OpenFrame locally for development

### 🏗️ Architecture & Design

Understand the platform's architecture and design patterns:

- **[Architecture Overview](architecture/overview.md)** - High-level system architecture, component relationships, and data flow

### 🧪 Testing

Learn about OpenFrame's testing strategy and practices:

- **[Testing Overview](testing/overview.md)** - Test structure, running tests, writing tests, and coverage requirements

### 🤝 Contributing

Guidelines for contributing to the OpenFrame project:

- **[Contributing Guidelines](contributing/guidelines.md)** - Code style, branch workflow, PR process, and review checklist

## Technology Stack Quick Reference

OpenFrame uses modern, production-ready technologies across multiple layers:

### Backend Services (Java)
- **Runtime**: Java 21, Spring Boot 3.3.0
- **API Layer**: REST (Spring MVC) + GraphQL (Netflix DGS)
- **Security**: OAuth2, JWT, Spring Security
- **Data**: MongoDB, Redis, Apache Cassandra, Apache Pinot
- **Messaging**: Apache Kafka, NATS JetStream
- **Build**: Maven 3.8+

### Frontend Services (TypeScript)
- **Framework**: React 18 with TypeScript
- **UI**: PrimeReact components, custom design system
- **State**: Apollo GraphQL Client, Zustand
- **Build**: Vite 5.0+, SWC compiler

### Client Agent (Rust)
- **Runtime**: Rust 1.75+
- **Async**: Tokio runtime
- **HTTP**: Reqwest client
- **Serialization**: Serde JSON
- **Build**: Cargo

### Infrastructure
- **Containers**: Docker, Docker Compose
- **Orchestration**: Kubernetes, Helm
- **Service Mesh**: Istio
- **Monitoring**: Prometheus, Grafana, Loki

## Project Structure

```text
openframe-oss-tenant/
├── openframe/                    # Java microservices and shared libraries
│   ├── services/                # Deployable microservices
│   │   ├── openframe-api/       # Main GraphQL/REST API
│   │   ├── openframe-gateway/   # API Gateway and routing
│   │   ├── openframe-frontend/  # React frontend application
│   │   ├── openframe-authorization-server/ # OAuth2 server
│   │   ├── openframe-client/    # Agent management service
│   │   ├── openframe-management/ # Admin and scheduled tasks
│   │   ├── openframe-stream/    # Kafka stream processing
│   │   ├── openframe-external-api/ # External REST API
│   │   └── openframe-config/    # Configuration server
│   └── libs/                    # Shared libraries (Maven modules)
├── clients/                     # Client applications
│   ├── openframe-client/        # Rust system agent
│   └── openframe-chat/          # AI chat client (Tauri)
├── integrated-tools/            # External tool Docker configurations
├── manifests/                   # Kubernetes deployment manifests
├── scripts/                     # Development and deployment scripts
└── docs/                        # Documentation (you are here!)
```

## Development Workflow

OpenFrame follows a standard Git workflow with specific conventions:

### 1. **Feature Development**
```bash
git checkout -b feature/your-feature-name
# Make changes
git commit -m "feat: add new feature description"
git push origin feature/your-feature-name
# Create Pull Request
```

### 2. **Testing**
```bash
# Run all tests
mvn test                         # Java tests
npm test                         # Frontend tests  
cargo test                       # Rust tests
```

### 3. **Code Quality**
```bash
# Java code formatting
mvn spotless:apply

# Frontend linting
npm run lint:fix

# Rust formatting
cargo fmt
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create DTOs in `api-service-core/src/main/java/.../dto/`
2. Add business logic in `api-service-core/src/main/java/.../service/`  
3. Create REST controller or GraphQL data fetcher
4. Add tests in `src/test/java/`
5. Update API documentation

### Adding a New Frontend Component

1. Create component in `openframe-frontend/src/components/`
2. Add TypeScript types in `src/types/`
3. Create API hooks in `src/hooks/`
4. Add unit tests
5. Update Storybook stories (if applicable)

### Adding External Tool Integration

1. Create SDK client in `libs/sdk/your-tool/`
2. Add data models in `openframe-data/src/main/java/.../document/`
3. Create service layer in appropriate core module
4. Add stream processing for events
5. Create frontend integration components

## Development Environment Quick Setup

For a rapid development environment setup:

```bash
# 1. Clone and enter repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
cd integrated-tools
docker compose up -d

# 3. Build OpenFrame services
cd ..
mvn clean install -DskipTests

# 4. Start development servers (in separate terminals)
# API Service
cd openframe/services/openframe-api && mvn spring-boot:run

# Frontend
cd openframe/services/openframe-frontend && npm run dev

# Gateway  
cd openframe/services/openframe-gateway && mvn spring-boot:run
```

## Documentation Standards

When contributing documentation:

- Use clear, concise language
- Include code examples with proper syntax highlighting
- Add Mermaid diagrams for architecture and flows
- Follow the established folder structure
- Test all examples before submitting

## Code Style Guidelines

### Java
- Follow Google Java Style Guide
- Use Spring Boot conventions
- Prefer composition over inheritance
- Write comprehensive JavaDoc for public APIs

### TypeScript/React
- Use functional components with hooks
- Prefer TypeScript strict mode
- Follow React best practices
- Use proper component prop typing

### Rust  
- Follow Rust API Guidelines
- Use `rustfmt` and `clippy`
- Prefer explicit error handling
- Document public APIs with doc comments

## Getting Help

### Community Resources
- 💬 **OpenMSP Slack**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🌐 **Website**: [openmsp.ai](https://www.openmsp.ai/)
- 📚 **Main Site**: [flamingo.run/openframe](https://www.flamingo.run/openframe)

### Development Channels
- `#openframe-dev` - General development discussion
- `#contributions` - Contribution coordination
- `#architecture` - Architecture and design discussions

---

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Environment Setup](setup/environment.md) | IDE, tools, and development environment configuration |
| [Local Development](setup/local-development.md) | Running OpenFrame locally for development |
| [Architecture Overview](architecture/overview.md) | System design, components, and data flow |
| [Testing Overview](testing/overview.md) | Test strategy, frameworks, and practices |
| [Contributing Guidelines](contributing/guidelines.md) | How to contribute code, documentation, and features |

---

**Ready to start developing?** Begin with the [Environment Setup Guide](setup/environment.md) to configure your development tools and workspace.