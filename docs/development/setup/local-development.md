# Local Development Guide

This guide walks you through running OpenFrame locally for development, including hot reload, debugging, and development workflow.

> **Prerequisites**: Complete the [Environment Setup Guide](environment.md) before proceeding.

## Quick Start for Development

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Load environment variables
source .env.local  # or set up as per environment guide
```

### 2. Start Infrastructure Services

```bash
# Start databases and messaging systems
docker-compose -f integrated-tools/docker-compose.yml up -d

# Verify services are running
docker-compose -f integrated-tools/docker-compose.yml ps
```

### 3. Build Project

```bash
# Build all Java modules (skip tests for faster startup)
mvn clean install -DskipTests

# Or build with tests (slower but more thorough)
mvn clean install
```

### 4. Start Backend Services

You have several options for running the backend services:

#### Option A: Use Platform Scripts (Recommended)

```bash
# Start all services with automatic ordering
./scripts/run-mac.sh          # macOS
./scripts/run-linux.sh        # Linux  
./scripts/run-windows.ps1     # Windows

# Silent mode (no prompts)
./scripts/run-mac.sh --silent
```

#### Option B: Start Services Manually

```bash
# Terminal 1: Config Server (must start first)
cd openframe/services/openframe-config
mvn spring-boot:run

# Terminal 2: Authorization Server  
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Terminal 3: Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Terminal 4: API Service
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Terminal 5: Client Service
cd openframe/services/openframe-client  
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Terminal 6: Management Service
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

#### Option C: IDE-Based Development

See [IDE Configuration](#ide-configuration) section below.

### 5. Start Frontend Development Server

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies (first time only)
npm install

# Start development server with hot reload
npm run dev

# Frontend will be available at http://localhost:3000
```

## Service Startup Order

Services must be started in this specific order due to dependencies:

```mermaid
graph TD
    A[Infrastructure Services] --> B[Config Server :8888]
    B --> C[Authorization Server :8082]
    C --> D[Gateway Service :8080]
    D --> E[API Service :8081]
    D --> F[Client Service :8083]
    D --> G[Management Service :8084]
    G --> H[Stream Service :8085]
```

### Startup Sequence Details

1. **Infrastructure** (Docker Compose): MongoDB, Kafka, Redis, Cassandra
2. **Config Server** (port 8888): Provides configuration for other services
3. **Authorization Server** (port 8082): Handles OAuth2/OIDC authentication
4. **Gateway Service** (port 8080): API gateway and routing
5. **API Service** (port 8081): GraphQL and REST APIs
6. **Client Service** (port 8083): Agent management
7. **Management Service** (port 8084): Administrative tasks
8. **Stream Service** (port 8085): Event processing
9. **Frontend** (port 3000): Vue.js development server

## Development Workflow

### Hot Reload and Live Development

#### Backend Hot Reload

Spring Boot DevTools provides automatic restart on code changes:

```xml
<!-- Already included in pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

Enable in your IDE:
- **IntelliJ**: Build → Build Project (Ctrl+F9) after changes
- **VS Code**: Java extension pack handles this automatically
- **Command Line**: Changes detected automatically

#### Frontend Hot Reload

Vite provides instant hot module replacement:

```bash
# Start with hot reload (default)
npm run dev

# View with network access (for testing on other devices)
npm run dev -- --host 0.0.0.0
```

### Testing During Development

#### Unit Tests

```bash
# Run all Java unit tests
mvn test

# Run tests for specific module
mvn test -pl openframe-api

# Run tests with coverage
mvn test jacoco:report

# Run frontend unit tests
cd openframe/services/openframe-frontend
npm test

# Run tests in watch mode
npm test -- --watch
```

#### Integration Tests

```bash
# Run integration tests (requires services to be running)
mvn test -Dtest=**/*IntegrationTest

# Run specific integration test
mvn test -Dtest=DeviceIntegrationTest
```

#### End-to-End Tests

```bash
# Start all services first, then run E2E tests
cd openframe-e2e-tests
mvn test -Dtest=SmokeTest
```

### Debugging

#### Java Service Debugging

##### IntelliJ IDEA

1. **Set up Remote Debug Configuration**:
   - Run → Edit Configurations
   - Add → Remote JVM Debug
   - Host: localhost, Port: 5005
   - Use module classpath: select service module

2. **Start service with debug enabled**:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
   ```

3. **Attach debugger**: Run → Debug 'Remote Debug'

##### VS Code

1. **Add to `.vscode/launch.json`**:
   ```json
   {
     "type": "java",
     "name": "Debug OpenFrame API",
     "request": "attach",
     "hostName": "localhost",
     "port": 5005
   }
   ```

2. **Start with debug and attach**

#### Frontend Debugging

##### Browser DevTools

- **Vue DevTools**: Install browser extension for component inspection
- **Network Tab**: Monitor API calls and GraphQL queries
- **Console**: View application logs and errors

##### VS Code Debugging

```json
{
  "name": "Debug Frontend",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
  "sourceMapPathOverrides": {
    "webpack:///src/*": "${webRoot}/*"
  }
}
```

### Database Development

#### MongoDB Development

```bash
# Connect to development database
mongosh mongodb://admin:password@localhost:27017/openframe_dev?authSource=admin

# Useful development queries
use openframe_dev
db.organizations.find().pretty()
db.devices.find({status: "ONLINE"}).count()
db.users.find({email: /admin/}).pretty()

# Drop collections for clean slate
db.devices.drop()
db.events.drop()
```

#### Sample Data Loading

Create development data for testing:

```javascript
// MongoDB sample data script
use openframe_dev

// Create test organization
db.organizations.insertOne({
  _id: ObjectId(),
  name: "Dev Test MSP",
  domain: "dev.local",
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date()
})

// Create test devices
db.devices.insertMany([
  {
    hostname: "dev-server-01",
    platform: "linux",
    status: "ONLINE",
    organizationId: ObjectId("..."),
    lastSeen: new Date()
  },
  {
    hostname: "dev-workstation-01", 
    platform: "windows",
    status: "OFFLINE",
    organizationId: ObjectId("..."),
    lastSeen: new Date(Date.now() - 3600000)
  }
])
```

### API Development and Testing

#### GraphQL Development

##### GraphiQL Interface

Access interactive GraphQL explorer at:
- `http://localhost:8080/graphiql` (via Gateway)
- `http://localhost:8081/graphiql` (direct API service)

##### Sample Queries

```graphql
# Get organizations
query GetOrganizations {
  organizations {
    edges {
      node {
        id
        name
        domain
        deviceCount
      }
    }
  }
}

# Get devices for organization  
query GetDevices($organizationId: ID!) {
  devices(organizationId: $organizationId) {
    edges {
      node {
        id
        hostname
        platform
        status
        lastSeen
      }
    }
  }
}

# Create organization
mutation CreateOrganization($input: CreateOrganizationInput!) {
  createOrganization(input: $input) {
    organization {
      id
      name
      domain
    }
  }
}
```

#### REST API Testing

```bash
# Health check
curl http://localhost:8080/health

# Get authentication token
curl -X POST http://localhost:8082/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=openframe-dev&client_secret=dev-secret"

# Use token for API calls
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/organizations
```

### Logs and Monitoring

#### Viewing Logs

```bash
# Follow all service logs
tail -f openframe/services/*/logs/application.log

# Service-specific logs
tail -f openframe/services/openframe-gateway/logs/application.log

# Docker service logs
docker-compose -f integrated-tools/docker-compose.yml logs -f mongodb
docker-compose -f integrated-tools/docker-compose.yml logs -f kafka
```

#### Log Configuration for Development

Create `application-local.yml` in each service:

```yaml
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
    org.mongodb.driver: INFO
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/application.log
```

## IDE Configuration

### IntelliJ IDEA Setup

#### Project Structure

1. **File → Open** → Select `openframe-oss-tenant` directory
2. **Import as Maven project**
3. **Configure modules**:
   - Mark `openframe/services/*/src/main/java` as Sources
   - Mark `openframe/services/*/src/test/java` as Test Sources
   - Mark `openframe/services/*/src/main/resources` as Resources

#### Run Configurations

Create run configurations for each service:

```xml
<!-- Gateway Service Configuration -->
<configuration name="Gateway Service" type="SpringBootApplicationConfigurationType">
  <option name="ACTIVE_PROFILES" value="local" />
  <option name="MAIN_CLASS_NAME" value="com.openframe.gateway.GatewayApplication" />
  <option name="MODULE_NAME" value="openframe-gateway" />
  <envs>
    <env name="SPRING_PROFILES_ACTIVE" value="local" />
    <env name="MONGODB_URI" value="mongodb://admin:password@localhost:27017/openframe_dev?authSource=admin" />
  </envs>
</configuration>
```

#### Database Tool Window

1. **View → Tool Windows → Database**
2. **Add MongoDB connection**:
   - Host: localhost:27017
   - Database: openframe_dev
   - User: admin / Password: password

### VS Code Setup

#### Multi-root Workspace

Create `.vscode/openframe.code-workspace`:

```json
{
  "folders": [
    { "name": "Root", "path": "." },
    { "name": "Frontend", "path": "./openframe/services/openframe-frontend" },
    { "name": "Gateway", "path": "./openframe/services/openframe-gateway" },
    { "name": "API", "path": "./openframe/services/openframe-api" }
  ],
  "settings": {
    "java.compile.nullAnalysis.mode": "automatic",
    "java.configuration.updateBuildConfiguration": "automatic"
  }
}
```

#### Tasks Configuration

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All Services",
      "type": "shell",
      "command": "mvn clean install -DskipTests",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    },
    {
      "label": "Start Infrastructure",
      "type": "shell",
      "command": "docker-compose -f integrated-tools/docker-compose.yml up -d",
      "group": "build"
    },
    {
      "label": "Frontend Dev Server",
      "type": "npm",
      "script": "dev",
      "path": "openframe/services/openframe-frontend/",
      "group": "build",
      "isBackground": true
    }
  ]
}
```

## Performance Optimization for Development

### Java Service Optimization

#### JVM Arguments for Development

```bash
# Add to IDE run configurations or JAVA_OPTS
-Xmx2g -Xms1g
-XX:+UseG1GC
-XX:+UseStringDeduplication
-Dspring.devtools.restart.enabled=true
-Dspring.devtools.livereload.enabled=true
```

#### Spring Boot DevTools Configuration

```properties
# application-local.properties
spring.devtools.restart.enabled=true
spring.devtools.restart.additional-paths=src/main/java
spring.devtools.livereload.enabled=true
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

### Frontend Optimization

#### Vite Development Configuration

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: { port: 3001 }, // Hot module replacement
    host: '0.0.0.0',     // Network access
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'apollo-client'],
  },
  build: {
    sourcemap: true, // Enable for debugging
  },
})
```

### Database Performance

#### MongoDB Development Optimizations

```javascript
// Increase query timeout for development
db.adminCommand({setParameter: 1, maxTimeMS: 30000})

// Enable query profiling
db.setProfilingLevel(2, {slowms: 100})

// Create development indexes
db.devices.createIndex({organizationId: 1, hostname: 1})
db.events.createIndex({timestamp: -1, organizationId: 1})
```

## Troubleshooting Common Development Issues

### Service Startup Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :8080
netstat -tulpn | grep 8080

# Kill process
kill -9 <PID>

# Or kill all Java processes
pkill -f java
```

#### Configuration Issues

```bash
# Verify environment variables
echo $MONGODB_URI
echo $SPRING_PROFILES_ACTIVE

# Check Spring Boot configuration
curl http://localhost:8080/actuator/configprops
curl http://localhost:8080/actuator/env
```

### Database Connection Issues

```bash
# Test MongoDB connectivity
mongosh mongodb://admin:password@localhost:27017/openframe_dev

# Test Redis connectivity  
redis-cli ping

# Test Kafka connectivity
kafka-console-consumer --bootstrap-server localhost:9092 --topic __consumer_offsets --from-beginning --max-messages 1
```

### Frontend Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Build production version
npm run build
```

### Memory Issues

```bash
# Monitor Java processes
jps -l
jstat -gc <PID>

# Monitor overall system
htop
free -h

# Increase JVM memory
export JAVA_OPTS="-Xmx4g -Xms2g"
```

## Next Steps

Now that you have OpenFrame running locally:

1. **Explore the [Architecture Overview](../architecture/overview.md)** to understand the system design
2. **Review the [Testing Guide](../testing/overview.md)** to learn about testing practices  
3. **Check the [Contributing Guidelines](../contributing/guidelines.md)** to start contributing
4. **Try making your first code change** and see hot reload in action

---

**Local development setup complete!** You now have a full OpenFrame development environment running with hot reload, debugging, and all the tools you need for productive development.