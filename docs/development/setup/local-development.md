# Local Development Guide

This guide covers running OpenFrame locally for development, including hot reload configuration, debugging setup, and common development workflows.

## Prerequisites

Before starting, ensure you have completed the [Environment Setup](environment.md) guide and have:

- ✅ Java 21 and Maven installed
- ✅ Node.js 18+ installed  
- ✅ Development databases running (MongoDB, Redis, Cassandra, etc.)
- ✅ IDE configured (IntelliJ IDEA or VS Code)
- ✅ Environment variables set

## Clone and Setup

### 1. Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up development branch (optional)
git checkout -b feature/your-development-work
```

### 2. Verify Project Structure

The repository follows this structure:

```text
openframe-oss-tenant/
├── openframe/services/          # Spring Boot microservices
│   ├── openframe-api/          # REST + GraphQL API service
│   ├── openframe-gateway/      # API gateway and security
│   ├── openframe-authorization-server/  # OAuth2/OIDC server
│   ├── openframe-client/       # Agent lifecycle management
│   ├── openframe-stream/       # Event processing service
│   ├── openframe-external-api/ # Public API endpoints
│   ├── openframe-management/   # Operational tooling
│   ├── openframe-config/       # Configuration server
│   └── openframe-frontend/     # Web UI application
├── clients/                    # Desktop clients and agents
│   ├── openframe-client/       # Device agent (Rust)
│   └── openframe-chat/         # Desktop chat client (Tauri)
├── scripts/                    # Development and deployment scripts
├── manifests/                  # Kubernetes and Docker configs
├── integrated-tools/           # Third-party tool configurations
└── pom.xml                     # Parent Maven configuration
```

### 3. Configure Development Environment

Create or update your development configuration:

```bash
# Copy sample development configuration
cp .env.example .env.development

# Edit with your specific settings
nano .env.development
```

**Example `.env.development`**:
```bash
# Development Configuration
OPENFRAME_PROFILE=development
SPRING_PROFILES_ACTIVE=development

# Database URLs (update ports if different)
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042

# Message Brokers
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_SERVERS=nats://localhost:4222

# AI Integration
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}

# Development Features
SPRING_DEVTOOLS_RESTART_ENABLED=true
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
```

## Running Locally

### Method 1: Full Stack Startup (Recommended)

This approach starts all services with proper dependency ordering:

```bash
# 1. Start development dependencies (databases, message brokers)
./scripts/dev-start-dependencies.sh

# 2. Initialize development configuration and data
./clients/openframe-client/scripts/setup_dev_init_config.sh

# 3. Build all services (skip tests for faster startup)
mvn clean install -DskipTests

# 4. Start all services in dependency order
./scripts/start-all-services.sh

# 5. Start the frontend (in a new terminal)
cd openframe/services/openframe-frontend
npm install  # First time only
npm run dev
```

**Services will start in this order:**
1. **Config Server** (port 8888)
2. **Authorization Server** (port 8082) 
3. **Gateway** (port 8081)
4. **API Service** (port 8080)
5. **External API** (port 8083)
6. **Client Service** (port 8084)
7. **Stream Service** (port 8085)
8. **Management Service** (port 8086)

### Method 2: Individual Service Development

For focused development on specific services:

```bash
# Start only required dependencies
docker compose -f docker-compose.dev.yml up -d mongodb redis kafka

# Start specific service with Spring Boot Maven plugin
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development

# Or run from your IDE with development profile active
```

### Method 3: IDE-Based Development

**IntelliJ IDEA Setup:**

1. **Import Project**:
   - File → Open → Select `openframe-oss-tenant` directory
   - Choose "Import as Maven project"
   - Wait for indexing to complete

2. **Configure Run Configurations**:
   
   **API Service Configuration**:
   ```text
   Name: OpenFrame API Service
   Main class: com.openframe.api.ApiApplication
   VM options: -Xms512m -Xmx2g -Dspring.profiles.active=development
   Environment variables: Load from .env.development file
   Working directory: $MODULE_WORKING_DIR$
   ```

   **Gateway Service Configuration**:
   ```text
   Name: OpenFrame Gateway Service
   Main class: com.openframe.gateway.GatewayApplication
   VM options: -Xms256m -Xmx1g -Dspring.profiles.active=development
   Environment variables: Load from .env.development file
   ```

3. **Start Services**:
   - Use the configured run configurations
   - Start in dependency order: Config → Auth → Gateway → API

## Hot Reload and Watch Mode

### Backend Hot Reload with Spring Boot DevTools

**Spring Boot DevTools** is included in all service modules and provides:

- **Automatic restart** when classpath changes
- **LiveReload** browser integration
- **Property defaults** for development
- **H2 console** access (when using H2 for testing)

**Configuration** (`application-development.yml`):
```yaml
spring:
  devtools:
    restart:
      enabled: true
      additional-paths: src/main/java
      exclude: static/**,public/**,resources/static/**
    livereload:
      enabled: true
      port: 35729
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
  logging:
    level:
      com.openframe: DEBUG
      org.springframework.web: DEBUG
```

### Frontend Hot Reload

**Next.js Development Server** (for openframe-frontend):
```bash
cd openframe/services/openframe-frontend

# Install dependencies (first time)
npm install

# Start with hot reload and turbo mode
npm run dev

# With debugging enabled
npm run dev:debug
```

**Features enabled in development**:
- **Fast Refresh** - Component state preservation during edits
- **Error Overlay** - Runtime error display in browser
- **Source Maps** - Debugging support for TypeScript
- **API Route Hot Reload** - Backend API changes without restart

### VoltAgent and Node.js Components

For the VoltAgent-based Node.js components:

```bash
# Install nodemon for auto-restart
npm install -g nodemon

# Run Node.js services with auto-reload
nodemon --exec "node --loader tsx/esm" src/main.ts

# Or with npm scripts
npm run dev:watch
```

## Debug Configuration

### Backend Service Debugging

**IntelliJ IDEA Debug Configuration**:
```text
Name: Debug API Service
Configuration type: Remote JVM Debug
Debugger mode: Attach to remote JVM
Host: localhost
Port: 5005
```

**Start service with debugging**:
```bash
cd openframe/services/openframe-api

# Start with debug agent
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Or set environment variable
export JAVA_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
mvn spring-boot:run
```

### Frontend Debugging

**VS Code Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeArgs": ["--inspect"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

**Browser DevTools Integration**:
- **React Developer Tools** - Component inspection
- **GraphQL Playground** - Available at `http://localhost:8080/graphql`
- **Network Tab** - API request/response debugging
- **Application Tab** - Local storage and session debugging

### Database Debugging

**MongoDB Debugging**:
```bash
# Enable MongoDB query logging
mongosh openframe_dev --eval "db.setLogLevel(2, 'query')"

# Monitor queries in real-time
mongosh openframe_dev --eval "db.runCommand({profile: 2})"
tail -f /var/log/mongodb/mongodb.log | grep -i query
```

**Cassandra Debugging**:
```bash
# Enable query tracing
cqlsh -e "TRACING ON; SELECT * FROM unified_log_event LIMIT 10;"

# Monitor slow queries
grep "SlowLog" /var/log/cassandra/debug.log
```

## Development Workflow Examples

### Common Development Tasks

#### 1. Adding a New REST Endpoint

**Backend (API Service)**:
```java
// 1. Create DTO
@Data
public class DeviceStatusRequest {
    private String deviceId;
    private String status;
}

// 2. Add Controller method
@RestController
@RequestMapping("/api/devices")
public class DeviceController {
    
    @PostMapping("/{deviceId}/status")
    public ResponseEntity<Device> updateDeviceStatus(
            @PathVariable String deviceId,
            @RequestBody DeviceStatusRequest request) {
        // Implementation
    }
}

// 3. Test with hot reload - save files and service restarts automatically
```

**Test the endpoint**:
```bash
# Test new endpoint immediately after saving
curl -X POST http://localhost:8080/api/devices/test-device-1/status \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-1","status":"online"}'
```

#### 2. Adding a Frontend Component

**Create component** (`openframe/services/openframe-frontend/src/components/DeviceStatus.tsx`):
```typescript
import React from 'react';

interface DeviceStatusProps {
  deviceId: string;
  status: 'online' | 'offline' | 'maintenance';
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({ deviceId, status }) => {
  return (
    <div className={`device-status status-${status}`}>
      Device {deviceId}: {status}
    </div>
  );
};
```

**Use in page** - Save and see changes immediately with Fast Refresh:
```typescript
import { DeviceStatus } from '../components/DeviceStatus';

export default function DevicesPage() {
  return (
    <div>
      <h1>Devices</h1>
      <DeviceStatus deviceId="dev-001" status="online" />
    </div>
  );
}
```

#### 3. Testing AI Integration

**Test Mingo AI locally**:
```typescript
// In your frontend or Node.js service
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Test AI integration
const response = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1000,
  messages: [{
    role: 'user',
    content: 'Help me understand the current system status'
  }]
});

console.log(response.content);
```

### Performance Testing in Development

**Load Testing APIs**:
```bash
# Install Apache Bench
sudo apt install apache2-utils  # Ubuntu
brew install httpie            # macOS

# Test API performance
ab -n 1000 -c 10 http://localhost:8080/api/devices
```

**Database Performance Monitoring**:
```bash
# MongoDB performance stats
mongosh openframe_dev --eval "db.runCommand({serverStatus: 1}).metrics"

# Redis performance monitoring
redis-cli --latency-history -i 1
```

### Integration Testing

**Test service-to-service communication**:
```bash
# Start all services
./scripts/start-all-services.sh

# Test API → Authorization Server flow
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dev@example.com","password":"devpass"}'

# Test Gateway → API routing
curl -H "Authorization: Bearer <token>" \
  http://localhost:8081/api/devices
```

## Troubleshooting Development Issues

### Service Startup Issues

**Port conflicts**:
```bash
# Find what's using port 8080
lsof -i :8080
kill $(lsof -t -i:8080)

# Or use different ports in application-development.yml
server:
  port: 8090  # Use alternative port
```

**Memory issues**:
```bash
# Increase JVM memory for development
export MAVEN_OPTS="-Xmx4g -Xms2g"
export JAVA_OPTS="-Xmx4g -Xms2g"

# Monitor memory usage
jcmd <pid> GC.run_finalization
jcmd <pid> VM.memory_summary
```

**Database connection issues**:
```bash
# Test connections individually
mongosh mongodb://localhost:27017/openframe_dev
redis-cli -h localhost -p 6379 ping
cqlsh localhost 9042
```

### Hot Reload Not Working

**Spring Boot DevTools issues**:
```bash
# Verify DevTools is enabled
grep -r "spring-boot-devtools" pom.xml

# Check if LiveReload port is available
lsof -i :35729

# Restart with clean workspace
./scripts/stop-all-services.sh
rm -rf target/
mvn clean compile spring-boot:run
```

**Frontend hot reload issues**:
```bash
# Clear Next.js cache
cd openframe/services/openframe-frontend
rm -rf .next node_modules/.cache
npm install
npm run dev
```

### Performance Issues in Development

**Slow startup troubleshooting**:
```bash
# Profile Spring Boot startup
java -XX:+FlightRecorder -XX:StartFlightRecording=duration=60s,filename=startup.jfr \
  -jar target/openframe-api.jar

# Check dependency resolution times
mvn dependency:resolve -X | grep -i "downloading\|downloaded"

# Monitor resource usage
htop  # or Activity Monitor on macOS
docker stats
```

## Production-Like Local Testing

### Using Docker Compose for Integration Testing

**Start with production-like setup**:
```bash
# Use production-style Docker Compose
docker compose -f docker-compose.local.yml up -d

# This includes:
# - All databases with production settings
# - Message brokers with persistence
# - Monitoring tools (optional)
# - Load balancers and proxies
```

### Environment Switching

**Switch between development profiles**:
```bash
# Development mode (default)
export SPRING_PROFILES_ACTIVE=development
mvn spring-boot:run

# Local production simulation
export SPRING_PROFILES_ACTIVE=local-prod
mvn spring-boot:run

# Test mode for integration testing
export SPRING_PROFILES_ACTIVE=test
mvn verify
```

## Next Steps

Once you have local development working smoothly:

1. **[Architecture Overview](../architecture/README.md)** - Understand the system design
2. **[Testing Guide](../testing/README.md)** - Learn testing patterns and practices  
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Understand the contribution workflow

---

*Happy developing! The local development setup provides a powerful environment for building and testing OpenFrame features. Join the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for development support and discussion.*