# Local Development Setup

This guide covers running OpenFrame locally for development, including hot reloading, debugging, and testing workflows.

## Development Workflow Overview

OpenFrame development follows a microservices pattern where you can run individual services or the full stack depending on your needs.

```mermaid
flowchart LR
    A[📥 Clone Repository] --> B[🔧 Install Dependencies]
    B --> C[🐳 Start Infrastructure]
    C --> D[☕ Start Backend Services]
    D --> E[⚛️ Start Frontend]
    E --> F[🧪 Run Tests]
    F --> G[💻 Development Ready]
```

## Repository Setup

### Clone and Initialize

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant
cd openframe-oss-tenant

# Initialize git hooks (optional)
git config core.hooksPath .githooks
chmod +x .githooks/*
```

### Verify Prerequisites

```bash
# Check Java version
java -version
# Expected: openjdk version "21.x.x"

# Check Node.js version
node --version
# Expected: v20.x.x or higher

# Check Maven version
mvn --version
# Expected: Apache Maven 3.8+ with Java 21

# Check Docker version
docker --version && docker compose version
# Expected: Docker 24+ and Compose 2.20+
```

## Infrastructure Services

Start the required infrastructure services using Docker:

```bash
# Start all infrastructure services
docker compose up -d mongodb redis kafka cassandra

# Or start individual services
docker compose up -d mongodb  # Primary database
docker compose up -d redis    # Caching layer
docker compose up -d kafka    # Event streaming
```

### Verify Infrastructure

```bash
# Check service health
docker compose ps

# Test database connections
mongo mongodb://localhost:27017/openframe_dev
redis-cli ping
```

## Backend Services Development

### Build All Services

```bash
# Clean build all Java services
mvn clean install

# Skip tests for faster builds during development
mvn clean install -DskipTests

# Build specific modules
mvn clean install -pl openframe/services/openframe-api
```

### Running Services Individually

#### API Service (Primary GraphQL API)

```bash
cd openframe/services/openframe-api

# Run with Maven
mvn spring-boot:run -Dspring-boot.run.profiles=development

# Or run with Java directly
java -jar target/openframe-api-*.jar --spring.profiles.active=development

# Enable debug mode
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

**Access**: http://localhost:8081
**GraphQL Playground**: http://localhost:8081/graphiql

#### Gateway Service (API Gateway)

```bash
cd openframe/services/openframe-gateway

# Run with development profile
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Access**: http://localhost:8080 (Routes to all services)

#### Authorization Server (OAuth2/OIDC)

```bash
cd openframe/services/openframe-authorization-server

# Run authorization service
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Access**: http://localhost:9000
**OIDC Discovery**: http://localhost:9000/.well-known/openid-configuration

#### Management Service (Admin & Scheduling)

```bash
cd openframe/services/openframe-management

# Run management service
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Access**: http://localhost:8082

#### Stream Service (Event Processing)

```bash
cd openframe/services/openframe-stream

# Run stream processing service
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Access**: http://localhost:8083

### Run All Backend Services

```bash
# Use the convenience script
./scripts/start-backend.sh

# Or manually in separate terminals
cd openframe/services/openframe-api && mvn spring-boot:run -Dspring-boot.run.profiles=development &
cd openframe/services/openframe-gateway && mvn spring-boot:run -Dspring-boot.run.profiles=development &
cd openframe/services/openframe-authorization-server && mvn spring-boot:run -Dspring-boot.run.profiles=development &
# ... etc
```

## Frontend Development

### Install Dependencies

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Check for security vulnerabilities
npm audit fix
```

### Development Server

```bash
# Start development server with hot reloading
npm run dev

# Start with specific port
PORT=3001 npm run dev

# Start with Turbo (faster builds)
npm run dev:turbo
```

**Access**: http://localhost:3000

### Build and Preview

```bash
# Build for production
npm run build

# Start production build locally
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

## Rust Client Development

### Setup Rust Environment

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install development tools
cargo install cargo-watch
cargo install cargo-audit
```

### Build and Run Client

```bash
cd clients/openframe-client

# Build in debug mode
cargo build

# Run the client
cargo run

# Run with automatic rebuilding
cargo watch -x run

# Run tests
cargo test

# Check code quality
cargo check
cargo clippy -- -D warnings
cargo fmt --check
```

### Client Configuration

Create development configuration file:

```bash
mkdir -p ~/.config/openframe
cat > ~/.config/openframe/config.toml << EOF
[client]
server_url = "http://localhost:8080"
tenant_id = "development"
log_level = "debug"
registration_secret = "dev-secret"

[agent]
heartbeat_interval = 30
max_retries = 3
timeout = 5000
EOF
```

## Hot Reloading and Watch Mode

### Java Services (Spring Boot DevTools)

Spring Boot DevTools is already configured in the development profile:

```bash
# Enable automatic restart on classpath changes
mvn spring-boot:run -Dspring-boot.run.profiles=development

# Trigger restart manually
touch src/main/java/trigger-restart
```

### Frontend (Next.js Fast Refresh)

Next.js Fast Refresh is enabled by default:

```bash
# Start with fast refresh
npm run dev

# Changes to React components will hot reload automatically
# Changes to pages will cause a hard refresh
# Changes to configuration files require manual restart
```

### Rust (Cargo Watch)

```bash
# Watch for changes and rebuild/restart
cargo watch -x run

# Watch and run tests
cargo watch -x test

# Custom watch commands
cargo watch -x check -x test -x run
```

## Debugging Setup

### Java Services Debugging

#### Remote Debugging

```bash
# Start service with remote debugging enabled
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"

# Connect IntelliJ IDEA
# Run → Edit Configurations → Add New → Remote JVM Debug
# Host: localhost, Port: 5005
```

#### In-IDE Debugging

1. **IntelliJ IDEA**: Create Spring Boot run configuration
2. **VS Code**: Use Java Extension Pack with launch.json configuration

```json
{
  "type": "java",
  "name": "Debug OpenFrame API",
  "request": "launch",
  "mainClass": "com.openframe.api.ApiApplication",
  "projectName": "openframe-api",
  "args": "--spring.profiles.active=development",
  "vmArgs": "-Xmx2g"
}
```

### Frontend Debugging

#### Browser DevTools
- React DevTools browser extension
- Redux DevTools for state management
- Apollo DevTools for GraphQL queries

#### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Rust Debugging

```bash
# Build with debug symbols
cargo build

# Debug with GDB
gdb target/debug/openframe-client

# Debug with LLDB (macOS)
lldb target/debug/openframe-client

# Debug in VS Code with CodeLLDB extension
```

## Testing During Development

### Backend Testing

```bash
# Run all tests
mvn test

# Run tests for specific module
mvn test -pl openframe/services/openframe-api

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run tests with coverage
mvn test jacoco:report

# Integration tests
mvn verify -Pit
```

### Frontend Testing

```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests (if configured)
npm run test:e2e
```

### Rust Testing

```bash
cd clients/openframe-client

# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_agent_registration

# Run tests with coverage (requires cargo-tarpaulin)
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

## Development Database Management

### MongoDB Development Data

```bash
# Create development test data
mongo openframe_dev --eval "
  db.organizations.insertOne({
    name: 'Development Corp',
    description: 'Test organization for development',
    contactEmail: 'dev@example.com'
  })
"

# Reset development database
mongo openframe_dev --eval "db.dropDatabase()"

# Import sample data
mongoimport --db openframe_dev --collection organizations --file sample-data/organizations.json
```

### Redis Development Cache

```bash
# Clear Redis cache
redis-cli flushdb

# Monitor Redis commands
redis-cli monitor

# View Redis keys
redis-cli keys "*"
```

### Kafka Development Topics

```bash
# List topics
docker exec -it kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# Create development topic
docker exec -it kafka kafka-topics.sh \
  --create --topic device-events-dev \
  --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 1

# Consume messages
docker exec -it kafka kafka-console-consumer.sh \
  --topic device-events-dev \
  --bootstrap-server localhost:9092 \
  --from-beginning
```

## Configuration Management

### Development Profiles

OpenFrame uses Spring profiles for environment-specific configuration:

```yaml
# application-development.yml
spring:
  datasource:
    url: jdbc:mongodb://localhost:27017/openframe_dev
  redis:
    host: localhost
    port: 6379
    database: 0
  kafka:
    bootstrap-servers: localhost:9092
    
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: INFO

management:
  endpoints:
    web:
      exposure:
        include: "*"
```

### Environment Variables

Create `.env.local` for local overrides:

```bash
# Database URLs
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/1

# API Keys for development
OPENFRAME_API_KEY=dev-api-key-1234567890
JWT_SECRET=dev-jwt-secret-change-in-production

# Feature flags
ENABLE_DEBUG_MODE=true
ENABLE_METRICS=true
ENABLE_TRACING=false

# Frontend configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_ENVIRONMENT=development
```

## Performance Optimization for Development

### Java JVM Tuning

```bash
# Set JVM options for development
export MAVEN_OPTS="-Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
export JAVA_OPTS="-server -Xmx2g -Xms1g -XX:+UseG1GC"

# Enable JVM debugging and profiling
export JAVA_OPTS="$JAVA_OPTS -Dcom.sun.management.jmxremote.port=9999"
export JAVA_OPTS="$JAVA_OPTS -Dcom.sun.management.jmxremote.authenticate=false"
export JAVA_OPTS="$JAVA_OPTS -Dcom.sun.management.jmxremote.ssl=false"
```

### Node.js Performance

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max_old_space_size=4096"

# Enable experimental features
export NODE_OPTIONS="$NODE_OPTIONS --experimental-modules"

# Development-specific optimizations
npm run dev -- --experimental-https
```

### Docker Performance

```bash
# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Optimize Docker Compose for development
docker compose --profile development up -d
```

## Troubleshooting Common Issues

### Port Conflicts

```bash
# Check which process is using a port
lsof -ti:8080
ss -tulpn | grep :8080

# Kill process using port
kill -9 $(lsof -ti:8080)

# Use alternative ports
mvn spring-boot:run -Dserver.port=8081
PORT=3001 npm run dev
```

### Memory Issues

```bash
# Check Java memory usage
jps -v | grep openframe

# Monitor memory usage
top -p $(pgrep -f openframe)

# Increase Maven memory
export MAVEN_OPTS="-Xmx4g"
```

### Database Connection Issues

```bash
# Check MongoDB connection
mongo --eval "db.stats()"

# Check Redis connection
redis-cli ping

# Reset database containers
docker compose down
docker compose up -d mongodb redis
```

### Dependency Issues

```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Re-download dependencies
mvn dependency:purge-local-repository
mvn clean install

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Development Scripts

### Useful Development Commands

Create `scripts/dev-helpers.sh`:

```bash
#!/bin/bash

# Start all services
start-all() {
    docker compose up -d
    ./scripts/start-backend.sh &
    cd openframe/services/openframe-frontend && npm run dev
}

# Stop all services
stop-all() {
    pkill -f "spring-boot:run"
    docker compose down
}

# Reset development environment
reset-dev() {
    stop-all
    docker compose down -v
    mvn clean
    cd openframe/services/openframe-frontend && rm -rf .next node_modules
    start-all
}

# Run tests
test-all() {
    mvn test
    cd openframe/services/openframe-frontend && npm test
    cd clients/openframe-client && cargo test
}
```

### Git Hooks for Development

Create `.githooks/pre-commit`:

```bash
#!/bin/bash
# Run linting and basic tests before commit

echo "Running pre-commit checks..."

# Java formatting and tests
mvn checkstyle:check
if [ $? -ne 0 ]; then
    echo "Java checkstyle failed"
    exit 1
fi

# Frontend linting
cd openframe/services/openframe-frontend
npm run lint
if [ $? -ne 0 ]; then
    echo "Frontend linting failed"
    exit 1
fi

# Rust formatting
cd clients/openframe-client
cargo fmt --check
if [ $? -ne 0 ]; then
    echo "Rust formatting check failed"
    exit 1
fi

echo "Pre-commit checks passed"
```

## Next Steps

With your local development environment running:

1. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
2. **[Testing Overview](../testing/overview.md)** - Learn testing practices
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Submit your first contribution

For development questions and support, join the **#development** channel in the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).