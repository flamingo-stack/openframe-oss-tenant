# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Build Commands
```bash
mvn clean install                           # Build all Java services and libraries
mvn clean install -DskipTests              # Build without running tests
mvn test                                    # Run all tests
```

### Frontend (UI) Commands
```bash
cd openframe/services/openframe-frontend
npm install                                 # Install dependencies
npm run dev                                 # Start development server
npm run build                               # Build for production
npm run type-check                          # TypeScript type checking
```

### Rust Client Commands
```bash
cd client
cargo build                                 # Build the Rust client
cargo test                                  # Run Rust tests
cargo run                                   # Run the client locally
```

### Local Development
```bash
# Platform-specific startup scripts:
./scripts/run-mac.sh                        # macOS
./scripts/run-linux.sh                      # Linux
./scripts/run-windows.ps1                   # Windows PowerShell

# Silent mode (no prompts):
./scripts/run-mac.sh --silent
```

### Docker Operations
```bash
# Note: Docker Compose files are located in integrated-tools/ directory
# Individual service stacks can be found in their respective subdirectories:
# - integrated-tools/tactical-rmm/
# - integrated-tools/fleetmdm/
# - integrated-tools/meshcentral/
# - integrated-tools/authentik/
```

## Architecture Overview

OpenFrame is a distributed microservices platform with the following core architecture:

### Service Layer
- **openframe-gateway**: API Gateway with JWT authentication, WebSocket support, and tool proxy
- **openframe-api**: GraphQL API service with OAuth2/OpenID Connect, user management
- **openframe-management**: Administrative service with scheduled tasks and system management
- **openframe-stream**: Stream processing service using Kafka for real-time data processing (NOT NiFi)
- **openframe-config**: Spring Cloud Config Server for centralized configuration management
- **openframe-client** (Java): Agent management and authentication service
- **openframe-frontend**: Vue 3 + TypeScript frontend with PrimeVue components

### Client Agent
- **client/** (Rust): Cross-platform system agent for monitoring and management

### Shared Libraries
- **openframe-data**: Data access layer (MongoDB, Cassandra, Redis, Kafka)
- **openframe-jwt**: JWT security implementation with cookie support
- **api-library**: Common API services and DTOs

### Technology Stack

#### Backend
- **Runtime**: Java 21, Spring Boot 3.3.0, Spring Cloud 2023.0.3
- **API**: GraphQL (Netflix DGS 7.0.0), RESTful services
- **Security**: JWT with OAuth2, Spring Security, AES-256 encryption
- **Data**: MongoDB 7.x, Cassandra 4.x, Apache Pinot 1.2.0, Redis
- **Messaging**: Apache Kafka 3.6.0 for event streaming
- **Processing**: OpenFrame Stream Service (custom data processing components)

#### Frontend
- **Framework**: Vue 3 with Composition API and TypeScript
- **UI**: PrimeVue 3.45.0 components, custom design system
- **State**: Pinia for state management
- **GraphQL**: Apollo Client for data fetching
- **Build**: Vite 5.0.10 with TypeScript support

#### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Orchestration**: Kubernetes 1.28+ with Helm charts (manifests/)
- **Monitoring**: Prometheus, Grafana, Loki for observability
- **Service Mesh**: Istio 1.20 for traffic management

## Key Development Patterns

### Authentication Flow
- Users authenticate through OAuth2/OpenID Connect via `openframe-api`
- JWTs are stored in HTTP-only cookies for security (moved from Authorization headers)
- Gateway converts cookies to Authorization headers for internal services
- Agents use separate authentication flow with service accounts

### Data Flow
1. **Ingestion**: External tools → `openframe-stream` → Kafka topics
2. **Processing**: Kafka → Stream Processing Service → enriched data → Cassandra/Pinot
3. **API Layer**: GraphQL queries → MongoDB/Cassandra/Pinot → client responses
4. **Real-time**: WebSocket connections through gateway for live updates

### Service Communication
- **External**: REST APIs through API Gateway
- **Internal**: Direct service-to-service HTTP calls
- **Async**: Kafka topics for event-driven communication
- **Configuration**: Spring Cloud Config for centralized configuration

## Project Structure

```
.
├── openframe/                          # Java services and libraries
│   ├── services/                       # Microservices
│   │   ├── openframe-gateway/          # API Gateway (port routing)
│   │   ├── openframe-api/              # GraphQL API and OAuth
│   │   ├── openframe-management/       # Admin and scheduled tasks
│   │   ├── openframe-stream/           # Kafka stream processing
│   │   ├── openframe-config/           # Configuration server
│   │   ├── openframe-client/           # Agent management service
│   │   ├── openframe-external-api/     # External API integrations
│   │   ├── openframe-authorization-server/ # Authorization server
│   │   ├── openframe-frontend/               # Vue.js frontend (primary)
│   │   └── openframe-frontend/         # Alternative frontend (React/Next.js)
│   └── libs/                           # Shared libraries
│       ├── openframe-core/             # Core models and utilities
│       ├── openframe-data/             # Data access layer
│       ├── openframe-jwt/              # JWT security implementation
│       └── api-library/                # Common API services
├── client/                             # Rust system agent
├── manifests/                          # Kubernetes Helm charts
├── integrated-tools/                   # Docker configs for external tools
├── scripts/                            # Development and deployment scripts
└── docs/                               # Documentation (flattened structure)
    ├── getting-started/                # Getting started guides
    ├── development/                    # Development documentation
    ├── api/                           # API documentation
    ├── deployment/                    # Deployment guides
    ├── operations/                    # Operations manual
    ├── reference/                     # Technical reference
    └── diagrams/                      # Architecture diagrams
```

## Documentation Structure

The documentation has been restructured into a comprehensive, flat hierarchy:

### Main Sections
- **getting-started/**: Introduction, prerequisites, quick start, first steps
- **development/**: Complete development guide with architecture, setup, testing
- **api/**: Authentication, GraphQL, REST, WebSocket documentation
- **deployment/**: Local, Kubernetes, cloud deployment guides
- **operations/**: Monitoring, logging, maintenance, troubleshooting
- **reference/**: Technical reference for services, libraries, configuration
- **diagrams/**: Visual architecture and system diagrams

### Key Files
- `docs/README.md`: Comprehensive master documentation index with navigation
- `README.md`: Main project README with current architecture (no NiFi references)
- Individual section READMEs provide detailed navigation within each area

## Code Standards

### Java/Spring Boot
- Use Java 21 features (records, sealed classes, pattern matching)
- Follow Spring Boot 3.x conventions and best practices
- Constructor injection over field injection
- Use `@ConfigurationProperties` for type-safe configuration
- Implement proper exception handling with `@ControllerAdvice`
- GraphQL DataFetchers in `openframe-api` for data access

### Vue.js/TypeScript
- Use Vue 3 Composition API with `<script setup>`
- TypeScript for all new code with strict mode
- PrimeVue components for UI consistency
- Apollo Client composables for GraphQL operations
- Pinia stores for state management

### Rust
- Use Tokio async runtime for I/O operations
- Implement proper error handling with `anyhow` and `thiserror`
- Follow Rust naming conventions (snake_case)
- Use `serde` for serialization/deserialization

## Testing Strategy

### Java
```bash
mvn test                                # Run all tests
mvn test -Dtest=ClassName               # Run specific test class
mvn test -Dtest=ClassName#methodName    # Run specific test method
```
- Unit tests with JUnit 5 and Mockito
- Integration tests with `@SpringBootTest`
- Repository tests with `@DataMongoTest`
- Web layer tests with `MockMvc`

### Frontend
```bash
cd openframe/services/openframe-frontend
npm run test:unit                       # Unit tests (if configured)
npm run type-check                      # TypeScript validation
```

### Rust
```bash
cd client
cargo test                              # Run all Rust tests
cargo test test_name                    # Run specific test
```

## Security Considerations

- All services use JWT authentication via HTTP-only cookies (NOT Authorization headers)
- Agents authenticate with service account credentials
- Database connections use encrypted credentials
- External tool integrations proxy through gateway
- CORS configured for frontend-backend communication
- Rate limiting implemented at gateway level

## Local Development Setup

1. **Prerequisites**: Java 21, Maven 3.9+, Docker 24.0+, Node.js 18+, Rust 1.70+ (for client)
2. **GitHub Token**: Required for private repository access during setup
3. **Run platform script**: `./scripts/run-mac.sh` (or equivalent for your OS)
4. **Access URLs**:
   - UI Dashboard: http://localhost:8080
   - GraphQL API: http://localhost:8080/graphql
   - Config Server: http://localhost:8888

## Common Tasks

### Adding New GraphQL Operations
1. Add query/mutation to schema in `openframe-api`
2. Implement DataFetcher class
3. Register DataFetcher in DGS configuration
4. Update frontend GraphQL queries

### Adding New Microservice
1. Create Maven module in `openframe/services/`
2. Follow existing service structure (controller/service/repository)
3. Add Docker configuration and Helm charts
4. Register service routes in gateway configuration

### Integrated Tool Connection
1. Add tool configuration in `docker-compose.openframe-{tool}.yml`
2. Implement connection logic in `openframe-client/ToolConnectionService`
3. Add UI components for tool management
4. Configure tool-specific data processing in `openframe-stream`

### Documentation Updates
1. Update relevant section in `docs/` hierarchy
2. Update cross-references and navigation links
3. Ensure consistency with master `docs/README.md`
4. Verify all Mermaid diagrams render correctly

## Architecture Notes (IMPORTANT)

### What Changed
- **Apache NiFi REMOVED**: Replaced with OpenFrame Stream Service throughout
- **Authentication Method**: JWT moved from Authorization headers to HTTP-only cookies
- **Documentation Structure**: Flattened from `docs/docs/` to `docs/`
- **Apache Pinot**: Added to all relevant architecture diagrams and descriptions

### Current Data Processing Pipeline
```
Data Sources → OpenFrame Stream Service → Kafka → [Cassandra/Pinot/MongoDB/Redis]
```

### DO NOT Reference
- Apache NiFi (removed from project - NOTE: Some NiFi dependencies may still exist in pom.xml but should not be used)
- Authorization header JWT (now uses cookies)
- Nested `docs/docs/` structure (flattened)

### Performance Characteristics
- **API Response Time**: < 200ms average
- **Throughput**: 100,000 events/second
- **Concurrent Users**: 10,000+ supported
- **Availability**: 99.9% uptime SLA

## Troubleshooting

### Common Issues
- **Service startup failures**: Check configuration and dependencies
- **Database connection errors**: Verify connection strings and credentials
- **Authentication issues**: Check JWT cookie configuration (not Authorization headers)
- **Documentation links**: Use flat structure (`docs/section/` not `docs/docs/section/`)

### Diagnostic Commands
```bash
# Service health
curl http://localhost:8080/actuator/health

# Service logs
docker-compose logs -f service-name

# Container status
kubectl get pods --sort-by=memory

# JWT token verification (cookies, not headers)
curl -b cookies.txt http://localhost:8080/api/user/profile
```

## Integrated Tools

Current integrations include:
- **Tactical RMM**: IT management suite
- **MeshCentral**: Remote management platform  
- **Fleet MDM**: Mobile device management
- **Authentik**: Identity provider

Each tool has dedicated documentation in `docs/reference/tools/` and API documentation in `docs/api/tools/`.