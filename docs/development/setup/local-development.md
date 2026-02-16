# Local Development Guide

This guide walks you through running OpenFrame locally for development with hot reload, debugging, and testing. Perfect for daily development workflow.

> **Prerequisites**: Complete [Environment Setup](environment.md) and have your development environment configured.

## Quick Start for Development

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify you have the required tools
java -version  # Should show Java 21
node -version  # Should show Node 18+
docker --version  # Should show Docker 24+

# Create development environment file
cp .env.example .env
# Edit .env with your configuration (see Environment Setup guide)
```

### 2. Start Infrastructure Services

```bash
# Start database and messaging services
docker compose up -d mongodb redis kafka

# Wait for services to be ready (about 60 seconds)
echo "Waiting for services to start..."
sleep 60

# Verify services are running
docker compose ps
# All services should show 'Up' status
```

### 3. Build Backend Services

```bash
# Build all Spring Boot modules (skip tests for faster startup)
mvn clean install -DskipTests

# Verify build success
echo "Build exit code: $?"
# Should be 0
```

### 4. Start Development Services

**Terminal 1 - Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server

# Run with development profile and debug port
java -Dspring.profiles.active=dev \
     -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005 \
     -jar target/openframe-authorization-server-*.jar

# Wait for: "Started OpenFrameAuthorizationServerApplication in X.X seconds"
```

**Terminal 2 - API Service:**
```bash
cd openframe/services/openframe-api

# Run with development profile and debug port  
java -Dspring.profiles.active=dev \
     -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5006 \
     -jar target/openframe-api-*.jar

# Wait for: "Started ApiApplication in X.X seconds"
```

**Terminal 3 - Gateway Service:**
```bash
cd openframe/services/openframe-gateway

# Run with development profile and debug port
java -Dspring.profiles.active=dev \
     -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5007 \
     -jar target/openframe-gateway-*.jar

# Wait for: "Started GatewayApplication in X.X seconds"
```

**Terminal 4 - Frontend Application:**
```bash
cd openframe/services/openframe-frontend

# Install dependencies (first time only)
npm install

# Start development server with hot reload
npm run dev

# Wait for: "ready - started server on 0.0.0.0:3000"
```

## Hot Reload Development Workflow

### Backend Hot Reload with Spring Boot DevTools

**Enable DevTools in each service module:**

Add to `pom.xml` in each service:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**IntelliJ IDEA Hot Reload Setup:**
1. **Enable automatic compilation**: Settings > Build, Execution, Deployment > Compiler > Build project automatically
2. **Enable runtime updates**: Registry > compiler.automake.allow.when.app.running = true
3. **Use Spring Boot run configuration** (not JAR execution)

**VS Code Hot Reload Setup:**
1. Install **Spring Boot Extension Pack**
2. Use **Spring Boot Dashboard** to run services
3. **Auto-reload on save** is enabled by default

### Frontend Hot Reload

Next.js provides built-in hot reload:

```bash
# Start with hot reload (default)
npm run dev

# Enable additional development features
NEXT_PUBLIC_DEV_MODE=true npm run dev
```

**Hot reload includes:**
- React component changes
- TypeScript compilation
- CSS/Tailwind updates  
- API route changes
- Configuration file updates

### Database Schema Hot Reload

For MongoDB schema changes during development:

```bash
# Connect to development database
mongo mongodb://localhost:27017/openframe-dev

# Drop and recreate collections for schema changes
db.users.drop()
db.organizations.drop()

# Restart API service to recreate with new schema
```

## Development Debugging

### Backend Debugging Setup

**IntelliJ IDEA Remote Debug:**
1. **Run > Edit Configurations**
2. **Add New > Remote JVM Debug**
3. **Configure for each service**:
   - Auth Server: Port 5005
   - API Service: Port 5006  
   - Gateway Service: Port 5007
4. **Set breakpoints** and attach debugger

**VS Code Java Debugging:**
1. Install **Extension Pack for Java**
2. Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "java",
            "name": "Attach to Auth Server",
            "request": "attach",
            "hostName": "localhost",
            "port": 5005
        },
        {
            "type": "java", 
            "name": "Attach to API Service",
            "request": "attach",
            "hostName": "localhost",
            "port": 5006
        },
        {
            "type": "java",
            "name": "Attach to Gateway",
            "request": "attach", 
            "hostName": "localhost",
            "port": 5007
        }
    ]
}
```

### Frontend Debugging

**Chrome DevTools:**
1. Open https://localhost:3000
2. **F12** to open DevTools
3. **Sources tab** for breakpoints
4. **Network tab** for API call inspection
5. **React DevTools** for component debugging

**VS Code Frontend Debugging:**
1. Install **Debugger for Chrome**
2. Create launch configuration:

```json
{
    "type": "chrome",
    "request": "launch", 
    "name": "Debug Next.js",
    "url": "https://localhost:3000",
    "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend"
}
```

### API Debugging Tools

**Test API Endpoints:**

```bash
# Health checks
curl -k https://localhost:8081/actuator/health  # Auth Server
curl -k https://localhost:8080/health           # API Service

# GraphQL introspection
curl -X POST https://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# REST API test
curl -X GET https://localhost:8080/api/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Use REST Client Extension:**

Create `test-api.http` file:
```http
### Health Check
GET https://localhost:8080/health

### Get Organizations
GET https://localhost:8080/api/organizations
Authorization: Bearer {{jwt_token}}

### GraphQL Query  
POST https://localhost:8080/graphql
Content-Type: application/json

{
  "query": "{ organizations { id name createdAt } }"
}
```

## Development Database Management

### MongoDB Development

**Access Development Database:**
```bash
# Command line access
mongosh mongodb://localhost:27017/openframe-dev

# List collections
show collections

# Query users
db.users.find().pretty()

# Query organizations  
db.organizations.find().pretty()

# Clear all data (development only!)
db.dropDatabase()
```

**MongoDB Compass GUI:**
- **Connection**: mongodb://localhost:27017
- **Database**: openframe-dev
- Browse collections, edit documents, run queries

### Redis Development

**Access Redis Cache:**
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# List all keys
keys *

# Get specific key
get auth:session:your-session-id

# Clear all cache (development only!)
flushall
```

### Kafka Development

**Monitor Kafka Topics:**
```bash
# List topics
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Watch topic messages
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic openframe-events \
  --from-beginning

# Produce test message
docker compose exec kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic openframe-events
```

## Testing During Development

### Backend Testing

**Run unit tests:**
```bash
# Test all modules
mvn test

# Test specific service
cd openframe/services/openframe-api
mvn test

# Test with coverage
mvn test jacoco:report
```

**Run integration tests:**
```bash
# Run integration test suite
mvn verify -Dtest.profile=integration

# Run specific integration test
mvn test -Dtest=OrganizationIntegrationTest
```

### Frontend Testing

**Run frontend tests:**
```bash
cd openframe/services/openframe-frontend

# Run Jest tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tests
npm run test:e2e
```

**Manual testing checklist:**
- [ ] Login/logout flow works
- [ ] Dashboard loads without errors
- [ ] Device list displays (may be empty)
- [ ] Organization CRUD operations
- [ ] Settings pages accessible
- [ ] API calls return proper responses

## Performance Monitoring in Development

### Backend Performance

**Enable actuator metrics:**

Add to `application-dev.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

**Monitor key metrics:**
```bash
# JVM metrics
curl https://localhost:8080/actuator/metrics/jvm.memory.used

# HTTP request metrics
curl https://localhost:8080/actuator/metrics/http.server.requests

# Database connection pool
curl https://localhost:8080/actuator/metrics/hikaricp.connections.active
```

### Frontend Performance

**Monitor with Next.js built-in tools:**
```bash
# Build with analysis
ANALYZE=true npm run build

# Performance metrics
npm run dev -- --profile
```

**Browser DevTools:**
- **Performance tab**: Record and analyze runtime performance
- **Lighthouse**: Audit performance, accessibility, SEO
- **Network tab**: Monitor API call timing
- **Memory tab**: Check for memory leaks

## Development Workflow Automation

### Automated Development Scripts

**Create `scripts/dev-reset.sh` for clean restart:**
```bash
#!/bin/bash
set -euo pipefail

echo "🔄 Resetting development environment..."

# Stop all processes
pkill -f "openframe.*\.jar" || true

# Stop and restart Docker services
docker compose down
docker compose up -d mongodb redis kafka

echo "⏳ Waiting for infrastructure..."
sleep 30

# Clean and rebuild
echo "🔨 Rebuilding services..."
mvn clean install -DskipTests

# Clear logs
rm -rf logs/*.log

echo "✅ Environment reset complete!"
echo "🚀 Run your services in separate terminals"
```

**Create `scripts/dev-logs.sh` for log monitoring:**
```bash
#!/bin/bash

# Tail all service logs
echo "📋 Monitoring all OpenFrame logs..."

tail -f logs/auth.log logs/api.log logs/gateway.log &
TAIL_PID=$!

# Cleanup on exit
trap "kill $TAIL_PID" EXIT

# Wait for interrupt
wait
```

### Git Workflow for Development

**Development branch strategy:**
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit frequently
git add .
git commit -m "feat: add new feature functionality"

# Push and create PR
git push origin feature/your-feature-name

# Create pull request on GitHub
```

**Useful Git aliases for development:**
```bash
# Quick status and log
git config --global alias.s status
git config --global alias.l "log --oneline --graph --decorate"

# Quick commit and push
git config --global alias.acp "!git add . && git commit -m"
git config --global alias.p push
```

## Common Development Issues & Solutions

### Service Start-up Issues

**Port conflicts:**
```bash
# Find process using port
lsof -i :8080

# Kill specific process
kill -9 <PID>

# Use different ports in development
java -Dserver.port=8090 -jar target/*.jar
```

**Database connection failures:**
```bash
# Check MongoDB is running
docker compose ps mongodb

# Restart MongoDB
docker compose restart mongodb

# Check connectivity
mongosh --eval "db.runCommand({ping: 1})"
```

**Memory issues:**
```bash
# Increase JVM memory
java -Xms1g -Xmx4g -jar target/*.jar

# Monitor memory usage
jps  # Find Java process ID
jstat -gc <PID> 1s  # Monitor garbage collection
```

### Frontend Development Issues

**Node modules conflicts:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**TypeScript errors:**
```bash
# Clear TypeScript cache
rm -rf .next/cache

# Check TypeScript compilation
npx tsc --noEmit
```

**Hot reload not working:**
```bash
# Restart development server
npm run dev

# Check file permissions (Linux/Mac)
ls -la openframe/services/openframe-frontend/
```

### Debugging Common Development Problems

**Authentication issues:**
```bash
# Check JWT token validity
jwt-cli decode <your-jwt-token>

# Verify OAuth2 configuration
curl https://localhost:8081/.well-known/openid_configuration
```

**API not responding:**
```bash
# Check service health
curl -k https://localhost:8080/actuator/health

# Verify routing
curl -k https://localhost:8080/api/health

# Check logs for errors
tail -f logs/api.log
```

**Database query issues:**
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/openframe-dev

# Enable profiling
db.setProfilingLevel(2)

# Check slow queries
db.system.profile.find().pretty()
```

## Next Steps

Your local development environment is ready! Continue with:

1. **[Architecture Overview](../architecture/README.md)** - Understand the system design
2. **[Testing Overview](../testing/README.md)** - Learn testing best practices  
3. **[Security Guidelines](../security/README.md)** - Implement security best practices
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing

## Getting Development Help

- **OpenMSP Slack**: https://www.openmsp.ai/ - Join `#development` channel
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Code Reviews**: Submit PRs early and often for feedback
- **Documentation**: Keep this guide updated as you discover new patterns

---

**🎯 Happy coding!** You're now ready for efficient OpenFrame development with hot reload, debugging, and testing.