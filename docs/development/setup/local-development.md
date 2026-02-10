# Local Development Guide

This guide covers running OpenFrame locally with hot reload, debugging capabilities, and development optimizations. Perfect for active development and testing.

## Quick Development Setup

### Prerequisites Check

Ensure your development environment is ready:
```bash
# Verify all tools are installed
java --version      # Java 21+
mvn --version       # Maven 3.9+
node --version      # Node.js 18+
docker --version    # Docker 24.0+

# Check environment variables
echo `$GITHUB_TOKEN`    # Should be set
echo `$JAVA_HOME`       # Should point to Java 21
```

### Clone and Initial Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set environment variables
export GITHUB_TOKEN="your_github_token_here"
export GITHUB_USERNAME="your_github_username"

# Run platform-specific setup
./scripts/run-mac.sh        # macOS
./scripts/run-linux.sh      # Linux  
./scripts/run-windows.ps1   # Windows
```

## Development Infrastructure

### Start Data Services

Start the required infrastructure services:

```bash
# Start MongoDB, Redis, Kafka using Docker Compose
docker-compose -f integrated-tools/docker-compose.openframe-data.yml up -d

# Verify services are running
docker-compose -f integrated-tools/docker-compose.openframe-data.yml ps
```

Expected output:
```text
Name                Command                  State           Ports
------------------------------------------------------------------------
mongo              docker-entrypoint-s ...   Up             0.0.0.0:27017->27017/tcp
redis              docker-entrypoint-s ...   Up             0.0.0.0:6379->6379/tcp
kafka              /etc/confluent/docker ...  Up             0.0.0.0:9092->9092/tcp
zookeeper          /etc/confluent/docker ...  Up             2181/tcp, 2888/tcp, 3888/tcp
```

### Create Development Database

```bash
# Connect to MongoDB and create development database
mongosh mongodb://localhost:27017

# In MongoDB shell:
use openframe_dev
db.createCollection("organizations")
db.createCollection("users") 
db.createCollection("devices")

# Exit MongoDB shell
exit
```

## Java Services Development

### Build All Services

```bash
# Initial build (includes downloading dependencies)
mvn clean install -DskipTests

# Quick rebuild (for code changes)
mvn compile -DskipTests

# Build specific module
mvn -pl openframe/services/openframe-api clean compile
```

### Run Services with Hot Reload

**Option 1: IDE-Based Development (Recommended)**

Configure your IDE (IntelliJ IDEA) for hot reload:

1. **Enable Auto-Make**:
   - **Settings** → **Build, Execution, Deployment** → **Compiler**
   - Check **"Build project automatically"**

2. **Configure Spring Boot DevTools**:
   ```xml
   <!-- Already included in development profile -->
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-devtools</artifactId>
       <scope>runtime</scope>
       <optional>true</optional>
   </dependency>
   ```

3. **Run Configuration**:
   - **Main Class**: `com.openframe.api.ApiApplication`
   - **VM Options**: `-Dspring.profiles.active=development -Xmx2g`
   - **Environment Variables**: `GITHUB_TOKEN=your_token`

**Option 2: Command Line with Spring Boot Maven Plugin**

```bash
# Start API service with hot reload
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development

# In separate terminal, start Gateway service
cd openframe/services/openframe-gateway  
mvn spring-boot:run -Dspring-boot.run.profiles=development

# In separate terminal, start Management service
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

### Service URLs

When running locally, services are available at:

| Service | URL | Purpose |
|---------|-----|---------|
| **API Gateway** | http://localhost:8088 | Main API entry point |
| **GraphQL API** | http://localhost:8082 | Internal GraphQL API |
| **Config Server** | http://localhost:8888 | Configuration management |
| **Management** | http://localhost:8084 | Administrative tasks |
| **Stream Processing** | http://localhost:8086 | Real-time data processing |

## Frontend Development

### Install Dependencies

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Or use pnpm for faster installs
pnpm install
```

### Run Development Server

```bash
# Start Vite development server with hot reload
npm run dev

# Alternative: start with specific port
npm run dev -- --port 3000

# Open browser automatically
npm run dev -- --open
```

The frontend development server provides:
- ✅ **Hot Module Replacement (HMR)**: Instant updates without page refresh
- ✅ **TypeScript compilation**: Real-time type checking
- ✅ **ESLint integration**: Code quality feedback
- ✅ **Tailwind CSS**: Instant styling updates

### Development Configuration

The frontend connects to backend services via environment variables:

**`.env.development`** (automatically loaded):
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8088
VITE_GRAPHQL_URL=http://localhost:8082/graphql
VITE_WS_URL=ws://localhost:8088/ws

# Development Flags
VITE_NODE_ENV=development
VITE_DEBUG=true
VITE_HOT_RELOAD=true

# Feature Flags for Development
VITE_ENABLE_MINGO_AI=true
VITE_ENABLE_MOCK_DATA=true
VITE_ENABLE_DEBUG_PANEL=true
```

### Frontend Development Workflow

```bash
# Start development with all features
npm run dev

# Run type checking in watch mode (separate terminal)
npm run type-check:watch

# Run linting with auto-fix
npm run lint:fix

# Run tests in watch mode
npm run test:watch
```

## Rust Client Development

### Build and Run Client

```bash
cd clients/openframe-client

# Build in debug mode
cargo build

# Run with debug logging
RUST_LOG=debug cargo run

# Run with auto-rebuild on changes
cargo watch -x check -x test -x run
```

### Client Configuration for Development

Create `clients/openframe-client/config/development.toml`:
```toml
[server]
api_url = "http://localhost:8088"
auth_url = "http://localhost:8088/auth"

[agent]
registration_secret = "dev-secret-123"
heartbeat_interval = "30s"
log_level = "debug"

[development]
mock_hardware_data = true
enable_test_mode = true
skip_signature_verification = true
```

## Integrated Development Workflow

### Complete Local Stack

Start everything for full-stack development:

```bash
# Terminal 1: Infrastructure services
docker-compose -f integrated-tools/docker-compose.openframe-data.yml up

# Terminal 2: API Service
cd openframe/services/openframe-api && mvn spring-boot:run -Dspring-boot.run.profiles=development

# Terminal 3: Gateway Service  
cd openframe/services/openframe-gateway && mvn spring-boot:run -Dspring-boot.run.profiles=development

# Terminal 4: Frontend Development Server
cd openframe/services/openframe-frontend && npm run dev

# Terminal 5: Rust Client (optional)
cd clients/openframe-client && cargo watch -x run
```

### Development Helper Scripts

Create `scripts/dev-start-all.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Starting OpenFrame Development Stack..."

# Start infrastructure
docker-compose -f integrated-tools/docker-compose.openframe-data.yml up -d
echo "✅ Infrastructure services started"

# Wait for services to be ready
sleep 5

# Start Java services in background
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development &
API_PID=$!
echo "✅ API service starting (PID: $API_PID)"

cd ../openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=development &
GATEWAY_PID=$!
echo "✅ Gateway service starting (PID: $GATEWAY_PID)"

cd ../openframe-frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend development server starting (PID: $FRONTEND_PID)"

cd ../../..

echo ""
echo "🌟 Development stack is starting up!"
echo "📊 Frontend: http://localhost:3000"
echo "🚪 Gateway: http://localhost:8088"  
echo "📡 GraphQL: http://localhost:8082/graphql"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle shutdown gracefully
trap "echo 'Shutting down...'; kill $API_PID $GATEWAY_PID $FRONTEND_PID 2>/dev/null; docker-compose -f integrated-tools/docker-compose.openframe-data.yml down" EXIT

# Wait for user interrupt
wait
```

## Testing During Development

### Automated Testing

```bash
# Run all Java tests
mvn test

# Run tests for specific module
mvn -pl openframe/services/openframe-api test

# Run tests with coverage
mvn test jacoco:report

# Run frontend tests
cd openframe/services/openframe-frontend
npm run test

# Run Rust tests
cd clients/openframe-client
cargo test
```

### Integration Testing

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
mvn verify -P integration-tests

# Run end-to-end tests
cd openframe/services/openframe-frontend
npm run test:e2e
```

## Debugging

### Java Services Debugging

**IntelliJ IDEA Remote Debugging:**
1. Add JVM arguments to service startup:
   ```bash
   -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005
   ```

2. Create remote debug configuration:
   - **Host**: `localhost`
   - **Port**: `5005`
   - **Module**: Select appropriate service module

**Command Line Debugging:**
```bash
# Start API service with debugging enabled
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
```

### Frontend Debugging

**Browser DevTools:**
- Vue DevTools extension for component inspection
- Network tab for API request/response debugging
- Console tab for JavaScript debugging

**VS Code Debugging:**
```json
{
  "name": "Debug Frontend",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src"
}
```

### Rust Client Debugging

```bash
# Debug build with symbols
cargo build

# Run with debugger (lldb on macOS, gdb on Linux)
rust-lldb target/debug/openframe-client

# Or use VS Code with CodeLLDB extension
```

## Development Best Practices

### Code Changes and Hot Reload

**Java Services:**
- Code changes trigger automatic restart (Spring DevTools)
- Configuration changes require manual restart
- Database schema changes require migration scripts

**Frontend:**
- Component changes reload instantly (HMR)
- Route changes may require browser refresh
- Configuration changes require dev server restart

**Rust Client:**
- Use `cargo watch` for automatic rebuilds
- Binary restart required for all changes
- Configuration changes loaded at startup

### Database Development

**MongoDB Development Data:**
```javascript
// Create sample data for development
use openframe_dev

// Insert sample organization
db.organizations.insertOne({
  name: "Development MSP",
  domain: "dev.example.com", 
  createdAt: new Date(),
  status: "ACTIVE"
})

// Insert sample user
db.users.insertOne({
  email: "admin@dev.example.com",
  firstName: "Admin",
  lastName: "User", 
  role: "ADMIN",
  organizationId: ObjectId("..."),
  createdAt: new Date()
})
```

### Performance Monitoring

**Development Metrics:**
```bash
# Check service health
curl http://localhost:8082/actuator/health
curl http://localhost:8088/actuator/health

# Monitor service metrics
curl http://localhost:8082/actuator/metrics

# Check database performance
mongosh --eval "db.stats()"
```

## Troubleshooting Development Issues

### Common Problems

**Port Conflicts:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill process if needed
kill -9 <PID>
```

**Maven Dependency Issues:**
```bash
# Clear local repository
rm -rf ~/.m2/repository

# Force update dependencies
mvn clean install -U
```

**Frontend Build Failures:**
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

**Database Connection Issues:**
```bash
# Check MongoDB status
docker-compose -f integrated-tools/docker-compose.openframe-data.yml ps

# View MongoDB logs
docker-compose -f integrated-tools/docker-compose.openframe-data.yml logs mongo

# Reset database
docker-compose -f integrated-tools/docker-compose.openframe-data.yml down -v
docker-compose -f integrated-tools/docker-compose.openframe-data.yml up -d
```

## Production-Like Development

### Enable Authentication

```bash
# Set OAuth configuration
export OAUTH2_CLIENT_ID="dev-client-id"
export OAUTH2_CLIENT_SECRET="dev-client-secret" 
export OAUTH2_ISSUER_URI="http://localhost:8088/oauth2"

# Start services with OAuth enabled
mvn spring-boot:run -Dspring-boot.run.profiles=development,oauth
```

### Enable External Tool Integration

```bash
# Start Tactical RMM development instance
cd integrated-tools/tactical-rmm
docker-compose up -d

# Configure OpenFrame to connect
export TACTICAL_RMM_URL="http://localhost:8000"
export TACTICAL_RMM_API_KEY="dev-api-key"
```

## Next Steps

Your local development environment is now ready! Continue with:

- [Architecture Overview](../architecture/overview.md) - Understand the system design
- [Testing Overview](../testing/overview.md) - Learn testing patterns and practices
- [Contributing Guidelines](../contributing/guidelines.md) - Ready to contribute code

---

**🎯 Development Ready!** Your OpenFrame local development environment supports hot reload, debugging, and full-stack development workflows!