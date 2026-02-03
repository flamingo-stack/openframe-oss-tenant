# Development Environment Setup

This guide provides detailed instructions for setting up a productive OpenFrame development environment. Whether you're a backend, frontend, or full-stack developer, this guide will get you configured with the right tools and settings.

## IDE Configuration

### IntelliJ IDEA (Recommended for Backend)

IntelliJ IDEA provides excellent support for Java, Spring Boot, and GraphQL development.

#### Installation and Setup

1. **Download IntelliJ IDEA**:
   - **Community Edition**: Free, sufficient for most development
   - **Ultimate Edition**: Includes additional web development features

2. **Install Required Plugins**:
   ```bash
   # Essential plugins for OpenFrame development:
   - Spring Boot
   - GraphQL
   - Docker
   - Kubernetes
   - Database Tools and SQL
   - REST Client
   ```

3. **Configure Java SDK**:
   ```bash
   File → Project Structure → Project
   Project SDK: Java 21 (Oracle/OpenJDK)
   Project Language Level: 21 - Pattern matching for switch
   ```

4. **Set up Maven Integration**:
   ```bash
   File → Settings → Build Tools → Maven
   Maven home path: /path/to/maven (or use bundled)
   User settings file: ~/.m2/settings.xml
   Local repository: ~/.m2/repository
   ```

#### OpenFrame-Specific Configuration

**Import Code Style**:
```xml
<!-- Save as openframe-codestyle.xml -->
<code_scheme name="OpenFrame">
  <option name="RIGHT_MARGIN" value="120" />
  <JavaCodeStyleSettings>
    <option name="IMPORTS_LAYOUT">
      <value>
        <package name="" withSubpackages="true" static="false" />
        <emptyLine />
        <package name="java" withSubpackages="true" static="false" />
        <package name="javax" withSubpackages="true" static="false" />
        <emptyLine />
        <package name="" withSubpackages="true" static="true" />
      </value>
    </option>
  </JavaCodeStyleSettings>
</code_scheme>
```

**Configure Live Templates** for common OpenFrame patterns:
```java
// Spring Boot Service Template
@Service
public class $CLASS_NAME$ {
    
    private static final Logger logger = LoggerFactory.getLogger($CLASS_NAME$.class);
    
    public $CLASS_NAME$() {
        // Constructor
    }
}
```

### Visual Studio Code (Alternative/Frontend)

VS Code is excellent for TypeScript/Vue.js development and works well for Java with extensions.

#### Essential Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-java-pack",
    "vscjava.vscode-spring-boot-dashboard", 
    "vscjava.vscode-spring-initializr",
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "GraphQL.vscode-graphql",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
```

#### VS Code Settings for OpenFrame

```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "vue.codeActions.enabled": true,
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/jdk-21"
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic"
}
```

## Development Tools Setup

### Java Development

#### Maven Configuration

Create/update `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <localRepository>~/.m2/repository</localRepository>
  
  <profiles>
    <profile>
      <id>openframe-dev</id>
      <properties>
        <maven.test.skip>false</maven.test.skip>
        <spring.profiles.active>development</spring.profiles.active>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>openframe-dev</activeProfile>
  </activeProfiles>
</settings>
```

#### Java Environment Variables

Add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Java Environment
export JAVA_HOME=/path/to/jdk-21
export MAVEN_HOME=/path/to/maven
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"

# Maven options for OpenFrame development
export MAVEN_OPTS="-Xmx2g -Xms1g -XX:+UseG1GC"

# Spring Boot development options
export SPRING_OUTPUT_ANSI_ENABLED=ALWAYS
```

### Node.js Development

#### Package Manager Configuration

Set up npm for efficient development:

```bash
# Set npm registry (if using private registry)
npm config set registry https://registry.npmjs.org/

# Configure npm for faster installs
npm config set prefer-offline true
npm config set progress false

# Set up global packages directory (optional)
npm config set prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
```

#### Node Version Management

Use nvm for managing Node.js versions:

```bash
# Install specific Node version for OpenFrame
nvm install 18.19.0
nvm use 18.19.0
nvm alias default 18.19.0

# Verify installation
node --version  # Should output v18.19.0
npm --version   # Should output 10.x.x
```

### Database Tools

#### MongoDB Compass

For MongoDB database management:

1. **Download**: [MongoDB Compass](https://www.mongodb.com/products/compass)
2. **Connect**: `mongodb://localhost:27017/openframe`
3. **Useful Collections**: 
   - `users` - User accounts
   - `organizations` - Tenant organizations  
   - `devices` - Managed devices
   - `oauth_clients` - OAuth client configurations

#### Redis CLI Tools

```bash
# Install redis-cli tools
brew install redis  # macOS
apt-get install redis-tools  # Ubuntu

# Connect to local Redis
redis-cli -h localhost -p 6379

# Useful Redis commands for development
redis-cli KEYS "*session*"  # View sessions
redis-cli FLUSHDB           # Clear database (dev only!)
```

## Development Scripts and Automation

### Shell Aliases

Add these helpful aliases to your shell profile:

```bash
# OpenFrame development aliases
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-clean="mvn clean && rm -rf node_modules"

# Service startup aliases
alias of-gateway="cd openframe/services/openframe-gateway && mvn spring-boot:run"
alias of-api="cd openframe/services/openframe-api && mvn spring-boot:run"
alias of-frontend="cd openframe/services/openframe-frontend && npm run dev"

# Database aliases
alias of-mongo="mongosh mongodb://localhost:27017/openframe"
alias of-redis="redis-cli -h localhost -p 6379"

# Docker aliases for infrastructure
alias of-infra-up="cd integrated-tools && docker-compose up -d"
alias of-infra-down="cd integrated-tools && docker-compose down"
alias of-infra-logs="cd integrated-tools && docker-compose logs -f"
```

### Development Scripts

Create a `scripts/dev-setup.sh` script for initial environment setup:

```bash
#!/bin/bash

set -e

echo "🚀 Setting up OpenFrame development environment..."

# Check prerequisites
echo "Checking prerequisites..."
command -v java >/dev/null 2>&1 || { echo "Java 21 is required"; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo "Maven is required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }

# Start infrastructure services
echo "Starting infrastructure services..."
cd integrated-tools
docker-compose up -d mongodb redis kafka nats

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Build backend services
echo "Building backend services..."
cd ..
mvn clean install -DskipTests

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd openframe/services/openframe-frontend
npm install

echo "✅ Development environment setup complete!"
echo "Run ./scripts/start-dev.sh to start all services"
```

### Development Startup Script

Create `scripts/start-dev.sh`:

```bash
#!/bin/bash

# Start all services for development

echo "🚀 Starting OpenFrame development environment..."

# Function to start service in background
start_service() {
    local service_name=$1
    local service_path=$2
    local start_command=$3
    
    echo "Starting $service_name..."
    cd $service_path
    $start_command &
    echo $! > /tmp/openframe-$service_name.pid
    cd - > /dev/null
}

# Start backend services
start_service "gateway" "openframe/services/openframe-gateway" "mvn spring-boot:run"
start_service "api" "openframe/services/openframe-api" "mvn spring-boot:run"
start_service "management" "openframe/services/openframe-management" "mvn spring-boot:run"

# Wait for services to start
echo "Waiting for services to initialize..."
sleep 45

# Start frontend
start_service "frontend" "openframe/services/openframe-frontend" "npm run dev"

echo "✅ All services started!"
echo "Frontend: http://localhost:3000"
echo "API: http://localhost:8081/graphiql"
echo ""
echo "To stop services, run: ./scripts/stop-dev.sh"
```

## Environment Variables for Development

### Core Environment Variables

Create `.env.development`:

```bash
# Application Environment
NODE_ENV=development
SPRING_PROFILES_ACTIVE=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe-dev
REDIS_URL=redis://localhost:6379/0

# Kafka Configuration  
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081

# NATS Configuration
NATS_URL=nats://localhost:4222

# Security Configuration
JWT_SECRET=dev-secret-change-in-production-please
JWT_EXPIRATION_HOURS=24
OAUTH_CLIENT_SECRET=dev-oauth-secret

# External Service Configuration
TACTICAL_RMM_URL=http://localhost:8001
FLEET_MDM_URL=http://localhost:8002
MESHCENTRAL_URL=http://localhost:3000

# AI Configuration (optional)
OPENAI_API_KEY=sk-your-development-key-here
ANTHROPIC_API_KEY=sk-ant-your-development-key-here

# Development Features
DEBUG_MODE=true
LOG_LEVEL=debug
ENABLE_SWAGGER=true
ENABLE_GRAPHQL_PLAYGROUND=true
```

### Service-Specific Environment Variables

**Gateway Service** (port 8080):
```bash
GATEWAY_PORT=8080
CORS_ENABLED=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**API Service** (port 8081):
```bash
API_SERVICE_PORT=8081
GRAPHQL_PLAYGROUND_ENABLED=true
API_RATE_LIMIT_ENABLED=false
```

**Frontend** (port 3000):
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_GRAPHQL_ENDPOINT=http://localhost:8081/graphql
VITE_APP_TITLE="OpenFrame Development"
```

## Debugging Configuration

### Java Service Debugging

For IntelliJ IDEA, set up remote debugging:

1. **Create Debug Configuration**:
   ```
   Run → Edit Configurations → Add New → Remote JVM Debug
   Name: OpenFrame API Debug
   Host: localhost  
   Port: 5005
   Module: openframe-api
   ```

2. **Start Service with Debug**:
   ```bash
   cd openframe/services/openframe-api
   mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
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
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
      "args": ["dev"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Browser Developer Tools

**Recommended Browser Extensions**:
- **Vue.js Devtools**: For Vue component debugging
- **Apollo Client Devtools**: For GraphQL query debugging
- **Redux DevTools**: For state management debugging

## Performance Optimization

### Development JVM Settings

For better development performance:

```bash
# Add to ~/.mavenrc
export MAVEN_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC -XX:+UseStringDeduplication"

# Add to service startup
-Dspring.devtools.restart.enabled=true
-Dspring.devtools.livereload.enabled=true
```

### Database Optimization for Development

**MongoDB Development Settings**:
```bash
# In ~/.mongorc.js
db.runCommand({setParameter: 1, internalQueryPlannerMaxIndexedSolutions: 64})
db.setProfilingLevel(1, { slowms: 100 })
```

**Redis Development Settings**:
```bash
# Set reasonable memory limits for development
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Troubleshooting Common Issues

### Port Conflicts
```bash
# Find processes using common ports
lsof -i :8080,8081,3000,27017,6379

# Kill specific processes
kill -9 $(lsof -t -i:8080)
```

### Java Issues
```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Reset Java environment
unset JAVA_TOOL_OPTIONS
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Reset node_modules
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

With your development environment configured:

1. **[Set up Local Development](local-development.md)** - Get all services running
2. **[Review Architecture](../architecture/overview.md)** - Understand the system design  
3. **[Read Testing Guide](../testing/overview.md)** - Learn the testing approach
4. **[Check Contributing Guidelines](../contributing/guidelines.md)** - Understand the contribution process

---

**🎯 Environment Ready!** Your development environment is now configured for productive OpenFrame development.