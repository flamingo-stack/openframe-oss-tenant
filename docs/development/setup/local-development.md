# Local Development Guide

This comprehensive guide walks you through cloning, building, running, and debugging OpenFrame locally. By the end, you'll have a fully functional development environment with hot reload, debugging capabilities, and all services running locally.

## Prerequisites Check

Before starting, ensure you have completed:

- ✅ [Prerequisites](../../getting-started/prerequisites.md) - Required software installed
- ✅ [Environment Setup](environment.md) - IDE and tools configured
- ✅ Infrastructure services running (MongoDB, Redis, Kafka)

## Repository Structure Overview

OpenFrame follows a well-organized multi-module structure:

```text
openframe-oss-tenant/
├── openframe-oss-lib/              # Shared libraries and core modules
│   ├── openframe-api-lib/          # API contracts and services
│   ├── openframe-api-service-core/ # API service implementation
│   ├── openframe-authorization-service-core/ # OAuth2/OIDC server
│   ├── openframe-client-core/      # Client service core
│   ├── openframe-data-*/           # Data layer modules
│   ├── openframe-gateway-service-core/ # Gateway implementation
│   ├── openframe-stream-service-core/  # Event streaming
│   └── sdk/                        # External tool SDKs
├── openframe/services/             # Executable service applications
│   ├── openframe-api/              # API service application
│   ├── openframe-authorization-server/ # Auth server application
│   ├── openframe-gateway/          # Gateway service application
│   ├── openframe-management/       # Management service
│   ├── openframe-stream/           # Stream processor
│   └── openframe-external-api/     # External API service
├── clients/                        # Client applications
│   ├── openframe-client/           # Rust agent client
│   └── openframe-chat/             # Tauri chat application
├── integrated-tools/               # Tool integrations
└── manifests/                      # Deployment manifests
```

## Step 1: Clone and Setup

### Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/your-org/openframe-oss-tenant.git
cd openframe-oss-tenant

# Initialize git submodules (if any)
git submodule update --init --recursive
```

### Verify Repository Structure

```bash
# Check the repository structure
find . -name "pom.xml" -type f | head -10
find . -name "Cargo.toml" -type f
find . -name "package.json" -type f

# Should show multiple Maven modules, Rust projects, and Node.js projects
```

## Step 2: Infrastructure Setup

### Start Infrastructure Services

Use Docker Compose to start all required infrastructure:

```bash
# Start all infrastructure services
docker-compose -f docker/docker-compose.dev.yml up -d

# Verify all services are running
docker-compose -f docker/docker-compose.dev.yml ps

# Expected output: MongoDB, Redis, Kafka, Zookeeper, NATS all running
```

### Create Docker Compose File (if not exists)

If `docker/docker-compose.dev.yml` doesn't exist, create it:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    container_name: openframe-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: admin123
    volumes:
      - mongodb_data:/data/db
      - ./scripts/db/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro

  redis:
    image: redis:7.2-alpine
    container_name: openframe-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: openframe-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
    volumes:
      - zookeeper_data:/var/lib/zookeeper/data

  kafka:
    image: confluentinc/cp-kafka:latest
    container_name: openframe-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
    volumes:
      - kafka_data:/var/lib/kafka/data

  nats:
    image: nats:2.9-alpine
    container_name: openframe-nats
    ports:
      - "4222:4222"
      - "8222:8222"  # HTTP monitoring
    command: ["-js", "-m", "8222"]
    volumes:
      - nats_data:/data

volumes:
  mongodb_data:
  redis_data:
  zookeeper_data:
  kafka_data:
  nats_data:
```

### Verify Infrastructure

```bash
# Test database connections
mongosh "mongodb://admin:admin123@localhost:27017" --eval "db.runCommand('ping')"
redis-cli ping

# Test Kafka
docker exec openframe-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Test NATS
curl http://localhost:8222/varz
```

## Step 3: Build the Platform

### Build Core Libraries First

The core libraries must be built before the service applications:

```bash
# Navigate to core libraries
cd openframe-oss-lib

# Clean and install all core modules
mvn clean install -DskipTests

# This builds all shared libraries:
# - openframe-core
# - openframe-data-*
# - openframe-api-*
# - openframe-security-*
# - All service cores
```

**Expected Output:**
```text
[INFO] Reactor Summary for OpenFrame OSS Libraries 5.30.0:
[INFO] 
[INFO] openframe-core ..................................... SUCCESS [  2.345 s]
[INFO] openframe-data-mongo ............................... SUCCESS [  3.456 s]
[INFO] openframe-api-lib .................................. SUCCESS [  1.234 s]
[INFO] openframe-api-service-core ......................... SUCCESS [  4.567 s]
[INFO] openframe-authorization-service-core ............... SUCCESS [  3.234 s]
[INFO] openframe-gateway-service-core ..................... SUCCESS [  2.789 s]
[INFO] BUILD SUCCESS
```

### Build Service Applications

```bash
# Navigate to service applications
cd ../openframe/services

# Build all service applications
mvn clean install -DskipTests

# Or build individual services
mvn clean install -DskipTests -pl openframe-api
mvn clean install -DskipTests -pl openframe-gateway
mvn clean install -DskipTests -pl openframe-authorization-server
```

### Verify Build Artifacts

```bash
# Check that JARs were created
find . -name "*-SNAPSHOT.jar" -type f

# Expected output should show JARs for each service:
# ./openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar
# ./openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar
# ./openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar
```

## Step 4: Configuration Setup

### Environment Variables

Create a comprehensive environment configuration:

```bash
# Create .env file in project root
cat > .env.local << 'EOF'
# Java Environment
JAVA_HOME=/path/to/java21
JAVA_OPTS=-Xmx2g -XX:+UseG1GC

# Spring Configuration
SPRING_PROFILES_ACTIVE=dev

# Database Configuration
MONGODB_URI=mongodb://admin:admin123@localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# AI Configuration (replace with your actual key)
ANTHROPIC_API_KEY=your_anthropic_key_here

# OpenFrame Configuration
OPENFRAME_ENV=development
OPENFRAME_LOG_LEVEL=DEBUG

# Service Ports
GATEWAY_PORT=8443
API_PORT=8080
AUTH_PORT=9000
MANAGEMENT_PORT=8082
STREAM_PORT=8083
EXTERNAL_API_PORT=8084

# Development Features
SPRING_DEVTOOLS_RESTART_ENABLED=true
SPRING_DEVTOOLS_LIVERELOAD_ENABLED=true
EOF

# Load environment variables
source .env.local
```

### Application Configuration

Create development profiles for each service:

**openframe-api/src/main/resources/application-dev.yml:**
```yaml
server:
  port: ${API_PORT:8080}

spring:
  devtools:
    restart:
      enabled: true
    livereload:
      enabled: true
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://admin:admin123@localhost:27017/openframe}
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    consumer:
      group-id: openframe-api-dev
      auto-offset-reset: latest
  redis:
    url: ${REDIS_URL:redis://localhost:6379}

logging:
  level:
    com.openframe: ${OPENFRAME_LOG_LEVEL:DEBUG}
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,env,configprops
  endpoint:
    health:
      show-details: always
```

**openframe-gateway/src/main/resources/application-dev.yml:**
```yaml
server:
  port: ${GATEWAY_PORT:8443}
  ssl:
    enabled: false  # Disable SSL for development

spring:
  cloud:
    gateway:
      routes:
        - id: api-service
          uri: http://localhost:8080
          predicates:
            - Path=/api/**
        - id: auth-service
          uri: http://localhost:9000
          predicates:
            - Path=/auth/**
        - id: external-api-service
          uri: http://localhost:8084
          predicates:
            - Path=/external/api/**

logging:
  level:
    com.openframe: ${OPENFRAME_LOG_LEVEL:DEBUG}
    org.springframework.cloud.gateway: DEBUG
```

## Step 5: Running Services

### Option A: Start All Services (Recommended)

Create a startup script for all services:

```bash
# Create start-all-services.sh
cat > scripts/start-all-services.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting OpenFrame Services..."

# Load environment
source .env.local

# Create logs directory
mkdir -p logs

# Start services in background with logging
echo "Starting Authorization Server..."
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev > logs/auth-server.log 2>&1 &
echo $! > logs/auth-server.pid

sleep 10  # Wait for auth server to start

echo "Starting API Service..."
java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev > logs/api-service.log 2>&1 &
echo $! > logs/api-service.pid

echo "Starting Management Service..."
java -jar openframe/services/openframe-management/target/openframe-management-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev > logs/management-service.log 2>&1 &
echo $! > logs/management-service.pid

echo "Starting Stream Service..."
java -jar openframe/services/openframe-stream/target/openframe-stream-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev > logs/stream-service.log 2>&1 &
echo $! > logs/stream-service.pid

echo "Starting External API Service..."
java -jar openframe/services/openframe-external-api/target/openframe-external-api-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev > logs/external-api-service.log 2>&1 &
echo $! > logs/external-api-service.pid

sleep 15  # Wait for services to start

echo "Starting Gateway Service..."
java -jar openframe/services/openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev > logs/gateway-service.log 2>&1 &
echo $! > logs/gateway-service.pid

echo "✅ All services started. Check logs/ directory for output."
echo "🌐 Gateway available at: http://localhost:8443"
echo "🔍 API available at: http://localhost:8080"
echo "🔐 Auth server at: http://localhost:9000"
EOF

chmod +x scripts/start-all-services.sh
./scripts/start-all-services.sh
```

### Option B: Start Services Individually

For debugging or focused development:

```bash
# Terminal 1: Authorization Server
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev

# Terminal 2: API Service
java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev

# Terminal 3: Gateway Service
java -jar openframe/services/openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar \
  --spring.profiles.active=dev

# Continue for other services...
```

### Monitor Service Status

```bash
# Create status check script
cat > scripts/check-services.sh << 'EOF'
#!/bin/bash

echo "🔍 Checking OpenFrame Services..."

services=(
  "Gateway:8443:/health"
  "API:8080:/actuator/health"
  "Auth:9000:/actuator/health"
  "Management:8082:/actuator/health"
  "Stream:8083:/actuator/health"
  "External-API:8084:/actuator/health"
)

for service in "${services[@]}"; do
  IFS=':' read -ra PARTS <<< "$service"
  name="${PARTS[0]}"
  port="${PARTS[1]}"
  endpoint="${PARTS[2]}"
  
  url="http://localhost:${port}${endpoint}"
  
  if curl -s -f "$url" > /dev/null; then
    echo "✅ $name (port $port) - UP"
  else
    echo "❌ $name (port $port) - DOWN"
  fi
done
EOF

chmod +x scripts/check-services.sh
./scripts/check-services.sh
```

## Step 6: Hot Reload and Development Mode

### Enable Spring Boot DevTools

Spring Boot DevTools is already included in the dependencies. For enhanced development experience:

**1. IDE Integration:**

**IntelliJ IDEA:**
- Enable "Build project automatically" in Settings → Compiler
- Enable "Allow auto-make to start even if developed application is currently running"
- Use Ctrl+F9 to trigger rebuild and restart

**VS Code:**
- Install "Spring Boot Extension Pack"
- Use Ctrl+Shift+P → "Spring Boot: Restart Apps"

**2. Automatic Restart Triggers:**

```bash
# Any change to these will trigger restart:
# - /src/main/java/**
# - /src/main/resources/**
# - Configuration files

# Watch for changes and auto-restart API service
find openframe/services/openframe-api/src -name "*.java" -o -name "*.yml" | entr -r java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev
```

### File Watching Setup

Install `entr` for automatic rebuilds:

```bash
# macOS
brew install entr

# Ubuntu/Debian
sudo apt install entr

# Use with Maven for automatic rebuilds
find . -name "*.java" | entr -s 'mvn compile'
```

## Step 7: Debugging Configuration

### IDE Debugging

**IntelliJ IDEA Remote Debug:**
1. Run → Edit Configurations → Add New → Remote JVM Debug
2. Set Host: localhost, Port: 5005 (or service-specific port)
3. Start service with debug options:

```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 \
  -jar openframe-api-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev
```

**VS Code Debugging:**

Update `.vscode/launch.json`:

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
      "vmArgs": "-Dspring.profiles.active=dev",
      "args": "",
      "console": "internalConsole"
    },
    {
      "type": "java",
      "name": "Attach to API Service",
      "request": "attach",
      "hostName": "localhost",
      "port": 5005
    }
  ]
}
```

### Application Logs

**Centralized Logging:**

```bash
# Create log aggregation script
cat > scripts/tail-all-logs.sh << 'EOF'
#!/bin/bash

# Tail all service logs in parallel
multitail \
  logs/auth-server.log \
  logs/api-service.log \
  logs/gateway-service.log \
  logs/management-service.log \
  logs/stream-service.log \
  logs/external-api-service.log
EOF

chmod +x scripts/tail-all-logs.sh
```

**Individual Service Logs:**

```bash
# Follow specific service logs
tail -f logs/api-service.log
tail -f logs/gateway-service.log | grep ERROR
tail -f logs/stream-service.log | grep "kafka\|stream"
```

## Step 8: Build Client Applications

### Rust Client (OpenFrame Agent)

```bash
# Navigate to Rust client
cd clients/openframe-client

# Development build
cargo build

# Release build
cargo build --release

# Run with development configuration
cargo run -- --config dev-config.toml

# Watch for changes and auto-rebuild
cargo watch -x 'run -- --config dev-config.toml'
```

### Tauri Chat Application

```bash
# Navigate to chat application
cd clients/openframe-chat

# Install Node.js dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build Tauri app
npm run tauri build
```

## Step 9: Testing and Validation

### API Testing

```bash
# Test Gateway health
curl -s http://localhost:8443/health | jq

# Test API service health
curl -s http://localhost:8080/actuator/health | jq

# Test GraphQL endpoint
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Test with authentication
curl -X POST http://localhost:8443/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-123" \
  -d '{"query": "{ organizations { id name } }"}'
```

### Database Validation

```bash
# Check MongoDB collections
mongosh "mongodb://admin:admin123@localhost:27017/openframe" --eval "show collections"

# Verify Kafka topics
docker exec openframe-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Test Redis
redis-cli ping
redis-cli keys "*"
```

### Integration Testing

```bash
# Run integration tests
cd openframe-oss-lib
mvn test -Dtest="*IntegrationTest"

# Run specific service tests
cd ../openframe/services/openframe-api
mvn test
```

## Common Development Workflows

### Making Changes

1. **Code Changes:**
   ```bash
   # Edit Java files in your IDE
   # DevTools will automatically restart the service
   ```

2. **Configuration Changes:**
   ```bash
   # Edit application-dev.yml
   # Restart the specific service to pick up changes
   ```

3. **Schema Changes:**
   ```bash
   # Update MongoDB collections or Kafka topics
   # Run database migration scripts if needed
   ```

### Testing Changes

1. **Unit Tests:**
   ```bash
   mvn test -Dtest=YourTestClass
   ```

2. **Integration Tests:**
   ```bash
   mvn verify -Pintegration-test
   ```

3. **Manual Testing:**
   ```bash
   # Use curl, Postman, or Thunder Client
   # Access web UI at http://localhost:8443
   ```

## Troubleshooting

### Service Startup Issues

**Port Conflicts:**
```bash
# Find process using port
lsof -i :8080

# Kill process
sudo kill -9 <PID>
```

**Memory Issues:**
```bash
# Increase JVM heap size
export JAVA_OPTS="-Xmx4g -Xms2g"
```

**Database Connection Issues:**
```bash
# Restart infrastructure
docker-compose -f docker/docker-compose.dev.yml restart

# Check connectivity
telnet localhost 27017
telnet localhost 6379
```

### Build Issues

**Dependency Problems:**
```bash
# Clean Maven cache
rm -rf ~/.m2/repository/com/openframe
mvn clean install -U
```

**Version Conflicts:**
```bash
# Check dependency tree
mvn dependency:tree | grep conflict
```

### Performance Issues

**Slow Startup:**
- Increase JVM memory allocation
- Use G1 garbage collector: `-XX:+UseG1GC`
- Enable parallel compilation: `-XX:+TieredCompilation`

**High Memory Usage:**
```bash
# Monitor JVM memory
jstat -gc <PID> 5s

# Generate heap dump for analysis
jmap -dump:format=b,file=heap.hprof <PID>
```

## Useful Development Commands

Create aliases for common tasks:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-start="./scripts/start-all-services.sh"
alias of-stop="./scripts/stop-all-services.sh"
alias of-logs="./scripts/tail-all-logs.sh"
alias of-status="./scripts/check-services.sh"
alias of-reset="docker-compose -f docker/docker-compose.dev.yml restart"
```

## Next Steps

Now that you have OpenFrame running locally:

1. **[Architecture Overview](../architecture/README.md)** - Understand the system design
2. **[Security Guidelines](../security/README.md)** - Learn security best practices
3. **[Testing Overview](../testing/README.md)** - Write and run tests
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Contribute to the project

## Need Help?

- **Community Support**: Join OpenMSP Slack at https://www.openmsp.ai/
- **Documentation Issues**: Report in the community channels
- **Development Questions**: Ask in the developer channels

You're now ready for productive OpenFrame development! 🚀