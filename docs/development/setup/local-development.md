# Local Development Setup

This guide walks you through setting up OpenFrame for local development, including running services in development mode with hot reload, debugging capabilities, and development-optimized configurations.

## Prerequisites

Before starting local development, ensure you have completed the [Environment Setup](environment.md) and have:

- ✅ Java 21 JDK installed and configured
- ✅ Node.js 18+ and npm
- ✅ Docker and Docker Compose
- ✅ Maven 3.8+
- ✅ IDE properly configured (IntelliJ IDEA or VS Code)

## Clone and Setup Repository

### 1. Clone the Repository

```bash
# Clone OpenFrame repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify repository structure
ls -la
```

### 2. Setup Git Configuration

```bash
# Configure Git for OpenFrame development
git config user.name "Your Name"
git config user.email "your.email@domain.com"

# Setup Git hooks for code quality
cp scripts/git-hooks/* .git/hooks/
chmod +x .git/hooks/*
```

### 3. Environment Configuration

Create your local environment configuration:

```bash
# Copy environment template
cp .env.example .env.local

# Edit configuration for local development
# Set your local database URLs, API keys, etc.
nano .env.local
```

## Infrastructure Setup

### 1. Start Infrastructure Services

OpenFrame requires several infrastructure services. Start them using Docker Compose:

```bash
# Start core infrastructure
cd integrated-tools
docker compose up -d mongodb redis kafka cassandra

# Verify services are running
docker compose ps
```

Expected output:
```text
NAME        COMMAND                  SERVICE     STATUS      PORTS
mongodb     "docker-entrypoint.s…"   mongodb     running     0.0.0.0:27017->27017/tcp
redis       "docker-entrypoint.s…"   redis       running     0.0.0.0:6379->6379/tcp  
kafka       "/etc/confluent/dock…"   kafka       running     0.0.0.0:9092->9092/tcp
cassandra   "docker-entrypoint.s…"   cassandra   running     0.0.0.0:9042->9042/tcp
```

### 2. Initialize Databases

Set up initial database schemas and data:

```bash
# Return to project root
cd ..

# Initialize MongoDB with dev data
docker exec -it mongodb mongosh --eval "
  db = db.getSiblingDB('openframe_dev');
  db.users.createIndex({email: 1}, {unique: true});
  db.organizations.createIndex({domain: 1}, {unique: true});
"

# Test MongoDB connection
docker exec -it mongodb mongosh openframe_dev --eval "db.runCommand('ping')"

# Test Redis connection
docker exec -it redis redis-cli ping
```

### 3. Configure External Tool Simulators (Optional)

For development without external RMM tools, start simulators:

```bash
# Start tool simulators
cd integrated-tools
docker compose -f docker-compose.dev.yml up -d tactical-rmm-simulator fleet-mdm-simulator

# These provide mock APIs compatible with OpenFrame
```

## Building OpenFrame Services

### 1. Build All Services

Build the entire OpenFrame stack:

```bash
# Clean build (first time or after major changes)
mvn clean install

# Quick build (skip tests for faster iteration)
mvn clean install -DskipTests

# Parallel build for faster compilation
mvn clean install -T 4 -DskipTests
```

### 2. Build Individual Services

For iterative development, build only what changed:

```bash
# Build specific service
cd openframe/services/openframe-api
mvn clean install -DskipTests

# Build shared libraries only
cd openframe/libs
mvn clean install -DskipTests
```

### 3. Frontend Dependencies

Install and build frontend dependencies:

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Install additional dev tools
npm install -g @vue/cli-service-global
```

## Running Services in Development Mode

### Method 1: Automated Development Scripts

Use the provided development scripts for the easiest setup:

#### macOS/Linux
```bash
# Interactive mode (recommended for first time)
./scripts/run-mac.sh
# or
./scripts/run-linux.sh

# Silent mode (no prompts)  
./scripts/run-mac.sh --silent
```

#### Windows PowerShell
```bash
# Interactive mode
./scripts/run-windows.ps1

# Silent mode
./scripts/run-windows.ps1 -Silent
```

The scripts will:
- Start services in the correct dependency order
- Set up development profiles
- Enable debug ports
- Display service status and URLs

### Method 2: Manual Service Startup

For more control over the development environment:

#### 1. Start Authorization Service
```bash
cd openframe/services/openframe-authorization-server

# Development mode with debug port
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5001" -Dspring-boot.run.profiles=dev
```

#### 2. Start API Service
```bash
cd openframe/services/openframe-api

# Development mode with debug port 5002
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5002" -Dspring-boot.run.profiles=dev
```

#### 3. Start Gateway Service
```bash
cd openframe/services/openframe-gateway

# Gateway with debug port 5003
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5003" -Dspring-boot.run.profiles=dev
```

#### 4. Start Client Service
```bash
cd openframe/services/openframe-client

# Client service with debug port 5004
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5004" -Dspring-boot.run.profiles=dev
```

#### 5. Start Stream Service
```bash
cd openframe/services/openframe-stream

# Stream service with debug port 5005
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005" -Dspring-boot.run.profiles=dev
```

#### 6. Start Management Service
```bash
cd openframe/services/openframe-management

# Management service with debug port 5006
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5006" -Dspring-boot.run.profiles=dev
```

#### 7. Start Frontend Development Server
```bash
cd openframe/services/openframe-frontend

# Development server with hot reload
npm run dev

# Alternative: Build and serve
npm run build && npm run preview
```

## Service Status and URLs

Once all services are running, you should have:

| Service | URL | Debug Port | Purpose |
|---------|-----|------------|---------|
| **Gateway** | http://localhost:8080 | 5003 | Main entry point |
| **Authorization** | http://localhost:8081 | 5001 | OAuth2/OIDC provider |
| **API Service** | http://localhost:8082 | 5002 | GraphQL/REST APIs |
| **Client Service** | http://localhost:8084 | 5004 | Agent management |
| **Stream Service** | http://localhost:8085 | 5005 | Event processing |
| **Management** | http://localhost:8083 | 5006 | Admin operations |
| **Frontend** | http://localhost:3000 | N/A | Web interface |

## Hot Reload and Development Features

### Backend Hot Reload

#### Using Spring Boot DevTools

Add to your Maven dependencies for hot reload:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

#### IntelliJ IDEA Auto-Reload

1. **Enable Build Project Automatically**
   - File → Settings → Build, Execution, Deployment → Compiler
   - ✅ Build project automatically

2. **Enable Auto-Make in Development**
   - Help → Find Action → Registry
   - ✅ compiler.automake.allow.when.app.running

#### Manual Hot Reload

```bash
# Trigger reload for specific service
cd openframe/services/openframe-api
mvn compile

# IntelliJ users can use Ctrl+Shift+F9 (Recompile)
```

### Frontend Hot Reload

The Vue.js development server includes hot module replacement (HMR):

```bash
cd openframe/services/openframe-frontend
npm run dev

# HMR is enabled by default
# Changes to .vue, .ts, .css files trigger automatic reload
```

## Debug Configuration

### Java Service Debugging

#### IntelliJ IDEA Remote Debug

1. **Create Remote Debug Configuration**
   ```
   Run → Edit Configurations → Add New → Remote JVM Debug
   • Name: OpenFrame API Debug
   • Host: localhost  
   • Port: 5002 (matches service debug port)
   • Module: openframe-api
   ```

2. **Start Debugging**
   - Set breakpoints in your code
   - Run the remote debug configuration
   - Trigger API calls to hit breakpoints

#### VS Code Java Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Attach to OpenFrame API",
      "request": "attach",
      "hostName": "localhost",
      "port": 5002
    }
  ]
}
```

### Frontend Debugging

#### Browser DevTools Integration

```javascript
// vite.config.ts - Development configuration
export default defineConfig({
  server: {
    port: 3000,
    sourcemap: true  // Enable source maps for debugging
  },
  build: {
    sourcemap: true  // Keep source maps in dev builds
  }
})
```

#### Vue DevTools

Install the Vue DevTools browser extension:
- Chrome: Vue.js devtools
- Firefox: Vue.js devtools
- Edge: Vue.js devtools

### Database Debugging

#### MongoDB Query Profiling

```bash
# Enable profiling in development
docker exec -it mongodb mongosh openframe_dev --eval "
  db.setProfilingLevel(2);
  db.system.profile.find().limit(5).sort({ts: -1}).pretty();
"
```

#### Redis Command Monitoring

```bash
# Monitor Redis commands in real-time
docker exec -it redis redis-cli monitor
```

## Development Workflows

### Typical Development Cycle

1. **Start Infrastructure**
   ```bash
   cd integrated-tools && docker compose up -d
   ```

2. **Start Backend Services**
   ```bash
   ./scripts/run-mac.sh --backend-only
   ```

3. **Start Frontend**
   ```bash
   cd openframe/services/openframe-frontend && npm run dev
   ```

4. **Make Changes**
   - Edit code in your IDE
   - Hot reload automatically applies changes
   - Test changes in browser

5. **Test and Debug**
   - Set breakpoints and debug issues
   - Run unit tests: `mvn test`
   - Check API responses in GraphQL playground

### API Development Workflow

1. **GraphQL Schema Changes**
   ```bash
   # Edit schema files in src/main/resources/schema/
   cd openframe/services/openframe-api
   
   # Schema is auto-reloaded with DevTools
   # Test in GraphQL Playground at http://localhost:8082/graphql
   ```

2. **Frontend API Integration**
   ```bash
   cd openframe/services/openframe-frontend
   
   # Generate TypeScript types from GraphQL schema
   npm run graphql:codegen
   
   # Types are automatically available in components
   ```

### Database Development

1. **Schema Changes**
   ```bash
   # MongoDB schema evolution
   docker exec -it mongodb mongosh openframe_dev --eval "
     db.users.createIndex({tenantId: 1, email: 1}, {unique: true});
   "
   ```

2. **Test Data Management**
   ```bash
   # Reset development database
   docker exec -it mongodb mongosh openframe_dev --eval "
     db.dropDatabase();
   "
   
   # Recreate with test data
   mvn test -Dtest=DatabaseInitializationTest
   ```

## Performance Optimization for Development

### JVM Optimization

Add these JVM options for better development performance:

```bash
# .env.local or IDE run configuration
MAVEN_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC -XX:+UseStringDeduplication"

# For individual services
JAVA_OPTS="-Xmx2g -Xms1g -XX:+UseG1GC"
```

### Build Performance

```bash
# Use parallel builds
mvn clean install -T 4

# Skip heavy processes in development
mvn clean install -DskipTests -Dcheckstyle.skip -Dfindbugs.skip

# Use incremental compilation
mvn compile -Dmaven.compiler.incremental=true
```

### Database Performance

```yaml
# docker-compose.override.yml for development
services:
  mongodb:
    command: mongod --wiredTigerCacheSizeGB 1 --nojournal
  
  redis:
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Troubleshooting Development Issues

### Service Won't Start

**Check port conflicts:**
```bash
# Find what's using the port
lsof -i :8080

# Kill conflicting process
kill -9 $(lsof -t -i :8080)
```

**Check Java version:**
```bash
# Verify Java version
java -version
echo $JAVA_HOME

# Set correct Java version
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

**Review service logs:**
```bash
# Maven startup logs
mvn spring-boot:run -X  # Verbose logging

# Application logs
tail -f logs/openframe-api.log
```

### Hot Reload Not Working

**IntelliJ IDEA:**
```bash
# Force project rebuild
Build → Rebuild Project

# Clear caches
File → Invalidate Caches and Restart
```

**Frontend:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Database Connection Issues

**MongoDB:**
```bash
# Check connection
docker exec -it mongodb mongosh --eval "db.adminCommand('ismaster')"

# Reset connection pool
docker restart mongodb
```

**Redis:**
```bash
# Test Redis connection
docker exec -it redis redis-cli ping

# Clear Redis data (development only!)
docker exec -it redis redis-cli FLUSHALL
```

### Memory Issues

**Increase available memory:**
```bash
# Docker Desktop settings:
# Resources → Memory: 8GB+

# JVM heap size:
export MAVEN_OPTS="-Xmx6g -Xms2g"
```

**Monitor memory usage:**
```bash
# Check Java processes
jps -lv

# Monitor memory usage
top -p $(pgrep -f "openframe")
```

## Next Steps

With your local development environment running:

1. **Explore the [Architecture Overview](../architecture/overview.md)** to understand system design
2. **Review [Testing Guide](../testing/overview.md)** to learn testing practices  
3. **Check [Contributing Guidelines](../contributing/guidelines.md)** for development workflow
4. **Try making your first change** by adding a simple API endpoint

## Development Resources

### Useful Development URLs

- **GraphQL Playground**: http://localhost:8082/graphql
- **API Documentation**: http://localhost:8082/swagger-ui/index.html
- **Management Endpoints**: http://localhost:8083/actuator
- **Frontend DevTools**: http://localhost:3000/__vite_dev__/

### Development Commands Cheat Sheet

```bash
# Quick service restart
pkill -f "openframe" && ./scripts/run-mac.sh --silent

# Database reset  
docker exec -it mongodb mongosh openframe_dev --eval "db.dropDatabase()"

# Clear all caches
mvn clean && rm -rf ~/.m2/repository/com/openframe

# Full rebuild
mvn clean install && npm install && npm run build
```

---

Ready to start developing! Your local OpenFrame instance should now be running with all development features enabled. Happy coding! 🚀