# Local Development Guide

This comprehensive guide walks you through setting up, running, and developing OpenFrame locally. You'll learn how to start all services, enable hot reload, configure debugging, and optimize your development workflow.

## Clone and Setup Commands

### Initial Repository Setup

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Initialize development environment
./clients/openframe-client/scripts/setup_dev_init_config.sh

# Verify repository structure
ls -la
```

Expected directory structure:
```text
openframe-oss-tenant/
├── clients/                    # Client applications
│   ├── openframe-chat/        # Tauri-based chat client
│   └── openframe-client/      # Rust agent client
├── integrated-tools/          # Tool integrations
├── manifests/                 # Deployment manifests
├── openframe/                 # Main platform services
│   └── services/             # Spring Boot applications
├── pom.xml                   # Parent Maven configuration
└── README.md
```

### Development Initialization Script

The `setup_dev_init_config.sh` script performs:
- Client configuration initialization
- Development certificates generation  
- Local environment variable setup
- Permission configuration for development

## Running Locally

### Infrastructure Services Startup

Start the required infrastructure services using Docker Compose:

```bash
# Start core infrastructure services
docker-compose up -d mongodb kafka redis nats cassandra

# Verify all services are running
docker-compose ps

# Check service health
docker-compose logs mongodb
docker-compose logs kafka
```

Expected services status:
```text
NAME                  SERVICE             STATUS              PORTS
openframe-mongodb     mongodb             running             0.0.0.0:27017->27017/tcp
openframe-kafka       kafka               running             0.0.0.0:9092->9092/tcp
openframe-redis       redis               running             0.0.0.0:6379->6379/tcp
openframe-nats        nats                running             0.0.0.0:4222->4222/tcp
openframe-cassandra   cassandra           running             0.0.0.0:9042->9042/tcp
```

### Backend Services (Spring Boot)

Build and run the backend services in the correct order:

#### 1. Build All Services
```bash
# Clean build all modules
mvn clean install -DskipTests

# Or build with tests (slower but recommended before commits)
mvn clean install
```

#### 2. Start Services in Order

**Authorization Server (Port 8081):**
```bash
# Start in background
mvn spring-boot:run -pl openframe/services/openframe-authorization-server &

# Or with specific profile
mvn spring-boot:run -pl openframe/services/openframe-authorization-server -Dspring-boot.run.profiles=local &
```

**API Gateway (Port 8080):**
```bash
# Start API Gateway
mvn spring-boot:run -pl openframe/services/openframe-gateway &
```

**API Service (Port 8082):**
```bash
# Start main API service
mvn spring-boot:run -pl openframe/services/openframe-api &
```

**Client Service (Port 8083):**
```bash
# Start client/agent service
mvn spring-boot:run -pl openframe/services/openframe-client &
```

**Management Service (Port 8084):**
```bash
# Start management service
mvn spring-boot:run -pl openframe/services/openframe-management &
```

**Stream Service (Port 8085):**
```bash
# Start stream processing service
mvn spring-boot:run -pl openframe/services/openframe-stream &
```

#### 3. Verify Backend Services

Check that all services are running:
```bash
# Test service endpoints
curl http://localhost:8081/actuator/health  # Auth Server
curl http://localhost:8080/actuator/health  # Gateway
curl http://localhost:8082/actuator/health  # API Service
curl http://localhost:8083/actuator/health  # Client Service
curl http://localhost:8084/actuator/health  # Management
curl http://localhost:8085/actuator/health  # Stream Service
```

### Frontend Application

Start the frontend development server:

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies (first time or when package.json changes)
npm install

# Start development server with hot reload
npm run dev

# Alternative: Start with specific port
npm run dev -- --port 3001
```

The frontend application uses:
- **VoltAgent Core**: AI agent functionality
- **Anthropic SDK**: Claude AI integration
- **Zod**: Schema validation
- **Glob**: File operations

Expected output:
```text
> openframe-frontend@1.0.0 dev
> next dev

ready - started server on 0.0.0.0:3000, url: http://localhost:3000
info  - Using webpack 5.88.2
event - compiled client and server successfully in 3.2s
```

## Hot Reload and Watch Mode

### Backend Hot Reload (Spring Boot DevTools)

Enable Spring Boot DevTools for automatic restarts:

1. **Ensure DevTools dependency** is in `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

2. **IDE Configuration** for hot reload:

**IntelliJ IDEA:**
- File → Settings → Build → Compiler → "Build project automatically"
- Help → Find Action → "Registry" → Enable "compiler.automake.allow.when.app.running"

**VS Code:**
- Add to `launch.json`:
```json
{
    "type": "java",
    "name": "OpenFrame API (Hot Reload)",
    "request": "launch",
    "mainClass": "com.openframe.api.ApiApplication",
    "vmArgs": ["-Dspring.devtools.restart.enabled=true"]
}
```

3. **Manual Restart Trigger:**
```bash
# Touch a file to trigger restart
touch src/main/resources/application.properties
```

### Frontend Hot Reload

The frontend supports automatic hot reload out of the box:

- **File Changes**: Automatically detected and applied
- **Component Updates**: Live updates without page refresh
- **Style Changes**: Instant CSS updates
- **Configuration Changes**: Require manual restart

Monitor hot reload in terminal:
```text
event - compiled client and server successfully in 847ms
wait  - compiling /app/dashboard/page (client and server)...
event - compiled client and server successfully in 234ms
```

### Database Hot Reload (Development)

For schema changes during development:

```bash
# MongoDB: Drop development database
mongo openframe_dev --eval "db.dropDatabase()"

# Restart services to recreate schema
# Kill and restart API service
kill %1  # If running in background
mvn spring-boot:run -pl openframe/services/openframe-api &
```

## Debug Configuration

### Backend Debugging

#### Remote Debug Setup

1. **Start service with debug options:**
```bash
# API Service with debug port 5005
mvn spring-boot:run -pl openframe/services/openframe-api \
    -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005"

# Gateway with debug port 5006
mvn spring-boot:run -pl openframe/services/openframe-gateway \
    -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5006"
```

2. **IDE Debug Configuration:**

**IntelliJ IDEA:**
```text
Run → Edit Configurations → Add New → Remote JVM Debug
Name: OpenFrame API Debug
Host: localhost
Port: 5005
Command line args: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
```

**VS Code:**
```json
{
    "type": "java",
    "name": "Debug OpenFrame API",
    "request": "attach",
    "hostName": "localhost",
    "port": 5005
}
```

#### Service-Specific Debug Ports
| Service | Debug Port | Process |
|---------|------------|---------|
| API Service | 5005 | Main business logic |
| Gateway | 5006 | Request routing |
| Auth Server | 5007 | Authentication |
| Client Service | 5008 | Agent management |
| Management | 5009 | Operations |
| Stream Service | 5010 | Event processing |

### Frontend Debugging

#### Browser DevTools Integration

1. **Chrome DevTools:**
   - Install React Developer Tools extension
   - Enable source maps in Next.js (enabled by default in dev)
   - Use Network tab to monitor API calls

2. **VS Code Integration:**
```json
{
    "type": "chrome",
    "request": "launch",
    "name": "Debug OpenFrame Frontend",
    "url": "http://localhost:3000",
    "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
    "sourceMaps": true
}
```

### Database Debugging

#### MongoDB Query Debugging

Enable query logging in Spring Boot:
```yaml
logging:
  level:
    org.springframework.data.mongodb: DEBUG
    org.mongodb.driver: DEBUG
```

Monitor queries in real-time:
```bash
# MongoDB profiler
mongo openframe_dev --eval "db.setProfilingLevel(2)"
mongo openframe_dev --eval "db.system.profile.find().pretty()"

# Or use MongoDB Compass GUI for visual query analysis
```

#### Redis Connection Debugging

```bash
# Redis CLI monitor mode
redis-cli monitor

# Check connections and memory usage
redis-cli info clients
redis-cli info memory
```

## Common Development Tasks

### Adding New Dependencies

#### Backend Dependencies (Maven)
```bash
# Add to appropriate module's pom.xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>

# Refresh dependencies
mvn dependency:resolve
```

#### Frontend Dependencies (npm)
```bash
cd openframe/services/openframe-frontend

# Add production dependency
npm install --save new-package

# Add development dependency
npm install --save-dev new-dev-package

# Update package-lock.json
npm install
```

### Database Management

#### MongoDB Operations
```bash
# Access development database
mongo openframe_dev

# Common development queries
db.users.find().pretty()
db.organizations.find().pretty()
db.devices.find().pretty()

# Reset collections
db.users.deleteMany({})
db.organizations.deleteMany({})
```

#### Data Seeding for Development
```bash
# Create sample data script
cat > scripts/seed-dev-data.js << 'EOF'
// MongoDB seed script for development
use openframe_dev;

// Create sample organization
db.organizations.insertOne({
    name: "Dev Organization",
    slug: "dev-org",
    contactEmail: "dev@example.com",
    createdAt: new Date()
});

// Create sample user
db.users.insertOne({
    email: "admin@dev.local",
    firstName: "Admin",
    lastName: "User",
    organizationId: ObjectId(),
    roles: ["ADMIN"],
    createdAt: new Date()
});
EOF

# Run seed script
mongo openframe_dev scripts/seed-dev-data.js
```

### Testing During Development

#### Unit Tests
```bash
# Run all tests
mvn test

# Run specific module tests
mvn test -pl openframe/services/openframe-api

# Run specific test class
mvn test -pl openframe/services/openframe-api -Dtest=UserServiceTest
```

#### Integration Tests
```bash
# Run integration tests (requires running infrastructure)
mvn verify -Pintegration-tests

# Run with TestContainers (slower but isolated)
mvn verify -Pcontainer-tests
```

#### Frontend Tests
```bash
cd openframe/services/openframe-frontend

# Run Jest tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Performance Optimization

#### JVM Tuning for Development
```bash
# Set in environment or IDE
export MAVEN_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC"

# Or add to Maven run configuration
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx4g -Xms2g"
```

#### Database Connection Optimization
```yaml
# application-local.yml
spring:
  data:
    mongodb:
      connection-pool:
        max-size: 10
        min-size: 5
        max-connection-idle-time: 30000
```

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use
```bash
# Find process using port
lsof -i :8080

# Kill process
sudo kill -9 <PID>

# Or start service on different port
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8081"
```

#### Out of Memory Errors
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx6g -Xms2g"

# Clear Maven cache
rm -rf ~/.m2/repository
```

#### Database Connection Issues
```bash
# Check MongoDB status
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# Clear MongoDB data (development only)
docker-compose down
docker volume prune
docker-compose up -d mongodb
```

#### Frontend Build Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Development Workflow Scripts

Create helper scripts for common tasks:

**`scripts/dev-start.sh`:**
```bash
#!/bin/bash
echo "🚀 Starting OpenFrame Development Environment"

# Start infrastructure
docker-compose up -d mongodb kafka redis nats cassandra

# Wait for services
sleep 10

# Start backend services
mvn spring-boot:run -pl openframe/services/openframe-authorization-server &
mvn spring-boot:run -pl openframe/services/openframe-gateway &
mvn spring-boot:run -pl openframe/services/openframe-api &

echo "✅ Backend services starting..."
echo "🌐 Frontend: cd openframe/services/openframe-frontend && npm run dev"
```

**`scripts/dev-stop.sh`:**
```bash
#!/bin/bash
echo "🛑 Stopping OpenFrame Development Environment"

# Stop background Maven processes
pkill -f "spring-boot:run"

# Stop Docker services
docker-compose down

echo "✅ All services stopped"
```

Make scripts executable:
```bash
chmod +x scripts/dev-start.sh scripts/dev-stop.sh
```

## Next Steps

With your local development environment running:

1. **Explore the [Architecture Overview](../architecture/README.md)** to understand the system design
2. **Review [Security Best Practices](../security/README.md)** for security implementation
3. **Check [Testing Overview](../testing/README.md)** for testing strategies
4. **Read [Contributing Guidelines](../contributing/guidelines.md)** for development workflows

Your OpenFrame local development environment is now fully operational! You can develop, test, and debug the platform with hot reload capabilities and comprehensive debugging tools. 🎉