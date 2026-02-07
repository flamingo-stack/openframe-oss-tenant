# Development Environment Setup

This comprehensive guide walks you through setting up a complete development environment for OpenFrame. Follow these steps to get a fully functional development setup for customizing, extending, and contributing to OpenFrame.

> **Note**: This guide is for development purposes. For production deployments, see the deployment documentation.

## Prerequisites

Before setting up the development environment, ensure you have the required software installed. See the [Prerequisites Guide](../../getting-started/prerequisites.md) for detailed installation instructions.

### Required Software Summary

- **Java 21+** (OpenJDK recommended)
- **Maven 3.8+** (for building Java services)
- **Node.js 18+** with npm
- **Docker 20.10+** with Docker Compose v2
- **Git 2.30+**
- **Rust 1.70+** (for client agent development)

### Development Tools (Recommended)

| Tool | Purpose | Download |
|------|---------|----------|
| **IntelliJ IDEA** | Java/Spring development | [Download](https://www.jetbrains.com/idea/) |
| **VS Code** | Frontend/TypeScript development | [Download](https://code.visualstudio.com/) |
| **Postman** | API testing | [Download](https://www.postman.com/) |
| **MongoDB Compass** | Database GUI | [Download](https://www.mongodb.com/products/compass) |

## Environment Setup

### 1. Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify repository structure
ls -la
```

Expected structure:
```text
openframe-oss-tenant/
├── openframe/                    # Main services and libraries
├── clients/                      # Client agents (Rust)
├── integrated-tools/             # External tool configurations
├── manifests/                    # Kubernetes manifests
├── scripts/                      # Development scripts
├── docker-compose.yml            # Local development stack
├── pom.xml                      # Maven parent POM
└── .env.example                 # Environment template
```

### 2. IDE Configuration

#### IntelliJ IDEA Setup

1. **Open Project**:
   ```text
   File → Open → Select openframe-oss-tenant directory
   Choose "Open as Maven Project"
   ```

2. **Configure Project SDK**:
   ```text
   File → Project Structure → Project
   Set Project SDK to Java 21
   Set Language Level to 21
   ```

3. **Install Plugins**:
   - **Spring Boot** (usually pre-installed)
   - **GraphQL** for schema development
   - **Docker** for container management
   - **Vue.js** for frontend development

4. **Configure Code Style**:
   ```text
   File → Settings → Editor → Code Style
   Import openframe-codestyle.xml (if available)
   ```

#### VS Code Setup

1. **Open Workspace**:
   ```bash
   code openframe-oss-tenant
   ```

2. **Install Extensions**:
   ```json
   {
     "recommendations": [
       "vscode.java-extension-pack",
       "ms-vscode.vscode-typescript-next",
       "vue.volar",
       "graphql.vscode-graphql",
       "ms-azuretools.vscode-docker",
       "rust-lang.rust-analyzer"
     ]
   }
   ```

3. **Configure Settings**:
   ```json
   {
     "java.home": "/path/to/java21",
     "typescript.preferences.includePackageJsonAutoImports": "auto",
     "vue.codeActions.enabled": true
   }
   ```

### 3. Development Environment Configuration

#### Create Environment File

```bash
# Copy example environment configuration
cp .env.example .env

# Edit configuration for development
nano .env  # or use your preferred editor
```

#### Development Environment Variables

```bash
# Development Environment Configuration
NODE_ENV=development
SPRING_PROFILES_ACTIVE=development

# Database URLs (Docker Compose)
MONGODB_URI=mongodb://localhost:27017/openframe
MONGODB_TEST_URI=mongodb://localhost:27017/openframe_test
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security Configuration (Development Only)
JWT_SECRET=dev-jwt-secret-256-bits-change-for-production
ENCRYPTION_KEY=dev-encryption-key-32-characters
OAUTH_CLIENT_SECRET=dev-oauth-client-secret

# Service URLs
GATEWAY_URL=http://localhost:8080
API_URL=http://localhost:8081
AUTH_URL=http://localhost:8082
MANAGEMENT_URL=http://localhost:8083
STREAM_URL=http://localhost:8084
FRONTEND_URL=http://localhost:3000
EXTERNAL_API_URL=http://localhost:8085

# Development Flags
DEBUG_MODE=true
LOG_LEVEL=DEBUG
HOT_RELOAD=true
DISABLE_CSRF=true
ENABLE_DEV_TOOLS=true

# External Tools (Optional)
TACTICAL_RMM_URL=http://localhost:8001
MESHCENTRAL_URL=http://localhost:4430
FLEET_URL=http://localhost:8080/fleet

# Email Configuration (Development - use MailHog)
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USERNAME=
MAIL_PASSWORD=
```

#### Configure Java Build Settings

Create or update `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
                              http://maven.apache.org/xsd/settings-1.0.0.xsd">
    <profiles>
        <profile>
            <id>openframe-dev</id>
            <properties>
                <maven.compiler.source>21</maven.compiler.source>
                <maven.compiler.target>21</maven.compiler.target>
                <spring.profiles.active>development</spring.profiles.active>
            </properties>
        </profile>
    </profiles>
    
    <activeProfiles>
        <activeProfile>openframe-dev</activeProfile>
    </activeProfiles>
</settings>
```

### 4. Database Setup

#### Start Development Infrastructure

```bash
# Start databases and message brokers
docker-compose up -d mongodb redis kafka mailhog

# Verify services are running
docker-compose ps
```

#### Initialize Development Data

```bash
# Create development database
mongo openframe --eval "db.version()"

# Import sample data (if available)
mongoimport --db openframe --collection organizations --file scripts/sample-data/organizations.json

# Create indexes for development
mongo openframe < scripts/db/create-indexes.js
```

#### Configure Redis for Development

```bash
# Connect to Redis CLI
redis-cli

# Set development configuration
CONFIG SET maxmemory 256mb
CONFIG SET maxmemory-policy allkeys-lru

# Exit Redis CLI
exit
```

### 5. Build and Start Services

#### Build All Services

```bash
# Clean build of all Java services
mvn clean install -DskipTests

# Build with tests (takes longer)
mvn clean install

# Verify build success
echo $?  # Should return 0
```

#### Start Services in Development Mode

**Terminal 1 - Gateway Service:**
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Terminal 2 - API Service:**
```bash
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Terminal 3 - Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Terminal 4 - Management Service:**
```bash
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

**Terminal 5 - Stream Processing:**
```bash
cd openframe/services/openframe-stream
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

#### Start Frontend Development Server

**Terminal 6 - Frontend:**
```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

### 6. Development Scripts

Create convenience scripts for common development tasks:

#### `scripts/dev-start.sh`

```bash
#!/bin/bash
set -e

echo "Starting OpenFrame Development Environment..."

# Start infrastructure
echo "Starting databases..."
docker-compose up -d mongodb redis kafka mailhog

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Start backend services
echo "Starting backend services..."
./scripts/start-backend.sh &

# Start frontend
echo "Starting frontend..."
cd openframe/services/openframe-frontend
npm run dev &

echo "Development environment started!"
echo "Frontend: http://localhost:3000"
echo "API Gateway: http://localhost:8080"
echo "GraphQL Playground: http://localhost:8081/graphql"
```

#### `scripts/dev-stop.sh`

```bash
#!/bin/bash
echo "Stopping OpenFrame Development Environment..."

# Stop Java processes
pkill -f "spring-boot:run"

# Stop Docker services
docker-compose down

echo "Development environment stopped."
```

#### `scripts/dev-reset.sh`

```bash
#!/bin/bash
echo "Resetting Development Environment..."

# Stop everything
./scripts/dev-stop.sh

# Clean build
mvn clean

# Reset databases
docker-compose down -v
docker-compose up -d mongodb redis kafka

# Rebuild
mvn install -DskipTests

echo "Development environment reset complete."
```

### 7. Testing Setup

#### Configure Test Databases

```bash
# Create test database
mongo openframe_test --eval "db.version()"

# Set test environment variables
export MONGODB_TEST_URI="mongodb://localhost:27017/openframe_test"
export SPRING_PROFILES_ACTIVE="test"
```

#### Run Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=ApiApplicationTest

# Run tests with coverage
mvn test jacoco:report

# Run integration tests
mvn test -Dgroups=integration

# Run e2e tests
cd openframe-e2e-tests
mvn test -Dtest=DevicesTest
```

## Development Workflows

### 1. Feature Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-api-endpoint

# Make changes
# ... development work ...

# Run tests
mvn test

# Commit changes
git add .
git commit -m "Add new API endpoint for device management"

# Push and create PR
git push origin feature/new-api-endpoint
```

### 2. Service Development

#### Add New REST Endpoint

1. **Create Controller**:
   ```java
   @RestController
   @RequestMapping("/api/v1/devices")
   public class DeviceController {
       
       @GetMapping
       public ResponseEntity<List<Device>> getDevices() {
           // Implementation
       }
   }
   ```

2. **Add Service Layer**:
   ```java
   @Service
   public class DeviceService {
       public List<Device> findAllDevices() {
           // Implementation
       }
   }
   ```

3. **Add Repository**:
   ```java
   @Repository
   public interface DeviceRepository extends MongoRepository<Device, String> {
       List<Device> findByOrganizationId(String organizationId);
   }
   ```

#### Add New GraphQL Endpoint

1. **Update Schema** (`src/main/resources/schema/devices.graphqls`):
   ```graphql
   type Query {
       devices(filter: DeviceFilter): DeviceConnection
   }
   
   type Device {
       id: ID!
       name: String!
       status: DeviceStatus!
   }
   ```

2. **Create Data Fetcher**:
   ```java
   @DgsComponent
   public class DeviceDataFetcher {
       
       @DgsQuery
       public List<Device> devices(@InputArgument DeviceFilter filter) {
           // Implementation
       }
   }
   ```

### 3. Frontend Development

#### Create New Vue Component

```vue
<template>
  <div class="device-list">
    <DataTable :value="devices" responsiveLayout="scroll">
      <Column field="name" header="Device Name"></Column>
      <Column field="status" header="Status">
        <template #body="slotProps">
          <Badge :value="slotProps.data.status" 
                 :severity="getStatusSeverity(slotProps.data.status)"/>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDevicesApi } from '@/api/devices'

const { fetchDevices } = useDevicesApi()
const devices = ref([])

onMounted(async () => {
  devices.value = await fetchDevices()
})

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'ONLINE': return 'success'
    case 'OFFLINE': return 'danger'
    default: return 'warning'
  }
}
</script>
```

#### Add GraphQL Query

```typescript
// src/api/devices.ts
import { gql } from '@apollo/client/core'

export const GET_DEVICES = gql`
  query GetDevices($filter: DeviceFilter) {
    devices(filter: $filter) {
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
`

export const useDevicesApi = () => {
  const { query } = useApolloClient()
  
  const fetchDevices = async (filter?: DeviceFilter) => {
    const result = await query({
      query: GET_DEVICES,
      variables: { filter }
    })
    return result.data.devices.edges.map(edge => edge.node)
  }
  
  return { fetchDevices }
}
```

## Development Tools and Debugging

### 1. GraphQL Development

#### GraphQL Playground

Access GraphQL Playground at http://localhost:8081/graphql

Example queries:
```graphql
# Query devices
query GetDevices {
  devices {
    edges {
      node {
        id
        name
        status
        organization {
          id
          name
        }
      }
    }
  }
}

# Create organization
mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    id
    name
    website
  }
}
```

### 2. Database Development

#### MongoDB Queries

```javascript
// Connect to development database
use openframe

// Find all devices
db.devices.find({})

// Find devices by organization
db.devices.find({organizationId: "org-123"})

// Create compound index
db.devices.createIndex({organizationId: 1, status: 1})

// Aggregation pipeline example
db.devices.aggregate([
  {$match: {status: "ONLINE"}},
  {$group: {_id: "$organizationId", count: {$sum: 1}}}
])
```

#### Redis Debugging

```bash
# Monitor Redis commands
redis-cli monitor

# Check cache keys
redis-cli keys "*device*"

# Inspect cached data
redis-cli get "cache:device:123"
```

### 3. Logging and Monitoring

#### Application Logs

```bash
# Tail logs for specific service
tail -f openframe/services/openframe-api/logs/application.log

# Filter logs by level
grep "ERROR" openframe/services/*/logs/application.log

# Follow all service logs
multitail openframe/services/*/logs/application.log
```

#### Log Configuration

Update `application-development.yml`:

```yaml
logging:
  level:
    com.openframe: DEBUG
    org.springframework.web: DEBUG
    org.springframework.security: DEBUG
  pattern:
    console: "%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/application.log
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Clean and rebuild
mvn clean install -U

# Check Java version
java -version
mvn -version
```

#### Database Connection Issues

```bash
# Check MongoDB status
docker logs mongodb

# Test connection
mongo --eval "db.adminCommand('ismaster')"

# Check network connectivity
telnet localhost 27017
```

#### Port Conflicts

```bash
# Check what's using a port
lsof -i :8080
netstat -tlnp | grep :8080

# Kill process using port
sudo kill -9 $(lsof -t -i :8080)
```

#### Memory Issues

```bash
# Increase Java heap size
export MAVEN_OPTS="-Xmx2g -XX:MaxMetaspaceSize=512m"

# Monitor JVM memory
jstat -gc $(jps | grep ApiApplication | cut -d' ' -f1) 1s
```

### Performance Optimization

#### JVM Tuning for Development

```bash
# Set JVM options for development
export JAVA_OPTS="-Xmx1g -Xms512m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Enable JVM debugging
export JAVA_OPTS="$JAVA_OPTS -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

#### Database Performance

```javascript
// MongoDB performance monitoring
db.enableFreeMonitoring()

// Check slow operations
db.getProfilingStatus()
db.setProfilingLevel(2, { slowms: 100 })

// Explain query performance
db.devices.find({organizationId: "org-123"}).explain("executionStats")
```

## Next Steps

Your development environment is now configured! Here's what to do next:

1. **[Local Development Guide](local-development.md)** - Day-to-day development workflows
2. **[Testing Overview](../testing/overview.md)** - Testing strategies and tools
3. **[Contributing Guidelines](../contributing/guidelines.md)** - How to contribute code
4. **[Architecture Overview](../architecture/overview.md)** - Understanding the system design

## Getting Help

- **Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Issues**: Report problems or ask questions
- **Documentation**: Explore the complete documentation suite

---

**Happy developing!** 🚀 Your OpenFrame development environment is ready for building amazing MSP solutions.