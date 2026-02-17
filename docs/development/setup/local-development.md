# Local Development Setup

This guide covers running OpenFrame locally for development, including infrastructure services, application services, debugging, and development workflows.

## Prerequisites

Before proceeding, ensure you have completed the [Development Environment Setup](./environment.md) and have all required tools installed.

## Infrastructure Services Setup

OpenFrame requires several infrastructure services. We'll use Docker Compose to run them locally.

### 1. Start Infrastructure Services

First, start the required infrastructure services:

```bash
# Navigate to project root
cd openframe-oss-tenant

# Start infrastructure services in background
docker-compose -f docker-compose.dev.yml up -d

# Or if using separate infrastructure compose file
docker-compose -f docker-compose.infrastructure.yml up -d
```

### 2. Verify Infrastructure Services

Check that all services are running:

```bash
# Check service status
docker-compose -f docker-compose.dev.yml ps

# Expected services:
# - mongodb (port 27017)
# - redis (port 6379)  
# - kafka (port 9092)
# - nats (port 4222)
# - zookeeper (for Kafka, port 2181)
```

### 3. Initialize Development Data

Set up initial data for development:

```bash
# Connect to MongoDB and create initial database
mongosh openframe_dev --eval "
  db.tenants.insertOne({
    _id: 'dev-tenant',
    domain: 'localhost',
    status: 'ACTIVE',
    createdAt: new Date()
  });
"

# Initialize Redis with development data (if needed)
redis-cli SET "dev:initialized" "true"
```

## Building the Application

### 1. Full Build

Build all OpenFrame services:

```bash
# Clean build (removes previous artifacts)
mvn clean install -DskipTests

# Build with tests (takes longer)
mvn clean install

# Parallel build (faster on multi-core systems)
mvn clean install -DskipTests -T 4
```

### 2. Module-Specific Builds

Build individual services for faster iteration:

```bash
# Build only API service
mvn clean install -pl openframe/services/openframe-api -am -DskipTests

# Build only Gateway service  
mvn clean install -pl openframe/services/openframe-gateway -am -DskipTests

# Build only Authorization service
mvn clean install -pl openframe/services/openframe-authorization-server -am -DskipTests
```

### 3. Development Profile Build

Use development-specific configurations:

```bash
# Build with development profile
mvn clean install -Pdev -DskipTests

# Build with debug information
mvn clean install -Ddebug=true -DskipTests
```

## Running Application Services

OpenFrame services must be started in the correct order due to dependencies.

### 1. Service Startup Order

Start services in this specific order:

1. **Authorization Server** (JWT issuer)
2. **Gateway Service** (requires auth server for JWT validation)
3. **API Service** (backend APIs)
4. **Client Service** (agent management)
5. **Management Service** (control plane operations)

### 2. Starting Services

#### Method 1: Using Maven (Recommended for Development)

```bash
# Terminal 1: Authorization Server
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 2: Gateway Service  
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 3: API Service
cd openframe/services/openframe-api  
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 4: Client Service
cd openframe/services/openframe-client
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

#### Method 2: Using JAR Files

```bash
# Build first
mvn clean install -DskipTests

# Start services (background execution)
nohup java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-*.jar \
  --spring.profiles.active=dev > auth.log 2>&1 &

nohup java -jar openframe/services/openframe-gateway/target/openframe-gateway-*.jar \
  --spring.profiles.active=dev > gateway.log 2>&1 &

nohup java -jar openframe/services/openframe-api/target/openframe-api-*.jar \
  --spring.profiles.active=dev > api.log 2>&1 &

nohup java -jar openframe/services/openframe-client/target/openframe-client-*.jar \
  --spring.profiles.active=dev > client.log 2>&1 &
```

#### Method 3: Development Helper Script

Create a development startup script:

```bash
#!/bin/bash
# dev-start.sh

set -e

echo "Starting OpenFrame Development Environment..."

# Function to start service and wait for health check
start_service() {
    local service_name=$1
    local jar_path=$2
    local port=$3
    local log_file=$4
    
    echo "Starting $service_name..."
    nohup java -jar "$jar_path" --spring.profiles.active=dev > "$log_file" 2>&1 &
    local pid=$!
    echo "$pid" > "/tmp/openframe-$service_name.pid"
    
    # Wait for service to be ready
    for i in {1..30}; do
        if curl -f "http://localhost:$port/actuator/health" >/dev/null 2>&1; then
            echo "$service_name started successfully (PID: $pid)"
            return 0
        fi
        sleep 2
    done
    
    echo "Failed to start $service_name"
    return 1
}

# Start services in order
start_service "auth" "openframe/services/openframe-authorization-server/target/openframe-authorization-server-*.jar" "8082" "auth.log"
sleep 5
start_service "gateway" "openframe/services/openframe-gateway/target/openframe-gateway-*.jar" "8080" "gateway.log"  
start_service "api" "openframe/services/openframe-api/target/openframe-api-*.jar" "8081" "api.log"
start_service "client" "openframe/services/openframe-client/target/openframe-client-*.jar" "8083" "client.log"

echo "All services started successfully!"
echo "Gateway: http://localhost:8080"
echo "API: http://localhost:8081"  
echo "Auth: http://localhost:8082"
echo "Client: http://localhost:8083"
```

### 3. Verify Services are Running

Check service health:

```bash
# Gateway service health
curl http://localhost:8080/actuator/health

# API service health
curl http://localhost:8081/actuator/health

# Authorization service health  
curl http://localhost:8082/actuator/health

# Client service health
curl http://localhost:8083/actuator/health
```

Expected response from each service:
```json
{
  "status": "UP",
  "components": {
    "diskSpace": {"status": "UP"},
    "mongo": {"status": "UP"}, 
    "redis": {"status": "UP"}
  }
}
```

## Development Configuration

### 1. Application Properties

Create development-specific configuration:

#### `application-dev.yml` (shared configuration)
```yaml
# Development profile configuration
spring:
  profiles:
    active: dev
    
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,loggers
        
server:
  error:
    include-stacktrace: always
    include-message: always
```

#### MongoDB Configuration
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe_dev
      database: openframe_dev
```

#### Kafka Configuration  
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.apache.kafka.common.serialization.JsonSerializer
    consumer:
      group-id: openframe-dev
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.apache.kafka.common.serialization.JsonDeserializer
```

### 2. Environment Variables for Development

Set up a `dev.env` file:

```bash
# Development environment variables
SPRING_PROFILES_ACTIVE=dev
LOG_LEVEL=DEBUG

# Database connections
MONGODB_URI=mongodb://localhost:27017/openframe_dev  
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# NATS
NATS_URL=nats://localhost:4222

# JWT/OAuth2 Configuration
JWT_ISSUER_URI=http://localhost:8082
OAUTH2_CLIENT_ID=openframe-dev-client
OAUTH2_CLIENT_SECRET=dev-secret-not-for-production

# Development flags
ENABLE_DEBUG_ENDPOINTS=true
DISABLE_CSRF=true
ALLOW_DEV_CORS=true

# External integrations (for testing)
TACTICAL_RMM_BASE_URL=http://localhost:8000
FLEET_MDM_BASE_URL=http://localhost:8080
MESHCENTRAL_BASE_URL=https://localhost:4430
```

## Development Workflows

### 1. Hot Reload Development

For faster development cycles:

#### Using Spring Boot DevTools

Add to each service's `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

#### IDE Hot Swap Configuration

**IntelliJ IDEA:**
1. Enable "Build project automatically" in Settings
2. Enable "Allow auto-make to start even if developed application is currently running"
3. Use Ctrl+F9 to rebuild changed classes

**VSCode:**
1. Install "Spring Boot Extension Pack"
2. Use "Spring Boot: Reload Projects" command

### 2. Database Development Workflow

#### MongoDB Development

```bash
# Connect to development database
mongosh openframe_dev

# View collections
show collections

# Query development data
db.users.find().pretty()
db.devices.find().limit(5)
db.organizations.find()

# Reset development data
db.dropDatabase()
```

#### Redis Development

```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# View specific data
GET "session:dev-session-id"
HGETALL "user:dev-user-id"

# Clear development cache
FLUSHDB
```

### 3. API Development and Testing

#### GraphQL Development

Access GraphQL Playground at `http://localhost:8081/graphql`:

```graphql
# Example query for development
query GetDevices {
  devices(first: 10) {
    edges {
      node {
        id
        name
        status
        lastSeen
      }
    }
  }
}

# Example mutation
mutation CreateOrganization($input: CreateOrganizationRequest!) {
  createOrganization(input: $input) {
    id
    name
    domain
  }
}
```

#### REST API Testing

Test REST endpoints using curl or Postman:

```bash
# Get authentication token (development)
AUTH_TOKEN=$(curl -X POST http://localhost:8082/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=dev-client&client_secret=dev-secret" \
  | jq -r .access_token)

# Test API endpoints
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:8081/api/devices

curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:8081/api/organizations
```

## Debugging

### 1. Remote Debugging Setup

Enable remote debugging for services:

```bash
# Start service with debug port
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 \
  -jar openframe-api-*.jar --spring.profiles.active=dev
```

#### IntelliJ Remote Debug Configuration
1. Run → Edit Configurations
2. Add new Remote JVM Debug configuration
3. Host: localhost, Port: 5005
4. Start service with debug flags, then connect debugger

### 2. Log Analysis

#### Centralized Logging
```bash
# View all service logs
tail -f *.log

# View specific service logs
tail -f api.log | grep ERROR
tail -f gateway.log | grep -i "authentication"
```

#### Application-Specific Logging
```yaml
# Add to application-dev.yml
logging:
  level:
    com.openframe.api: DEBUG
    com.openframe.gateway.security: TRACE
    org.springframework.web.reactive: DEBUG
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
```

### 3. Performance Monitoring

#### JVM Monitoring
```bash
# Monitor JVM performance
jps  # List running Java processes
jstat -gc [PID] 5s  # Monitor garbage collection
jconsole  # GUI monitoring tool
```

#### Application Metrics
```bash
# View application metrics
curl http://localhost:8080/actuator/metrics
curl http://localhost:8081/actuator/metrics/jvm.memory.used
curl http://localhost:8082/actuator/metrics/http.server.requests
```

## Testing During Development

### 1. Running Tests

```bash
# Run all tests
mvn test

# Run tests for specific service
mvn test -pl openframe/services/openframe-api

# Run specific test class
mvn test -Dtest=DeviceControllerTest

# Run with coverage
mvn test jacoco:report
```

### 2. Integration Testing

Run integration tests against local services:

```bash
# Start services first
./dev-start.sh

# Run integration tests
mvn integration-test -Pintegration

# Run specific integration test
mvn test -Dtest=*IntegrationTest
```

### 3. End-to-End Testing

Test complete workflows:

```bash
# Start all services and infrastructure
docker-compose -f docker-compose.dev.yml up -d
./dev-start.sh

# Run E2E test suite
mvn test -Pe2e -Dtest.environment=local
```

## Development Helper Scripts

### 1. Service Management Script

Create `dev-tools.sh`:

```bash
#!/bin/bash

case "$1" in
    start)
        echo "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        ./dev-start.sh
        ;;
    stop)
        echo "Stopping development environment..."
        pkill -f "openframe-.*\.jar"
        docker-compose -f docker-compose.dev.yml down
        ;;
    restart)
        $0 stop
        sleep 5
        $0 start
        ;;
    logs)
        tail -f *.log
        ;;
    health)
        echo "Checking service health..."
        curl -f http://localhost:8080/actuator/health && echo " Gateway: UP" || echo " Gateway: DOWN"
        curl -f http://localhost:8081/actuator/health && echo " API: UP" || echo " API: DOWN"
        curl -f http://localhost:8082/actuator/health && echo " Auth: UP" || echo " Auth: DOWN"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|health}"
        exit 1
        ;;
esac
```

### 2. Database Reset Script

Create `reset-dev-data.sh`:

```bash
#!/bin/bash
echo "Resetting development data..."

# Reset MongoDB
mongosh openframe_dev --eval "db.dropDatabase()"

# Reset Redis
redis-cli FLUSHDB

# Initialize with test data
mongosh openframe_dev --eval "
  db.tenants.insertOne({
    _id: 'dev-tenant',
    domain: 'localhost',
    status: 'ACTIVE'
  });
  db.users.insertOne({
    email: 'dev@openframe.local',
    tenantId: 'dev-tenant',
    role: 'ADMIN'
  });
"

echo "Development data reset complete!"
```

## Troubleshooting

### Common Development Issues

#### Port Conflicts
```bash
# Find processes using OpenFrame ports
lsof -i :8080
lsof -i :8081  
lsof -i :8082

# Kill conflicting processes
kill -9 [PID]
```

#### Service Startup Issues
```bash
# Check service logs for startup errors
tail -f auth.log
tail -f gateway.log

# Verify infrastructure services
docker-compose -f docker-compose.dev.yml ps
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh --eval "db.runCommand('ping')"

# Test Redis connection
redis-cli ping

# Check network connectivity
telnet localhost 27017
telnet localhost 6379
```

#### Memory Issues
```bash
# Check available memory
free -h

# Increase JVM heap size
export MAVEN_OPTS="-Xmx4g"
java -Xmx2g -jar service.jar
```

## Next Steps

With your local development environment running:

1. **[Explore the Architecture](../architecture/README.md)** - Understand service interactions
2. **[Review Security Guidelines](../security/README.md)** - Learn secure development practices
3. **[Set Up Testing](../testing/README.md)** - Configure comprehensive testing
4. **[Join the Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Connect with other developers

Your local OpenFrame environment is now ready for development! 🚀