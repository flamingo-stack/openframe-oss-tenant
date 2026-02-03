# Local Development Workflow

This guide covers the day-to-day development workflow for OpenFrame, including running services locally, debugging, testing changes, and common development tasks.

## Daily Development Startup

### Quick Start Script

OpenFrame provides platform-specific scripts for rapid local development:

```bash
# macOS
./scripts/run-mac.sh

# Linux  
./scripts/run-linux.sh

# Windows PowerShell
./scripts/run-windows.ps1

# Silent mode (no prompts, uses defaults)
./scripts/run-mac.sh --silent
```

These scripts will:
1. Start required databases (MongoDB, Redis, Kafka)
2. Build all services if needed
3. Start services in correct order
4. Open the web interface

### Manual Service Startup

For more control or debugging, start services manually:

#### 1. Start Infrastructure Services

```bash
# Start databases and message queue
docker-compose -f integrated-tools/docker-compose.yml up -d mongodb redis kafka

# Verify they're running
docker-compose -f integrated-tools/docker-compose.yml ps
```

#### 2. Start Core Services (in order)

**Terminal 1 - Configuration Service:**
```bash
cd openframe/services/openframe-config
mvn spring-boot:run -Dspring.profiles.active=dev
```

**Terminal 2 - Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring.profiles.active=dev
```

**Terminal 3 - API Service:**
```bash
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring.profiles.active=dev
```

**Terminal 4 - Gateway Service:**
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring.profiles.active=dev
```

**Terminal 5 - Management Service:**
```bash
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring.profiles.active=dev
```

#### 3. Start Frontend

```bash
cd openframe/services/openframe-frontend
npm run dev
```

## Development Workflow

### Code Changes and Hot Reload

OpenFrame supports hot reloading for rapid development:

#### Java Services Hot Reload

Java services use Spring Boot DevTools for automatic restart:

1. **Make code changes** in your IDE
2. **Save the file** (Ctrl+S / Cmd+S)
3. **DevTools detects changes** and restarts the service
4. **Test your changes** immediately

**Example: Adding a new GraphQL query**

```java
// In src/main/java/com/openframe/api/datafetcher/DeviceDataFetcher.java
@DgsQuery
public Device deviceById(@InputArgument String id) {
    // Add your implementation
    log.debug("Fetching device by ID: {}", id);
    return deviceService.findById(id);
}

// Save file → Service restarts → Test at http://localhost:8081/graphql
```

#### Frontend Hot Module Replacement (HMR)

Vue components reload instantly without losing state:

1. **Edit Vue components** in your IDE
2. **Save changes** 
3. **Browser updates immediately** without page refresh
4. **Component state preserved** during reload

**Example: Component change**

```vue
<!-- In src/components/DeviceCard.vue -->
<template>
  <div class="device-card">
    <h3>{{ device.name }}</h3>
    <!-- Add new field -->
    <p>Status: {{ device.status }}</p>
  </div>
</template>

<!-- Save → Browser updates immediately -->
```

### Development URLs

During development, services run on these URLs:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Web interface |
| **Gateway** | [http://localhost:8080](http://localhost:8080) | API gateway |
| **API Service** | [http://localhost:8081](http://localhost:8081) | GraphQL API |
| **GraphQL Playground** | [http://localhost:8081/graphql](http://localhost:8081/graphql) | API testing |
| **Auth Server** | [http://localhost:8082](http://localhost:8082) | OAuth endpoints |
| **Config Server** | [http://localhost:8888](http://localhost:8888) | Configuration |
| **Management** | [http://localhost:8084](http://localhost:8084) | Admin APIs |

## Debugging Guide

### Java Service Debugging

#### 1. Enable Debug Mode

Add debug arguments to Maven command:

```bash
# Start with debugging enabled
cd openframe/services/openframe-api
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"
```

#### 2. Attach Debugger in IDE

**IntelliJ IDEA:**
1. **Run → Edit Configurations**
2. **Add New → Remote JVM Debug**
3. **Host**: `localhost`, **Port**: `5005`
4. **Click Debug** to attach

**VS Code:**
```json
// .vscode/launch.json
{
  "type": "java",
  "name": "Attach to API Service",
  "request": "attach",
  "hostName": "localhost",
  "port": 5005
}
```

#### 3. Set Breakpoints and Debug

```java
@RestController
public class DeviceController {
    
    @GetMapping("/api/devices/{id}")
    public Device getDevice(@PathVariable String id) {
        // Set breakpoint here
        Device device = deviceService.findById(id);
        return device; // Execution will pause here
    }
}
```

### Frontend Debugging

#### 1. Browser DevTools

- **Vue DevTools**: Install browser extension for component inspection
- **Apollo DevTools**: For GraphQL query debugging
- **Chrome DevTools**: Network tab for API calls

#### 2. VS Code Debugging

```json
// .vscode/launch.json
{
  "type": "chrome",
  "request": "launch",
  "name": "Debug Frontend",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
  "sourceMaps": true
}
```

#### 3. Debug GraphQL Queries

```typescript
// In your Vue component
import { useQuery } from '@vue/apollo-composable'
import { GET_DEVICES } from '@/graphql/queries'

export default {
  setup() {
    const { result, loading, error } = useQuery(GET_DEVICES)
    
    // Add debugging
    watch(error, (newError) => {
      if (newError) {
        console.error('GraphQL Error:', newError)
        debugger // Breakpoint in browser DevTools
      }
    })
    
    return { result, loading, error }
  }
}
```

### Database Debugging

#### MongoDB Queries

```bash
# Connect to development database
mongosh mongodb://localhost:27017/openframe_dev

# Find documents
db.devices.find({}).limit(5).pretty()

# Check indexes
db.devices.getIndexes()

# Explain query performance
db.devices.find({tenantId: "tenant123"}).explain("executionStats")
```

#### Redis Debugging

```bash
# Connect to Redis
redis-cli -p 6379

# List all keys
KEYS *

# Check specific cache entry
GET "cache:tenant:tenant123:devices"

# Monitor Redis commands in real-time
MONITOR
```

## Testing Changes

### Unit Testing

Run tests for specific components:

```bash
# Java service tests
cd openframe/services/openframe-api
mvn test

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run specific test method  
mvn test -Dtest=DeviceServiceTest#testFindById

# Frontend tests
cd openframe/services/openframe-frontend
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- DeviceCard.spec.ts
```

### Integration Testing

```bash
# Run integration tests
cd openframe/services/openframe-api
mvn test -Dtest=*IT

# Run with specific profile
mvn test -Dtest=*IT -Dspring.profiles.active=integration
```

### End-to-End Testing

```bash
# Start all services first
./scripts/run-mac.sh

# In another terminal, run E2E tests
cd openframe-e2e-tests  
mvn test -Dtest=DevicesTest
```

### API Testing with curl

```bash
# Test health endpoints
curl http://localhost:8080/health
curl http://localhost:8081/health
curl http://localhost:8082/health

# Test GraphQL API
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { organizations { edges { node { id name } } } }"}'

# Test authentication
curl -X POST http://localhost:8082/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@example.com","password":"password"}'
```

## Common Development Tasks

### Adding a New GraphQL Query

1. **Define the query in schema**:

```graphql
# In src/main/resources/schema/device.graphqls
type Query {
    devicesByOrganization(organizationId: String!): [Device]
}
```

2. **Implement the data fetcher**:

```java
@Component
public class DeviceDataFetcher {
    
    @DgsQuery
    public List<Device> devicesByOrganization(@InputArgument String organizationId) {
        return deviceService.findByOrganizationId(organizationId);
    }
}
```

3. **Test the query**:

```graphql
# At http://localhost:8081/graphql
query {
  devicesByOrganization(organizationId: "org123") {
    id
    name
    status
  }
}
```

### Adding a New Vue Component

1. **Create the component**:

```vue
<!-- src/components/DeviceList.vue -->
<template>
  <div class="device-list">
    <h2>Devices</h2>
    <div v-for="device in devices" :key="device.id" class="device-item">
      {{ device.name }} - {{ device.status }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from '@vue/apollo-composable'
import { GET_DEVICES } from '@/graphql/queries'

const { result: devices, loading } = useQuery(GET_DEVICES)
</script>
```

2. **Add GraphQL query**:

```typescript
// src/graphql/queries/devices.ts
import { gql } from '@apollo/client/core'

export const GET_DEVICES = gql`
  query GetDevices {
    devices {
      edges {
        node {
          id
          name
          status
        }
      }
    }
  }
`
```

3. **Use in a page**:

```vue
<!-- src/pages/DevicesPage.vue -->
<template>
  <div>
    <DeviceList />
  </div>
</template>

<script setup lang="ts">
import DeviceList from '@/components/DeviceList.vue'
</script>
```

### Adding a New REST Endpoint

```java
@RestController
@RequestMapping("/api/devices")
public class DeviceController {
    
    @Autowired
    private DeviceService deviceService;
    
    @GetMapping("/{id}")
    public ResponseEntity<Device> getDevice(@PathVariable String id) {
        Device device = deviceService.findById(id);
        if (device == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(device);
    }
    
    @PostMapping
    public ResponseEntity<Device> createDevice(@RequestBody CreateDeviceRequest request) {
        Device device = deviceService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    }
}
```

### Database Migration/Schema Changes

OpenFrame uses code-first approach with MongoDB:

1. **Update domain models**:

```java
@Document(collection = "devices")
public class Device {
    @Id
    private String id;
    
    private String name;
    private DeviceStatus status;
    
    // Add new field
    private String description;
    
    // Getters and setters
}
```

2. **Services auto-create collections** on first use

3. **Add indexes as needed**:

```java
@Component
public class DatabaseInitializer {
    
    @EventListener
    public void onApplicationReady(ApplicationReadyEvent event) {
        // Create index for performance
        mongoTemplate.getCollection("devices")
            .createIndex(Indexes.compound(
                Indexes.ascending("tenantId"),
                Indexes.ascending("status")
            ));
    }
}
```

## Performance Optimization During Development

### JVM Tuning for Development

```bash
# Set JVM options for better development performance
export MAVEN_OPTS="-Xms1g -Xmx4g -XX:+UseG1GC -XX:+UseStringDeduplication"

# Enable JVM debugging and profiling
export JAVA_OPTS="-XX:+PrintGCDetails -XX:+PrintGCTimeStamps -Xloggc:gc.log"
```

### Database Performance

```javascript
// MongoDB indexes for development
db.devices.createIndex({ "tenantId": 1, "status": 1 })
db.users.createIndex({ "email": 1 }, { "unique": true })
db.organizations.createIndex({ "tenantId": 1 })
```

### Frontend Build Optimization

```typescript
// vite.config.ts - Development optimizations
export default defineConfig({
  server: {
    hmr: {
      overlay: false // Disable error overlay for cleaner debugging
    }
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', '@vue/apollo-composable'],
          ui: ['primevue/config', 'primevue/button']
        }
      }
    }
  }
})
```

## Troubleshooting Common Issues

### Service Won't Start

```bash
# Check if ports are available
lsof -i :8080
lsof -i :8081

# Check Java processes
jps -v

# Kill hung processes
pkill -f "spring-boot"
```

### Database Connection Issues

```bash
# Check MongoDB status
docker-compose -f integrated-tools/docker-compose.yml ps mongodb

# Check MongoDB logs
docker-compose -f integrated-tools/docker-compose.yml logs mongodb

# Restart MongoDB
docker-compose -f integrated-tools/docker-compose.yml restart mongodb
```

### Frontend Build Issues

```bash
# Clear caches
rm -rf node_modules/.cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check
```

### Memory Issues

```bash
# Monitor Java heap usage
jstat -gc -t <PID> 5s

# Monitor system memory
top -p <PID>

# Increase heap size temporarily
export MAVEN_OPTS="-Xmx6g"
```

## Next Steps

Now that you understand the local development workflow:

1. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
2. **[Testing Guide](../testing/overview.md)** - Learn testing best practices
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Prepare to contribute code

## Getting Help

For development support:

1. **Check service logs** for error messages
2. **Use debugging tools** to identify issues  
3. **Ask questions** in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. **Search documentation** for similar issues