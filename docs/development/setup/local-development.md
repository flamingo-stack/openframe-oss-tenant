# Local Development Guide

This guide covers running OpenFrame locally for development, including hot reload, debugging, and efficient development workflows.

> **Prerequisites**: Complete the [Environment Setup](environment.md) before starting local development.

## Quick Start for Development

### Clone and Initial Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Create development environment file
cp .env.example .env.development

# Start infrastructure services
docker compose up -d
```

### Build and Run Backend Services

```bash
# Full build (first time or after major changes)
mvn clean install

# Quick build (skip tests for faster iteration)
mvn clean install -DskipTests

# Start all backend services
./scripts/run-linux.sh --dev
```

The `--dev` flag enables:
- Hot reload for Java services
- Debug ports exposed
- Detailed logging
- Development-friendly configuration

### Start Frontend with Hot Reload

```bash
# In a new terminal
cd openframe/services/openframe-frontend

# Install dependencies (first time)
npm install

# Start development server with hot reload
npm run dev
```

Access the frontend at: http://localhost:3000

### Build and Run Rust Client

```bash
# In a new terminal
cd clients/openframe-client

# Build in development mode (faster compilation)
cargo build

# Run with debug logging
RUST_LOG=debug cargo run -- \
  --server http://localhost:8080 \
  --registration-secret "your-secret"
```

## Development Workflow

### Hot Reload Configuration

#### Java Services (Spring Boot DevTools)

**Automatic Restart Triggers:**
- Java source files (`.java`)
- Resources (`application.yml`, etc.)
- Dependencies (`pom.xml` changes)

**Manual Restart:**
```bash
# Trigger restart without rebuilding
touch openframe/services/openframe-api/src/main/resources/application.yml
```

**IDE Integration:**
- **IntelliJ IDEA**: Build → Build Project (`Ctrl+F9`)
- **VS Code**: Save files and DevTools will auto-restart

#### Frontend (Vite Hot Reload)

**Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 3001,
      overlay: true
    }
  },
  build: {
    sourcemap: true // Enable source maps for debugging
  }
})
```

**Hot Reload Features:**
- **Vue Component Updates**: Preserves component state
- **CSS Updates**: Instant style changes
- **TypeScript Changes**: Type-safe hot reload
- **GraphQL Schema Updates**: Auto-regenerates types

#### Rust Client (cargo-watch)

```bash
# Install cargo-watch for auto-rebuild
cargo install cargo-watch

# Auto-rebuild and run on file changes
cargo watch -x 'run -- --server http://localhost:8080'

# Auto-rebuild and run tests
cargo watch -x test
```

## Debugging

### Java Services Debugging

#### Remote Debugging Setup

**Start service with debugging:**
```bash
# Enable debug port 5005
mvn spring-boot:run -pl openframe/services/openframe-api \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

**IntelliJ IDEA Setup:**
1. Run → Edit Configurations
2. Add → Remote JVM Debug
3. Configuration:
   - **Host**: localhost
   - **Port**: 5005
   - **Use module classpath**: openframe-api

**VS Code Setup:**
```json
// .vscode/launch.json
{
  "type": "java",
  "name": "Debug OpenFrame API",
  "request": "attach",
  "hostName": "localhost",
  "port": 5005
}
```

#### Service-Specific Debug Ports

| Service | Debug Port | Start Command |
|---------|------------|---------------|
| **API Service** | 5005 | `mvn spring-boot:run -pl openframe/services/openframe-api -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"` |
| **Gateway** | 5006 | Same pattern with port 5006 |
| **Auth Server** | 5007 | Same pattern with port 5007 |
| **Management** | 5008 | Same pattern with port 5008 |

### Frontend Debugging

#### Browser DevTools

**Vue DevTools Setup:**
1. Install browser extension
2. Open DevTools
3. Vue tab shows:
   - Component hierarchy
   - Component state
   - Event timeline
   - Performance profiling

**Chrome DevTools Sources:**
- Set breakpoints in TypeScript files
- Source maps enabled by default
- Step through Vue component lifecycle

#### VS Code Debugging

**Configuration** (`.vscode/launch.json`):
```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Debug Frontend",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
  "sourceMapPathOverrides": {
    "webpack:///src/*": "${webRoot}/*"
  }
}
```

### Rust Client Debugging

#### Command Line Debugging

```bash
# Run with debug symbols and logging
RUST_LOG=debug RUST_BACKTRACE=full cargo run

# Use debugger (gdb on Linux, lldb on macOS)
rust-gdb target/debug/openframe-client
```

#### VS Code Debugging

**Configuration** (`.vscode/launch.json`):
```json
{
  "type": "lldb",
  "request": "launch",
  "name": "Debug Rust Client",
  "program": "${workspaceFolder}/clients/openframe-client/target/debug/openframe-client",
  "args": ["--server", "http://localhost:8080"],
  "cwd": "${workspaceFolder}/clients/openframe-client"
}
```

## Database Development

### MongoDB Development

**Connection for Development:**
```bash
# Connect via MongoDB shell
mongosh mongodb://localhost:27017/openframe

# Useful development queries
use openframe

# List all collections
show collections

# View recent devices
db.machines.find().sort({createdAt: -1}).limit(5)

# View users
db.users.find().pretty()

# Clear test data (development only!)
db.machines.deleteMany({hostname: /test-/})
```

**MongoDB Compass GUI:**
- Connection: `mongodb://localhost:27017`
- Database: `openframe`
- Useful for visual data exploration

### Redis Development

**Redis CLI:**
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Useful development commands
# List all keys
KEYS *

# View user sessions
KEYS user:session:*

# Get cached data
GET device:cache:device-id-123

# Clear development cache
FLUSHDB  # Use carefully!
```

### Apache Kafka Development

**Kafka Console Tools:**
```bash
# List topics
docker exec openframe-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Consume messages from a topic
docker exec openframe-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic device-events \
  --from-beginning

# Produce test message
docker exec -it openframe-kafka kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic device-events
```

## Testing During Development

### Backend Testing

#### Unit Tests

```bash
# Run all unit tests
mvn test

# Run tests for specific service
mvn test -pl openframe/services/openframe-api

# Run specific test class
mvn test -pl openframe/services/openframe-api -Dtest=DeviceServiceTest

# Run with debugging
mvn test -pl openframe/services/openframe-api -Dmaven.surefire.debug
```

#### Integration Tests

```bash
# Run integration tests (requires running services)
mvn verify -Dspring.profiles.active=test

# Run specific integration test
mvn test -pl openframe/services/openframe-api -Dtest=DeviceControllerIntegrationTest
```

### Frontend Testing

#### Unit Tests

```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

#### E2E Tests

```bash
# Install Playwright (first time)
npm run test:e2e:install

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed
```

### Rust Client Testing

```bash
cd clients/openframe-client

# Run unit tests
cargo test

# Run tests with logging
RUST_LOG=debug cargo test

# Run integration tests
cargo test --test integration_tests

# Run tests in watch mode
cargo watch -x test
```

## Development Scripts

### Custom Development Scripts

**Backend Helper Scripts:**
```bash
# scripts/dev-backend.sh
#!/bin/bash
set -e

echo "Starting OpenFrame backend services for development..."

# Start infrastructure
docker compose up -d

# Wait for services to be ready
echo "Waiting for infrastructure..."
sleep 10

# Build and start services
mvn clean install -DskipTests -q
./scripts/run-linux.sh --dev --silent

echo "Backend services started! 🚀"
```

**Frontend Helper Script:**
```bash
# scripts/dev-frontend.sh
#!/bin/bash
set -e

cd openframe/services/openframe-frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

# Start development server
echo "Starting frontend development server..."
npm run dev
```

**Full Development Setup:**
```bash
# scripts/dev-setup.sh
#!/bin/bash
set -e

echo "Setting up full OpenFrame development environment..."

# Backend
./scripts/dev-backend.sh &
BACKEND_PID=$!

# Wait for backend to start
sleep 30

# Frontend
./scripts/dev-frontend.sh &
FRONTEND_PID=$!

echo "Development environment ready!"
echo "Frontend: http://localhost:3000"
echo "API: http://localhost:8080"
echo "GraphQL: http://localhost:8080/graphql"

# Wait for user to stop
read -p "Press Enter to stop all services..."

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
docker compose stop
```

### Development Aliases

**Add to your shell profile:**
```bash
# OpenFrame development aliases
alias of-dev="./scripts/dev-setup.sh"
alias of-backend="./scripts/dev-backend.sh"
alias of-frontend="./scripts/dev-frontend.sh"
alias of-client="cd clients/openframe-client && RUST_LOG=debug cargo run"

# Quick commands
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-mongo="mongosh mongodb://localhost:27017/openframe"
alias of-redis="redis-cli -h localhost -p 6379"

# Service logs
alias of-logs="docker compose logs -f"
alias of-api-logs="docker compose logs -f openframe-api"
alias of-gateway-logs="docker compose logs -f openframe-gateway"
```

## Performance Optimization for Development

### Java Service Optimization

**JVM Arguments for Development:**
```bash
export MAVEN_OPTS="-Xmx2g -XX:ReservedCodeCacheSize=1g -XX:+UseG1GC"
```

**Spring Boot DevTools Configuration:**
```yaml
# application-dev.yml
spring:
  devtools:
    restart:
      enabled: true
      exclude: "static/**,templates/**"
      additional-exclude: "logs/**"
    livereload:
      enabled: true
  jpa:
    show-sql: false  # Disable in dev for performance
logging:
  level:
    root: INFO  # Reduce log noise
    com.openframe: DEBUG
```

### Frontend Optimization

**Vite Development Optimization:**
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      'vue',
      '@vue/runtime-core',
      'pinia',
      '@apollo/client/core'
    ]
  },
  server: {
    fs: {
      strict: false
    }
  }
})
```

**TypeScript Performance:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true
  }
}
```

### Docker Optimization

**Development Docker Compose Override:**
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  mongodb:
    command: mongod --nojournal --smallfiles
    
  kafka:
    environment:
      KAFKA_LOG_RETENTION_HOURS: 1
      
  redis:
    command: redis-server --save ""
```

## Troubleshooting Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -ti:8080
netstat -tulpn | grep 8080

# Kill process
kill -9 $(lsof -ti:8080)

# Or use different ports
export GATEWAY_PORT=8090
```

### Hot Reload Not Working

**Java Services:**
```bash
# Check DevTools is on classpath
mvn dependency:tree | grep devtools

# Restart with clean build
mvn clean compile
```

**Frontend:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

### Database Connection Issues

```bash
# Check Docker services
docker compose ps

# Restart infrastructure
docker compose restart mongodb kafka redis

# Check logs
docker compose logs mongodb
```

### Memory Issues

```bash
# Increase Java memory
export JAVA_OPTS="-Xmx4g"

# Increase Node.js memory  
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
docker stats
```

## Development Best Practices

### Code Organization

1. **Feature Branches**: Create branches for each feature/bugfix
2. **Small Commits**: Make atomic commits with clear messages
3. **Test First**: Write tests before implementing features
4. **Code Reviews**: All changes go through pull requests

### Development Cycle

1. **Pull Latest**: `git pull origin main`
2. **Create Branch**: `git checkout -b feature/new-feature`
3. **Start Services**: `./scripts/dev-setup.sh`
4. **Develop & Test**: Make changes with hot reload
5. **Run Tests**: `mvn test && npm test && cargo test`
6. **Commit & Push**: `git commit -am "Add new feature"`
7. **Create PR**: Submit for review

### Debugging Strategies

1. **Start Simple**: Use `System.out.println()` or `console.log()` first
2. **Use Debugger**: Set breakpoints for complex logic
3. **Check Logs**: Application logs show detailed execution
4. **Isolate Issues**: Test individual components
5. **Reproduce Consistently**: Create minimal test cases

## What's Next?

Now that you have local development running:

1. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
2. **[Testing Guide](../testing/overview.md)** - Learn the testing strategy
3. **[Contributing Guide](../contributing/guidelines.md)** - Start contributing to OpenFrame

Your local development environment is ready for productive OpenFrame development! 🛠️