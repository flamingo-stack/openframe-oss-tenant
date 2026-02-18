# Local Development Guide

This guide covers the day-to-day development workflow for OpenFrame OSS Tenant, including running services locally, debugging, hot reload configuration, and common development tasks.

> **Prerequisites:** Complete the [Environment Setup](environment.md) guide first.

## Development Workflow Overview

OpenFrame follows a microservices architecture with multiple Spring Boot services and a React frontend. Here's the typical development workflow:

```mermaid
flowchart TD
    A[Start Dependencies] --> B[Start Config Server]
    B --> C[Start Core Services]
    C --> D[Start Frontend]
    D --> E[Develop & Test]
    E --> F[Debug Issues]
    F --> E
    E --> G[Build & Deploy]
```

## Starting the Development Environment

### 1. Start Infrastructure Dependencies

Start the required infrastructure services using Docker Compose:

```bash
# Start MongoDB, Redis, Kafka, NATS
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps
```

Expected output:
```text
NAME                    SERVICE     STATUS        PORTS
openframe-mongodb       mongodb     Up 2 minutes  0.0.0.0:27017->27017/tcp
openframe-redis         redis       Up 2 minutes  0.0.0.0:6379->6379/tcp
openframe-kafka         kafka       Up 2 minutes  0.0.0.0:9092->9092/tcp
openframe-nats          nats        Up 2 minutes  0.0.0.0:4222->4222/tcp
```

### 2. Start Configuration Server (Required First)

The config server must start before other services:

```bash
cd openframe/services/openframe-config
mvn spring-boot:run
```

Wait for startup completion:
```text
2024-02-03 10:15:32.145  INFO 12345 --- [main] ConfigServerApplication: Started ConfigServerApplication in 8.234 seconds
```

### 3. Start Core Services

Start services in separate terminal windows/tabs:

#### Authorization Server

```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

#### API Service

```bash
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

#### Gateway Service

```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

#### Stream Service (Optional for basic development)

```bash
cd openframe/services/openframe-stream
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

### 4. Start Frontend Application

```bash
cd openframe/services/openframe-frontend

# Install dependencies (if not already done)
npm install

# Start development server with hot reload
npm run dev
```

The frontend will be available at `http://localhost:3000` with hot reload enabled.

## Service Startup Verification

### Health Check Script

Create a script to check all services:

```bash
#!/bin/bash
# save as check-services.sh

services=(
    "Config Server:8888"
    "Authorization:8081"
    "API Service:8080"
    "Gateway:8082"
    "Frontend:3000"
)

echo "🔍 Checking OpenFrame services..."
echo "================================"

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if [[ $port == "3000" ]]; then
        # Frontend check (different endpoint)
        if curl -s http://localhost:$port > /dev/null 2>&1; then
            echo "✅ $name (port $port) - Running"
        else
            echo "❌ $name (port $port) - Not responding"
        fi
    else
        # Spring Boot actuator health check
        health=$(curl -s http://localhost:$port/actuator/health 2>/dev/null | grep -o '"status":"UP"')
        if [[ $health ]]; then
            echo "✅ $name (port $port) - Healthy"
        else
            echo "❌ $name (port $port) - Unhealthy or not running"
        fi
    fi
done

echo "================================"
```

Make it executable and run:

```bash
chmod +x check-services.sh
./check-services.sh
```

## Hot Reload Configuration

### Backend Hot Reload (Spring Boot DevTools)

Spring Boot DevTools is configured for automatic restart on file changes.

**Enable DevTools in Maven:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

**IDE Configuration:**

**IntelliJ IDEA:**
1. Enable "Build project automatically" in Settings → Build → Compiler
2. Enable "Allow auto-make to start even if developed application is currently running"
3. Changes to Java files will automatically restart the service

**VS Code:**
- Java files will auto-compile when saved
- Restart the Spring Boot run configuration to see changes

### Frontend Hot Reload (Vite)

The React frontend uses Vite for hot module replacement (HMR).

**Configuration is in `vite.config.ts`:**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    hmr: {
      port: 3001
    }
  },
  // ... other config
})
```

**Features:**
- ✅ Instant updates for React components
- ✅ CSS hot reload
- ✅ TypeScript type checking
- ✅ Error overlay in browser

## Debugging Services

### Debug Configuration

#### IntelliJ IDEA Debug Setup

1. **Create Debug Configuration:**
   - Run → Edit Configurations → Add New → Spring Boot
   - Name: "Debug OpenFrame API"
   - Main class: `com.openframe.api.ApiApplication`
   - VM options: `-Dspring.profiles.active=development -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005`

2. **Start in Debug Mode:**
   - Click the debug icon (🐛) next to your configuration
   - Set breakpoints in your code
   - Make API requests to trigger breakpoints

#### Remote Debugging

Start services with debug ports:

```bash
# API Service on debug port 5005
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Authorization Service on debug port 5006  
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5006"

# Gateway Service on debug port 5007
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5007"
```

Connect your IDE to the appropriate debug port.

### Frontend Debugging

#### Browser DevTools

1. **React DevTools Extension:**
   - Install React Developer Tools browser extension
   - Access component tree and props in the "Components" tab
   - Profile performance in the "Profiler" tab

2. **Redux DevTools (if using Redux):**
   - Install Redux DevTools extension
   - Monitor state changes and actions

#### VS Code Frontend Debugging

Create `.vscode/launch.json` for frontend debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend in Chrome",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
      "args": ["--mode", "development"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["--preserve-symlinks"]
    }
  ]
}
```

## Common Development Tasks

### Building and Testing

#### Full Project Build

```bash
# Build entire project
mvn clean install

# Build without tests (faster)
mvn clean install -DskipTests

# Build specific service
cd openframe/services/openframe-api
mvn clean install
```

#### Running Tests

```bash
# Run all tests
mvn test

# Run tests for specific service
cd openframe/services/openframe-api
mvn test

# Run specific test class
mvn test -Dtest=ApiControllerTest

# Run tests with coverage
mvn test jacoco:report
```

#### Frontend Build and Test

```bash
cd openframe/services/openframe-frontend

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Database Operations

#### MongoDB Development Operations

```bash
# Connect to development database
mongosh mongodb://admin:password@localhost:27017/openframe_dev

# Common operations
db.tenants.find({}).pretty()
db.users.find({}).pretty()
db.devices.countDocuments()

# Create test data
db.tenants.insertOne({
  name: "Test Tenant",
  domain: "test.openframe.local",
  status: "ACTIVE"
})
```

#### Redis Development Operations

```bash
# Connect to Redis
redis-cli

# Check cached data
KEYS openframe:*
GET openframe:tenant:12345
HGETALL openframe:session:abcdef

# Clear development cache
FLUSHDB
```

### Log Analysis

#### Application Logs

Services write logs to the console and optionally to files.

**View real-time logs:**
```bash
# API Service logs
tail -f openframe/services/openframe-api/logs/application.log

# All services (if configured to write to files)
tail -f openframe/services/*/logs/application.log
```

**Common log patterns to watch for:**
- `ERROR` - Application errors
- `WARN` - Warnings that might indicate issues
- `INFO` - General application flow
- `DEBUG` - Detailed execution information

#### Structured Logging Search

If using JSON logging format:

```bash
# Search for errors in the last hour
grep '"level":"ERROR"' application.log | jq '.'

# Filter by specific component
grep '"logger":"com.openframe.api.controller"' application.log | jq '.'

# Search for specific tenant activity
grep '"tenantId":"tenant-123"' application.log | jq '.'
```

### Performance Monitoring

#### JVM Monitoring

**Using built-in actuator endpoints:**

```bash
# Health check
curl http://localhost:8080/actuator/health

# Metrics
curl http://localhost:8080/actuator/metrics

# JVM memory info
curl http://localhost:8080/actuator/metrics/jvm.memory.used

# HTTP request metrics
curl http://localhost:8080/actuator/metrics/http.server.requests
```

**Using JConsole for detailed monitoring:**

```bash
# Start JConsole (included with JDK)
jconsole

# Connect to local Spring Boot process
# Look for process: com.openframe.api.ApiApplication
```

#### Frontend Performance

**Analyze bundle size:**
```bash
cd openframe/services/openframe-frontend
npm run build

# Analyze bundle composition
npx vite-bundle-analyzer dist
```

**Check for memory leaks:**
1. Open Chrome DevTools → Performance tab
2. Record a typical user session
3. Look for increasing memory usage over time

## Troubleshooting Common Issues

### Service Startup Issues

**Config Server Connection Failures:**
```bash
# Check if config server is running
curl http://localhost:8888/actuator/health

# Check service logs for configuration errors
grep "Could not resolve" logs/application.log
```

**Database Connection Issues:**
```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017 --eval "db.adminCommand('ismaster')"

# Test Redis connection
redis-cli ping
```

**Port Conflicts:**
```bash
# Find what's using a port
lsof -i :8080
netstat -tulpn | grep :8080

# Kill the process
kill -9 <PID>
```

### Memory and Performance Issues

**OutOfMemoryError:**
```bash
# Increase heap size
export MAVEN_OPTS="-Xmx4G"
mvn spring-boot:run
```

**Slow startup:**
```bash
# Use tiered compilation
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-XX:+TieredCompilation -XX:TieredStopAtLevel=1"
```

### Frontend Issues

**Dependency Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build Errors:**
```bash
# Check TypeScript errors
npm run type-check

# Run linting
npm run lint
```

## Development Scripts

Create these helpful scripts in your project root:

### `scripts/dev-start.sh`

```bash
#!/bin/bash
echo "🚀 Starting OpenFrame Development Environment"

# Start dependencies
echo "📦 Starting infrastructure dependencies..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for dependencies
sleep 10

# Start services in background
echo "🛠️ Starting core services..."
cd openframe/services/openframe-config && mvn spring-boot:run > /dev/null 2>&1 &
sleep 15

cd ../openframe-authorization-server && mvn spring-boot:run > /dev/null 2>&1 &
cd ../openframe-api && mvn spring-boot:run > /dev/null 2>&1 &
cd ../openframe-gateway && mvn spring-boot:run > /dev/null 2>&1 &

echo "⏳ Services starting... Check health with ./check-services.sh"
echo "🌐 Frontend will be available at http://localhost:3000"
echo "📊 Start frontend with: cd openframe/services/openframe-frontend && npm run dev"
```

### `scripts/dev-stop.sh`

```bash
#!/bin/bash
echo "🛑 Stopping OpenFrame Development Environment"

# Kill Spring Boot processes
pkill -f "spring-boot:run"

# Stop Docker dependencies
docker-compose -f docker-compose.dev.yml down

echo "✅ Development environment stopped"
```

Make scripts executable:
```bash
chmod +x scripts/dev-start.sh scripts/dev-stop.sh
```

## Performance Tips

### Development Optimizations

**Maven Build Speed:**
```bash
# Use parallel builds
mvn clean install -T 1C

# Skip tests during development builds
mvn clean install -DskipTests

# Use offline mode (when dependencies are cached)
mvn clean install -o
```

**Spring Boot Startup Speed:**
```bash
# Use development profile optimizations
-Dspring.jpa.hibernate.ddl-auto=update
-Dspring.jpa.show-sql=false
-Dlogging.level.root=WARN
```

**Frontend Development:**
```bash
# Use Vite's fast refresh
npm run dev

# Disable type checking for faster builds (development only)
npm run dev -- --skip-type-check
```

## Next Steps

With your local development environment running smoothly:

1. **[Architecture Overview](../architecture/README.md)** - Understand the system design
2. **[Security Best Practices](../security/README.md)** - Implement secure development practices  
3. **[Testing Overview](../testing/README.md)** - Learn the testing strategy

---

You now have a complete local development workflow! This setup provides hot reload, debugging capabilities, and efficient development practices for the OpenFrame OSS Tenant platform.