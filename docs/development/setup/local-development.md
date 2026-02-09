# Local Development Guide

This guide walks you through cloning, building, and running OpenFrame locally for development. Perfect for contributors and developers wanting to understand the platform.

## Prerequisites Check

Before starting, ensure you have completed [Environment Setup](environment.md):
- Java 21+ installed
- Maven 3.9+ available
- Node.js 18+ LTS
- Docker and Docker Compose
- Git configured

## Repository Structure Overview

Understanding the codebase organization:

```text
openframe-oss-tenant/
├── openframe/                      # Core platform services
│   ├── services/                  # Microservices (runnable apps)
│   │   ├── openframe-api/         # GraphQL + REST API service  
│   │   ├── openframe-gateway/     # API Gateway with routing
│   │   ├── openframe-auth/        # OAuth2 authorization server
│   │   ├── openframe-frontend/    # Vue.js web application
│   │   ├── openframe-management/  # Admin and scheduler service
│   │   ├── openframe-stream/      # Kafka stream processing
│   │   ├── openframe-external-api/ # External API endpoints
│   │   └── openframe-client/      # Agent management service
│   └── libs/                     # Shared libraries
│       ├── openframe-core/        # Core utilities and models
│       ├── openframe-data/        # Data access layer
│       └── openframe-security/    # Security and JWT libraries
├── clients/                      # Client applications
│   ├── openframe-client/        # Rust system agent
│   └── openframe-chat/          # Tauri chat application
├── integrated-tools/            # External tool configurations
│   ├── tactical-rmm/           # Tactical RMM configs
│   ├── meshcentral/            # MeshCentral configs
│   └── docker-compose.*.yml   # Database services
├── scripts/                    # Development and deployment scripts
├── manifests/                 # Kubernetes Helm charts
└── openframe-e2e-tests/      # End-to-end test suite
```

## Step 1: Clone and Setup

### Clone Repository

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify structure
ls -la
```

### Initialize Git Hooks (Optional)

```bash
# Setup pre-commit hooks for code quality
cp scripts/hooks/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit
```

## Step 2: Environment Configuration

### Create Development Environment File

```bash
# Copy example environment configuration
cp .env.example .env.development

# Edit with your preferences
nano .env.development
```

**Key configurations for local development:**

```bash
# === Core Settings ===
TENANT_DOMAIN=dev.openframe.local
TENANT_NAME=Development Environment
OPENFRAME_ENV=development

# === Database URLs ===
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# === Service Ports ===
GATEWAY_PORT=8443
API_PORT=8082
AUTH_PORT=8081
FRONTEND_PORT=3000

# === Development Features ===
DEBUG_MODE=true
HOT_RELOAD_ENABLED=true
SKIP_EMAIL_VERIFICATION=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# === Security (Development Only) ===
JWT_SECRET=development-secret-minimum-256-bits-long
ENCRYPTION_KEY=dev-encryption-key-32-characters
```

### Load Environment Variables

```bash
# Load into current session
source .env.development

# Add to shell profile for persistence (optional)
echo "source $(pwd)/.env.development" >> ~/.bashrc
```

## Step 3: Database Services

### Start Core Dependencies

OpenFrame requires several database services. Start them using Docker Compose:

```bash
# Start core infrastructure
docker compose -f integrated-tools/docker-compose.core.yml up -d

# Verify services are running
docker compose -f integrated-tools/docker-compose.core.yml ps
```

This starts:
- **MongoDB** (port 27017) — Primary database
- **Redis** (port 6379) — Cache and session storage
- **Apache Kafka** (port 9092) — Event streaming
- **Zookeeper** (port 2181) — Kafka coordination

### Optional Analytics Services

For full analytics capabilities:

```bash
# Start analytics services (optional)
docker compose -f integrated-tools/docker-compose.analytics.yml up -d
```

This adds:
- **Apache Pinot** (port 9000) — Real-time analytics
- **Apache Cassandra** (port 9042) — Time-series data

### Verify Database Connectivity

```bash
# Test MongoDB
docker exec -it mongodb mongosh openframe_dev --eval "db.runCommand('ping')"

# Test Redis  
docker exec -it redis redis-cli ping

# Test Kafka
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Step 4: Backend Services

### Build All Java Services

```bash
# Clean build all services and libraries
mvn clean install

# Skip tests for faster builds during development
mvn clean install -DskipTests

# Build specific service only
mvn clean install -pl openframe/services/openframe-api -DskipTests
```

### Run Services Individually

For targeted development, run services separately:

**API Service:**
```bash
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Gateway Service:**
```bash  
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server  
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

### Run All Services via Docker

For full-stack development:

```bash
# Build Docker images
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### Service Health Checks

Verify each service is responding:

```bash
# Gateway health
curl -k https://localhost:8443/health

# API health  
curl http://localhost:8082/actuator/health

# Auth server health
curl http://localhost:8081/actuator/health

# Management service health
curl http://localhost:8084/actuator/health
```

## Step 5: Frontend Development

### Install Dependencies

```bash
cd openframe/services/openframe-frontend

# Install npm dependencies
npm install

# Verify installation
npm list --depth=0
```

### Development Server

```bash
# Start development server with hot reload
npm run dev

# Or specify port explicitly
npm run dev -- --port 3000

# Build for production testing
npm run build
npm run preview
```

### Frontend Configuration

The frontend connects to backend services via environment variables:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8082',
      '/auth': 'http://localhost:8081',
      '/graphql': 'http://localhost:8082'
    }
  }
})
```

### Access Frontend

- **Development Server**: http://localhost:3000
- **Production Build**: http://localhost:4173 (after `npm run preview`)
- **Via Gateway**: https://localhost:8443 (after backend services running)

## Step 6: Client Development (Rust)

### Install Rust Toolchain

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### Build OpenFrame Client

```bash
cd clients/openframe-client

# Build in debug mode
cargo build

# Run locally (requires admin privileges)
sudo cargo run

# Build release version
cargo build --release
```

### Build Chat Client (Tauri)

```bash
cd clients/openframe-chat

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build desktop app
npm run tauri build
```

## Step 7: Development Workflow

### Hot Reload Development

For optimal development experience:

**Terminal 1 - Backend Services:**
```bash
# Start databases
docker compose -f integrated-tools/docker-compose.core.yml up -d

# Start specific service with auto-reload
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Terminal 2 - Frontend:**
```bash
cd openframe/services/openframe-frontend
npm run dev
```

**Terminal 3 - Testing:**
```bash
# Watch for file changes and run tests
mvn test -Dtest.watch=true
```

### Code Generation

Some components require code generation:

```bash
# Generate GraphQL types
cd openframe/services/openframe-frontend
npm run codegen

# Generate OpenAPI clients
mvn clean generate-sources -pl openframe/libs/openframe-api-client
```

### Database Seeding

Populate development data:

```bash
# Run data initialization
mvn exec:java -Dexec.mainClass="com.openframe.data.DataSeeder" \
  -pl openframe/libs/openframe-data

# Or use the management service endpoint
curl -X POST http://localhost:8084/api/admin/seed-data
```

## Step 8: Testing Setup

### Run Unit Tests

```bash
# Run all tests
mvn test

# Run tests for specific module
mvn test -pl openframe/services/openframe-api

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Frontend tests
cd openframe/services/openframe-frontend
npm test
```

### Integration Tests

```bash
# Start test databases (uses different ports)
docker compose -f integrated-tools/docker-compose.test.yml up -d

# Run integration tests
mvn test -Dtest="*IT"

# Run E2E tests
cd openframe-e2e-tests
mvn test
```

### Test Coverage

```bash
# Generate coverage reports
mvn jacoco:report

# View coverage
open target/site/jacoco/index.html

# Frontend coverage
cd openframe/services/openframe-frontend  
npm run test:coverage
```

## Development Tools and Commands

### Maven Shortcuts

```bash
# Fast compilation (no tests)
mvn compile -DskipTests

# Clean and install specific module
mvn clean install -pl openframe/services/openframe-api

# Update dependencies
mvn versions:use-latest-versions

# Display dependency tree
mvn dependency:tree
```

### npm Scripts

```bash
cd openframe/services/openframe-frontend

# Available scripts
npm run lint          # ESLint checking
npm run format         # Prettier formatting  
npm run type-check     # TypeScript validation
npm run build-only     # Build without type checking
npm run preview        # Preview production build
```

### Docker Development

```bash
# Rebuild specific service
docker compose build openframe-api

# View service logs
docker compose logs -f openframe-api

# Execute commands in containers
docker compose exec mongodb mongosh
docker compose exec redis redis-cli

# Reset development environment
docker compose down -v
docker compose up -d
```

## IDE Integration

### IntelliJ IDEA

**Run Configurations:**

Create run configurations for each service:

```xml
<!-- .idea/runConfigurations/API_Service.xml -->
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="API Service" type="SpringBootApplicationConfigurationType">
    <module name="openframe-api" />
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.api.ApiApplication" />
    <option name="ACTIVE_PROFILES" value="development" />
    <method v="2">
      <option name="Make" enabled="true" />
    </method>
  </configuration>
</component>
```

### VS Code

**Launch Configuration:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Debug API Service",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "args": "--spring.profiles.active=development"
    },
    {
      "name": "Frontend Dev Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

## Debugging and Troubleshooting

### Common Issues

**Port Conflicts:**
```bash
# Check port usage
lsof -i :8443
netstat -tulnp | grep :8443

# Kill process using port
sudo kill -9 $(lsof -t -i:8443)
```

**Memory Issues:**
```bash
# Increase Docker memory
# Docker Desktop → Resources → Advanced → Memory: 8GB+

# Java memory configuration
export MAVEN_OPTS="-Xmx4g -XX:+UseG1GC"
```

**Database Connection Issues:**
```bash
# Reset databases
docker compose -f integrated-tools/docker-compose.core.yml down -v
docker compose -f integrated-tools/docker-compose.core.yml up -d

# Check container logs
docker logs mongodb
docker logs redis
```

**Build Failures:**
```bash
# Clear Maven cache
rm -rf ~/.m2/repository/com/openframe

# Clear npm cache
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install
```

### Debug Mode

Enable debug logging:

```bash
# Java services
export LOGGING_LEVEL_COM_OPENFRAME=DEBUG

# Frontend
export VITE_DEBUG=true

# Docker containers
docker compose logs -f openframe-api | grep ERROR
```

### Performance Monitoring

Monitor development performance:

```bash
# Java process monitoring
jps -v
jstat -gc [PID] 1s

# Container resource usage
docker stats

# Database performance
docker exec mongodb mongostat
docker exec redis redis-cli info memory
```

## Platform Scripts

### Automated Development Scripts

Use the provided platform scripts for streamlined development:

```bash
# macOS development setup
./scripts/run-mac.sh --dev

# Linux development setup  
./scripts/run-linux.sh --dev

# Windows development setup
./scripts/run-windows.ps1 -DevMode

# Silent mode (no prompts)
./scripts/run-mac.sh --dev --silent
```

### Custom Development Scripts

Create personal shortcuts:

```bash
# Create bin/dev-start.sh
#!/bin/bash
echo "Starting OpenFrame development environment..."

# Start databases
docker compose -f integrated-tools/docker-compose.core.yml up -d

# Wait for services
sleep 10

# Start API in background
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development &

# Start frontend
cd ../openframe-frontend
npm run dev
```

## Next Steps

Now that you have OpenFrame running locally:

1. **[Architecture Overview](../architecture/overview.md)** — Understand system design
2. **[Testing Guide](../testing/overview.md)** — Learn testing strategies
3. **[Contributing Guidelines](../contributing/guidelines.md)** — Contribute code

## Advanced Development Topics

### Microservices Development

- **Service Discovery**: Services discover each other via gateway
- **Configuration Management**: Spring Cloud Config for centralized settings  
- **Event Driven Architecture**: Kafka topics for async communication
- **Database per Service**: Each service owns its data domain

### Frontend Architecture

- **Component Library**: Shared Vue components across features
- **State Management**: Pinia stores for application state
- **API Integration**: GraphQL with Apollo Client
- **Build Pipeline**: Vite for fast development and production builds

### Security Development

- **JWT Authentication**: Token-based auth with refresh rotation
- **OAuth2 Integration**: Support for external identity providers
- **Multi-tenant Security**: Tenant isolation across all layers
- **API Security**: Rate limiting and input validation

---

Questions? Join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for developer support and discussion.