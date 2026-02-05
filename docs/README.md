# OpenFrame OSS Tenant Documentation

Welcome to the comprehensive documentation for **OpenFrame OSS Tenant** - the open-source, tenant-aware backend stack that powers OpenFrame and the Flamingo AI MSP platform.

## 📚 Table of Contents

### Getting Started
Start here if you're new to OpenFrame:
- [Introduction](./getting-started/introduction.md) - What is OpenFrame OSS Tenant?
- [Prerequisites](./getting-started/prerequisites.md) - System requirements and dependencies
- [Quick Start](./getting-started/quick-start.md) - Get running in 5 minutes
- [First Steps](./getting-started/first-steps.md) - Essential next steps after installation

### Development
For contributors and developers:
- [Development Overview](./development/README.md) - Development section index
- [Environment Setup](./development/setup/environment.md) - Set up your development environment
- [Local Development](./development/setup/local-development.md) - Advanced development workflows
- [Architecture Overview](./development/architecture/overview.md) - System architecture and design
- [Microservices](./development/architecture/microservices.md) - Service architecture details
- [Security Architecture](./development/architecture/security.md) - Security design and implementation
- [Data Flow](./development/architecture/data-flow.md) - How data flows through the system
- [Integration Patterns](./development/architecture/integration.md) - Integration architecture
- [Testing Overview](./development/testing/overview.md) - Testing strategies and guidelines
- [Contributing Guidelines](./development/contributing/guidelines.md) - How to contribute effectively
- [Code Style Guide](./development/contributing/code-style.md) - Coding standards and conventions
- [Development Scripts](./development/tools/scripts.md) - Useful development scripts
- [Rust Client Development](./development/client-agent/rust-development.md) - Rust agent development

### Reference
Technical reference documentation:
- [Architecture Overview](./reference/architecture/overview.md) - High-level system architecture
- [API Service](./reference/architecture/openframe-api-service.md) - REST and GraphQL APIs
- [Gateway Service](./reference/architecture/openframe-gateway-service.md) - Edge routing and security
- [Authorization Server](./reference/architecture/openframe-authorization-server.md) - OAuth2/OIDC identity provider
- [Client Service](./reference/architecture/openframe-client-service.md) - Agent interaction layer
- [Management Service](./reference/architecture/openframe-management-service.md) - Platform control plane
- [Stream Service](./reference/architecture/openframe-stream-service.md) - Real-time event processing
- [Data Layer - Core & Cache](./reference/architecture/data-layer-core-and-cache.md) - Data storage and caching
- [Data Layer - Kafka](./reference/architecture/data-layer-kafka.md) - Event streaming architecture
- [Security Core](./reference/architecture/security-core.md) - Core security components
- [Security OAuth BFF](./reference/architecture/security-oauth-bff.md) - Browser-safe OAuth2 layer
- [SDK Integrations](./reference/architecture/sdk-integrations.md) - Third-party integrations
- [Core Utilities](./reference/architecture/core-utilities.md) - Shared utility libraries
- [OAuth BFF Controller](./reference/architecture/oauth-bff-controller.md) - OAuth controller implementation
- [Pinot Initializer](./reference/architecture/pinot-initializer.md) - Analytics database setup
- [Integrated Tools Event Pipeline](./development/architecture/integrated-tools-event-streaming-pipeline.md) - Event streaming for integrated tools

### CLI Tools

The OpenFrame CLI tools is maintained in a separate repository:
- **Repository**: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- **Installation**: [Installation Guide](https://github.com/flamingo-stack/openframe-cli#installation)
- **Documentation**: [CLI Documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

**Note**: CLI tools are NOT located in this repository. Always refer to the external repository for installation and usage.

## 📊 Architecture Overview

OpenFrame OSS Tenant implements a modern microservices architecture with four key layers:

```mermaid
flowchart TB
    Client[Client Applications] --> LB[Load Balancer]
    LB --> Gateway[API Gateway]
    
    subgraph "Gateway Layer"
        Gateway --> GraphQL[GraphQL Engine]
        Gateway --> Auth[Auth Service]
    end
    
    subgraph "Processing Layer"
        Stream[Stream Processing] --> Kafka[Apache Kafka]
        Kafka --> |Analytics| Pinot[Apache Pinot]
        Kafka --> |Storage| Cassandra[Cassandra]
    end
    
    subgraph "Data Layer"
        GraphQL --> MongoDB[(MongoDB)]
        GraphQL --> Cassandra
        GraphQL --> Pinot
        GraphQL --> Redis[(Redis Cache)]
    end
    
    subgraph "Infrastructure Layer"
        Loki       --> Grafana
        Prometheus --> Grafana
    end
    
    style Gateway fill:#FFC109,stroke:#1A1A1A,color:#FAFAFA
    style Stream fill:#666666,stroke:#1A1A1A,color:#FAFAFA
    style MongoDB fill:#212121,stroke:#1A1A1A,color:#FAFAFA
```

## 🚀 Quick Navigation

### For New Users
1. **[Getting Started](./getting-started/introduction.md)** - Begin your OpenFrame journey
2. **[Quick Start](./getting-started/quick-start.md)** - 5-minute setup guide
3. **[First Steps](./getting-started/first-steps.md)** - What to do after installation

### For Developers
1. **[Development Setup](./development/setup/environment.md)** - Configure your development environment
2. **[Architecture](./development/architecture/overview.md)** - Understand the system design
3. **[Contributing](./development/contributing/guidelines.md)** - How to contribute code

### For DevOps/Platform Teams
1. **[Architecture Reference](./reference/architecture/overview.md)** - Technical architecture details
2. **[Security Architecture](./development/architecture/security.md)** - Security implementation details
3. **[Microservices Guide](./development/architecture/microservices.md)** - Service architecture

## 🛠️ Core Services

| Service | Purpose | Port | Documentation |
|---------|---------|------|---------------|
| **Gateway Service** | Edge routing, security, WebSocket proxying | 8080 | [Reference](./reference/architecture/openframe-gateway-service.md) |
| **Authorization Server** | Multi-tenant OAuth2/OIDC provider | 8081 | [Reference](./reference/architecture/openframe-authorization-server.md) |
| **API Service** | REST + GraphQL APIs | 8082 | [Reference](./reference/architecture/openframe-api-service.md) |
| **Client Service** | Agent interaction layer | 8083 | [Reference](./reference/architecture/openframe-client-service.md) |
| **Management Service** | Platform control plane | 8084 | [Reference](./reference/architecture/openframe-management-service.md) |
| **Stream Service** | Real-time event processing | 8085 | [Reference](./reference/architecture/openframe-stream-service.md) |
| **Frontend** | Vue.js web interface | 3000 | Development only |

## 💡 Key Concepts

### Multi-Tenancy
OpenFrame implements **strict tenant isolation** at every layer:
- Identity and authentication (per-tenant OAuth2 issuers)
- Data storage (tenant-scoped queries and isolation)
- Event streaming (tenant-aware message routing)
- API access (tenant context in all operations)

### Event-Driven Architecture
The platform uses **Apache Kafka** for:
- Real-time event streaming between services
- Integration with external tools (FleetDM, Tactical RMM)
- Analytics data pipeline to Apache Pinot
- Change data capture (CDC) with Debezium

### Security Model
- **Gateway-first security** with JWT validation
- **OAuth2/OIDC** with multi-issuer support
- **API key authentication** for external integrations
- **Rate limiting** and circuit breakers
- **Audit logging** for compliance

## 📖 Quick Links

- [Main Project README](../README.md) - Project overview and quick start
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [License](../LICENSE.md) - Licensing information

## 🔗 External Resources

- **OpenFrame Website**: https://openframe.ai
- **Flamingo Platform**: https://flamingo.run
- **Community Slack**: https://www.openmsp.ai/

## 🆘 Getting Help

**Join our OpenMSP Slack Community:**
🔗 https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

**Channels:**
- `#general` - General discussion about OpenFrame
- `#development` - Development questions and discussions
- `#support` - User support and troubleshooting

> **Note**: We don't use GitHub Issues or GitHub Discussions. All support and community interaction happens in our Slack community.

---

*Documentation generated by [OpenFrame Doc Orchestrator](https://github.com/flamingo-stack/openframe-oss-tenant)*