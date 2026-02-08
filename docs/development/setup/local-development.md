# Local Development Guide

This guide shows you how to run OpenFrame locally for development, including hot reload, debugging, and testing workflows.

## Prerequisites

Before starting, ensure you have completed the [Environment Setup](environment.md) guide and have:

- ✅ Java 21+ and Maven installed
- ✅ Node.js 18+ and npm installed  
- ✅ Docker and Docker Compose running
- ✅ Development services started
- ✅ IDE configured (IntelliJ IDEA or VS Code)

## Quick Start

For the impatient developer, here's the fastest path to a running development environment:

```bash
# 1. Clone and enter project
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure
docker compose -f integrated-tools/docker-compose.yml up -d

# 3. Run development script
./scripts/dev-setup.sh && ./scripts/dev-run.sh

# 4. Access OpenFrame
open http://localhost:8080
```

## Step-by-Step Development Setup

### Step 1: Start Infrastructure Services

First, start the required databases and integrated tools:

```bash
# Start all infrastructure services
docker compose -f integrated-tools/docker-compose.yml up -d

# Verify services are healthy
docker compose -f integrated-tools/docker-compose.yml ps

# Check logs if any service fails
docker compose -f integrated-tools/docker-compose.yml logs [service-name]
```

**Expected running services:**
```text
mongodb              Up (healthy)     
redis                Up (healthy)
kafka                Up (healthy)  
cassandra            Up (healthy)
tactical-rmm         Up (healthy)
meshcentral          Up (healthy)
fleet-mdm            Up (healthy)
authentik            Up (healthy)
```

### Step 2: Configure Development Environment

Create your local development configuration:

```bash
# Copy development environment template
cp .env.template .env.development

# Edit with your preferred editor
vi .env.development  # or code .env.development
```

**Key development settings:**
```bash
# Enable development mode
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=DEBUG

# Database connections (matching Docker services)
MONGODB_URI=mongodb://localhost:27017/openframe_dev
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
REDIS_URL=redis://localhost:6379

# Development-friendly security (NOT for production)
JWT_SECRET=development-secret-key-not-for-production
DISABLE_CSRF=true
ENABLE_CORS=true

# Enable development tools
ENABLE_H2_CONSOLE=true
ENABLE_SWAGGER_UI=true  
ENABLE_GRAPHQL_PLAYGROUND=true
MOCK_EXTERNAL_APIS=false
```

### Step 3: Build the Backend Services

Build all Java services for development:

```bash
# Clean and compile all services
mvn clean compile -DskipTests

# Or build with tests (takes longer)
mvn clean install

# Verify build success
echo $?  # Should output 0
```

**Build troubleshooting:**
```bash
# If build fails, try cleaning Maven cache
rm -rf ~/.m2/repository/com/openframe
mvn clean install -U

# Check Java version
java -version  # Should be 21+
```

### Step 4: Install Frontend Dependencies

Set up the Vue.js frontend for development:

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Verify installation
npm list --depth=0

# Return to project root
cd ../../..
```

**Frontend troubleshooting:**
```bash
# If npm install fails, try cleaning
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check Node.js version
node --version  # Should be 18+
```

---

## Development Workflows

### Workflow 1: Full Development Mode (Recommended)

This starts all services with hot reload and debugging enabled:

```bash
# Start all services in development mode
./scripts/dev-start.sh

# Services will start in this order:
# 1. Config Server (port 8888)
# 2. Gateway Service (port 8080)  
# 3. Authorization Server (port 8082)
# 4. API Service (port 8081)
# 5. Client Service (port 8084)
# 6. Stream Service (port 8085)
# 7. Management Service (port 8086)
# 8. Frontend Dev Server (port 3000)
```

**Access points:**
- **Main Application**: http://localhost:8080 (via Gateway)
- **Frontend Dev Server**: http://localhost:3000 (direct access with hot reload)
- **GraphQL Playground**: http://localhost:8081/graphiql
- **Swagger UI**: http://localhost:8083/swagger-ui.html

### Workflow 2: Service-by-Service Development

For focused development on specific services:

#### Backend Service Development

```bash
# Start only essential services
./scripts/dev-start-minimal.sh

# Then start your target service with debugging
cd openframe/services/openframe-api

# Run with Maven (enables hot reload with Spring DevTools)
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"

# Or run from IDE with debug configuration
```

#### Frontend-Only Development

```bash
# Start backend services only (no frontend)
./scripts/dev-start-backend.sh

# In another terminal, start frontend dev server
cd openframe/services/openframe-frontend
npm run dev

# Frontend now available at http://localhost:3000
# With hot module replacement (HMR) enabled
```

#### Client Agent Development (Rust)

```bash
# Start OpenFrame backend
./scripts/dev-start-backend.sh

# In another terminal, work on Rust client
cd clients/openframe-client

# Development build with debug info
cargo build

# Run with debug logging
RUST_LOG=debug cargo run

# Live reload on file changes (requires cargo-watch)
cargo install cargo-watch
cargo watch -x run
```

### Workflow 3: Testing-Focused Development

For test-driven development:

```bash
# Run all tests
./scripts/dev-test.sh

# Run tests with coverage
mvn clean test jacoco:report

# Frontend tests
cd openframe/services/openframe-frontend
npm run test
npm run test:coverage

# Rust tests
cd clients/openframe-client  
cargo test
```

---

## Hot Reload and Development Tools

### Java Hot Reload with Spring DevTools

Spring DevTools is configured for automatic restart on code changes:

**Trigger conditions:**
- Java source file changes
- Configuration file changes
- Classpath changes

**Manual trigger:**
```bash
# In your IDE, Build → Build Project (Ctrl+F9 in IntelliJ)
# Or touch a source file:
touch src/main/java/com/openframe/api/ApiApplication.java
```

### Frontend Hot Module Replacement (HMR)

Vue.js development server provides instant updates:

**What gets hot reloaded:**
- Vue component changes
- TypeScript/JavaScript changes
- CSS/SCSS changes
- GraphQL queries

**Configuration in `vite.config.ts`:**
```typescript
export default defineConfig({
  server: {
    hmr: {
      port: 3001  // HMR WebSocket port
    },
    proxy: {
      '/api': 'http://localhost:8080',  // Proxy API calls to Gateway
      '/graphql': 'http://localhost:8081'  // Proxy GraphQL to API Service
    }
  }
})
```

### Database Hot Reload

Development databases support live schema updates:

**MongoDB:**
```bash
# Connect to development database
mongosh mongodb://localhost:27017/openframe_dev

# Make schema changes (MongoDB is schemaless)
db.devices.updateMany({}, {$set: {newField: "defaultValue"}})
```

**Cassandra:**
```bash
# Connect to Cassandra
docker exec -it cassandra cqlsh

# Use development keyspace
USE openframe_dev;

# Add columns to existing tables
ALTER TABLE log_events ADD new_column text;
```

---

## Debugging Setup

### Backend Debugging (Java)

#### IntelliJ IDEA Debugging

1. **Create Debug Configuration:**
   ```text
   Run → Edit Configurations → Add → Remote JVM Debug
   Name: OpenFrame API Debug
   Host: localhost
   Port: 5005
   Command line args: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
   ```

2. **Start Service with Debug:**
   ```bash
   # Start with debug port enabled
   mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
   ```

3. **Attach Debugger:**
   - Click debug button in IntelliJ
   - Set breakpoints in your code
   - Debug as normal

#### VS Code Debugging

1. **Configure `.vscode/launch.json`:**
   ```json
   {
     "type": "java",
     "name": "Attach to OpenFrame API",
     "request": "attach",
     "hostName": "localhost",
     "port": 5005
   }
   ```

2. **Start debugging from Run and Debug panel**

### Frontend Debugging (Vue.js)

#### Browser DevTools

Vue.js development builds include debugging support:

```bash
# Start frontend with source maps
cd openframe/services/openframe-frontend
npm run dev

# Open browser DevTools
# Vue DevTools extension provides additional insights
```

#### VS Code Frontend Debugging

1. **Install Debugger for Chrome extension**

2. **Configure `.vscode/launch.json`:**
   ```json
   {
     "type": "pwa-chrome",
     "name": "Debug OpenFrame Frontend", 
     "request": "launch",
     "url": "http://localhost:3000",
     "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
     "sourceMaps": true
   }
   ```

### Database Debugging

#### MongoDB Queries

```bash
# Enable MongoDB profiling for slow queries
mongosh mongodb://localhost:27017/openframe_dev
db.setProfilingLevel(2, {slowms: 100})

# View slow queries
db.system.profile.find().pretty()
```

#### GraphQL Query Debugging

Access GraphQL Playground at http://localhost:8081/graphiql:

```graphql
# Example debugging query
query DebugDevices {
  devices(first: 10) {
    edges {
      node {
        id
        name
        status
        lastSeen
        organization {
          name
        }
      }
    }
  }
}
```

---

## Testing During Development

### Unit Testing

Run tests for specific components:

```bash
# Test specific Java service
cd openframe/services/openframe-api
mvn test

# Test specific Java class
mvn test -Dtest=DeviceServiceTest

# Test specific method
mvn test -Dtest=DeviceServiceTest#testCreateDevice

# Frontend unit tests
cd openframe/services/openframe-frontend
npm run test

# Test specific component
npm run test -- --grep "DeviceList"
```

### Integration Testing

Test service interactions:

```bash
# Run integration tests (requires running services)
mvn test -Dspring.profiles.active=integration

# API integration tests
cd openframe-e2e-tests
mvn test -Dtest=DevicesApiTest
```

### End-to-End Testing

```bash
# Start all services in test mode
./scripts/test-start.sh

# Run E2E tests
cd openframe-e2e-tests
mvn test

# Run specific E2E scenario
mvn test -Dtest=UserRegistrationTest
```

---

## Performance Monitoring During Development

### Application Metrics

OpenFrame includes Micrometer metrics for development monitoring:

**Access metrics endpoints:**
- **API Service**: http://localhost:8081/actuator/metrics
- **Gateway**: http://localhost:8080/actuator/metrics
- **Custom metrics**: http://localhost:8081/actuator/metrics/openframe.*

### JVM Monitoring

Monitor JVM performance during development:

```bash
# Enable JFR (Java Flight Recorder)
export MAVEN_OPTS="-XX:+FlightRecorder -XX:StartFlightRecording=duration=60s,filename=openframe.jfr"
mvn spring-boot:run

# Analyze recording
jfr print openframe.jfr | head -50
```

### Database Performance

Monitor database queries:

```bash
# MongoDB slow query log
mongosh mongodb://localhost:27017/openframe_dev
db.setProfilingLevel(1, {slowms: 50})

# Redis monitoring
redis-cli monitor

# Kafka consumer lag
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --all-groups
```

---

## Development Scripts Reference

OpenFrame includes several scripts to streamline development:

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/dev-setup.sh` | Initial development setup | `./scripts/dev-setup.sh` |
| `scripts/dev-start.sh` | Start all services | `./scripts/dev-start.sh` |
| `scripts/dev-stop.sh` | Stop all services | `./scripts/dev-stop.sh` |
| `scripts/dev-restart.sh` | Restart all services | `./scripts/dev-restart.sh [service]` |
| `scripts/dev-test.sh` | Run all tests | `./scripts/dev-test.sh` |
| `scripts/dev-clean.sh` | Clean build artifacts | `./scripts/dev-clean.sh` |

### Utility Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/dev-logs.sh` | Show service logs | `./scripts/dev-logs.sh [service]` |
| `scripts/dev-db-reset.sh` | Reset development databases | `./scripts/dev-db-reset.sh` |
| `scripts/dev-check.sh` | Health check all services | `./scripts/dev-check.sh` |

### Example Usage

```bash
# Start development environment
./scripts/dev-setup.sh
./scripts/dev-start.sh

# Watch API service logs
./scripts/dev-logs.sh openframe-api

# Restart just the frontend
./scripts/dev-restart.sh openframe-frontend

# Reset databases (caution: deletes all data)
./scripts/dev-db-reset.sh

# Check if all services are healthy
./scripts/dev-check.sh
```

---

## Common Development Issues

### Port Conflicts

**Problem**: Service won't start due to port conflict

**Solution:**
```bash
# Find what's using the port
lsof -i :8080

# Kill the process
kill -9 <PID>

# Or configure OpenFrame to use different ports
export SERVER_PORT=8090
mvn spring-boot:run -Dserver.port=8090
```

### Out of Memory Errors

**Problem**: Java heap space exceptions during development

**Solution:**
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4g -XX:MaxMetaspaceSize=512m"

# Or set in IDE run configuration
# VM Options: -Xmx4g -XX:MaxMetaspaceSize=512m
```

### Database Connection Issues

**Problem**: Cannot connect to MongoDB/Redis

**Solution:**
```bash
# Check if services are running
docker compose -f integrated-tools/docker-compose.yml ps

# Restart problematic service
docker compose -f integrated-tools/docker-compose.yml restart mongodb

# Check service logs
docker compose -f integrated-tools/docker-compose.yml logs mongodb
```

### Hot Reload Not Working

**Problem**: Changes not reflected in running application

**Java/Spring Boot:**
```bash
# Ensure Spring DevTools is included
grep -r spring-boot-devtools pom.xml

# Trigger manual restart
# In IDE: Build → Build Project (Ctrl+F9)
```

**Vue.js Frontend:**
```bash
# Check HMR configuration
grep -A 5 "hmr" vite.config.ts

# Restart dev server
npm run dev
```

### Test Failures

**Problem**: Tests failing in development environment

**Solution:**
```bash
# Clean test database
./scripts/dev-db-reset.sh

# Run tests in isolation
mvn clean test -Dspring.profiles.active=test

# Check for port conflicts during testing
./scripts/dev-check.sh
```

---

## Next Steps

Now that you have a running development environment:

1. **[Architecture Overview](../architecture/overview.md)**: Understand how OpenFrame components interact
2. **[Testing Guide](../testing/overview.md)**: Learn the testing strategy and best practices
3. **[Contributing Guidelines](../contributing/guidelines.md)**: Follow the development workflow and coding standards

## Development Best Practices

- **Use feature branches** for all development work
- **Write tests first** when possible (TDD)
- **Keep services loosely coupled** - avoid direct service-to-service calls
- **Monitor application metrics** during development
- **Use the debugger** instead of print statements
- **Reset databases** regularly to avoid data inconsistencies

## Getting Help

- **OpenMSP Slack**: Join #development channel for real-time help
- **GitHub Issues**: Report bugs or request features
- **Code Reviews**: Ask for help with implementation questions

Happy developing! 🚀