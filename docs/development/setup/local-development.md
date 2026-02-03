# Local Development Guide

This guide covers running OpenFrame locally for development, including hot reload, debugging, and testing workflows.

## Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# 3. Build all services
mvn clean install -DskipTests

# 4. Run development setup
./scripts/dev-start.sh

# 5. Access the application
open http://localhost:3000
```

## Development Architecture

```mermaid
flowchart TD
    Dev[Developer Machine] --> IDE[IDE - IntelliJ/VS Code]
    IDE --> API[API Service :8080]
    IDE --> Gateway[Gateway :8081] 
    IDE --> Auth[Auth Server :8082]
    IDE --> Frontend[Frontend :3000]
    
    API --> MongoDB[(MongoDB :27017)]
    API --> Redis[(Redis :6379)]
    Gateway --> Kafka[(Kafka :9092)]
    
    Frontend --> Gateway
    
    Docker[Docker Infrastructure] --> MongoDB
    Docker --> Redis  
    Docker --> Kafka
```

## Infrastructure Setup

### Start Required Services

OpenFrame requires several backing services for development:

```bash
# Start all infrastructure services
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# Verify services are running
docker compose -f integrated-tools/docker-compose.infrastructure.yml ps
```

Expected services:

| Service | Port | Status Check |
|---------|------|--------------|
| **MongoDB** | 27017 | `mongosh --eval "db.adminCommand('hello')"` |
| **Redis** | 6379 | `redis-cli ping` |
| **Kafka** | 9092 | `docker logs openframe-kafka \| grep "started"` |
| **Zookeeper** | 2181 | `docker logs openframe-zookeeper \| grep "binding"` |
| **NATS** | 4222 | `curl http://localhost:8222/varz` |

### Infrastructure Configuration

The infrastructure stack includes development-friendly settings:

```yaml
# docker-compose.infrastructure.yml highlights
services:
  mongodb:
    ports: ["27017:27017"]
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=openframe
      
  redis:
    ports: ["6379:6379"]
    command: redis-server --appendonly yes
    
  kafka:
    ports: ["9092:9092"]
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
```

## Backend Services Development

### Development Profiles

OpenFrame services use Spring profiles for environment-specific configuration:

- **`dev`**: Local development with debug logging
- **`test`**: Testing with in-memory databases  
- **`prod`**: Production configuration

### Running Individual Services

#### API Service (Port 8080)
```bash
cd openframe/services/openframe-api

# Method 1: Maven Spring Boot plugin
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Method 2: IDE run configuration (recommended)
# Use IntelliJ/Eclipse run configurations

# Method 3: JAR execution
mvn clean package -DskipTests
java -Dspring.profiles.active=dev -jar target/openframe-api-*.jar
```

#### Gateway Service (Port 8081) 
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

#### Authorization Server (Port 8082)
```bash
cd openframe/services/openframe-authorization-server  
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Development Configuration

Create `application-dev.yml` files for development overrides:

```yaml
# openframe-api/src/main/resources/application-dev.yml
server:
  port: 8080
  
spring:
  data:
    mongodb:
      uri: mongodb://admin:password@localhost:27017/openframe?authSource=admin
  redis:
    host: localhost
    port: 6379
    database: 0
  kafka:
    bootstrap-servers: localhost:9092
    
logging:
  level:
    com.openframe: DEBUG
    org.springframework.web: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: "*"
```

### Hot Reload Setup

#### Backend Hot Reload

Use Spring Boot DevTools for automatic restarts:

```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>  
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

#### IntelliJ IDEA Hot Reload
1. Settings > Build > Compiler > Build project automatically
2. Settings > Advanced Settings > Allow auto-make to start even if developed application is currently running
3. Press `Ctrl+F9` to trigger recompilation

#### VS Code Hot Reload
Use the Java Extension Pack with automatic build enabled:
```json
// .vscode/settings.json
{
  "java.compile.nullAnalysis.mode": "automatic",
  "java.autobuild.enabled": true
}
```

### Debug Configuration

#### Remote Debug Setup
```bash
# Start service with debug port
export MAVEN_OPTS="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

#### IDE Debug Configuration

**IntelliJ IDEA:**
1. Run/Debug Configurations > Add New > Remote JVM Debug
2. Host: localhost, Port: 5005
3. Set breakpoints and start debugging

**VS Code:**
```json
// .vscode/launch.json
{
  "type": "java",
  "name": "Debug API Service", 
  "request": "attach",
  "hostName": "localhost",
  "port": 5005
}
```

## Frontend Development

### Vue.js Development Server

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Available at http://localhost:3000
```

### Frontend Configuration

Development environment variables:

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8081
VITE_GRAPHQL_ENDPOINT=http://localhost:8081/graphql
VITE_WS_ENDPOINT=ws://localhost:8081/subscriptions
VITE_AUTH_BASE_URL=http://localhost:8082

# Feature flags
VITE_FEATURE_AI_CHAT=true
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_EXTERNAL_INTEGRATIONS=true

# Debug settings
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

### Hot Module Replacement (HMR)

Vue 3 with Vite provides fast HMR:

```typescript
// HMR is automatic, but you can customize it
if (import.meta.hot) {
  import.meta.hot.accept()
}
```

### Frontend Debugging

#### Browser DevTools
1. Start with `npm run dev` (source maps enabled)
2. Open Chrome DevTools  
3. Sources tab shows original TypeScript/Vue files
4. Set breakpoints directly in source code

#### Vue DevTools Extension
```bash
# Install Vue DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/vuejs-devtools/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/
```

## Client Applications Development

### Rust Client Development

The OpenFrame agent is written in Rust:

```bash
cd clients/openframe-client

# Build in debug mode
cargo build

# Run with development logging
RUST_LOG=debug cargo run

# Run tests
cargo test

# Run with hot reload using cargo-watch
cargo install cargo-watch
cargo watch -x "run"
```

### Tauri Chat Client

```bash
cd clients/openframe-chat

# Install dependencies
npm install

# Start in development mode (with hot reload)
npm run tauri dev

# Build for development
npm run tauri build --debug
```

## Development Workflows

### Full Stack Development Loop

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant IDE as IDE
    participant Backend as Backend Services
    participant Frontend as Frontend
    participant Browser as Browser
    
    Dev->>IDE: Make backend changes
    IDE->>Backend: Auto-compile & restart
    Dev->>IDE: Make frontend changes  
    IDE->>Frontend: Hot reload
    Frontend->>Browser: Update UI instantly
    Dev->>Browser: Test changes
```

### Typical Development Session

1. **Start Infrastructure**
   ```bash
   docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d
   ```

2. **Start Backend Services** (in separate terminals)
   ```bash
   # Terminal 1: API Service
   cd openframe/services/openframe-api && mvn spring-boot:run -Dspring.profiles.active=dev
   
   # Terminal 2: Gateway
   cd openframe/services/openframe-gateway && mvn spring-boot:run -Dspring.profiles.active=dev
   
   # Terminal 3: Auth Server
   cd openframe/services/openframe-authorization-server && mvn spring-boot:run -Dspring.profiles.active=dev
   ```

3. **Start Frontend**
   ```bash
   # Terminal 4: Frontend
   cd openframe/services/openframe-frontend && npm run dev
   ```

4. **Development & Testing**
   - Make changes in IDE
   - Test in browser at http://localhost:3000
   - Check logs in terminal windows
   - Use debugger as needed

### Multi-Service Debugging

When debugging across services, use correlation IDs:

```java
// In service code, add correlation ID to logs
@Slf4j
@RestController
public class DeviceController {
    
    @GetMapping("/devices/{id}")
    public ResponseEntity<Device> getDevice(@PathVariable String id) {
        MDC.put("correlationId", UUID.randomUUID().toString());
        log.debug("Fetching device: {}", id);
        // ... service logic
        return ResponseEntity.ok(device);
    }
}
```

## Testing During Development

### Running Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run specific test method
mvn test -Dtest=DeviceServiceTest#testGetDevice

# Run tests with specific profile
mvn test -Dspring.profiles.active=test

# Skip tests during build
mvn clean install -DskipTests
```

### Frontend Testing

```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests  
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Integration Testing

Test with real services running:

```bash
# Start test environment
docker compose -f integrated-tools/docker-compose.test.yml up -d

# Run integration tests
mvn verify -Pintegration-tests

# Or run specific integration test
mvn test -Dtest=DeviceIntegrationTest -Dspring.profiles.active=integration
```

## Performance Monitoring During Development

### JVM Monitoring

Add JVM flags for performance monitoring:

```bash
# Enable JFR (Java Flight Recorder)
export JAVA_OPTS="-XX:+FlightRecorder -XX:StartFlightRecording=duration=60s,filename=profile.jfr"

# Enable GC logging
export JAVA_OPTS="$JAVA_OPTS -XX:+UseG1GC -Xlog:gc*:gc.log"

# Start service with monitoring
mvn spring-boot:run -Dspring-boot.run.jvmArguments="$JAVA_OPTS"
```

### Database Performance

Monitor MongoDB during development:

```bash
# Enable profiling for slow queries (>100ms)
mongosh --eval "db.setProfilingLevel(1, { slowms: 100 })"

# View recent slow queries
mongosh --eval "db.system.profile.find().limit(5).sort({ts:-1}).pretty()"

# Monitor current operations
mongosh --eval "db.currentOp()"
```

### Redis Monitoring

```bash
# Monitor Redis commands in real-time
redis-cli monitor

# Get Redis performance statistics
redis-cli info stats

# Monitor memory usage
redis-cli info memory
```

## Environment Reset & Cleanup

### Quick Reset Script

```bash
#!/bin/bash
# scripts/dev-reset.sh

echo "🔄 Resetting development environment..."

# Stop Java processes
pkill -f "spring-boot"

# Stop frontend
pkill -f "vite"

# Reset Docker volumes (removes all data)
docker compose -f integrated-tools/docker-compose.infrastructure.yml down -v

# Clean Maven cache
mvn clean
rm -rf target/

# Restart infrastructure
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

echo "✅ Environment reset complete! Wait 30s for services to start."
```

### Selective Cleanup

```bash
# Clean only Java build artifacts
mvn clean

# Reset only databases (keep containers)
docker compose -f integrated-tools/docker-compose.infrastructure.yml restart mongodb redis

# Clear browser cache and storage
# Use browser dev tools > Application > Clear Storage
```

## Troubleshooting Common Issues

### Port Conflicts

```bash
# Find what's using a port
lsof -i :8080

# Kill specific process
kill $(lsof -t -i:8080)

# Change service port in application-dev.yml
server:
  port: 8090  # Use different port
```

### Service Startup Issues

```bash
# Check service dependencies are running
docker compose -f integrated-tools/docker-compose.infrastructure.yml ps

# View service logs
docker logs openframe-mongodb
docker logs openframe-redis
docker logs openframe-kafka

# Test database connectivity
mongosh mongodb://admin:password@localhost:27017/openframe?authSource=admin --eval "db.adminCommand('hello')"
```

### Frontend Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
lsof -i :3000

# Use different port
npm run dev -- --port 3001
```

### Memory Issues

```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4096m"

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor system resources
top -o cpu
# or on macOS
top -o MEM
```

## IDE-Specific Development Tips

### IntelliJ IDEA

#### Useful Settings
- Settings > Editor > General > Auto Import > Add unambiguous imports on the fly
- Settings > Build > Build Tools > Maven > Import Maven projects automatically
- Settings > Build > Compiler > Build project automatically

#### Helpful Plugins
- **Spring Boot Helper**: Additional Spring Boot support
- **GraphQL**: GraphQL schema support
- **Docker**: Container management within IDE
- **Database Navigator**: Database tool alternative

### VS Code

#### Workspace Configuration
```json
// .vscode/settings.json
{
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.compile.nullAnalysis.mode": "automatic",
  "typescript.preferences.noSemicolons": "off",
  "editor.formatOnSave": true,
  "vue.codeActions.enabled": true
}
```

#### Recommended Extensions
- Java Extension Pack
- Vue Language Features (Volar)
- Docker
- GraphQL: Syntax Highlighting
- Thunder Client (Postman alternative)

## Next Steps

With local development running smoothly:

1. **[Architecture Overview](../architecture/overview.md)** - Understand how services interact
2. **[Testing Guide](../testing/overview.md)** - Learn the testing strategies  
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Contribute to the project

---

**🎯 You're now set up for productive local development!** The combination of hot reload, debugging capabilities, and monitoring tools will help you build efficiently with OpenFrame.