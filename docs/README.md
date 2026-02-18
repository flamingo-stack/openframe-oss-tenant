# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** — the complete AI-driven MSP platform that powers the OpenFrame ecosystem. This documentation hub provides everything you need to understand, deploy, develop, and contribute to the platform.

## 📚 Table of Contents

### 🚀 Getting Started

New to OpenFrame? Start here to get up and running quickly:

- **[Introduction](./getting-started/introduction.md)** - Platform overview and key features
- **[Prerequisites](./getting-started/prerequisites.md)** - System requirements and setup
- **[Quick Start Guide](./getting-started/quick-start.md)** - Get running in 5 minutes
- **[First Steps](./getting-started/first-steps.md)** - Explore platform features and capabilities

### 🔧 Development

Everything you need for OpenFrame development:

- **[Development Overview](./development/README.md)** - Development workflow and standards
- **[Environment Setup](./development/setup/environment.md)** - IDE and tool configuration
- **[Local Development](./development/setup/local-development.md)** - Development workflow guide
- **[Architecture Guide](./development/architecture/README.md)** - System design and patterns
- **[Security Guidelines](./development/security/README.md)** - Security best practices
- **[Testing Guide](./development/testing/README.md)** - Testing strategies and tools
- **[Contributing Guidelines](./development/contributing/guidelines.md)** - Code standards and process

### 🏗️ Architecture Reference

Technical reference documentation for all platform components:

#### Core Services
- **[API Service Core](./architecture/api-service-core/api-service-core.md)** - Internal tenant-facing APIs (REST + GraphQL)
- **[Authorization Service Core](./architecture/authorization-service-core/authorization-service-core.md)** - OAuth2/OIDC and multi-tenant authentication
- **[Gateway Service Core](./architecture/gateway-service-core/gateway-service-core.md)** - JWT validation, routing, and rate limiting
- **[Stream Service Core](./architecture/stream-service-core/stream-service-core.md)** - Kafka event processing and data enrichment
- **[Management Service Core](./architecture/management-service-core/management-service-core.md)** - Infrastructure bootstrapping and operational control
- **[External API Service Core](./architecture/external-api-service-core/external-api-service-core.md)** - Public API key-secured endpoints

#### Data Modules
- **[Data Mongo Core](./architecture/data-mongo-core/data-mongo-core.md)** - MongoDB persistence and multi-tenant repositories
- **[Data Kafka Core](./architecture/data-kafka-core/data-kafka-core.md)** - Event streaming and CDC message processing
- **[Data Redis Core](./architecture/data-redis-core/data-redis-core.md)** - Caching and distributed locking

#### Frontend & Security
- **[Frontend Tenant App Core](./architecture/frontend-tenant-app-core/frontend-tenant-app-core.md)** - Multi-tenant web application and OAuth BFF
- **[Security OAuth Core](./architecture/security-oauth-core/security-oauth-core.md)** - OAuth2 security primitives and utilities

#### Service Applications & Contracts  
- **[Service Applications](./architecture/service-applications/service-applications.md)** - Deployable Spring Boot applications
- **[API Lib Contracts](./architecture/api-lib-contracts/api-lib-contracts.md)** - Shared API contracts and DTOs

#### Platform Overview
- **[Architecture Overview](./architecture/README.md)** - Complete platform architecture and service interactions

### 📊 Visual Documentation

Architecture diagrams and visual documentation - **88 Mermaid diagrams** available:

- **[Architecture Diagrams](./architecture/diagrams/)** - Visual system design and service interactions
  - Component diagrams for all services
  - Data flow diagrams 
  - Security and authentication flows
  - Event streaming architectures
  - Multi-tenant isolation patterns

**Key Diagram Collections:**
- API Service Core: 7 diagrams
- Authorization Service Core: 6 diagrams  
- Gateway Service Core: 7 diagrams
- Stream Service Core: 6 diagrams
- Management Service Core: 11 diagrams
- External API Service Core: 8 diagrams
- Data layer diagrams: MongoDB (6), Kafka (4), Redis (3)
- Frontend application flows: 6 diagrams

### 🔧 CLI Tools

The OpenFrame CLI tools are maintained in a separate repository:

- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)  
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 🎯 Documentation Quick Navigation

### By Role

#### **For New Users**
1. [Introduction](./getting-started/introduction.md) - Understand what OpenFrame is
2. [Prerequisites](./getting-started/prerequisites.md) - Set up your environment  
3. [Quick Start](./getting-started/quick-start.md) - Get running locally
4. [First Steps](./getting-started/first-steps.md) - Explore key features

#### **For Developers**
1. [Environment Setup](./development/setup/environment.md) - Configure your IDE
2. [Local Development](./development/setup/local-development.md) - Development workflow
3. [Architecture Guide](./development/architecture/README.md) - System design
4. [Contributing Guidelines](./development/contributing/guidelines.md) - Code standards

#### **For Architects & Technical Leads**
1. [Architecture Overview](./architecture/README.md) - Complete system design
2. [Service Documentation](./architecture/) - Deep dive into each component
3. [Security Architecture](./architecture/security-oauth-core/security-oauth-core.md) - Security model
4. [Visual Diagrams](./architecture/diagrams/) - System architecture diagrams

### By Task

#### **Getting Started**
- 🚀 **New to OpenFrame?** → [Introduction](./getting-started/introduction.md)
- ⚡ **Quick Setup?** → [Quick Start Guide](./getting-started/quick-start.md)
- 🛠️ **Development Setup?** → [Environment Setup](./development/setup/environment.md)

#### **Understanding the Architecture**
- 🏗️ **System Overview?** → [Architecture Overview](./architecture/README.md)
- 🔐 **Security Model?** → [Authorization Service](./architecture/authorization-service-core/authorization-service-core.md)
- 📊 **Data Flow?** → [Stream Service](./architecture/stream-service-core/stream-service-core.md)
- 🌐 **API Design?** → [API Service](./architecture/api-service-core/api-service-core.md)

#### **Development & Contributing**
- 📝 **Code Standards?** → [Contributing Guidelines](./development/contributing/guidelines.md)
- 🧪 **Testing?** → [Testing Guide](./development/testing/README.md)
- 🔒 **Security?** → [Security Guidelines](./development/security/README.md)

## 🏗️ Platform Architecture at a Glance

OpenFrame OSS Tenant is a complete microservices platform with:

### **Multi-Tenant Foundation**
- Per-tenant JWT signing keys and OAuth2/OIDC
- Complete tenant isolation at database and API levels
- Scalable multi-tenant architecture supporting thousands of organizations

### **AI-Powered Automation**
- **Mingo AI** for technicians - intelligent ticket triage and resolution
- **Fae AI** for clients - automated communication and support
- Event-driven processing with real-time data enrichment

### **Microservices Architecture**
- **8 Core Services** with clear separation of concerns
- **REST + GraphQL APIs** with comprehensive security
- **Event-driven communication** via Kafka streams
- **Multi-database persistence** (MongoDB, Redis, Cassandra)

### **Enterprise-Grade Security**
- Multi-issuer JWT validation with caching
- API key authentication for external integrations  
- Role-based authorization with tenant scoping
- Comprehensive audit logging and compliance

## 📋 Platform Components Overview

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| **API Gateway** | Request routing, JWT validation, rate limiting | [Gateway Service](./architecture/gateway-service-core/gateway-service-core.md) |
| **Authorization Server** | OAuth2/OIDC, SSO, tenant management | [Authorization Service](./architecture/authorization-service-core/authorization-service-core.md) |
| **API Service** | Internal tenant APIs (REST + GraphQL) | [API Service](./architecture/api-service-core/api-service-core.md) |
| **External API** | Public API key-secured endpoints | [External API Service](./architecture/external-api-service-core/external-api-service-core.md) |
| **Stream Service** | Event processing and data enrichment | [Stream Service](./architecture/stream-service-core/stream-service-core.md) |
| **Management Service** | Infrastructure automation and control | [Management Service](./architecture/management-service-core/management-service-core.md) |
| **Frontend App** | Multi-tenant web interface | [Frontend App](./architecture/frontend-tenant-app-core/frontend-tenant-app-core.md) |

## 🔗 External Resources

### Community & Support
- **🚀 Slack Community**: [Join OpenMSP Workspace](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **🌐 OpenFrame Website**: [https://www.flamingo.run/openframe](https://www.flamingo.run/openframe)
- **🔗 Platform Site**: [https://openframe.ai](https://openframe.ai)
- **🦩 Flamingo Company**: [https://flamingo.run](https://flamingo.run)

### Project Links
- **📂 Main Repository**: [flamingo-stack/openframe-oss-tenant](https://github.com/flamingo-stack/openframe-oss-tenant)
- **⚙️ CLI Tools**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **📋 Project Board**: Available in Slack community
- **🐛 Issue Tracking**: Via Slack (not GitHub Issues)

## 📖 Quick Links

### Repository Navigation
- **[Project README](../README.md)** - Main project overview and quick start
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to the project
- **[License](../LICENSE.md)** - Flamingo AI Unified License v1.0

### Key Documentation Files
- **[Prerequisites](./getting-started/prerequisites.md)** - Required tools and setup
- **[Quick Start](./getting-started/quick-start.md)** - 5-minute local deployment
- **[Architecture](./architecture/README.md)** - Complete technical overview
- **[Development Setup](./development/setup/environment.md)** - IDE and environment config

## 🛠️ Technology Stack Reference

### **Backend Technologies**
- Java 21 with Spring Boot 3.3.0
- Spring Security OAuth2 Resource Server
- Netflix DGS for GraphQL
- Apache Kafka for event streaming
- MongoDB for document persistence
- Redis for caching and locking
- Apache Cassandra for time-series data

### **Frontend Technologies**  
- TypeScript with React 18+
- TanStack Query for data fetching
- TailwindCSS for styling
- Vite for build tooling

### **Infrastructure & DevOps**
- Docker for containerization
- Kubernetes for orchestration
- NATS for lightweight messaging
- Apache Pinot for analytics
- Debezium for change data capture

## ⚡ Quick Start Commands

```bash
# Clone and setup
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
./clients/openframe-client/scripts/setup_dev_init_config.sh

# Build and run
mvn clean install
cd openframe/services/openframe-config && mvn spring-boot:run &
cd ../openframe-api && mvn spring-boot:run &
cd ../openframe-authorization-server && mvn spring-boot:run &  
cd ../openframe-gateway && mvn spring-boot:run &
cd ../openframe-frontend && npm install && npm run dev
```

Access your local instance at `http://localhost:3000`

## 📚 Documentation Standards

This documentation follows these principles:

- **Comprehensive Coverage** - Every component is fully documented
- **Practical Examples** - Real code samples and use cases
- **Visual Diagrams** - Architecture and flow diagrams for clarity
- **Cross-Referenced** - Related topics are linked for easy navigation
- **Up-to-Date** - Documentation is maintained with code changes

## 🤝 Contributing to Documentation

Found an error or want to improve the docs?

1. **Join our Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Discuss in #docs**: Propose changes and improvements
3. **Follow our**: [Contributing Guidelines](../CONTRIBUTING.md)
4. **Submit PR**: With your documentation improvements

---

**Need Help?** Join our [Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time support and discussions!

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*