# Local Development Guide

This guide walks you through setting up OpenFrame for local development, including cloning the repository, building services, and running everything locally with hot reload for an efficient development workflow.

## 🎯 Overview

Local development setup includes:
1. **Repository Setup**: Cloning and initial configuration
2. **Infrastructure Services**: Starting databases and message queues
3. **Backend Services**: Running Java microservices with hot reload
4. **Frontend Development**: Vue.js development server with HMR
5. **Client Agent**: Rust agent development and testing

## 📁 Repository Setup

### Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Check repository structure
ls -la
# Expected structure:
# ├── openframe/           # Main services
# ├── clients/             # Client applications  
# ├── integrated-tools/    # External tool configs
# ├── deps/                # Dependency libraries
# └── docs/                # Documentation
```

### Initialize Git Hooks and Configuration

```bash
# Set up Git hooks (optional but recommended)
git config core.hooksPath .githooks
chmod +x .githooks/*

# Configure Git for development
git config --local user.name "Your Name"
git config --local user.email "your.email@example.com"

# Set up commit message template
git config --local commit.template .gitmessage.txt
```

### Environment Configuration

Create your development environment file:

```bash
# Create .env file in repository root
cp .env.example .env

# Edit with your preferred settings
cat > .env << EOF
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0

# Service Configuration
API_BASE_URL=http://localhost:8081
AUTH_BASE_URL=http://localhost:8082
GATEWAY_BASE_URL=http://localhost:8080
FRONTEND_BASE_URL=http://localhost:3000

# Development Settings
OPENFRAME_ENV=development
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=dev
NODE_ENV=development

# Security (development only)
JWT_SECRET=development-jwt-secret-min-32-characters
ENCRYPTION_KEY=dev-encryption-key-32-chars-long
COOKIE_SECURE=false
EOF
```

## 🗄️ Infrastructure Services

### Option A: Docker Compose (Recommended)

Start the required infrastructure services:

```bash
# Start core infrastructure
docker compose -f integrated-tools/docker-compose.yml up -d mongodb redis kafka

# Verify services are running
docker compose -f integrated-tools/docker-compose.yml ps

# Check service health
docker compose -f integrated-tools/docker-compose.yml logs mongodb
docker compose -f integrated-tools/docker-compose.yml logs redis
docker compose -f integrated-tools/docker-compose.yml logs kafka
```

**Expected Output:**
```text
✅ mongodb    running (healthy)
✅ redis      running (healthy)
✅ kafka      running (healthy)
```

### Option B: Native Installation

If you prefer running services natively:

#### MongoDB
```bash
# macOS
brew services start mongodb/brew/mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

#### Redis  
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Windows
redis-server
```

#### Kafka
```bash
# Download and start Kafka locally
# (See Kafka documentation for detailed setup)
```

### Verify Infrastructure

Test connectivity to all services:

```bash
# Test MongoDB
mongosh --eval "db.adminCommand('ping')"

# Test Redis  
redis-cli ping

# Test Kafka
# (Kafka will be tested when services connect)
```

## ⚙️ Backend Services Development

### Build All Services

```bash
# Clean build all Java services
mvn clean install -DskipTests

# This builds:
# - openframe-api
# - openframe-gateway
# - openframe-authorization-server
# - openframe-management
# - openframe-client
# - openframe-stream
# - openframe-external-api
# - openframe-config
```

### Start Services for Development

#### Method 1: Manual Service Startup (Recommended for Development)

Start each service in separate terminal windows for better debugging:

**Terminal 1 - Configuration Server:**
```bash
cd openframe/services/openframe-config
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Wait for startup message:
# "OpenFrame Config Server started on port 8888"
```

**Terminal 2 - Authorization Server:**  
```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Wait for startup message:
# "OpenFrame Authorization Server started on port 8082"
```

**Terminal 3 - API Service:**
```bash
cd openframe/services/openframe-api  
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Wait for startup message:
# "OpenFrame API started on port 8081"
```

**Terminal 4 - Gateway Service:**
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Wait for startup message:
# "OpenFrame Gateway started on port 8080"
```

**Terminal 5 - Management Service (Optional):**
```bash
cd openframe/services/openframe-management
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

#### Method 2: Development Script

Use the provided development script:

```bash
# Make sure script is executable
chmod +x scripts/dev-start.sh

# Start all services
./scripts/dev-start.sh

# View logs
./scripts/dev-logs.sh

# Stop all services
./scripts/dev-stop.sh
```

### Hot Reload Configuration

#### Java Services Hot Reload

For automatic reloading during development, configure Spring Boot DevTools:

**Add to each service's `pom.xml`:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**IDE Configuration:**
- **IntelliJ IDEA**: Enable "Build project automatically" and "Allow auto-make to start"
- **VS Code**: Configure auto-save and Java auto-build

#### Verify Hot Reload

1. **Start a service** with `mvn spring-boot:run`
2. **Make a code change** to a Java file
3. **Save the file** - DevTools should detect and restart
4. **Check logs** for restart notification

### Service Health Checks

Verify all services are running correctly:

```bash
# Check Gateway health
curl http://localhost:8080/actuator/health

# Check API service
curl http://localhost:8081/actuator/health  

# Check Authorization server
curl http://localhost:8082/actuator/health

# Check all endpoints
for port in 8080 8081 8082; do
  echo "Checking port $port:"
  curl -s http://localhost:$port/actuator/health | jq .status
done
```

**Expected Response:** `{"status":"UP"}`

## 🎨 Frontend Development

### Setup and Installation

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies  
npm install

# Verify Node.js and npm versions
node --version  # Should be 18+
npm --version   # Should be 9+
```

### Development Server

```bash
# Start development server with hot module replacement
npm run dev

# The server will start on http://localhost:3000
# Hot reload is automatically enabled

# Alternative: Start with specific configuration
npm run dev -- --port 3000 --host 0.0.0.0
```

### Frontend Development Workflow

#### File Structure
```text
openframe/services/openframe-frontend/
├── src/
│   ├── app/                 # Main application pages
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard views
│   │   ├── devices/        # Device management
│   │   ├── organizations/  # Organization management
│   │   └── settings/       # System settings
│   ├── components/         # Shared components
│   ├── lib/                # Utilities and services
│   └── stores/             # Pinia state stores
├── public/                 # Static assets
└── docs/                   # Component documentation
```

#### Hot Module Replacement (HMR)

HMR is automatically enabled:

1. **Edit Vue components** - Changes reflect immediately
2. **Modify TypeScript** - Automatic recompilation
3. **Update CSS/styles** - Instant style updates
4. **State preservation** - Component state maintained during updates

#### Development Tools

**Vue DevTools:**
```bash
# Install browser extension for Vue DevTools
# Available for Chrome, Firefox, and Edge
```

**TypeScript Checking:**
```bash
# Run TypeScript checker in watch mode
npm run type-check

# Fix TypeScript errors
npm run type-check -- --fix
```

**Linting and Formatting:**
```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint -- --fix

# Format code with Prettier
npm run format
```

## 🦀 Client Agent Development

### Rust Agent Setup

```bash
# Navigate to client directory
cd clients/openframe-client

# Check Rust version
rustc --version  # Should be 1.70+

# Build in debug mode for development
cargo build

# Run with development logging
RUST_LOG=debug cargo run

# Run tests
cargo test

# Run with automatic restart on file changes (requires cargo-watch)
cargo install cargo-watch
cargo watch -x run
```

### Client Agent Configuration

Create a development configuration:

```bash
# Create config file
mkdir -p ~/.config/openframe-client

cat > ~/.config/openframe-client/config.toml << EOF
[server]
base_url = "http://localhost:8080"
client_service_url = "http://localhost:8083"

[agent] 
poll_interval = 30
heartbeat_interval = 60
log_level = "debug"

[development]
mock_system_info = true
disable_auto_update = true
EOF
```

### Testing Client Agent

```bash
# Test agent registration (requires running backend)
cargo run -- --register --token "test-registration-token"

# Test agent communication
cargo run -- --test-connection

# Run agent in development mode
cargo run -- --dev-mode
```

## 🔄 Development Workflow

### Daily Development Process

1. **Start Infrastructure:**
   ```bash
   docker compose -f integrated-tools/docker-compose.yml up -d
   ```

2. **Start Backend Services:**
   ```bash
   # Use separate terminals or tmux/screen
   ./scripts/dev-start.sh
   ```

3. **Start Frontend:**
   ```bash
   cd openframe/services/openframe-frontend
   npm run dev
   ```

4. **Develop and Test:**
   - Make code changes
   - Hot reload provides instant feedback
   - Use browser DevTools and IDE debugging

5. **Run Tests:**
   ```bash
   # Java tests
   mvn test

   # Frontend tests
   cd openframe/services/openframe-frontend
   npm run test

   # Rust tests  
   cd clients/openframe-client
   cargo test
   ```

### Code Quality Checks

#### Pre-commit Checks
```bash
# Format Java code
mvn spotless:apply

# Check TypeScript
cd openframe/services/openframe-frontend
npm run type-check

# Format Rust code
cd clients/openframe-client  
cargo fmt
```

#### Integration Testing
```bash
# Run integration tests
mvn test -Dtest=**/*IntegrationTest

# Test specific service
cd openframe/services/openframe-api
mvn test -Dtest=**/*IntegrationTest
```

## 🐛 Debugging Setup

### Backend Debugging

#### IntelliJ IDEA
1. **Set breakpoints** in Java source files
2. **Start services in Debug mode** using IDE run configurations
3. **Attach to running processes** for services started externally

#### VS Code  
1. **Configure launch.json** with debug configurations
2. **Use Java Debug Extension** for backend services
3. **Set breakpoints** and use step-through debugging

#### Remote Debugging
For services running in containers or external processes:

```bash
# Start service with debug port
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -jar service.jar

# Attach debugger to port 5005
```

### Frontend Debugging

#### Browser DevTools
1. **Vue DevTools** - Component inspection and state debugging
2. **Network Tab** - API request monitoring
3. **Console** - JavaScript debugging and logging

#### VS Code Debugging
Configure debugger for Vue.js applications:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Frontend",
  "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
  "args": ["--mode", "development"],
  "console": "integratedTerminal"
}
```

### Database Debugging

#### MongoDB
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/openframe_dev

# Query collections
db.organizations.find().pretty()
db.users.find().pretty()

# Check indexes
db.organizations.getIndexes()
```

#### Redis
```bash
# Connect to Redis
redis-cli

# List all keys
keys *

# Get specific values
get "key-name"
```

## 🧪 Testing During Development

### Unit Testing

```bash
# Java unit tests
mvn test -DskipIntegrationTests=true

# Frontend unit tests
cd openframe/services/openframe-frontend
npm run test:unit

# Rust unit tests
cd clients/openframe-client
cargo test --lib
```

### Integration Testing

```bash
# Java integration tests
mvn test -Dtest=**/*IntegrationTest

# End-to-end tests
npm run test:e2e
```

### API Testing

```bash
# Test GraphQL API
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { organizations { id name } }"}'

# Test REST endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/external/api/v1/organizations
```

## 🚀 Performance Optimization

### Development Performance Tips

1. **Increase JVM Memory:**
   ```bash
   export MAVEN_OPTS="-Xmx4g -Xms2g"
   ```

2. **Enable Parallel Builds:**
   ```bash
   mvn clean install -T 4  # Use 4 threads
   ```

3. **Skip Tests During Development:**
   ```bash
   mvn install -DskipTests
   ```

4. **Use Development Profiles:**
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=dev,fast
   ```

## 🔧 Troubleshooting

### Common Development Issues

#### Port Conflicts
```bash
# Check what's using a port
lsof -i :8080

# Kill process using port
kill -9 $(lsof -t -i :8080)
```

#### Service Startup Issues
```bash
# Check service logs
./scripts/dev-logs.sh servicename

# Reset databases
docker compose -f integrated-tools/docker-compose.yml down -v
docker compose -f integrated-tools/docker-compose.yml up -d
```

#### Build Issues
```bash
# Clear Maven cache
rm -rf ~/.m2/repository/com/openframe

# Clear Node.js cache
npm clean-install

# Clear Cargo cache
cargo clean
```

#### Memory Issues
```bash
# Monitor Java process memory
jps -v

# Monitor system resources
htop  # Linux/macOS
```

## 📋 Development Checklist

### Before Starting Development
- [ ] All prerequisite tools installed and configured
- [ ] Repository cloned and `.env` file configured
- [ ] Infrastructure services running (MongoDB, Redis, Kafka)
- [ ] All backend services start successfully
- [ ] Frontend development server running
- [ ] Health checks pass for all services

### During Development
- [ ] Hot reload working for all modified components
- [ ] Code formatting and linting enabled
- [ ] Unit tests passing for modified code
- [ ] Integration tests passing for affected services
- [ ] Documentation updated for user-facing changes

## 📚 Next Steps

With local development set up:

1. **Explore the codebase** - Understand the architecture and patterns
2. **Review [Architecture Overview](../architecture/README.md)** - Deep dive into system design
3. **Check [Contributing Guidelines](../contributing/guidelines.md)** - Learn the contribution process
4. **Join the community** - Connect with other developers on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## 🆘 Getting Help

- **Development Issues**: [OpenMSP Slack #dev](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Bug Reports**: GitHub Issues
- **Feature Discussions**: GitHub Discussions

---

**Local Development Ready!** You now have a complete OpenFrame development environment. Start building amazing MSP automation features!