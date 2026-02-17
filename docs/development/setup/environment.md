# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame OSS Tenant. We'll configure IDEs, development tools, debugging capabilities, and environment-specific settings optimized for productive development.

> **Prerequisites**: Complete the [Prerequisites Guide](../../getting-started/prerequisites.md) before proceeding.

## Development IDE Configuration

### IntelliJ IDEA Setup (Recommended for Java Development)

IntelliJ IDEA provides excellent support for Spring Boot and the OpenFrame ecosystem.

#### Installation

```bash
# macOS (using Homebrew)
brew install --cask intellij-idea

# Windows (using Chocolatey)  
choco install intellij-idea

# Linux (using snap)
sudo snap install intellij-idea-community --classic
```

#### OpenFrame Project Configuration

**1. Import Project:**

1. Open IntelliJ IDEA
2. Choose "Open" and select the `openframe-oss-tenant` directory
3. Select "Import project from external model" → "Maven"
4. Choose "Import Maven projects automatically"
5. Select Project SDK: Java 21
6. Click "Finish"

**2. Configure Project Settings:**

```text
File → Project Structure → Project Settings
├── Project SDK: Java 21
├── Project Language Level: 21 - Pattern matching for switch
├── Project Compiler Output: ./target
└── Module Settings:
    ├── Sources: src/main/java, src/main/resources  
    ├── Test Sources: src/test/java, src/test/resources
    └── Dependencies: Maven managed
```

**3. Enable Annotation Processing:**

```text
File → Settings → Build, Execution, Deployment → Compiler → Annotation Processors
✅ Enable annotation processing
✅ Obtain processors from project classpath  
```

**4. Configure Spring Boot:**

```text
File → Settings → Build, Execution, Deployment → Spring Boot
✅ Enable Spring Boot support
Application Properties: application.yml, application-dev.yml
```

#### Essential IntelliJ Plugins

Install these plugins for optimal OpenFrame development:

```text
File → Settings → Plugins → Browse repositories

Required Plugins:
├── Spring Boot (built-in)
├── Spring Data JPA (built-in) 
├── Spring Security (built-in)
├── Database Tools and SQL (built-in)
├── Docker (built-in)
├── Kubernetes (built-in)
├── GraphQL (JetBrains)
├── Kafka (JetBrains)
└── MongoDB Plugin
```

#### Run/Debug Configurations

**API Service Configuration:**

```text
Run → Edit Configurations → + → Spring Boot
├── Name: OpenFrame API Service
├── Main class: com.openframe.api.ApiApplication
├── Active profiles: dev,local
├── VM options: -Xmx2g -Dspring.profiles.active=dev
├── Environment variables:
│   ├── SPRING_DATASOURCE_URL=mongodb://localhost:27017/openframe
│   ├── SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092
│   └── SPRING_REDIS_HOST=localhost
└── Use classpath of module: openframe-api
```

**Gateway Service Configuration:**

```text
Run → Edit Configurations → + → Spring Boot  
├── Name: OpenFrame Gateway Service
├── Main class: com.openframe.gateway.GatewayApplication
├── Active profiles: dev,local
├── VM options: -Xmx1g -Dserver.port=8761
└── Use classpath of module: openframe-gateway
```

**Authorization Server Configuration:**

```text
Run → Edit Configurations → + → Spring Boot
├── Name: OpenFrame Authorization Server
├── Main class: com.openframe.authz.OpenFrameAuthorizationServerApplication  
├── Active profiles: dev,local
├── VM options: -Xmx1g -Dserver.port=9000
└── Use classpath of module: openframe-authorization-server
```

### Visual Studio Code Setup (Multi-Language Development)

VS Code is excellent for working with the full OpenFrame stack, including Node.js tooling and Rust clients.

#### Installation

```bash
# macOS
brew install --cask visual-studio-code

# Windows
choco install vscode

# Linux  
sudo snap install --classic code
```

#### Essential Extensions

Install the Extension Pack for Java and additional tools:

```json
{
  "recommendations": [
    "vscjava.vscode-java-pack",
    "vmware.vscode-spring-boot", 
    "pivotal.vscode-boot-dev-pack",
    "redhat.java",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-azuretools.vscode-docker",
    "mongodb.mongodb-vscode",
    "kafka-integration.kafka",
    "graphql.vscode-graphql"
  ]
}
```

#### Workspace Configuration

Create `.vscode/settings.json`:

```json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/usr/lib/jvm/java-21-openjdk-amd64"
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "spring.boot.ls.problem.application-properties.enabled": true,
  "spring-boot.ls.java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

#### Launch Configurations  

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "OpenFrame API Service",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "args": [],
      "vmArgs": "-Dspring.profiles.active=dev -Xmx2g",
      "env": {
        "SPRING_DATASOURCE_URL": "mongodb://localhost:27017/openframe"
      }
    },
    {
      "type": "java",
      "name": "OpenFrame Gateway",  
      "request": "launch",
      "mainClass": "com.openframe.gateway.GatewayApplication",
      "projectName": "openframe-gateway",
      "vmArgs": "-Dspring.profiles.active=dev -Dserver.port=8761"
    }
  ]
}
```

## Environment Variables Configuration

Set up development-specific environment variables for consistent behavior across the team.

### Shell Configuration

Add to `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# OpenFrame Development Environment
export OPENFRAME_DEV_HOME="$HOME/openframe-development"
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export MAVEN_HOME="/usr/share/maven"
export NODE_VERSION="18"

# Memory settings for development
export MAVEN_OPTS="-Xmx4g -XX:MaxPermSize=512m"
export JAVA_OPTS="-Xmx2g -Xms1g"
export NODE_OPTIONS="--max-old-space-size=4096"

# OpenFrame service ports
export OPENFRAME_API_PORT=8080
export OPENFRAME_GATEWAY_PORT=8761  
export OPENFRAME_AUTH_PORT=9000
export OPENFRAME_EXTERNAL_API_PORT=8081

# Database connections
export MONGODB_HOST=localhost
export MONGODB_PORT=27017
export REDIS_HOST=localhost
export REDIS_PORT=6379
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Development flags
export SPRING_PROFILES_ACTIVE=dev,local
export OPENFRAME_LOG_LEVEL=DEBUG
export OPENFRAME_ENABLE_DEBUG_ENDPOINTS=true

# Path updates
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$HOME/.nvm/versions/node/v$NODE_VERSION/bin:$PATH"
```

### Application Properties

Create development-specific configuration files:

#### `application-dev.yml` (Place in each service's resources)

```yaml
# Development Configuration
server:
  port: ${OPENFRAME_API_PORT:8080}
  
spring:
  profiles:
    active: dev
  
  # Database Configuration
  data:
    mongodb:
      uri: mongodb://${MONGODB_HOST:localhost}:${MONGODB_PORT:27017}/openframe-dev
      
  # Kafka Configuration  
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    consumer:
      group-id: openframe-dev
      auto-offset-reset: earliest
    producer:
      retries: 3
      
  # Redis Configuration
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    database: 1  # Use different database for dev

# Logging Configuration
logging:
  level:
    com.openframe: ${OPENFRAME_LOG_LEVEL:DEBUG}
    org.springframework.security: INFO
    org.springframework.kafka: INFO
    org.springframework.data.mongodb: INFO
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"

# Actuator Configuration
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,configprops
  endpoint:
    health:
      show-details: always

# Development Security (relaxed for local development)
openframe:
  security:
    jwt:
      secret: dev-secret-key-not-for-production
      expiration: 3600000  # 1 hour
    cors:
      allowed-origins: 
        - http://localhost:3000
        - http://localhost:8080
        - http://127.0.0.1:3000
      allowed-headers: "*"
      allowed-methods: "*"
      
  # Debug endpoints (only enabled in dev)
  debug:
    enabled: ${OPENFRAME_ENABLE_DEBUG_ENDPOINTS:false}
    endpoints:
      - /debug/cache-stats
      - /debug/active-sessions  
      - /debug/kafka-topics
```

#### `.env` File for Docker Compose

Create `.env` in the project root:

```env
# Docker Compose Environment
COMPOSE_PROJECT_NAME=openframe-dev

# Service versions
MONGODB_VERSION=6.0
KAFKA_VERSION=7.4-ccs
REDIS_VERSION=7.0-alpine
CASSANDRA_VERSION=4.1
NATS_VERSION=2.9-alpine

# Database configuration
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=dev-password
MONGODB_DATABASE=openframe-dev

# Kafka configuration  
KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092

# Redis configuration
REDIS_PASSWORD=dev-redis-password

# Network configuration
OPENFRAME_NETWORK=openframe-dev-network

# Volume paths
MONGODB_DATA_PATH=./dev-data/mongodb
KAFKA_DATA_PATH=./dev-data/kafka
REDIS_DATA_PATH=./dev-data/redis
CASSANDRA_DATA_PATH=./dev-data/cassandra
```

## Development Database Setup

### MongoDB Development Configuration

Create development database initialization scripts:

#### `scripts/init-dev-mongodb.js`

```javascript
// Development MongoDB Initialization
db = db.getSiblingDB('openframe-dev');

// Create collections with development data
db.tenants.insertMany([
  {
    _id: ObjectId(),
    domain: "dev.openframe.local",
    name: "Development Tenant",
    status: "ACTIVE",
    createdAt: new Date(),
    settings: {
      timeZone: "UTC",
      locale: "en-US"
    }
  }
]);

db.users.insertMany([
  {
    _id: ObjectId(),
    tenantId: "dev.openframe.local", 
    email: "dev@openframe.local",
    firstName: "Developer",
    lastName: "User",
    status: "ACTIVE",
    roles: ["ADMIN", "USER"],
    createdAt: new Date()
  }
]);

// Create indexes for development
db.devices.createIndex({ "tenantId": 1, "status": 1 });
db.events.createIndex({ "tenantId": 1, "timestamp": -1 });
db.organizations.createIndex({ "tenantId": 1, "name": 1 });

print("Development database initialized successfully");
```

Run the initialization:

```bash
# Start MongoDB
docker-compose up -d mongodb

# Wait for MongoDB to be ready
sleep 10

# Initialize development database
docker exec -i mongodb mongosh < scripts/init-dev-mongodb.js
```

### Redis Development Setup

Configure Redis for development use:

#### `config/redis-dev.conf`

```conf
# Redis Development Configuration
port 6379
bind 127.0.0.1
protected-mode yes
requirepass dev-redis-password

# Memory settings
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence (disabled for dev speed)
save ""
appendonly no

# Logging
loglevel debug
logfile ""

# Development-specific settings
databases 16
timeout 300
```

## Testing Environment Configuration

### Test Database Setup

Configure separate test databases to avoid conflicts with development data:

#### `application-test.yml`

```yaml
spring:
  profiles:
    active: test
    
  # Test Database (separate from dev)  
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe-test
      
  # In-memory Kafka for tests
  kafka:
    bootstrap-servers: ${spring.embedded.kafka.brokers}
    
  # Embedded Redis for tests  
  redis:
    port: 0  # Random port for embedded Redis

# Test-specific logging (less verbose)
logging:
  level:
    com.openframe: INFO
    org.springframework.test: WARN
    org.testcontainers: INFO

# Disable security for integration tests
openframe:
  security:
    enabled: false
    
# Fast test execution
management:
  endpoints:
    enabled-by-default: false
```

### Testcontainers Configuration

Create `src/test/resources/testcontainers.properties`:

```properties
# Testcontainers configuration for integration tests
testcontainers.reuse.enable=true
testcontainers.checks.disable=true

# Container image versions
mongodb.docker.image.name=mongo:6.0
redis.docker.image.name=redis:7.0-alpine
kafka.docker.image.name=confluentinc/cp-kafka:7.4.0
```

## Development Utilities and Scripts

### Development Helper Scripts

Create `scripts/dev-utils.sh`:

```bash
#!/bin/bash
# OpenFrame Development Utilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Development environment status
dev_status() {
    echo -e "${BLUE}OpenFrame Development Environment Status${NC}"
    echo "=============================================="
    
    # Check Java
    if java --version >/dev/null 2>&1; then
        echo -e "✅ Java: $(java --version | head -n1)"
    else
        echo -e "❌ Java: Not installed or not in PATH"
    fi
    
    # Check Maven
    if mvn --version >/dev/null 2>&1; then
        echo -e "✅ Maven: $(mvn --version | head -n1 | cut -d' ' -f3)"
    else
        echo -e "❌ Maven: Not installed or not in PATH"
    fi
    
    # Check Node.js
    if node --version >/dev/null 2>&1; then
        echo -e "✅ Node.js: $(node --version)"
    else
        echo -e "❌ Node.js: Not installed or not in PATH"
    fi
    
    # Check Docker
    if docker --version >/dev/null 2>&1; then
        echo -e "✅ Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    else
        echo -e "❌ Docker: Not installed or not running"
    fi
    
    # Check infrastructure services
    echo -e "\n${BLUE}Infrastructure Services:${NC}"
    
    if docker-compose ps | grep -q "mongodb.*Up"; then
        echo -e "✅ MongoDB: Running"
    else
        echo -e "❌ MongoDB: Not running"
    fi
    
    if docker-compose ps | grep -q "kafka.*Up"; then
        echo -e "✅ Kafka: Running"
    else
        echo -e "❌ Kafka: Not running"
    fi
    
    if docker-compose ps | grep -q "redis.*Up"; then
        echo -e "✅ Redis: Running"
    else
        echo -e "❌ Redis: Not running"
    fi
}

# Clean development environment
dev_clean() {
    echo -e "${YELLOW}Cleaning development environment...${NC}"
    
    # Stop all Java processes
    pkill -f "openframe" || true
    
    # Clean Maven builds
    mvn clean -q
    
    # Clean Node.js builds
    find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Clean Docker containers and volumes (optional)
    read -p "Clean Docker containers and volumes? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        docker system prune -f
    fi
    
    echo -e "${GREEN}Development environment cleaned!${NC}"
}

# Setup development environment
dev_setup() {
    echo -e "${BLUE}Setting up development environment...${NC}"
    
    # Create data directories
    mkdir -p dev-data/{mongodb,kafka,redis,cassandra}
    
    # Copy configuration files
    cp config/application-dev.yml.template openframe/services/*/src/main/resources/application-dev.yml 2>/dev/null || true
    
    # Install Node.js dependencies
    if [ -f package.json ]; then
        echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
        npm install
    fi
    
    # Install client dependencies
    if [ -d clients/openframe-chat ]; then
        echo -e "${YELLOW}Installing chat client dependencies...${NC}"
        cd clients/openframe-chat && npm install && cd ../..
    fi
    
    echo -e "${GREEN}Development environment setup complete!${NC}"
}

# Main script logic
case "${1:-}" in
    status)
        dev_status
        ;;
    clean)
        dev_clean
        ;;
    setup)
        dev_setup
        ;;
    *)
        echo "Usage: $0 {status|clean|setup}"
        echo "  status - Check development environment status"
        echo "  clean  - Clean build artifacts and processes"
        echo "  setup  - Set up development environment"
        exit 1
        ;;
esac
```

Make the script executable:

```bash
chmod +x scripts/dev-utils.sh

# Use the script
./scripts/dev-utils.sh status
./scripts/dev-utils.sh setup
./scripts/dev-utils.sh clean
```

## Debugging Configuration

### Remote Debugging Setup

Enable remote debugging for services:

#### Java Services

Add to your run configurations or startup scripts:

```bash
# Enable remote debugging on port 5005
export JAVA_OPTS="$JAVA_OPTS -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Different ports for each service
export API_DEBUG_PORT=5005
export GATEWAY_DEBUG_PORT=5006  
export AUTH_DEBUG_PORT=5007

# Start with debugging
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:$API_DEBUG_PORT \
     -jar openframe-api.jar
```

#### IDE Debug Configuration

**IntelliJ IDEA:**

```text
Run → Edit Configurations → + → Remote JVM Debug
├── Name: OpenFrame API Remote Debug
├── Host: localhost
├── Port: 5005
├── Use module classpath: openframe-api
└── Search sources using module's classpath: ✅
```

**VS Code:**

```json
{
  "type": "java",
  "name": "Remote Debug API Service",
  "request": "attach",
  "hostName": "localhost",
  "port": 5005,
  "projectName": "openframe-api"
}
```

### Logging Configuration for Development

#### Structured Development Logging

Create `logback-spring.xml` for each service:

```xml
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    
    <!-- Development console logging -->
    <springProfile name="dev">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
                <providers>
                    <timestamp/>
                    <logLevel/>
                    <loggerName/>
                    <message/>
                    <mdc/>
                    <stackTrace/>
                </providers>
            </encoder>
        </appender>
        
        <logger name="com.openframe" level="DEBUG"/>
        <logger name="org.springframework.security" level="INFO"/>
        <logger name="org.springframework.web" level="INFO"/>
        
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
    
    <!-- File logging for debugging -->
    <springProfile name="dev,debug">
        <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
            <file>logs/openframe-dev.log</file>
            <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
                <fileNamePattern>logs/openframe-dev.%d{yyyy-MM-dd}.log</fileNamePattern>
                <maxHistory>7</maxHistory>
            </rollingPolicy>
            <encoder>
                <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        
        <root level="DEBUG">
            <appender-ref ref="FILE"/>
        </root>
    </springProfile>
</configuration>
```

## Environment Validation

### Validation Script

Create `scripts/validate-dev-env.sh`:

```bash
#!/bin/bash
# Validate development environment setup

set -euo pipefail

echo "🔍 Validating OpenFrame Development Environment"
echo "============================================="

VALIDATION_FAILED=0

# Function to check command availability
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        echo "✅ $1 is available"
        return 0
    else
        echo "❌ $1 is not available"
        VALIDATION_FAILED=1
        return 1
    fi
}

# Function to check service connectivity
check_service() {
    local service=$1
    local port=$2
    local name=$3
    
    if timeout 3 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
        echo "✅ $name is running on port $port"
        return 0
    else
        echo "❌ $name is not accessible on port $port"
        VALIDATION_FAILED=1
        return 1
    fi
}

# Check required commands
echo -e "\n📋 Checking Required Software"
echo "----------------------------"
check_command java
check_command javac
check_command mvn
check_command node
check_command npm
check_command docker
check_command docker-compose
check_command git

# Check Java version
echo -e "\n☕ Checking Java Version"
echo "----------------------"
if java --version | grep -q "21\."; then
    echo "✅ Java 21 detected"
else
    echo "❌ Java 21 not detected"
    java --version
    VALIDATION_FAILED=1
fi

# Check Node.js version
echo -e "\n🚀 Checking Node.js Version"  
echo "--------------------------"
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    echo "✅ Node.js $NODE_VERSION detected (>= 18 required)"
else
    echo "❌ Node.js $NODE_VERSION detected (18+ required)"
    VALIDATION_FAILED=1
fi

# Check Docker daemon
echo -e "\n🐳 Checking Docker"
echo "----------------"
if docker info >/dev/null 2>&1; then
    echo "✅ Docker daemon is running"
else
    echo "❌ Docker daemon is not running"
    VALIDATION_FAILED=1
fi

# Check infrastructure services if Docker is running
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "\n🏗️ Checking Infrastructure Services"
    echo "--------------------------------"
    check_service mongodb 27017 "MongoDB"
    check_service kafka 9092 "Kafka" 
    check_service redis 6379 "Redis"
fi

# Check environment variables
echo -e "\n🌍 Checking Environment Variables"
echo "-------------------------------"
if [ -n "${JAVA_HOME:-}" ]; then
    echo "✅ JAVA_HOME is set to $JAVA_HOME"
else
    echo "❌ JAVA_HOME is not set"
    VALIDATION_FAILED=1
fi

if [ -n "${MAVEN_HOME:-}" ]; then
    echo "✅ MAVEN_HOME is set to $MAVEN_HOME"
else
    echo "⚠️ MAVEN_HOME is not set (optional)"
fi

# Check project structure
echo -e "\n📁 Checking Project Structure"
echo "---------------------------"
if [ -f pom.xml ]; then
    echo "✅ Root pom.xml found"
else
    echo "❌ Root pom.xml not found"
    VALIDATION_FAILED=1
fi

if [ -d openframe/services ]; then
    echo "✅ Services directory found"
else
    echo "❌ Services directory not found"
    VALIDATION_FAILED=1
fi

if [ -d deps/openframe-oss-lib ]; then
    echo "✅ Core libraries directory found"
else
    echo "❌ Core libraries directory not found"  
    VALIDATION_FAILED=1
fi

# Final validation result
echo -e "\n📊 Validation Summary"
echo "==================="
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo "🎉 All validations passed! Your development environment is ready."
    exit 0
else
    echo "❌ Some validations failed. Please address the issues above."
    exit 1
fi
```

Run the validation:

```bash
chmod +x scripts/validate-dev-env.sh
./scripts/validate-dev-env.sh
```

## Summary

You now have a complete development environment setup for OpenFrame OSS Tenant! This configuration provides:

- ✅ **IDE Integration** - IntelliJ IDEA and VS Code configured
- ✅ **Environment Variables** - Consistent development settings
- ✅ **Database Setup** - MongoDB, Redis with development data
- ✅ **Testing Configuration** - Separate test databases and settings  
- ✅ **Development Scripts** - Utilities for common tasks
- ✅ **Debugging Support** - Remote debugging and structured logging
- ✅ **Validation Tools** - Environment verification scripts

**Next Steps:**
1. Run the validation script to ensure everything is working
2. Proceed to [Local Development Guide](local-development.md) to start the services
3. Try building your first feature or integration

**Troubleshooting:**
If you encounter issues, check the validation output and ensure all prerequisites are met. Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help with specific problems.