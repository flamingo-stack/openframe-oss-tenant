# Local Development Guide

This guide covers running OpenFrame locally for development, including hot reload, debugging, and advanced development workflows.

## Development Overview

OpenFrame supports multiple development modes to optimize your workflow:

| Mode | Use Case | Services | Frontend | Hot Reload |
|------|----------|----------|----------|------------|
| **Full Local** | Complete development | All local | Local dev server | ✅ Full |
| **Hybrid** | Backend focus | Local backend + external tools | Local dev server | ✅ Backend only |
| **Frontend Only** | UI development | Remote backend | Local dev server | ✅ Frontend only |
| **Container Dev** | Production-like testing | All containerized | Built assets | ❌ Manual rebuild |

## Quick Development Start

### Option 1: Full Local Development (Recommended)

```bash
# 1. Start backing services
docker compose -f integrated-tools/docker-compose.yml up -d

# 2. Start OpenFrame in development mode
./scripts/dev-mode.sh

# Services will be available at:
# - Frontend: http://localhost:3000 (with hot reload)
# - API Gateway: http://localhost:8080
# - GraphQL Playground: http://localhost:8081/graphql
```

### Option 2: Service-by-Service Development

Start services individually for focused development:

```bash
# Terminal 1: Start databases
docker compose -f integrated-tools/docker-compose.yml up -d mongodb redis kafka nats

# Terminal 2: Start API service with hot reload
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 3: Start Gateway
cd openframe/services/openframe-gateway  
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 4: Start Frontend with hot reload
cd openframe/services/openframe-frontend
npm run dev
```

## Development Configuration

### Spring Boot Development Profiles

Each service supports development-specific configuration via Spring profiles.

#### `application-dev.yml` Configuration

Create development-specific configurations for each service:

**API Service** (`openframe-api/src/main/resources/application-dev.yml`):
```yaml
server:
  port: 8081
  
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe-dev
  redis:
    host: localhost
    port: 6379
    database: 0
    
logging:
  level:
    com.openframe: DEBUG
    org.springframework.graphql: DEBUG
    org.springframework.security: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,beans,configprops
        
graphql:
  graphiql:
    enabled: true
    path: /graphiql
```

**Gateway Service** (`openframe-gateway/src/main/resources/application-dev.yml`):
```yaml
server:
  port: 8080
  
spring:
  cloud:
    gateway:
      routes:
        - id: api-service
          uri: http://localhost:8081
          predicates:
            - Path=/api/**
        - id: frontend-dev
          uri: http://localhost:3000
          predicates:
            - Path=/app/**
  
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8082/realms/openframe
          
logging:
  level:
    org.springframework.cloud.gateway: DEBUG
    org.springframework.security: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,routes,gateway
```

### Frontend Development Configuration

#### Next.js Development Setup

**`next.config.js`**:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable fast refresh
  reactStrictMode: true,
  
  // Development-specific settings
  ...(process.env.NODE_ENV === 'development' && {
    // Disable telemetry in development
    telemetry: {
      disabled: true
    },
    
    // Enable source maps
    productionBrowserSourceMaps: false,
    
    // Optimize for development
    optimizeFonts: false,
    minify: false
  }),
  
  // API proxy for development
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8080/api/:path*'
        },
        {
          source: '/graphql',
          destination: 'http://localhost:8081/graphql'
        }
      ]
    }
  },
  
  // CORS handling for development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
```

#### Environment Variables for Development

**`.env.local`**:
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8081/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws

# Development flags
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_ENABLE_DEVTOOLS=true

# Feature flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENABLE_MINGO=true
NEXT_PUBLIC_ENABLE_FLEET_INTEGRATION=true

# Authentication
NEXT_PUBLIC_AUTH_PROVIDER=local
NEXT_PUBLIC_OAUTH_CLIENT_ID=openframe-dev

# Logging
NEXT_PUBLIC_LOG_LEVEL=debug
```

## Hot Reload and Development Tools

### Java Hot Reload with Spring Boot DevTools

Add DevTools dependency to enable hot reload:

**`pom.xml`** (in each service):
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**Development workflow**:
1. Make Java changes
2. Save files (auto-compilation triggers)
3. Application restarts automatically
4. Changes reflected immediately

### Frontend Hot Reload

Next.js includes built-in hot reload:

- **Fast Refresh**: React component changes update instantly
- **Auto-reload**: Page refreshes on routing or config changes
- **Error Overlay**: Shows compilation errors in browser

## Debugging Setup

### Java Service Debugging

#### IntelliJ IDEA Debug Configuration

1. **Run → Edit Configurations**
2. **Add New → Spring Boot**
3. Configure:
   ```text
   Name: OpenFrame API (Debug)
   Main Class: com.openframe.api.ApiApplication
   VM Options: -Dspring.profiles.active=dev -Xdebug
   Environment Variables: DEBUG_MODE=true
   ```

#### VSCode Debug Configuration

**`.vscode/launch.json`**:
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
      "args": "",
      "vmArgs": "-Dspring.profiles.active=dev",
      "env": {
        "DEBUG_MODE": "true",
        "LOG_LEVEL": "DEBUG"
      },
      "console": "internalConsole",
      "stopOnEntry": false
    },
    {
      "type": "java",
      "name": "Debug Gateway Service", 
      "request": "launch",
      "mainClass": "com.openframe.gateway.GatewayApplication",
      "projectName": "openframe-gateway",
      "vmArgs": "-Dspring.profiles.active=dev"
    }
  ]
}
```

#### Remote Debugging

For debugging services running in containers:

```bash
# Start service with debug port exposed
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -jar app.jar
```

Connect debugger to `localhost:5005`

### Frontend Debugging

#### Browser DevTools Integration

Next.js provides excellent DevTools integration:

- **React DevTools**: Component inspection and profiling
- **Redux DevTools**: State management debugging  
- **Network Panel**: API request monitoring
- **Console**: Runtime error reporting

#### VSCode Frontend Debugging

**`.vscode/launch.json`** (add to existing):
```json
{
  "type": "node",
  "name": "Debug Next.js",
  "request": "launch",
  "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/next/dist/bin/next",
  "args": ["dev"],
  "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
  "console": "integratedTerminal",
  "env": {
    "NODE_OPTIONS": "--inspect"
  }
}
```

## Development Database Management

### MongoDB Development

#### Sample Data Setup

Create development seed data:

```bash
# Run MongoDB seed script
cd scripts/dev-data
./seed-mongodb.sh
```

**`seed-mongodb.sh`**:
```bash
#!/bin/bash
mongosh mongodb://localhost:27017/openframe-dev << 'EOF'

// Create sample organizations
db.organizations.insertMany([
  {
    "_id": ObjectId(),
    "name": "Acme Corp",
    "industry": "Technology",
    "contactPerson": {
      "name": "John Doe",
      "email": "john@acme.com",
      "phone": "+1-555-0123"
    },
    "address": {
      "street": "123 Tech Street",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94105"
    },
    "createdAt": new Date(),
    "updatedAt": new Date()
  }
]);

// Create sample devices
db.machines.insertMany([
  {
    "_id": ObjectId(),
    "hostname": "dev-workstation-01",
    "osName": "Windows 11",
    "osVersion": "22H2",
    "ipAddress": "192.168.1.100",
    "macAddress": "00:11:22:33:44:55",
    "status": "ONLINE",
    "lastSeen": new Date(),
    "createdAt": new Date()
  }
]);

EOF
```

### Redis Development

Monitor Redis during development:

```bash
# Monitor Redis commands
docker exec -it openframe-redis-dev redis-cli monitor

# Check specific keys
docker exec -it openframe-redis-dev redis-cli
> keys openframe:*
> get openframe:session:abc123
```

## Testing During Development

### Automated Testing in Development

#### Continuous Test Execution

**Java services**:
```bash
# Run tests continuously (Maven)
mvn test -Dtest.continuous=true

# Or use Maven wrapper with file watching
./mvnw compile quarkus:dev -Dtests=true
```

**Frontend tests**:
```bash
# Run tests in watch mode
cd openframe/services/openframe-frontend
npm run test:watch

# Run specific test suites
npm run test -- --testPathPattern=components
```

#### Integration Testing

Set up integration test environment:

```bash
# Start test databases
docker compose -f docker/test-compose.yml up -d

# Run integration tests
mvn verify -Pintegration-tests
```

### Manual Testing Tools

#### GraphQL Testing

Use GraphQL Playground at `http://localhost:8081/graphql`:

```graphql
# Test device query
query DeviceList {
  devices {
    id
    hostname
    status
    lastSeen
    organization {
      name
    }
  }
}

# Test device mutation
mutation UpdateDeviceStatus($id: ID!, $status: DeviceStatus!) {
  updateDeviceStatus(id: $id, status: $status) {
    id
    status
    updatedAt
  }
}
```

#### REST API Testing

Use the REST client or curl:

```bash
# Health check
curl -X GET http://localhost:8080/health

# Authentication
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# API with authentication
curl -X GET http://localhost:8080/api/devices \
  -H "Authorization: Bearer <token>"
```

## Development Workflow Best Practices

### Code Change Workflow

1. **Make Changes**: Edit source code
2. **Auto-compile**: Save triggers compilation
3. **Auto-restart**: Service restarts with changes
4. **Verify**: Test changes in browser/API client
5. **Debug**: Use breakpoints if needed
6. **Test**: Run relevant tests
7. **Commit**: Commit working changes

### Branch-based Development

```bash
# Create feature branch
git checkout -b feature/new-device-management

# Regular commits during development
git add .
git commit -m "Add device status updates"

# Push for backup/collaboration
git push origin feature/new-device-management

# Merge when complete
git checkout main
git merge feature/new-device-management
```

### Development Performance Tips

#### Java Development Performance

```bash
# Optimize Maven builds for development
export MAVEN_OPTS="-Xmx4g -XX:ReservedCodeCacheSize=1g -XX:+UseParallelGC"

# Use Maven daemon for faster builds
mvn --daemon

# Skip tests during rapid development (run later)
mvn compile -DskipTests
```

#### Frontend Performance

```bash
# Use npm/yarn caching
npm config set cache ~/.npm --global
npm config set prefer-offline true

# Optimize Node.js for development
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Troubleshooting Development Issues

### Common Java Issues

**Problem**: Service won't start due to port conflict  
**Solution**: Check and kill conflicting processes:
```bash
# Find process using port 8080
lsof -ti:8080
kill -9 <PID>

# Or change port in application-dev.yml
server:
  port: 8082
```

**Problem**: Database connection failures  
**Solution**: Verify database containers are running:
```bash
docker compose -f integrated-tools/docker-compose.yml ps
docker compose -f integrated-tools/docker-compose.yml logs mongodb
```

**Problem**: Hot reload not working  
**Solution**: Ensure DevTools is configured correctly:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
</dependency>
```

### Common Frontend Issues

**Problem**: Frontend can't connect to backend  
**Solution**: Check proxy configuration in `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8080/api/:path*'
    }
  ]
}
```

**Problem**: Environment variables not loading  
**Solution**: Restart Next.js dev server:
```bash
# Kill existing dev server
pkill -f "next dev"

# Restart with environment reload
npm run dev
```

**Problem**: Hot reload stops working  
**Solution**: Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

### Database Issues

**Problem**: MongoDB connection timeout  
**Solution**: Check MongoDB logs and restart:
```bash
docker logs openframe-mongodb-dev
docker restart openframe-mongodb-dev
```

**Problem**: Redis memory issues  
**Solution**: Clear Redis cache:
```bash
docker exec openframe-redis-dev redis-cli flushall
```

## Development Scripts

Create helper scripts for common development tasks:

**`scripts/dev-reset.sh`**:
```bash
#!/bin/bash
echo "🔄 Resetting development environment..."

# Stop all services
docker compose -f integrated-tools/docker-compose.yml down
pkill -f "java.*openframe"
pkill -f "next dev"

# Clean build artifacts
mvn clean
rm -rf openframe/services/openframe-frontend/.next

# Restart everything
docker compose -f integrated-tools/docker-compose.yml up -d
sleep 10
./scripts/run-mac.sh
```

**`scripts/dev-logs.sh`**:
```bash
#!/bin/bash
echo "📋 Streaming development logs..."

# Tail logs from all services
tail -f \
  openframe/services/openframe-api/logs/application.log \
  openframe/services/openframe-gateway/logs/application.log \
  openframe/services/openframe-frontend/.next/trace &

# Also show Docker logs
docker compose -f integrated-tools/docker-compose.yml logs -f
```

## Next Steps

Now that you have local development running:

1. 🏛️ **[Architecture Overview](../architecture/README.md)** - Understand the system design
2. 🧪 **[Testing Guide](../testing/README.md)** - Set up testing workflows  
3. 🔒 **[Security Guide](../security/README.md)** - Learn security patterns
4. 🤝 **[Contributing Guidelines](../contributing/guidelines.md)** - Contribution process

---

**Happy developing!** 🚀 You're now set up for productive OpenFrame development with hot reload and debugging capabilities.