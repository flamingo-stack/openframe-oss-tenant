# Local Development Setup

This comprehensive guide walks you through setting up OpenFrame for local development, including cloning the repository, building services, configuring databases, and running the complete platform locally.

## Prerequisites

Before starting, ensure you have completed the [Development Environment Setup](./environment.md). You should have:

- ✅ Java 21 JDK installed
- ✅ Maven 3.9+ configured
- ✅ Node.js 18+ with npm/pnpm
- ✅ Docker 24.0+ with Compose v2
- ✅ Rust 1.70+ toolchain
- ✅ Git configured with credentials

## Step 1: Repository Setup

### Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/your-org/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify repository structure
ls -la
# Expected: openframe/, clients/, integrated-tools/, scripts/, docs/
```

### Set Up GitHub Access

OpenFrame development requires access to private repositories during the build process:

```bash
# Create GitHub Personal Access Token with these permissions:
# - repo (full control of private repositories)
# - read:packages (read access to GitHub packages)

# Set environment variable
export GITHUB_TOKEN=your_personal_access_token_here

# Add to your shell profile for persistence
echo 'export GITHUB_TOKEN=your_personal_access_token_here' >> ~/.bashrc
source ~/.bashrc
```

### Configure Maven for GitHub

Update your `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <servers>
    <server>
      <id>github-openframe</id>
      <username>${env.GITHUB_USERNAME}</username>
      <password>${env.GITHUB_TOKEN}</password>
    </server>
  </servers>
</settings>
```

## Step 2: Environment Configuration

### Create Local Environment File

Create a `.env` file in the project root:

```bash
# Copy the template
cp .env.example .env

# Edit with your preferred editor
nano .env
```

### Essential Configuration

Update `.env` with these critical settings:

```bash
# GitHub Access (required)
GITHUB_TOKEN=your_personal_access_token
GITHUB_USERNAME=your_github_username

# Database Connections (will be started via Docker)
MONGO_CONNECTION_STRING=mongodb://admin:password@localhost:27017/openframe?authSource=admin
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
PINOT_BROKER_URL=http://localhost:8000

# JWT Configuration (change for production)
JWT_SECRET_KEY=dev-secret-key-change-in-production-environment

# Service Ports (default configuration)
API_GATEWAY_PORT=8080
API_SERVICE_PORT=8081
AUTH_SERVICE_PORT=8082
CLIENT_SERVICE_PORT=8083
MANAGEMENT_SERVICE_PORT=8084
EXTERNAL_API_SERVICE_PORT=8085
STREAM_SERVICE_PORT=8086
CONFIG_SERVER_PORT=8888

# Development Settings
SPRING_PROFILES_ACTIVE=local
LOG_LEVEL=DEBUG
ENABLE_DEBUG_ENDPOINTS=true

# Feature Flags
ENABLE_CHAT_AI=true
ENABLE_DEVICE_MANAGEMENT=true
ENABLE_REAL_TIME_MONITORING=true
ENABLE_ANALYTICS=true
```

### Load Environment Variables

```bash
# Load environment variables into current session
source .env

# Or add to shell profile for automatic loading
echo 'source ~/projects/openframe-oss-tenant/.env' >> ~/.bashrc
```

## Step 3: Database Setup

### Start Database Services with Docker

OpenFrame uses Docker Compose to manage local database services:

```bash
# Navigate to integrated tools directory
cd integrated-tools

# Start all database services
docker compose -f docker-compose.databases.yml up -d

# Verify services are running
docker compose -f docker-compose.databases.yml ps
```

Expected output:
```
NAME               COMMAND                  SERVICE     STATUS
mongodb            "docker-entrypoint.s…"   mongodb     Up
kafka              "/etc/confluent/dock…"   kafka       Up
zookeeper          "/etc/confluent/dock…"   zookeeper   Up
redis              "docker-entrypoint.s…"   redis       Up
cassandra          "docker-entrypoint.s…"   cassandra   Up
pinot-controller   "bin/pinot-admin.sh …"   pinot       Up
```

### Initialize Databases

```bash
# Wait for services to be ready (may take 2-3 minutes)
./scripts/wait-for-databases.sh

# Initialize database schemas and sample data
./scripts/init-databases.sh
```

The initialization script will:
- Create MongoDB databases and collections
- Set up Kafka topics
- Initialize Cassandra keyspaces
- Configure Pinot tables
- Load sample data for development

### Verify Database Connectivity

```bash
# Test MongoDB
docker exec -it openframe-mongodb mongosh --eval "db.adminCommand('listDatabases')"

# Test Kafka
docker exec -it openframe-kafka kafka-topics --list --bootstrap-server localhost:9092

# Test Redis
docker exec -it openframe-redis redis-cli ping
```

## Step 4: Build Services

### Build All Java Services

```bash
# Return to project root
cd ..

# Build all services and libraries (first build may take 10-15 minutes)
mvn clean install

# Alternative: Skip tests for faster initial build
mvn clean install -DskipTests
```

### Build Frontend Application

```bash
# Navigate to frontend service
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Build for development
npm run build:dev

# Return to project root
cd ../../..
```

### Build Client Applications

#### Rust Client Agent

```bash
# Navigate to client directory
cd clients/openframe-client

# Build the client agent
cargo build

# Build for release (optional, for testing performance)
cargo build --release

# Return to project root
cd ../..
```

#### Chat Application (Tauri)

```bash
# Navigate to chat client directory
cd clients/openframe-chat

# Install frontend dependencies
npm install

# Build Tauri application
npm run tauri build

# Return to project root
cd ../..
```

## Step 5: Start Services

### Method 1: Automated Platform Startup (Recommended)

Use the provided platform scripts for easy startup:

```bash
# macOS
./scripts/run-mac.sh

# Linux
./scripts/run-linux.sh

# Windows (PowerShell)
./scripts/run-windows.ps1

# Silent mode (no interactive prompts)
./scripts/run-mac.sh --silent
```

The script will:
1. Verify all dependencies are available
2. Start database services if not running
3. Build any changes to services
4. Start all microservices in correct order
5. Initialize sample data
6. Provide access URLs

### Method 2: Manual Service Startup

If you prefer manual control, start services individually:

#### Start Core Services

```bash
# Terminal 1: Config Server (must start first)
cd openframe/services/openframe-config
mvn spring-boot:run

# Terminal 2: API Gateway
cd openframe/services/openframe-gateway
mvn spring-boot:run

# Terminal 3: API Service
cd openframe/services/openframe-api
mvn spring-boot:run

# Terminal 4: Authorization Service
cd openframe/services/openframe-authorization-server
mvn spring-boot:run
```

#### Start Supporting Services

```bash
# Terminal 5: Client Service
cd openframe/services/openframe-client
mvn spring-boot:run

# Terminal 6: Management Service
cd openframe/services/openframe-management
mvn spring-boot:run

# Terminal 7: Stream Processing Service
cd openframe/services/openframe-stream
mvn spring-boot:run

# Terminal 8: External API Service
cd openframe/services/openframe-external-api
mvn spring-boot:run
```

#### Start Frontend Development Server

```bash
# Terminal 9: Frontend Development Server
cd openframe/services/openframe-frontend
npm run dev
```

### Service Startup Order

Services must be started in this order due to dependencies:

```mermaid
flowchart TD
    subgraph databases[Database Layer]
        MongoDB[(MongoDB)]
        Kafka[(Kafka)]
        Redis[(Redis)]
        Cassandra[(Cassandra)]
        Pinot[(Pinot)]
    end
    
    subgraph core[Core Services]
        Config[Config Server<br/>:8888]
        Gateway[API Gateway<br/>:8080]
    end
    
    subgraph business[Business Services]
        API[API Service<br/>:8081]
        Auth[Auth Service<br/>:8082]
        Client[Client Service<br/>:8083]
        Management[Management Service<br/>:8084]
        Stream[Stream Service<br/>:8086]
        External[External API<br/>:8085]
    end
    
    subgraph frontend[Frontend]
        WebApp[Web Application<br/>:3000]
        ChatApp[Chat Application<br/>:1420]
    end

    databases --> Config
    Config --> Gateway
    Config --> API
    Config --> Auth
    Config --> Client
    Config --> Management
    Config --> Stream
    Config --> External
    
    Gateway --> WebApp
    API --> WebApp
    
    classDef dbStyle fill:#fff3e0,stroke:#f57c00
    classDef coreStyle fill:#e8f5e8,stroke:#388e3c
    classDef businessStyle fill:#e3f2fd,stroke:#0277bd
    classDef frontendStyle fill:#f3e5f5,stroke:#7b1fa2
    
    class MongoDB,Kafka,Redis,Cassandra,Pinot dbStyle
    class Config,Gateway coreStyle
    class API,Auth,Client,Management,Stream,External businessStyle
    class WebApp,ChatApp frontendStyle
```

## Step 6: Verify Installation

### Check Service Health

Once all services are started, verify they're healthy:

```bash
# Check API Gateway health
curl http://localhost:8080/actuator/health

# Check individual service health
curl http://localhost:8081/actuator/health  # API Service
curl http://localhost:8082/actuator/health  # Auth Service
curl http://localhost:8083/actuator/health  # Client Service
```

Expected response:
```json
{
  "status": "UP",
  "components": {
    "db": {"status": "UP"},
    "diskSpace": {"status": "UP"},
    "ping": {"status": "UP"}
  }
}
```

### Access the Platform

#### Web Dashboard

Open your browser and navigate to: **http://localhost:8080**

Default credentials:
- **Username**: `admin@example.com`
- **Password**: `admin123`

#### GraphQL Playground

Explore the GraphQL API: **http://localhost:8080/graphql**

Try this sample query:
```graphql
query {
  devices {
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
```

#### API Documentation

View REST API documentation: **http://localhost:8085/swagger-ui**

### Test Core Features

#### Device Management

1. Navigate to **Devices** in the web dashboard
2. You should see 5 sample devices with different statuses
3. Click on a device to view detailed information
4. Test the remote access features (if available)

#### Real-time Monitoring

1. Go to **Dashboard** to see the overview
2. Check the **System Metrics** charts
3. Verify that data is updating in real-time

#### AI Chat (Mingo)

1. Click the **Chat** button in the top navigation
2. Try asking: "Show me the device status summary"
3. Verify that Mingo responds with current device information

## Development Workflow

### Hot Reload and Development Mode

#### Backend Services (Java)

For faster development, use Spring Boot DevTools:

```bash
# In each service directory, run with DevTools
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=true"
```

#### Frontend Development

The frontend supports hot reload:

```bash
cd openframe/services/openframe-frontend
npm run dev

# The development server will automatically reload on file changes
# Access at: http://localhost:3000 (proxies to backend at :8080)
```

#### Rust Client Development

For Rust development with auto-rebuild:

```bash
cd clients/openframe-client
cargo watch -x build  # Rebuilds on file changes
cargo watch -x test   # Runs tests on file changes
```

### Database Development

#### View Database Contents

```bash
# MongoDB
docker exec -it openframe-mongodb mongosh openframe

# Show collections
show collections

# Query devices
db.devices.find().pretty()

# Query users
db.users.find().pretty()
```

#### View Kafka Messages

```bash
# List topics
docker exec -it openframe-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume messages from a topic
docker exec -it openframe-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic device-events \
  --from-beginning
```

### Making Code Changes

#### Backend Changes

1. **Service Code Changes**:
   ```bash
   # Make your changes to Java files
   # DevTools will automatically restart the application
   # Or manually restart: Ctrl+C then mvn spring-boot:run
   ```

2. **Database Schema Changes**:
   ```bash
   # Update entity classes
   # Changes are automatically applied in development mode
   ```

3. **Configuration Changes**:
   ```bash
   # Update application.yml files
   # Restart the affected service for changes to take effect
   ```

#### Frontend Changes

1. **Vue Components**:
   ```bash
   # Changes in .vue files automatically reload the browser
   # Check the console for any TypeScript errors
   ```

2. **Dependencies**:
   ```bash
   # After adding new dependencies
   cd openframe/services/openframe-frontend
   npm install
   # Development server automatically restarts
   ```

## Troubleshooting

### Common Issues and Solutions

#### Service Startup Issues

**Problem**: Service fails to start with "Port already in use"
```bash
# Find and kill process using the port
sudo lsof -i :8080
kill -9 <PID>

# Or use different ports in .env file
export API_GATEWAY_PORT=8090
```

**Problem**: Service can't connect to database
```bash
# Check if database containers are running
docker compose -f integrated-tools/docker-compose.databases.yml ps

# Restart database services
docker compose -f integrated-tools/docker-compose.databases.yml restart

# Check connection from service logs
tail -f logs/api-service.log
```

#### Database Issues

**Problem**: MongoDB connection refused
```bash
# Check MongoDB container
docker logs openframe-mongodb

# Reset MongoDB container
docker compose -f integrated-tools/docker-compose.databases.yml stop mongodb
docker compose -f integrated-tools/docker-compose.databases.yml up -d mongodb
```

**Problem**: Kafka topics not created
```bash
# Manually create topics
docker exec -it openframe-kafka kafka-topics \
  --create --topic device-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 --replication-factor 1
```

#### Build Issues

**Problem**: Maven build fails with dependency issues
```bash
# Clear Maven cache
rm -rf ~/.m2/repository/com/openframe

# Retry build
mvn clean install -U
```

**Problem**: Frontend build fails
```bash
# Clear node modules and package lock
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Performance Issues

#### Slow Service Startup

```bash
# Increase JVM heap size
export MAVEN_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC"

# Use parallel Maven builds
mvn clean install -T 4  # Uses 4 threads
```

#### Frontend Loading Slowly

```bash
# Enable faster Node.js operations
export NODE_OPTIONS="--max-old-space-size=4096"

# Use pnpm instead of npm for faster installs
npm install -g pnpm
pnpm install  # Instead of npm install
```

### Debugging Tips

#### Enable Debug Logging

Add to `.env`:
```bash
LOG_LEVEL=DEBUG
LOGGING_LEVEL_COM_OPENFRAME=TRACE
```

#### Remote Debugging Java Services

```bash
# Start service with debugging enabled
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"

# Connect your IDE debugger to localhost:5005
```

#### View Service Logs

```bash
# Service logs are written to logs/ directory
tail -f logs/api-service.log
tail -f logs/gateway-service.log

# Or view via Docker (if using container mode)
docker compose logs -f api-service
```

## Next Steps

Now that you have OpenFrame running locally:

### 🎯 **Immediate Next Steps**
1. **[Architecture Overview](../architecture/overview.md)** - Understand how the system works
2. **[Testing Guide](../testing/overview.md)** - Learn how to run and write tests
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Make your first contribution

### 🛠️ **Development Tasks**
1. **Explore the Codebase** - Browse service implementations and understand patterns
2. **Run Tests** - Verify your setup by running the test suite
3. **Make Changes** - Try modifying functionality and see the results
4. **Create Features** - Build new features following established patterns

### 📚 **Learn More**
1. **GraphQL API** - Explore the GraphQL schema and try different queries
2. **Database Models** - Understand the data structures and relationships
3. **Event Processing** - Learn how real-time events flow through the system
4. **Security Model** - Understand authentication and authorization

## Development Resources

### 🗨️ **Community Support**
- **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Get help from developers and users
- **Community Hub** - Visit [OpenMSP.ai](https://www.openmsp.ai/) for resources

### 🔗 **Useful Links**
- **GraphQL Playground**: http://localhost:8080/graphql
- **API Documentation**: http://localhost:8085/swagger-ui
- **Database Admin**: MongoDB Compass → localhost:27017
- **Service Health**: http://localhost:8080/actuator/health

### 📖 **Technical Documentation**
- **[Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)**
- **[Vue.js 3 Guide](https://vuejs.org/guide/)**
- **[GraphQL Specification](https://spec.graphql.org/)**
- **[Apache Kafka Documentation](https://kafka.apache.org/documentation/)**

---

**Congratulations!** 🎉 You now have a complete OpenFrame development environment running locally. Start exploring, building, and contributing to the future of MSP operations!