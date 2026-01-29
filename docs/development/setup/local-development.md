# Local Development Guide

This guide walks you through running OpenFrame locally for development, including hot reload setup, debugging configuration, and development workflows.

## Quick Development Start

For developers who have completed the [Environment Setup](./environment.md), here's the fastest way to get OpenFrame running locally:

```bash
# 1. Clone and navigate to project
git clone https://github.com/your-org/openframe.git
cd openframe

# 2. Start infrastructure services  
./scripts/run-mac.sh --silent          # macOS
./scripts/run-linux.sh --silent        # Linux
./scripts/run-windows.ps1 -Silent      # Windows

# 3. Build all services (one time)
mvn clean install -DskipTests

# 4. Start development services (in separate terminals)
# Terminal 1: Config Service (start first)
cd openframe/services/openframe-config && mvn spring-boot:run

# Terminal 2: API Service  
cd openframe/services/openframe-api && mvn spring-boot:run

# Terminal 3: Gateway Service
cd openframe/services/openframe-gateway && mvn spring-boot:run

# Terminal 4: Frontend (hot reload enabled)
cd openframe/services/openframe-frontend && npm run dev
```

**Development URLs:**
- Frontend: http://localhost:3000 (auto-reload)
- API Gateway: http://localhost:8080
- GraphQL Playground: http://localhost:8080/graphql

## Infrastructure Services Setup

### Start Required Services with Docker

OpenFrame requires several backing services. Use our development Docker Compose setup:

```bash
# Start all infrastructure services
cd integrated-tools
docker compose -f development-stack.yml up -d

# Verify services are running
docker compose ps
```

The development stack includes:

| Service | Port | Purpose | Health Check |
|---------|------|---------|-------------|
| **MongoDB** | 27017 | Primary database | `mongosh --eval "db.runCommand('ping')"` |
| **Redis** | 6379 | Cache and sessions | `redis-cli ping` |
| **Kafka** | 9092 | Event streaming | `kafka-topics.sh --bootstrap-server localhost:9092 --list` |
| **Zookeeper** | 2181 | Kafka coordination | `echo ruok | nc localhost 2181` |
| **Cassandra** | 9042 | Time-series data | `cqlsh -e "DESCRIBE KEYSPACES;"` |
| **Pinot** | 8000 | Analytics database | `curl http://localhost:8000/health` |

### Alternative: Individual Service Startup

If you prefer to start services individually:

```bash
# MongoDB
docker run -d --name openframe-mongo -p 27017:27017 -e MONGO_INITDB_DATABASE=openframe mongo:7

# Redis  
docker run -d --name openframe-redis -p 6379:6379 redis:7-alpine

# Kafka (with Zookeeper)
docker run -d --name openframe-zookeeper -p 2181:2181 -e ZOOKEEPER_CLIENT_PORT=2181 confluentinc/cp-zookeeper:7.4.0

docker run -d --name openframe-kafka \
  -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=localhost:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  confluentinc/cp-kafka:7.4.0
```

## Building the Platform

### Initial Build

Build all OpenFrame services and libraries:

```bash
# Full build with tests
mvn clean install

# Fast build (skip tests for development)
mvn clean install -DskipTests

# Build specific service
cd openframe/services/openframe-api
mvn clean install -DskipTests
```

### Build Verification

Verify successful builds:

```bash
# Check JAR files were created
find . -name "*.jar" -path "*/target/*" | grep -E "(api|gateway|management|stream|config|client)"

# Expected output:
# ./openframe/services/openframe-api/target/openframe-api-0.1.0.jar
# ./openframe/services/openframe-gateway/target/openframe-gateway-0.1.0.jar
# ... (other services)
```

## Running Services Locally

### Service Startup Order

Start services in this order for proper dependency resolution:

#### 1. Configuration Service (First)
```bash
cd openframe/services/openframe-config
mvn spring-boot:run

# Wait for startup message:
# "Started ConfigServerApplication in X.XX seconds"
```

#### 2. Core Services (Parallel)
```bash
# Terminal 2: API Service
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring.profiles.active=development

# Terminal 3: Management Service  
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring.profiles.active=development

# Terminal 4: Stream Service
cd openframe/services/openframe-stream  
mvn spring-boot:run -Dspring.profiles.active=development
```

#### 3. Gateway Service (After Core Services)
```bash
# Terminal 5: Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring.profiles.active=development

# Wait for all upstream services to be discovered
# Look for "DiscoveryClient_OPENFRAME-API/api-service:openframe-api:8081 - registration status: 204"
```

#### 4. Client Service (Optional)
```bash
# Terminal 6: Client Service
cd openframe/services/openframe-client
mvn spring-boot:run -Dspring.profiles.active=development
```

### Service Health Verification

Check that all services are healthy:

```bash
# Configuration Service
curl http://localhost:8888/actuator/health

# API Service  
curl http://localhost:8081/actuator/health

# Gateway Service
curl http://localhost:8080/actuator/health

# Management Service
curl http://localhost:8082/actuator/health

# Stream Service
curl http://localhost:8083/actuator/health
```

Expected response for each:
```json
{"status":"UP","components":{"mongodb":{"status":"UP"},"redis":{"status":"UP"}}}
```

## Frontend Development Setup

### Hot Reload Configuration

The OpenFrame frontend supports hot reload for rapid development:

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Alternative: Start with specific configuration
npm run dev -- --host 0.0.0.0 --port 3000
```

### Frontend Development Features

#### Vue DevTools
```bash
# Automatically enabled in development mode
# Install Vue DevTools browser extension:
# Chrome: https://chrome.google.com/webstore/detail/vuejs-devtools/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/
```

#### TypeScript Type Checking
```bash
# Run type checking
npm run type-check

# Watch mode for continuous type checking
npm run type-check -- --watch
```

#### Linting and Formatting
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format code with Prettier
npm run format
```

### Frontend Environment Configuration

Create `openframe/services/openframe-frontend/.env.development.local`:

```bash
# API Configuration
VITE_API_URL=http://localhost:8080
VITE_GRAPHQL_URL=http://localhost:8080/graphql
VITE_WS_URL=ws://localhost:8080/ws

# Development Features
VITE_ENABLE_DEVTOOLS=true
VITE_SHOW_DEBUG_INFO=true
VITE_MOCK_API=false

# Authentication
VITE_AUTH_COOKIE_DOMAIN=localhost
VITE_AUTH_COOKIE_SECURE=false

# External Integrations (for development)
VITE_TACTICAL_RMM_URL=http://localhost:8005
VITE_MESHCENTRAL_URL=http://localhost:4430
```

## Debug Configuration

### Java Services Debugging

#### IDE Debug Configuration (IntelliJ IDEA)

Create debug configurations for each service:

```bash
# For each service, add VM options:
-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005

# Use different debug ports:
API Service: 5005
Gateway Service: 5006  
Management Service: 5007
Stream Service: 5008
Config Service: 5009
Client Service: 5010
```

#### Command Line Debug Startup
```bash
# Start API service with debugging
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Connect debugger from IDE:
# Run → Attach to Process → Remote JVM Debug → localhost:5005
```

#### Debug Logging Configuration
```bash
# Enable debug logging for specific packages
# Add to application-development.yml:
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: INFO
    root: INFO
```

### Frontend Debugging

#### Browser DevTools Integration
```javascript
// Debug information automatically enabled in development
// Access via browser console:
window.__OPENFRAME_DEBUG__ // Debug information
window.__VUE_DEVTOOLS_GLOBAL_HOOK__ // Vue DevTools
```

#### VS Code Debug Configuration
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch", 
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
      "sourceMapPathOverrides": {
        "*": "${webRoot}/*"
      }
    },
    {
      "name": "Debug Frontend Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vitest",
      "args": ["--run"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "console": "integratedTerminal"
    }
  ]
}
```

## Development Workflow

### Code Changes and Hot Reload

#### Backend Services
Java services support hot reload with Spring Boot DevTools:

```bash
# Enable DevTools (already configured in development profile)
# Changes to source code trigger automatic restart

# For faster reload, use JRebel (commercial) or DCEVM (free)
# Manual restart if needed:
# Stop service (Ctrl+C) and restart with mvn spring-boot:run
```

#### Frontend Hot Reload
```bash
# Automatic reload on file changes
# Supports:
# - Vue component changes
# - TypeScript changes  
# - CSS/SCSS changes
# - Configuration changes

# Manual reload if needed:
# Browser will automatically refresh or show overlay
```

### Testing During Development

#### Run Tests Continuously
```bash
# Backend: Run tests in watch mode (IntelliJ IDEA)
# Right-click test class → Debug → Select "Repeat until failure"

# Frontend: Run tests in watch mode
cd openframe/services/openframe-frontend
npm run test -- --watch

# E2E tests
npm run test:e2e -- --headed --watch
```

#### API Testing with GraphQL Playground
```bash
# Access GraphQL Playground: http://localhost:8080/graphql

# Example query:
query GetDevices {
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

# Example mutation:
mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    id
    name
    createdAt
  }
}
```

### Database Management in Development

#### MongoDB Operations
```bash
# Connect to development database
mongosh mongodb://localhost:27017/openframe

# Useful development queries:
use openframe
db.organizations.find().limit(5)
db.machines.find({status: "ONLINE"})
db.events.find().sort({timestamp: -1}).limit(10)

# Reset development data (if needed)
db.dropDatabase()
```

#### Redis Operations
```bash
# Connect and inspect cache
redis-cli -h localhost -p 6379

# View cached sessions
KEYS session:*

# Clear development cache
FLUSHDB

# Monitor Redis operations
MONITOR
```

### Log Monitoring

#### Centralized Log Viewing
```bash
# Use multitail to monitor all services (Linux/macOS)
brew install multitail  # macOS
sudo apt install multitail  # Ubuntu

# Monitor all service logs
multitail -i \
  logs/api.log \
  logs/gateway.log \
  logs/management.log \
  logs/stream.log
```

#### Service-Specific Logs
```bash
# API Service logs
tail -f logs/openframe-api.log

# Gateway Service logs  
tail -f logs/openframe-gateway.log

# Frontend logs (in browser console)
# Open DevTools → Console → Filter by "OpenFrame"
```

## Performance Optimization for Development

### JVM Configuration for Development

Add to each service's `application-development.yml`:

```yaml
# Optimize for development speed
spring:
  devtools:
    restart:
      enabled: true
      additional-paths: src/main/java
    livereload:
      enabled: true

# JVM optimization for development
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,env,configprops

logging:
  level:
    org.springframework.boot.devtools: INFO
```

### Maven Development Profile

Use the development profile for faster builds:

```xml
<profiles>
  <profile>
    <id>development</id>
    <properties>
      <maven.test.skip>true</maven.test.skip>
      <maven.javadoc.skip>true</maven.javadoc.skip>
      <checkstyle.skip>true</checkstyle.skip>
    </properties>
  </profile>
</profiles>
```

Activate with:
```bash
mvn spring-boot:run -Pdevelopment
```

## Troubleshooting Development Issues

### Common Service Startup Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :8080
kill -9 <PID>

# Or change service port
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8090"
```

#### Database Connection Issues
```bash
# Verify MongoDB is accessible
mongosh --eval "db.runCommand('ping')"

# Check Docker containers
docker ps | grep mongo
docker logs openframe-mongo

# Restart database container
docker restart openframe-mongo
```

#### Service Discovery Issues
```bash
# Check Eureka registry (if using service discovery)
curl http://localhost:8888/actuator/env

# Verify network connectivity between services
curl http://localhost:8081/actuator/health
```

### Frontend Issues

#### Module Resolution Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### TypeScript Errors
```bash
# Run type checking
npm run type-check

# Generate types from GraphQL schema
npm run graphql:codegen

# Restart TypeScript service in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Memory and Performance Issues

#### Java Heap Issues
```bash
# Increase heap size for development
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx2048m -Xms1024m"

# Monitor memory usage
jconsole  # GUI tool
jstat -gc <pid>  # Command line
```

#### Database Performance
```bash
# Enable MongoDB query profiling
mongosh --eval "db.setProfilingLevel(1, {slowms: 100})"

# Monitor slow queries
mongosh --eval "db.system.profile.find().sort({ts: -1}).limit(5)"
```

## Next Steps

With your local development environment running:

1. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
2. **[Testing Overview](../testing/overview.md)** - Learn testing strategies  
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Contribute to the project

Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for development support and to connect with other contributors!