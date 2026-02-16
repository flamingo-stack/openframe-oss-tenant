# Local Development Setup

This guide walks you through cloning, building, and running OpenFrame locally for development. Follow this after completing the [Environment Setup](environment.md).

## 🚀 Quick Start for Developers

### 1. Clone and Initial Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Make scripts executable (Linux/macOS)
chmod +x scripts/*.sh
```

### 2. Infrastructure Services

Start the required infrastructure services first:

```bash
# Start databases and messaging systems
docker-compose up -d mongodb kafka cassandra pinot redis

# Wait for services to be ready (about 2-3 minutes)
./scripts/wait-for-infrastructure.sh
```

### 3. Backend Services Development

#### Build All Services

```bash
# Clean build all Java services
mvn clean install -DskipTests

# Or build specific service
cd openframe/services/openframe-api
mvn clean install -DskipTests
```

#### Run Services in Development Mode

**Option 1: All Services with Script**
```bash
# Start all backend services
./scripts/run-dev-backend.sh
```

**Option 2: Individual Services**

Open separate terminals for each service:

```bash
# Terminal 1: API Gateway
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=development

# Terminal 2: API Service  
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=development

# Terminal 3: Authorization Server
cd openframe/services/openframe-authorization-server  
mvn spring-boot:run -Dspring-boot.run.profiles=development

# Terminal 4: Client Service
cd openframe/services/openframe-client
mvn spring-boot:run -Dspring-boot.run.profiles=development
```

### 4. Frontend Development

#### Install Dependencies

```bash
cd openframe/services/openframe-frontend
npm install
```

#### Start Development Server

```bash
# Start with hot reload
npm run dev

# Frontend will be available at http://localhost:3000
```

#### Build for Production Testing

```bash
# Build optimized version
npm run build

# Preview production build
npm run preview
```

## 🔧 Development Workflow

### Hot Reload Configuration

#### Backend Hot Reload

**Spring Boot DevTools** is configured for automatic restart:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**IDE Configuration for Hot Reload:**

**IntelliJ IDEA:**
1. File → Settings → Build → Compiler → Enable "Build project automatically"
2. Help → Find Action → Registry → Enable "compiler.automake.allow.when.app.running"

**VS Code with Java Extension:**
- Automatic hot reload is enabled by default

#### Frontend Hot Reload

Vite provides instant hot reload for React components:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/graphql': 'http://localhost:8080'
    }
  }
});
```

### Development Scripts

#### Backend Development Scripts

Create `scripts/dev-backend.sh`:

```bash
#!/bin/bash
echo "🚀 Starting OpenFrame backend services in development mode..."

# Export development environment variables
export SPRING_PROFILES_ACTIVE=development
export LOG_LEVEL=DEBUG

# Start services in background
echo "Starting API Gateway..."
cd openframe/services/openframe-gateway && mvn spring-boot:run > logs/gateway.log 2>&1 &

echo "Starting API Service..."  
cd openframe/services/openframe-api && mvn spring-boot:run > logs/api.log 2>&1 &

echo "Starting Authorization Server..."
cd openframe/services/openframe-authorization-server && mvn spring-boot:run > logs/auth.log 2>&1 &

echo "Starting Client Service..."
cd openframe/services/openframe-client && mvn spring-boot:run > logs/client.log 2>&1 &

echo "✅ Backend services starting... Check logs/ directory for output"
```

#### Frontend Development Scripts

**package.json scripts:**

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "dev:debug": "vite --mode development --debug", 
    "build": "tsc && vite build",
    "build:dev": "tsc && vite build --mode development",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix"
  }
}
```

### Code Generation and Auto-refresh

#### GraphQL Code Generation

The frontend automatically generates TypeScript types from GraphQL schemas:

```bash
# Manual generation
npm run codegen

# Watch mode for development
npm run codegen:watch
```

**codegen.ts configuration:**

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:8080/graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/gql/': {
      preset: 'client',
      plugins: []
    }
  },
  hooks: { afterOneFileWrite: ['prettier --write'] }
};
```

## 🏗️ Build Configurations

### Development Build Profile

#### Backend Configuration

**application-development.yml:**

```yaml
server:
  port: ${SERVER_PORT:8080}
  
spring:
  datasource:
    url: jdbc:mongodb://localhost:27017/openframe_dev
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: create-drop
      
logging:
  level:
    com.openframe: DEBUG
    org.springframework: INFO
    
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,loggers,env
```

#### Frontend Configuration

**.env.development:**

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
VITE_GRAPHQL_URL=http://localhost:8080/graphql
VITE_LOG_LEVEL=debug
VITE_MOCK_API=false
```

### Production Build Profile

#### Backend Production Config

**application-production.yml:**

```yaml
server:
  port: ${SERVER_PORT:8080}
  compression:
    enabled: true
    
spring:
  datasource:
    url: ${DATABASE_URL}
  jpa:
    show-sql: false
    hibernate:
      ddl-auto: validate
      
logging:
  level:
    com.openframe: INFO
    root: WARN
```

#### Frontend Production Config

**.env.production:**

```bash
VITE_API_BASE_URL=${API_BASE_URL}
VITE_WS_BASE_URL=${WS_BASE_URL}
VITE_GRAPHQL_URL=${GRAPHQL_URL}
VITE_LOG_LEVEL=warn
VITE_MOCK_API=false
```

## 🦀 Client Agent Development

### Building the Rust Client

#### Development Build

```bash
cd clients/openframe-client

# Debug build with full logging
cargo build

# Run with debug logging
RUST_LOG=debug cargo run
```

#### Release Build

```bash
# Optimized release build
cargo build --release

# Cross-platform builds
cargo build --release --target x86_64-pc-windows-gnu
cargo build --release --target x86_64-apple-darwin
cargo build --release --target aarch64-apple-darwin
```

#### Development Configuration

**config/development.toml:**

```toml
[server]
base_url = "http://localhost:8080"
websocket_url = "ws://localhost:8080/ws"

[agent]
heartbeat_interval = 30
retry_attempts = 3
log_level = "debug"

[tools]
auto_install = true
update_check_interval = 300
```

### Client Development Workflow

#### Watch Mode for Auto-rebuild

```bash
# Install cargo-watch
cargo install cargo-watch

# Auto-rebuild on file changes
cargo watch -c -w src -x 'run'

# Run tests on changes
cargo watch -c -w src -x 'test'
```

#### Testing Client Agent

```bash
# Run unit tests
cargo test

# Integration tests
cargo test --test integration

# Test with specific log level
RUST_LOG=debug cargo test
```

## 🔍 Development Debugging

### Backend Debugging

#### IntelliJ IDEA Remote Debugging

**Add JVM debug options:**

```bash
export MAVEN_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
mvn spring-boot:run
```

**IntelliJ Debug Configuration:**
1. Run → Edit Configurations → Remote JVM Debug
2. Host: `localhost`, Port: `5005`
3. Set breakpoints and start debugging

#### VS Code Java Debugging

**launch.json:**

```json
{
  "type": "java",
  "name": "Debug OpenFrame API",
  "request": "launch",
  "mainClass": "com.openframe.api.ApiApplication",
  "projectName": "openframe-api",
  "args": "--spring.profiles.active=development",
  "vmArgs": "-Dserver.port=8081"
}
```

### Frontend Debugging

#### Browser Developer Tools

**React Developer Tools:**
- Install React DevTools browser extension
- Access via F12 → React tab

**Apollo Client DevTools:**
- Install Apollo DevTools extension
- Monitor GraphQL queries and cache

#### VS Code Debugging

**launch.json for frontend:**

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Debug Frontend",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
  "sourceMapPathOverrides": {
    "webpack:///src/*": "${webRoot}/*"
  }
}
```

### Rust Debugging

#### VS Code Rust Debugging

**launch.json for client agent:**

```json
{
  "type": "lldb",
  "request": "launch", 
  "name": "Debug Client Agent",
  "cargo": {
    "args": ["build", "--bin=openframe-client"],
    "filter": {
      "name": "openframe-client",
      "kind": "bin"
    }
  },
  "args": [],
  "cwd": "${workspaceFolder}/clients/openframe-client"
}
```

## 📊 Development Monitoring

### Application Health Checks

#### Service Health Endpoints

| Service | Health Check URL |
|---------|-----------------|
| **API Gateway** | http://localhost:8080/actuator/health |
| **API Service** | http://localhost:8081/actuator/health |
| **Auth Server** | http://localhost:9000/actuator/health |
| **Client Service** | http://localhost:8082/actuator/health |

#### Health Check Script

```bash
#!/bin/bash
echo "🏥 Checking OpenFrame service health..."

services=(
  "Gateway:8080"
  "API:8081" 
  "Auth:9000"
  "Client:8082"
)

for service in "${services[@]}"; do
  name=$(echo $service | cut -d: -f1)
  port=$(echo $service | cut -d: -f2)
  
  if curl -sf "http://localhost:$port/actuator/health" > /dev/null; then
    echo "✅ $name service healthy"
  else
    echo "❌ $name service unhealthy"
  fi
done
```

### Development Metrics

#### Application Metrics

Access metrics at:
- **Prometheus format**: http://localhost:8080/actuator/prometheus
- **JSON format**: http://localhost:8080/actuator/metrics

#### Custom Development Dashboard

Create a simple health dashboard:

```html
<!DOCTYPE html>
<html>
<head>
    <title>OpenFrame Dev Dashboard</title>
    <meta http-equiv="refresh" content="30">
</head>
<body>
    <h1>OpenFrame Development Status</h1>
    <div id="services"></div>
    
    <script>
    const services = [
        {name: 'API Gateway', port: 8080},
        {name: 'API Service', port: 8081}, 
        {name: 'Auth Server', port: 9000},
        {name: 'Client Service', port: 8082},
        {name: 'Frontend', port: 3000}
    ];
    
    services.forEach(service => {
        fetch(`http://localhost:${service.port}/actuator/health`)
            .then(r => r.json())
            .then(data => {
                document.getElementById('services').innerHTML += 
                    `<p>✅ ${service.name}: ${data.status}</p>`;
            })
            .catch(() => {
                document.getElementById('services').innerHTML += 
                    `<p>❌ ${service.name}: DOWN</p>`;
            });
    });
    </script>
</body>
</html>
```

## 🧪 Testing in Development

### Running Tests

#### Backend Tests

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run with coverage
mvn clean test jacoco:report
```

#### Frontend Tests

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Integration Tests

```bash
# Run integration tests
mvn verify -P integration-tests

# Run specific integration test
mvn test -Dtest=DeviceIntegrationTest
```

### Test Data Setup

#### Database Test Data

Create development seed data:

```javascript
// scripts/seed-dev-data.js
const { MongoClient } = require('mongodb');

async function seedData() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  const db = client.db('openframe_dev');
  
  // Insert test organizations
  await db.collection('organizations').insertMany([
    {
      name: 'Acme Corporation',
      domain: 'acme.com',
      contactEmail: 'admin@acme.com'
    },
    {
      name: 'TechStart Inc', 
      domain: 'techstart.com',
      contactEmail: 'admin@techstart.com'
    }
  ]);
  
  console.log('✅ Test data seeded');
  await client.close();
}

seedData().catch(console.error);
```

## 🚨 Troubleshooting Development Issues

### Common Problems and Solutions

#### Port Already in Use

```bash
# Find process using port
sudo lsof -i :8080
# or
netstat -tulpn | grep :8080

# Kill process
sudo kill -9 <PID>
```

#### Maven Build Issues

```bash
# Clear Maven cache
mvn dependency:purge-local-repository

# Force update dependencies  
mvn clean install -U

# Skip tests for faster builds
mvn clean install -DskipTests
```

#### npm Installation Problems

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Restart MongoDB
docker restart mongodb

# Check logs
docker logs mongodb
```

#### Frontend Hot Reload Not Working

```bash
# Check Vite configuration
npm run dev -- --debug

# Clear Vite cache
rm -rf node_modules/.vite

# Restart development server
npm run dev
```

### Development Logs

#### Centralized Logging

Create a logs directory structure:

```bash
mkdir -p logs/{api,gateway,auth,client,frontend}

# Start services with log output
mvn spring-boot:run > logs/api/app.log 2>&1 &
```

#### Log Monitoring

```bash
# Tail all service logs
tail -f logs/*/*.log

# Monitor specific service
tail -f logs/api/app.log

# Search logs
grep -r "ERROR" logs/
```

## 🎯 Development Best Practices

### Git Workflow

#### Branch Naming Convention

```bash
# Feature branches
git checkout -b feature/user-management
git checkout -b feature/device-monitoring

# Bug fixes
git checkout -b fix/login-redirect-issue
git checkout -b fix/memory-leak

# Hotfixes
git checkout -b hotfix/critical-security-patch
```

#### Commit Message Format

```text
type(scope): brief description

Longer description if needed

Closes #123
```

**Types:** feat, fix, docs, style, refactor, test, chore

### Code Quality

#### Pre-commit Hooks

Install and configure pre-commit hooks:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

#### Code Formatting

**Backend (Java):**
```xml
<plugin>
    <groupId>com.spotify.fmt</groupId>
    <artifactId>fmt-maven-plugin</artifactId>
    <executions>
        <execution>
            <goals>
                <goal>format</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

**Frontend (TypeScript):**
```json
{
  "scripts": {
    "format": "prettier --write src/**/*.{ts,tsx}",
    "lint:fix": "eslint --fix src/**/*.{ts,tsx}"
  }
}
```

## 🚀 Next Steps

With your local development environment running:

1. **[Architecture Overview](../architecture/README.md)**: Understand the system design
2. **[Contributing Guidelines](../contributing/guidelines.md)**: Learn the contribution process  
3. **[Security Overview](../security/README.md)**: Understand security implementation
4. **[Testing Overview](../testing/README.md)**: Learn testing strategies

Your local OpenFrame development environment is now ready for productive development! 🎉