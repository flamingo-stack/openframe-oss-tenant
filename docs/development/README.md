# Development Documentation

Welcome to the OpenFrame development documentation! This section provides comprehensive guides for developers working on OpenFrame, from environment setup to contributing guidelines.

## Documentation Structure

The development documentation is organized into the following sections:

### 🛠️ Setup Guides
- **[Environment Setup](setup/environment.md)** - IDE configuration, development tools, and editor setup
- **[Local Development](setup/local-development.md)** - Running OpenFrame locally, debugging, and hot reload

### 🏗️ Architecture
- **[Overview](architecture/overview.md)** - High-level system architecture, components, and data flow

### 🧪 Testing
- **[Overview](testing/overview.md)** - Test structure, running tests, and writing new tests

### 🤝 Contributing
- **[Guidelines](contributing/guidelines.md)** - Code style, PR process, and contribution workflow

## Quick Development Setup

For experienced developers who want to jump straight in:

```bash
# 1. Clone and setup
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure
docker compose up -d

# 3. Build everything
mvn clean install -DskipTests

# 4. Start backend services
./scripts/run-linux.sh --silent

# 5. Start frontend (new terminal)
cd openframe/services/openframe-frontend
npm install && npm run dev

# 6. Build client agent (new terminal)
cd clients/openframe-client
cargo build --release
```

## Technology Stack

OpenFrame is built using modern technologies across multiple layers:

### Backend Services (Java)
- **Runtime**: Java 21, Spring Boot 3.3.0
- **API**: GraphQL (Netflix DGS 7.0.0), REST
- **Security**: Spring Security, OAuth2, JWT
- **Data**: MongoDB, Cassandra, Apache Pinot, Redis
- **Messaging**: Apache Kafka, NATS JetStream
- **Build**: Maven 3.9+

### Frontend (TypeScript)
- **Framework**: Vue 3 with Composition API
- **Language**: TypeScript 5.0+
- **UI**: PrimeVue 3.45.0, custom components
- **State**: Pinia, Apollo Client (GraphQL)
- **Build**: Vite 5.0.10

### Client Agent (Rust)
- **Language**: Rust 1.70+
- **Async**: Tokio runtime
- **Serialization**: Serde
- **HTTP**: reqwest
- **Packaging**: Velopack (cross-platform updates)

### Infrastructure
- **Containers**: Docker, Docker Compose
- **Orchestration**: Kubernetes 1.28+ (Helm charts)
- **Monitoring**: Prometheus, Grafana, Loki

## Development Environment Requirements

| Tool | Version | Purpose |
|------|---------|---------|
| **Java** | 21+ | Backend development |
| **Maven** | 3.9+ | Build tool |
| **Node.js** | 18+ LTS | Frontend development |
| **Rust** | 1.70+ | Client development |
| **Docker** | 24.0+ | Local infrastructure |
| **Git** | 2.30+ | Version control |

## Project Structure

```text
openframe-oss-tenant/
├── openframe/                          # Java services and libraries
│   ├── services/                       # Microservices
│   │   ├── openframe-api/              # GraphQL/REST API
│   │   ├── openframe-gateway/          # API Gateway
│   │   ├── openframe-authorization-server/ # OAuth2/OIDC
│   │   ├── openframe-frontend/         # Vue.js UI
│   │   └── ...
│   └── libs/                           # Shared libraries
│       ├── openframe-core/             # Core utilities
│       ├── openframe-data/             # Data access
│       └── ...
├── clients/                            # Client applications
│   ├── openframe-client/               # Rust system agent
│   └── openframe-chat/                 # Tauri chat app
├── integrated-tools/                   # External tool configs
├── manifests/                          # Kubernetes manifests
└── scripts/                           # Development scripts
```

## Development Workflow

### 1. Feature Development
1. Create feature branch from `main`
2. Set up local environment (see setup guides)
3. Implement changes with tests
4. Run full test suite
5. Submit pull request

### 2. Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing  
- **E2E Tests**: Full workflow testing
- **Performance Tests**: Load and stress testing

### 3. Code Quality
- **Linting**: ESLint (TypeScript), Checkstyle (Java), Clippy (Rust)
- **Formatting**: Prettier (TypeScript), google-java-format (Java), rustfmt (Rust)
- **Type Safety**: TypeScript strict mode, Java records, Rust ownership

## Development Commands

### Backend Development
```bash
# Build all services
mvn clean install

# Run tests
mvn test

# Run specific service
mvn spring-boot:run -pl openframe/services/openframe-api

# Debug mode
mvn spring-boot:run -pl openframe/services/openframe-api -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### Frontend Development
```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Run tests
npm test
```

### Client Development
```bash
cd clients/openframe-client

# Build in debug mode
cargo build

# Build in release mode
cargo build --release

# Run tests
cargo test

# Run with logging
RUST_LOG=debug cargo run

# Format code
cargo fmt

# Lint code
cargo clippy
```

## API Development

### GraphQL API
- **Endpoint**: http://localhost:8080/graphql
- **Playground**: Interactive query interface
- **Schema**: Auto-generated from Java code
- **DataLoaders**: N+1 query prevention

### REST API
- **Endpoint**: http://localhost:8080/api/v1
- **Documentation**: OpenAPI 3.0 spec
- **Authentication**: JWT or API key
- **Rate Limiting**: Configurable per key

## Database Development

### MongoDB (Primary Database)
```bash
# Connect to local MongoDB
mongosh mongodb://localhost:27017/openframe

# View collections
show collections

# Query devices
db.machines.find().limit(5)
```

### Apache Pinot (Analytics)
```bash
# Access Pinot console
open http://localhost:9000

# Query events
SELECT * FROM events 
WHERE __time > ago('PT1H') 
LIMIT 10
```

### Redis (Cache)
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# View keys
KEYS *

# Get cached value
GET user:session:abc123
```

## Debugging

### Java Services
1. **IDE Integration**: IntelliJ IDEA, VS Code with Java extensions
2. **Remote Debugging**: Port 5005 (see commands above)
3. **Logging**: Logback configuration in `application.yml`
4. **Profiling**: JProfiler, VisualVM

### TypeScript Frontend
1. **Browser DevTools**: Vue DevTools extension
2. **VS Code**: Built-in TypeScript debugging
3. **Hot Reload**: Vite development server
4. **State Inspection**: Pinia DevTools

### Rust Client
1. **IDE Integration**: VS Code with rust-analyzer
2. **Debugging**: `cargo debug` or IDE debugger
3. **Logging**: `RUST_LOG=debug` environment variable
4. **Profiling**: `cargo flamegraph`, perf

## Common Development Tasks

### Adding a New API Endpoint
1. Define GraphQL schema in `.graphqls` files
2. Create DataFetcher class
3. Implement service layer logic
4. Add tests (unit + integration)
5. Update API documentation

### Adding a Frontend Component
1. Create Vue 3 component with TypeScript
2. Define props and emits interfaces
3. Implement composition API logic
4. Add component tests
5. Update Storybook stories

### Integrating a New Tool
1. Create tool-specific SDK (if needed)
2. Implement stream processing pipeline
3. Add database schema changes
4. Create API endpoints for tool data
5. Build UI components for tool management

## Performance Optimization

### Backend
- **Database Indexing**: MongoDB compound indexes
- **Caching**: Redis for frequently accessed data  
- **Connection Pooling**: HikariCP configuration
- **Async Processing**: CompletableFuture, @Async

### Frontend  
- **Code Splitting**: Dynamic imports, route-based splitting
- **State Management**: Efficient Pinia stores
- **Image Optimization**: WebP format, lazy loading
- **Bundle Analysis**: webpack-bundle-analyzer

### Client
- **Efficient I/O**: Tokio async runtime
- **Memory Management**: Rust ownership system
- **Binary Size**: Strip symbols, optimize for size
- **Update Efficiency**: Delta updates via Velopack

## Security Considerations

- **Input Validation**: All API inputs validated
- **SQL Injection**: No raw SQL queries
- **XSS Prevention**: Output encoding, CSP headers
- **JWT Security**: Short expiration, secure cookies
- **Dependency Scanning**: Regular security audits

## Getting Help

### Community Support
- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Discussions**: Technical questions and architecture discussions

### Documentation Issues
- Report documentation bugs or improvements needed
- All development coordination happens on Slack

### Code Reviews
- All pull requests require review
- Focus on code quality, security, and maintainability
- Automated testing must pass

## What's Next?

Choose your path based on what you want to work on:

- **Backend Development**: Start with [Environment Setup](setup/environment.md)
- **Frontend Development**: Check [Local Development](setup/local-development.md)  
- **Architecture Understanding**: Read [Architecture Overview](architecture/overview.md)
- **Contributing**: Review [Contributing Guidelines](contributing/guidelines.md)

Welcome to the OpenFrame development community! 🚀