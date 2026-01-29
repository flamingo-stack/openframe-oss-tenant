# Development Documentation

Welcome to the OpenFrame development documentation. This section provides comprehensive guides for developers who want to contribute to, customize, or extend the OpenFrame platform.

## Quick Navigation

### Getting Started
- **[Environment Setup](./setup/environment.md)** - IDE, tools, and development environment configuration
- **[Local Development](./setup/local-development.md)** - Running OpenFrame locally for development
- **[Architecture Overview](./architecture/overview.md)** - Platform architecture and design patterns

### Development Guides  
- **[Testing Overview](./testing/overview.md)** - Testing strategy, frameworks, and best practices
- **[Contributing Guidelines](./contributing/guidelines.md)** - Code style, PR process, and contribution workflow

## Development Stack

OpenFrame is built using modern, enterprise-grade technologies:

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Java** | 21+ | Core runtime environment |
| **Spring Boot** | 3.3.0 | Microservices framework |
| **GraphQL** | Netflix DGS 7.0.0 | API query language |
| **MongoDB** | 7.0+ | Primary document database |
| **Apache Kafka** | 3.6.0 | Event streaming platform |
| **Cassandra** | 4.1+ | Time-series data storage |
| **Redis** | 7.0+ | Caching and session management |

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue.js** | 3.4+ | Progressive JavaScript framework |
| **TypeScript** | 5.0+ | Type-safe JavaScript |
| **Vite** | 5.0+ | Build tool and dev server |
| **PrimeVue** | 3.45+ | UI component library |
| **Pinia** | 2.1+ | State management |
| **Apollo Client** | 3.8+ | GraphQL client |

### Infrastructure Technologies  
| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | 24.0+ | Containerization |
| **Kubernetes** | 1.28+ | Orchestration |
| **Helm** | 3.12+ | Package management |
| **Istio** | 1.20+ | Service mesh |

## Project Structure

```
openframe/
├── services/                    # Microservices
│   ├── openframe-gateway/      # API Gateway (Spring Cloud Gateway)
│   ├── openframe-api/          # GraphQL API (Netflix DGS)
│   ├── openframe-management/   # Admin service (Spring Boot)
│   ├── openframe-stream/       # Stream processing (Kafka Streams)
│   ├── openframe-config/       # Configuration server
│   ├── openframe-client/       # Agent management service
│   ├── openframe-external-api/ # External integrations
│   ├── openframe-authorization-server/ # OAuth2/OIDC
│   └── openframe-frontend/     # Vue.js frontend
├── libs/                       # Shared libraries
│   ├── openframe-core/         # Core models and utilities
│   ├── openframe-data/         # Data access layer
│   ├── openframe-jwt/          # JWT security
│   └── api-library/           # Common API components
├── clients/                    # Client applications
│   ├── openframe-client/       # Rust system agent  
│   └── openframe-chat/        # Tauri chat application
├── integrated-tools/           # External tool configurations
│   ├── tactical-rmm/          # TacticalRMM integration
│   ├── fleetmdm/             # FleetMDM integration
│   └── meshcentral/          # MeshCentral integration
├── manifests/                  # Kubernetes manifests
├── scripts/                    # Development scripts
└── docs/                      # Documentation
```

## Development Workflow

### Typical Development Tasks

1. **Feature Development**
   - Create feature branch from `main`
   - Implement feature with tests
   - Submit pull request
   - Code review and merge

2. **Bug Fixes**
   - Identify issue in GitHub or Slack
   - Create bug fix branch
   - Implement fix with regression test
   - Submit pull request

3. **Integration Development**
   - Add new external tool integration
   - Implement connector and data mapping
   - Add configuration UI
   - Document integration steps

### Code Organization Patterns

#### Backend Services (Java)
```
src/main/java/com/openframe/[service]/
├── config/          # Spring configuration
├── controller/      # REST/GraphQL controllers  
├── service/         # Business logic
├── repository/      # Data access
├── dto/            # Data transfer objects
├── mapper/         # Entity/DTO mapping
└── exception/      # Custom exceptions
```

#### Frontend Application (Vue.js)
```
src/
├── app/            # Application pages and features
├── components/     # Reusable UI components
├── lib/           # Utilities and configurations
├── stores/        # Pinia state stores
└── types/         # TypeScript type definitions
```

#### Shared Libraries
```
src/main/java/com/openframe/[lib]/
├── model/         # Domain models
├── service/       # Common services
├── util/         # Utility functions
└── config/       # Shared configurations
```

## Development Principles

### Code Quality Standards
- **Test Coverage**: Minimum 80% for business logic
- **Documentation**: All public APIs documented
- **Code Style**: Consistent formatting and naming
- **Security**: Security review for all changes
- **Performance**: Load testing for critical paths

### Architecture Principles
- **Microservices**: Loosely coupled, independently deployable
- **API-First**: Well-defined interfaces between services
- **Event-Driven**: Asynchronous communication via Kafka
- **Cloud-Native**: Kubernetes-ready, stateless services
- **Security**: Zero-trust, authentication everywhere

### Technology Choices
- **Open Source First**: Prefer open-source solutions
- **Proven Technologies**: Use mature, well-supported tools
- **Developer Experience**: Prioritize developer productivity
- **Scalability**: Design for horizontal scaling
- **Observability**: Built-in monitoring and logging

## Getting Started with Development

### 1. Set Up Your Environment
Follow the [Environment Setup](./setup/environment.md) guide to configure:
- IDE and development tools
- Local databases and services
- Code quality tools
- Debugging configuration

### 2. Run OpenFrame Locally  
Use the [Local Development](./setup/local-development.md) guide to:
- Start all services locally
- Configure hot reload
- Set up debugging
- Test integrations

### 3. Understand the Architecture
Read the [Architecture Overview](./architecture/overview.md) to learn:
- Service boundaries and responsibilities
- Data flow patterns
- Integration patterns
- Security model

### 4. Write and Run Tests
See [Testing Overview](./testing/overview.md) for:
- Unit testing patterns
- Integration testing setup
- End-to-end testing
- Performance testing

### 5. Contribute Code
Follow [Contributing Guidelines](./contributing/guidelines.md) for:
- Code style requirements
- Pull request process
- Code review expectations
- Release procedures

## Common Development Tasks

### Adding a New API Endpoint

1. **Define GraphQL Schema**
```graphql
# In schema.graphqls
type Query {
  getDevice(id: ID!): Device
}

type Device {
  id: ID!
  name: String!
  status: DeviceStatus!
  organization: Organization!
}
```

2. **Implement Data Fetcher**
```java
@DgsComponent
public class DeviceDataFetcher {
    
    @DgsQuery
    public Device getDevice(@InputArgument String id) {
        return deviceService.findById(id);
    }
}
```

3. **Add Frontend Query**
```typescript
const GET_DEVICE = gql`
  query GetDevice($id: ID!) {
    getDevice(id: $id) {
      id
      name
      status
      organization {
        name
      }
    }
  }
`;
```

### Adding a New Integration

1. **Create Integration Service**
```java
@Service
public class NewToolIntegrationService {
    
    public void syncData() {
        // Implementation
    }
    
    public void handleWebhook(WebhookPayload payload) {
        // Implementation  
    }
}
```

2. **Add Configuration Properties**
```java
@ConfigurationProperties(prefix = "openframe.integrations.newtool")
@Data
public class NewToolProperties {
    private String apiUrl;
    private String apiKey;
    private boolean enabled = false;
}
```

3. **Create UI Configuration**
```vue
<template>
  <div class="integration-config">
    <h3>New Tool Integration</h3>
    <FormField label="API URL">
      <InputText v-model="config.apiUrl" />
    </FormField>
    <FormField label="API Key">  
      <Password v-model="config.apiKey" />
    </FormField>
  </div>
</template>
```

## Resources and Support

### Documentation
- **API Documentation**: Generated from GraphQL schema
- **Code Documentation**: JavaDoc for Java, TSDoc for TypeScript
- **Architecture Decisions**: Documented in `docs/architecture/`
- **Integration Guides**: Step-by-step integration tutorials

### Development Tools
- **IDE Support**: IntelliJ IDEA, VS Code configurations included
- **Database Tools**: MongoDB Compass, Redis CLI, Cassandra CQL
- **Testing Tools**: JUnit, TestNG, Playwright, Postman collections
- **Monitoring**: Local Prometheus, Grafana dashboards

### Community
- **OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Developer Channels**: #developers, #architecture, #integrations
- **Office Hours**: Weekly developer Q&A sessions
- **Code Reviews**: Collaborative review process in Slack

## Contributing

OpenFrame is built by the community, for the community. We welcome contributions of all kinds:

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Propose new functionality  
- **Code Contributions**: Submit pull requests
- **Documentation**: Improve guides and references
- **Integrations**: Add support for new tools
- **Testing**: Help expand test coverage

Start with our [Contributing Guidelines](./contributing/guidelines.md) to learn how to get involved.

---

Ready to start developing? Begin with the [Environment Setup](./setup/environment.md) guide!