# Local Development Guide

This guide covers running OpenFrame services locally for development, debugging, and testing. It assumes you've completed the [Environment Setup](environment.md).

## Development Server Startup

### Option 1: Full Stack Development (Recommended)

Use the development startup script for a complete local environment:

```bash
# Start all services with development configuration
./scripts/dev-setup.sh

# Or start with specific profiles
SPRING_PROFILES_ACTIVE=dev,debug ./scripts/dev-setup.sh
```

This script will:
1. Start infrastructure containers (MongoDB, Kafka, Redis)
2. Build all Java services
3. Start services with debug ports enabled
4. Launch frontend development server
5. Set up hot reload for all components

### Option 2: Service-by-Service Startup

For focused development on specific services:

**1. Start Infrastructure:**
```bash
# Start only required infrastructure
docker compose -f integrated-tools/docker-compose.yml up -d mongodb kafka redis

# Verify containers are running
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**2. Start Config Server (Required First):**
```bash
cd openframe/services/openframe-config
mvn spring-boot:run -Dspring.profiles.active=dev
```

**3. Start Core Services:**
```bash
# Terminal 1 - API Service with debug
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring.profiles.active=dev \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"

# Terminal 2 - Gateway Service with debug  
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring.profiles.active=dev \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5006"

# Terminal 3 - Authorization Server
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring.profiles.active=dev \
  -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5007"
```

**4. Start Frontend:**
```bash
cd openframe/services/openframe-frontend
npm run dev
```

## Service Configuration for Development

### Development Profiles

Each service supports multiple Spring profiles:

| Profile | Purpose | Configuration |
|---------|---------|---------------|
| `dev` | Development mode | Debug logging, permissive CORS |
| `local` | Local infrastructure | Local database connections |
| `debug` | Debug mode | Additional debug endpoints |
| `test` | Testing | Test database, mock services |

**Activate profiles:**
```bash
# Single profile
mvn spring-boot:run -Dspring.profiles.active=dev

# Multiple profiles  
mvn spring-boot:run -Dspring.profiles.active=dev,local,debug
```

### Service-Specific Configurations

**API Service (`application-dev.yml`):**
```yaml
server:
  port: 8080

spring:
  data:
    mongodb:
      uri: mongodb://admin:password123@localhost:27017/openframe_dev?authSource=admin
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: openframe-api-dev

dgs:
  graphql:
    playground:
      enabled: true
    introspection:
      enabled: true

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers

logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
```

**Gateway Service (`application-dev.yml`):**
```yaml
server:
  port: 8081

spring:
  cloud:
    gateway:
      routes:
        - id: api-service
          uri: http://localhost:8080
          predicates:
            - Path=/api/**,/graphql/**
        - id: auth-service
          uri: http://localhost:8082
          predicates:
            - Path=/oauth/**,/.well-known/**

security:
  jwt:
    public-key-location: classpath:dev-public-key.pem
    
cors:
  allowed-origins: http://localhost:3000,http://localhost:8080
  allowed-methods: GET,POST,PUT,DELETE,OPTIONS
  allowed-headers: "*"
  allow-credentials: true
```

## Hot Reload and Live Development

### Backend Hot Reload

**Spring Boot DevTools** enables automatic restart when files change:

**1. Add DevTools dependency (already included):**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**2. Configure IDE for automatic compilation:**

**IntelliJ IDEA:**
- File → Settings → Build → Compiler → ✓ Build project automatically
- Settings → Advanced Settings → ✓ Allow auto-make to start even if developed application is currently running

**VS Code:**
```json
{
  "java.compile.nullAnalysis.mode": "automatic",
  "java.autobuild.enabled": true
}
```

**3. Watch for changes:**
```bash
# DevTools will automatically restart when:
# - Java files in src/main/java are modified
# - Resources in src/main/resources are modified
# - Configuration files are updated
```

### Frontend Hot Module Replacement

**Vite HMR** provides instant updates for frontend changes:

```bash
cd openframe/services/openframe-frontend
npm run dev

# Vite will automatically:
# - Reload Vue components on change
# - Update CSS without page refresh  
# - Preserve application state
# - Show compilation errors in browser
```

**Watch specific file types:**
```typescript
// vite.config.ts - Custom HMR configuration
export default defineConfig({
  server: {
    hmr: {
      overlay: true // Show errors as overlay
    }
  },
  plugins: [
    vue({
      // Enable script setup sugar
      script: {
        defineModel: true
      }
    })
  ]
})
```

### Rust Development with Cargo Watch

For the client agent development:

```bash
cd clients/openframe-client

# Watch and rebuild on changes
cargo watch -x 'run'

# Watch and test on changes
cargo watch -x 'test'

# Watch with custom command
cargo watch -x 'clippy' -x 'fmt'
```

## Debugging Configuration

### Java Service Debugging

**Remote Debug Setup:**

**1. Start service with debug agent:**
```bash
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"
```

**2. IntelliJ IDEA Remote Debug Configuration:**
```text
Run → Edit Configurations → Add New → Remote JVM Debug
- Name: OpenFrame API Debug
- Host: localhost  
- Port: 5005
- Use module classpath: openframe-api
```

**3. Set breakpoints and start debugging:**
- Set breakpoints in your code
- Click Debug icon for the remote configuration
- Service will pause execution at breakpoints

### Frontend Debugging

**Browser DevTools Integration:**

**1. Install Vue DevTools browser extension**

**2. Configure source maps (already enabled in dev mode):**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true // Enables source maps
  }
})
```

**3. VS Code debugging configuration:**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Vue App",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ]
}
```

### Database Debugging

**MongoDB Connection Testing:**
```bash
# Connect with mongosh
mongosh "mongodb://admin:password123@localhost:27017/openframe_dev?authSource=admin"

# Useful debugging queries
db.users.find({}).limit(5)
db.organizations.find({}).pretty()
db.events.find({}).sort({createdAt: -1}).limit(10)

# Enable MongoDB profiling for slow queries
db.setProfilingLevel(2, {slowms: 100})
db.system.profile.find().sort({ts: -1}).limit(5)
```

**Redis Debugging:**
```bash
# Connect to Redis
redis-cli -h localhost -p 6379 -a redis123

# Monitor all commands
MONITOR

# Check memory usage
INFO memory

# List all keys (use carefully in production)
KEYS *
```

**Kafka Debugging:**
```bash
# List topics
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Consumer messages from a topic
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic openframe.events --from-beginning

# Producer test messages
kafka-console-producer.sh --bootstrap-server localhost:9092 --topic openframe.events
```

## Testing in Development

### Running Tests

**Backend Tests:**
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=OrganizationServiceTest

# Run specific test method
mvn test -Dtest=OrganizationServiceTest#createOrganization

# Run tests with specific profile
mvn test -Dspring.profiles.active=test

# Run integration tests only
mvn verify -DskipUnitTests
```

**Frontend Tests:**
```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit -- --watch

# Run E2E tests (if configured)
npm run test:e2e
```

**Rust Tests:**
```bash
cd clients/openframe-client

# Run all tests
cargo test

# Run specific test
cargo test test_agent_registration

# Run tests with output
cargo test -- --nocapture

# Run tests with backtraces
RUST_BACKTRACE=1 cargo test
```

### Test Data Management

**Development Test Data:**
```bash
# Reset development database
mongosh "mongodb://admin:password123@localhost:27017/openframe_dev?authSource=admin" --eval "
  db.dropDatabase();
"

# Reload test data
node scripts/load-test-data.js
```

**Create Test Data Script (`scripts/load-test-data.js`):**
```javascript
const { MongoClient } = require('mongodb');

async function loadTestData() {
  const client = new MongoClient('mongodb://admin:password123@localhost:27017');
  await client.connect();
  
  const db = client.db('openframe_dev');
  
  // Create test organizations
  await db.collection('organizations').insertMany([
    {
      name: 'Test MSP Company',
      domain: 'test-msp.local',
      contactEmail: 'admin@test-msp.local',
      createdAt: new Date()
    },
    {
      name: 'Development Organization', 
      domain: 'dev.local',
      contactEmail: 'dev@dev.local',
      createdAt: new Date()
    }
  ]);
  
  // Create test users
  await db.collection('users').insertMany([
    {
      email: 'dev@openframe.local',
      hashedPassword: '$2a$10$...',  // Generate with bcrypt
      role: 'ADMIN',
      organizationId: 'test-org-id',
      createdAt: new Date()
    }
  ]);
  
  console.log('✅ Test data loaded successfully');
  await client.close();
}

loadTestData().catch(console.error);
```

## Performance Monitoring in Development

### Application Metrics

**Enable Actuator endpoints:**
```yaml
# application-dev.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers,threaddump,heapdump
  endpoint:
    health:
      show-details: always
```

**Access metrics:**
```bash
# Health check
curl http://localhost:8080/actuator/health

# JVM metrics  
curl http://localhost:8080/actuator/metrics/jvm.memory.used

# Custom application metrics
curl http://localhost:8080/actuator/metrics/openframe.api.requests

# Prometheus format
curl http://localhost:8080/actuator/prometheus
```

### Database Performance

**MongoDB Performance Monitoring:**
```javascript
// Enable slow query logging
db.setProfilingLevel(2, {slowms: 100});

// View slow queries
db.system.profile.find().sort({ts: -1}).limit(5).pretty();

// Check index usage
db.collection.find({field: "value"}).explain("executionStats");
```

**Kafka Performance:**
```bash
# Check consumer group lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group openframe-api-dev --describe

# Topic statistics
kafka-topics.sh --bootstrap-server localhost:9092 --topic openframe.events --describe
```

## Troubleshooting Development Issues

### Common Service Startup Problems

**Port Already in Use:**
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
mvn spring-boot:run -Dserver.port=8081
```

**Database Connection Issues:**
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs openframe-mongodb

# Test connection
mongosh "mongodb://admin:password123@localhost:27017/admin"
```

**Memory Issues:**
```bash
# Increase JVM heap size
export MAVEN_OPTS="-Xmx2g -Xms1g"

# Or per service
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx2g -Xms1g"
```

### Frontend Development Issues

**Module Resolution Errors:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**CORS Issues:**
```typescript
// vite.config.ts - Update proxy configuration
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

### Build Issues

**Maven Build Failures:**
```bash
# Clean build
mvn clean install -DskipTests

# Update dependencies
mvn dependency:resolve

# Check for dependency conflicts
mvn dependency:tree
```

**Node Build Issues:**
```bash
# Check Node/npm versions
node --version
npm --version

# Update dependencies
npm update

# Clear TypeScript cache
npx tsc --build --clean
```

## Development Workflow Best Practices

### Code Changes Workflow

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-feature-name
   ```

2. **Make changes with hot reload active**
3. **Test changes locally:**
   ```bash
   mvn test  # Backend tests
   npm run test:unit  # Frontend tests
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   git push origin feature/new-feature-name
   ```

### Service Development Tips

- **Start with API service** for backend changes
- **Use GraphQL Playground** for API testing
- **Enable debug logging** for troubleshooting
- **Monitor application metrics** for performance
- **Use database GUI tools** for data inspection

### Performance Development Tips

- **Profile slow endpoints** using actuator metrics
- **Monitor memory usage** during development  
- **Use connection pooling** for database connections
- **Cache frequently accessed data** using Redis
- **Optimize GraphQL queries** to prevent N+1 problems

## Next Steps

With your local development environment running:

1. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
2. **[Testing Overview](../testing/overview.md)** - Set up comprehensive testing
3. **[Security Overview](../security/overview.md)** - Implement security best practices
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Learn the contribution process

Your local development environment is now fully operational! Start building amazing features for OpenFrame! 🚀