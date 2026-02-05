# Local Development Guide

This guide covers running OpenFrame locally for development, including hot reload, debugging, and efficient development workflows.

## Prerequisites

Before starting local development, ensure you have completed:
- [Development Environment Setup](environment.md)
- All prerequisite software installed
- Development environment variables configured

## Project Structure for Development

```text
openframe-oss-tenant/
├── openframe/
│   ├── services/                    # Java microservices
│   │   ├── openframe-api/          # Main API service
│   │   ├── openframe-gateway/      # API Gateway
│   │   ├── openframe-frontend/     # Next.js frontend
│   │   └── ...                     # Other services
│   └── libs/                       # Shared Java libraries
├── clients/
│   ├── openframe-client/          # Rust system agent
│   └── openframe-chat/            # Tauri chat app
├── scripts/
│   ├── dev-start.sh               # Development startup
│   ├── dev-stop.sh                # Development cleanup
│   └── wait-for-services.sh       # Service readiness
└── docker-compose.dev.yml         # Development infrastructure
```

## Quick Development Start

### One-Command Development Setup

```bash
# Clone and start everything
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Start development environment (automated)
./scripts/dev-quick-start.sh
```

This script will:
1. Start infrastructure services (MongoDB, Redis, Kafka, etc.)
2. Build all Java services
3. Start services with hot reload enabled
4. Launch the frontend development server
5. Open browser tabs for development tools

## Manual Development Setup

### Step 1: Start Infrastructure Services

Start the supporting services first:

```bash
# Start development infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps

# Check logs if needed
docker-compose -f docker-compose.dev.yml logs -f mongodb
```

Expected services:
- **MongoDB**: localhost:27017 (openframe_dev database)
- **Cassandra**: localhost:9042
- **Redis**: localhost:6379
- **Kafka**: localhost:9092
- **Apache Pinot**: localhost:8099

### Step 2: Build the Platform

Compile all services and libraries:

```bash
# Full build with tests (first time)
mvn clean install

# Fast build without tests (for iterations)
mvn clean install -DskipTests -T 4
```

### Step 3: Start Services with Hot Reload

Start services individually for better control:

```bash
# Terminal 1: Configuration Server
cd openframe/services/openframe-config
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 2: Authorization Server  
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 3: API Service
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 4: Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 5: Management Service
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 6: Client Service
cd openframe/services/openframe-client
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 7: Stream Service
cd openframe/services/openframe-stream
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Step 4: Start Frontend Development Server

```bash
# Terminal 8: Frontend
cd openframe/services/openframe-frontend
npm install
npm run dev
```

## Hot Reload Configuration

### Java Services Hot Reload

Spring Boot DevTools is configured for automatic restart:

```xml
<!-- Already configured in pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

Environment variables for hot reload:

```bash
# Enable automatic restart
SPRING_DEVTOOLS_RESTART_ENABLED=true

# Enable LiveReload browser extension support
SPRING_DEVTOOLS_LIVERELOAD_ENABLED=true

# Faster restart by excluding certain directories
SPRING_DEVTOOLS_RESTART_EXCLUDE=static/**,public/**,META-INF/**
```

### Frontend Hot Reload

Next.js provides built-in hot reload:

```bash
# Start with hot reload (default)
npm run dev

# Start with turbo mode for faster builds
npm run dev:turbo
```

### Rust Client Hot Reload

Use `cargo-watch` for automatic rebuilds:

```bash
# Install cargo-watch
cargo install cargo-watch

# Run with hot reload
cd clients/openframe-client
cargo watch -x 'run -- --config dev.toml'
```

## Debug Configuration

### Java Service Debugging

#### IntelliJ IDEA Debug Setup

1. **Create Remote Debug Configuration**:
   ```
   Run → Edit Configurations → Add New → Remote JVM Debug
   Name: Debug API Service
   Host: localhost
   Port: 5005
   ```

2. **Start Service with Debug Port**:
   ```bash
   cd openframe/services/openframe-api
   mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
   ```

3. **Attach Debugger**: Run the debug configuration in IntelliJ

#### Command Line Debugging

```bash
# Start any service with remote debugging
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Connect with jdb (command line debugger)
jdb -attach localhost:5005
```

### Frontend Debugging

#### VS Code Debug Setup

1. **Install VS Code Extensions**:
   - Debugger for Chrome
   - Next.js debugger

2. **Launch Configuration** (`.vscode/launch.json`):
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Debug Next.js",
         "type": "node",
         "request": "launch",
         "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/next",
         "args": ["dev"],
         "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
         "runtimeArgs": ["--inspect"],
         "env": {
           "NODE_ENV": "development"
         }
       },
       {
         "name": "Debug Chrome",
         "type": "chrome",
         "request": "launch",
         "url": "http://localhost:3000",
         "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend",
         "breakOnLoad": true,
         "sourceMapPathOverrides": {
           "webpack:///./~/*": "${workspaceFolder}/node_modules/*",
           "webpack:///./src/*": "${workspaceFolder}/src/*"
         }
       }
     ]
   }
   ```

#### Browser DevTools

```bash
# Start Next.js with Node.js inspector
npm run dev -- --inspect

# Connect Chrome DevTools
# Navigate to: chrome://inspect/#devices
# Click "inspect" under Remote Target
```

### Database Debugging

#### MongoDB Debugging

```bash
# Connect to development database
docker exec -it mongodb mongosh openframe_dev

# Common debugging commands
db.users.find().pretty()
db.organizations.countDocuments()
db.devices.find({"status": "offline"}).limit(5)

# Enable MongoDB profiling
db.setProfilingLevel(2)  # Log all operations
db.system.profile.find().limit(5).sort({ts:-1}).pretty()
```

#### Redis Debugging

```bash
# Connect to Redis
docker exec -it redis redis-cli

# Common debugging commands
keys *                    # List all keys
get user:session:123      # Get specific key
monitor                   # Monitor all commands
info memory              # Memory usage stats
```

#### Cassandra Debugging

```bash
# Connect to Cassandra
docker exec -it cassandra cqlsh

# Switch to development keyspace
USE openframe_dev;

# Common debugging queries
SELECT * FROM log_events WHERE tenant_id = ? LIMIT 10;
DESCRIBE TABLES;
SELECT COUNT(*) FROM device_metrics;
```

## Development Workflows

### Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-dashboard-widget
git push -u origin feature/new-dashboard-widget

# 2. Start development environment
./scripts/dev-start.sh

# 3. Make changes and test
# Backend changes: Hot reload automatic
# Frontend changes: Save and refresh browser

# 4. Run tests
mvn test -pl openframe-api-service-core
cd openframe/services/openframe-frontend && npm run test

# 5. Commit and push
git add .
git commit -m "feat: add new dashboard widget"
git push

# 6. Create pull request
```

### Testing Workflow

```bash
# Run all backend tests
mvn test

# Run specific service tests
mvn test -pl openframe-api-service-core

# Run frontend tests
cd openframe/services/openframe-frontend
npm run test

# Run frontend tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run integration tests
mvn integration-test -P integration-tests
```

### Database Development Workflow

#### Schema Changes

```bash
# MongoDB schema changes are handled via migration scripts
# Located in: openframe/services/openframe-management/src/main/resources/migrations/

# Cassandra schema changes
# Located in: openframe/services/openframe-management/src/main/resources/cassandra-schema/

# Apply migrations during development
mvn exec:java -Dexec.mainClass="com.openframe.management.MigrationRunner" -pl openframe-management-service
```

#### Test Data Setup

```bash
# Load development test data
curl -X POST http://localhost:8081/dev/seed-data \
  -H "Content-Type: application/json" \
  -d '{"organizations": 5, "devices": 50, "users": 10}'

# Reset development database
curl -X POST http://localhost:8081/dev/reset-database
```

### API Development Workflow

#### GraphQL Development

```bash
# Access GraphQL Playground
open http://localhost:8080/graphql

# Example queries for testing
query GetDevices {
  devices(first: 10) {
    edges {
      node {
        id
        name
        deviceType
        status
        lastSeen
      }
    }
  }
}

# Run GraphQL schema validation
cd openframe/services/openframe-api
mvn compile # Validates schema during compilation
```

#### REST API Development

```bash
# Access Swagger UI
open http://localhost:8080/swagger-ui

# Test endpoints with curl
curl -X GET "http://localhost:8080/api/v1/organizations" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Health check endpoints
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
```

## Performance Optimization for Development

### JVM Tuning for Development

Add these JVM options for faster development:

```bash
# Add to MAVEN_OPTS or IDE run configurations
export MAVEN_OPTS="-Xmx4g -Xms1g -XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:+UseJVMCICompiler"

# For each service, add JVM options:
-Xmx2g -Xms512m
-XX:+UseG1GC
-XX:+UnlockExperimentalVMOptions 
-Dspring.jmx.enabled=true
-Dcom.sun.management.jmxremote.port=9999
-Dcom.sun.management.jmxremote.authenticate=false
-Dcom.sun.management.jmxremote.ssl=false
```

### Frontend Build Optimization

```bash
# Use SWC for faster builds (already configured)
npm run dev  # Uses Next.js SWC compiler

# Analyze bundle size
npm run analyze

# Enable turbo mode
npm run dev:turbo
```

### Docker Development Optimization

```bash
# Use BuildKit for faster Docker builds
export DOCKER_BUILDKIT=1

# Use multi-stage builds and layer caching
docker build --target development .

# Prune unused resources periodically  
docker system prune -a
```

## Common Development Issues and Solutions

### Port Conflicts

```bash
# Check what's using ports
lsof -i :8080
lsof -i :3000

# Kill processes on specific ports
kill -9 $(lsof -t -i:8080)

# Change service ports if needed (application-dev.yml)
server.port: 8085
```

### Memory Issues

```bash
# Increase Docker memory limit
# Docker Desktop → Settings → Resources → Memory: 8GB+

# Monitor Java heap usage
jcmd <PID> GC.run
jstat -gc <PID> 1000

# Profile memory usage
java -XX:+UnlockCommercialFeatures -XX:+FlightRecorder -XX:StartFlightRecording=duration=60s,filename=profile.jfr
```

### Database Connection Issues

```bash
# Restart infrastructure services
docker-compose -f docker-compose.dev.yml restart

# Check service logs
docker-compose -f docker-compose.dev.yml logs mongodb
docker-compose -f docker-compose.dev.yml logs cassandra

# Verify connections
telnet localhost 27017  # MongoDB
telnet localhost 9042   # Cassandra
```

### Build Issues

```bash
# Clear Maven cache
mvn dependency:purge-local-repository

# Rebuild from scratch
mvn clean install -U

# Clear Node.js cache
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install
```

## Development Tools and URLs

When everything is running, access these development tools:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application |
| **API Gateway** | http://localhost:8080 | Gateway and proxy |
| **GraphQL Playground** | http://localhost:8080/graphql | GraphQL API testing |
| **Swagger UI** | http://localhost:8080/swagger-ui | REST API documentation |
| **Authorization Server** | http://localhost:9000 | OAuth2 endpoints |
| **Actuator Health** | http://localhost:8080/actuator | Service health checks |
| **MongoDB Express** | http://localhost:8082 | Database management |
| **Redis Commander** | http://localhost:8083 | Redis management |
| **Kafka Manager** | http://localhost:9000 | Kafka topic management |

## Next Steps

Once you have local development running:

1. Review [Architecture Overview](../architecture/overview.md) to understand the system design
2. Check [Testing Guide](../testing/overview.md) for writing and running tests  
3. Read [Contributing Guidelines](../contributing/guidelines.md) for code contribution standards
4. Explore the codebase and start building features!

---

**Development Support**: Join the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) `#development` channel for real-time help with local development setup and troubleshooting.