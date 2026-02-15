# Local Development Setup

This guide walks you through cloning, building, and running OpenFrame locally for development. This setup enables hot reload, debugging, and live development of the platform.

## Prerequisites

Before starting, ensure you have completed the [Environment Setup](environment.md) guide and have all required tools installed.

## Repository Setup

### Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Initialize and update submodules (if any)
git submodule update --init --recursive

# Verify repository structure
ls -la
```

Expected directory structure:
```text
openframe-oss-tenant/
├── openframe/           # Java services and libraries
├── clients/            # Client applications (Rust)
├── integrated-tools/   # Docker configurations for external tools
├── manifests/         # Kubernetes deployment files
├── scripts/           # Development and deployment scripts
├── docs/              # Documentation
├── pom.xml           # Root Maven configuration
└── README.md
```

### Configure Git for Development

```bash
# Set up Git hooks for code quality (optional)
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Configure Git to ignore IDE files
echo "*.iml" >> .gitignore
echo ".idea/" >> .gitignore
echo ".vscode/" >> .gitignore
echo "*.log" >> .gitignore
```

## Infrastructure Services Setup

Start the required infrastructure services using Docker Compose:

### Start Core Infrastructure

```bash
cd integrated-tools

# Start essential services
docker compose up -d mongodb redis kafka nats

# Verify services are running
docker compose ps
```

Expected output:
```text
NAME                IMAGE               COMMAND             STATUS
mongodb             mongo:7.0           "docker-entrypoint" Up
redis               redis:7.2-alpine    "docker-entrypoint" Up  
kafka               confluentinc/cp-kafka                  Up
nats                nats:2.10                              Up
```

### Start Analytics Infrastructure (Optional)

For full functionality including analytics:

```bash
# Start analytics services (requires more resources)
docker compose up -d cassandra pinot

# Wait for Cassandra to be ready (can take 2-3 minutes)
docker compose logs -f cassandra

# Verify Cassandra is ready
docker compose exec cassandra nodetool status
```

### Start External Tool Integration (Optional)

For testing integrations with external MSP tools:

```bash
# Start Tactical RMM (development instance)
cd tactical-rmm
docker compose up -d

# Start MeshCentral (development instance)
cd ../meshcentral
docker compose up -d

# Start Fleet MDM (development instance)  
cd ../fleet-mdm
docker compose up -d
```

## Build OpenFrame Services

### Build All Java Services and Libraries

```bash
# Return to project root
cd ../..

# Clean and build all Maven modules
mvn clean install

# Skip tests for faster build (during initial setup)
mvn clean install -DskipTests

# Build with specific profiles
mvn clean install -P development
```

This builds:
- Shared libraries (`openframe-core`, `openframe-data`, etc.)
- Service applications (`openframe-api`, `openframe-gateway`, etc.)
- Test modules

### Build Frontend Application

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Build for development
npm run build:dev

# Or start development server immediately
npm run dev
```

### Build Rust Client Agent

```bash
cd ../../../clients/openframe-client

# Build in development mode
cargo build

# Build with optimizations (slower)
cargo build --release

# Run tests
cargo test
```

## Running OpenFrame Services

OpenFrame follows a microservices architecture. Start services in dependency order:

### Method 1: Using Development Scripts (Recommended)

Use platform-specific development scripts:

```bash
# macOS/Linux
./scripts/run-dev.sh

# Windows
./scripts/run-dev.ps1

# Or with specific configuration
./scripts/run-dev.sh --profile dev --log-level DEBUG
```

These scripts will:
- Start infrastructure services
- Launch all OpenFrame services in development mode
- Set up proper environment variables
- Enable hot reload where applicable

### Method 2: Manual Service Startup

Start each service manually for more control:

#### 1. Configuration Service

```bash
cd openframe/services/openframe-config
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Wait for startup message: `Started ConfigServerApplication`

#### 2. Authorization Server

```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
```

Verify at: http://localhost:8082/.well-known/openid_configuration

#### 3. API Service

```bash
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
```

Verify GraphQL playground at: http://localhost:8081/graphql

#### 4. Client Service

```bash
cd openframe/services/openframe-client  
mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
```

#### 5. Management Service

```bash
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
```

#### 6. Stream Service (Optional)

```bash
cd openframe/services/openframe-stream
mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
```

#### 7. Gateway Service

```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
```

Verify at: http://localhost:8080/health

#### 8. Frontend Application

```bash
cd openframe/services/openframe-frontend
npm run dev
```

Access at: http://localhost:3000

### Service Startup Verification

Verify all services are running correctly:

| Service | URL | Expected Response |
|---------|-----|------------------|
| **Frontend** | http://localhost:3000 | OpenFrame login page |
| **Gateway** | http://localhost:8080/health | `{"status":"UP"}` |
| **API Service** | http://localhost:8081/actuator/health | Service health status |
| **Auth Server** | http://localhost:8082/actuator/health | Authorization server health |
| **GraphQL** | http://localhost:8081/graphql | GraphQL Playground |

## Development Features

### Hot Reload Configuration

**Backend (Spring Boot DevTools)**:
Already enabled in development profile. Changes to Java classes will trigger automatic restarts.

**Frontend (Vite Hot Module Replacement)**:
```bash
# Start with HMR enabled (default)
npm run dev

# Enable additional debugging
VITE_DEBUG=true npm run dev
```

**Watch Mode for Maven**:
```bash
# Continuously rebuild on file changes
mvn compile -Dfile.encoding=UTF-8 -T 1C -o -q --no-transfer-progress -Dmaven.test.skip=true -Dmaven.main.skip=false -Dspring-boot.run.fork=false
```

### Debug Configuration

**Java Services (IntelliJ IDEA)**:
1. Create "Remote JVM Debug" configuration
2. Set port to 5005 (or service-specific port)
3. Start service with debug profile:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
   ```

**Frontend (VS Code)**:
1. Install "Debugger for Chrome" extension
2. Create launch configuration:
   ```json
   {
     "name": "Debug React App",
     "type": "node",
     "request": "launch",
     "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
     "args": ["--mode", "development"],
     "console": "integratedTerminal"
   }
   ```

**Rust Client (VS Code)**:
```json
{
  "name": "Debug OpenFrame Client",
  "type": "lldb",
  "request": "launch", 
  "program": "${workspaceFolder}/clients/openframe-client/target/debug/openframe-client",
  "args": ["--config", "dev-config.toml", "--log-level", "debug"],
  "cwd": "${workspaceFolder}/clients/openframe-client"
}
```

### Live Database Access

**MongoDB (Development)**:
```bash
# Connect to development database
mongosh mongodb://localhost:27017/openframe_dev

# View collections
show collections

# Query organizations
db.organizations.find().pretty()
```

**Redis (Development)**:
```bash
# Connect to Redis
redis-cli -h localhost -p 6379 -n 1

# View cached data
keys *
get "cache:key:example"
```

## Development Workflow

### Typical Development Session

1. **Start Infrastructure**:
   ```bash
   cd integrated-tools
   docker compose up -d mongodb redis kafka nats
   ```

2. **Start Core Services**:
   ```bash
   # Terminal 1: Config Service
   cd openframe/services/openframe-config
   mvn spring-boot:run -Dspring-boot.run.profiles=dev
   
   # Terminal 2: API Service  
   cd openframe/services/openframe-api
   mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
   
   # Terminal 3: Gateway Service
   cd openframe/services/openframe-gateway
   mvn spring-boot:run -Dspring-boot.run.profiles=dev,local
   ```

3. **Start Frontend with Hot Reload**:
   ```bash
   cd openframe/services/openframe-frontend
   npm run dev
   ```

4. **Make Changes and Test**:
   - Modify Java code → automatic restart
   - Modify React code → hot reload in browser
   - Test endpoints via GraphQL playground

### Code Generation and Scaffolding

**Generate GraphQL Schema Types**:
```bash
cd openframe/services/openframe-api
mvn compile  # Triggers DGS code generation
```

**Generate Frontend API Types**:
```bash
cd openframe/services/openframe-frontend
npm run codegen  # Generates TypeScript types from GraphQL
```

**Create New Service**:
```bash
# Use Maven archetype (if available)
mvn archetype:generate -DarchetypeGroupId=com.openframe \
  -DarchetypeArtifactId=openframe-service-archetype \
  -DgroupId=com.openframe \
  -DartifactId=openframe-new-service
```

## Testing in Development

### Run All Tests

```bash
# Java tests
mvn test

# Frontend tests  
cd openframe/services/openframe-frontend
npm test

# Rust tests
cd clients/openframe-client
cargo test
```

### Run Specific Test Categories

```bash
# Unit tests only
mvn test -Dtest="**/*UnitTest"

# Integration tests only
mvn test -Dtest="**/*IntegrationTest"

# End-to-end tests
cd openframe/services/openframe-frontend
npm run test:e2e
```

### Test with External Services

```bash
# Start external tool containers for integration testing
cd integrated-tools/tactical-rmm
docker compose up -d

# Run tests that require external services
mvn test -Dtest="**/*ExternalIntegrationTest"
```

## Performance Optimization for Development

### Java JVM Tuning

Add to your shell profile or IDE run configurations:

```bash
# Faster startup and better garbage collection for development
export MAVEN_OPTS="-Xmx2g -Xms1g -XX:+UseG1GC -XX:+UseStringDeduplication"

# Enable JVM debugging features
export JAVA_TOOL_OPTIONS="-Dspring.output.ansi.enabled=always -Dfile.encoding=UTF-8"
```

### Frontend Build Optimization

```bash
# Enable SWC for faster builds (if available)
export VITE_USE_SWC=true

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Database Performance

**MongoDB Development Tuning**:
```javascript
// Connect and optimize for development
use openframe_dev
db.adminCommand({setParameter: 1, internalQueryPlannerMaxIndexedSolutions: 64})
```

## Troubleshooting Development Issues

### Service Won't Start

```bash
# Check if ports are in use
lsof -i :8080  # Gateway port
lsof -i :8081  # API port
lsof -i :3000  # Frontend port

# Kill processes using ports
kill $(lsof -t -i:8080)
```

### Build Failures

```bash
# Clean and rebuild
mvn clean compile -U -DskipTests

# Clear npm cache
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install

# Clear Cargo cache
cd clients/openframe-client
cargo clean
cargo build
```

### Database Connection Issues

```bash
# Verify MongoDB is running
docker compose ps mongodb

# Check MongoDB logs
docker compose logs mongodb

# Test connection manually
mongosh mongodb://localhost:27017/openframe_dev --eval "db.runCommand('ping')"
```

### Memory Issues

```bash
# Monitor resource usage
docker stats

# Increase Docker memory limits
# Docker Desktop → Settings → Resources → Memory → 8GB+
```

## Development Best Practices

### Code Organization
- Keep business logic in service layers
- Use DTOs for API boundaries
- Implement proper error handling
- Write comprehensive tests

### Git Workflow
- Create feature branches from `main`
- Use conventional commit messages
- Squash commits before merging
- Keep pull requests focused and small

### Performance
- Profile applications during development
- Monitor database query performance
- Use caching appropriately
- Optimize frontend bundle sizes

---

**Next Steps**: With OpenFrame running locally, explore the [Architecture Overview](../architecture/overview.md) to understand the system design, or jump to [Testing Overview](../testing/overview.md) to learn about the testing strategy.