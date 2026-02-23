# Development Environment Setup

This guide will help you set up a comprehensive development environment for working with OpenFrame. Follow these steps to configure your machine for efficient development, testing, and debugging.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Java)

**Edition**: IntelliJ IDEA Ultimate (Community Edition will work but with limited features)

**Installation**:
```bash
# macOS with Homebrew
brew install --cask intellij-idea

# Ubuntu with snap
sudo snap install intellij-idea-ultimate --classic

# Windows - download from JetBrains website
```

**Essential Plugins**:
- **Spring Boot** - Enhanced Spring framework support
- **Kafka** - Kafka topic and message visualization
- **GraphQL** - GraphQL schema and query support
- **Docker** - Container management from IDE
- **SonarLint** - Code quality and security analysis
- **GitToolBox** - Enhanced Git integration

**Configuration**:

1. **Java SDK Setup**:
   ```text
   File → Project Structure → SDKs → Add JDK
   Point to your Java 21 installation
   ```

2. **Maven Integration**:
   ```text
   File → Settings → Build Tools → Maven
   - Maven home directory: /usr/share/maven (or your Maven path)
   - User settings file: ~/.m2/settings.xml
   - Local repository: ~/.m2/repository
   ```

3. **Spring Boot Run Configurations**:
   ```text
   Run → Edit Configurations → Add New → Spring Boot
   - Name: OpenFrame API Service
   - Main class: com.openframe.api.ApiApplication
   - Program arguments: --spring.profiles.active=development
   ```

### Visual Studio Code (Recommended for Frontend)

**Extensions**:
- **Java Extension Pack** - Comprehensive Java development
- **Spring Boot Extension Pack** - Spring Boot tooling
- **TypeScript and JavaScript** - Frontend development
- **GraphQL** - GraphQL development tools
- **Docker** - Container management
- **REST Client** - API testing within VS Code
- **Kafka** - Kafka topic browsing and message inspection

**Settings Configuration** (`.vscode/settings.json`):
```json
{
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.compile.nullAnalysis.mode": "automatic",
  "spring-boot.ls.checkjvm": false,
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## Required Development Tools

### Java Development Environment

**Java 21 Setup**:
```bash
# Verify current Java version
java -version

# Ubuntu - install OpenJDK 21
sudo apt update
sudo apt install openjdk-21-jdk

# macOS - install via Homebrew
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc

# Set JAVA_HOME
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
echo 'export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))' >> ~/.bashrc
```

**Maven Configuration** (`~/.m2/settings.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
    <profiles>
        <profile>
            <id>development</id>
            <properties>
                <maven.compiler.source>21</maven.compiler.source>
                <maven.compiler.target>21</maven.compiler.target>
                <spring.profiles.active>development</spring.profiles.active>
            </properties>
        </profile>
    </profiles>
    <activeProfiles>
        <activeProfile>development</activeProfile>
    </activeProfiles>
</settings>
```

### Node.js Development Environment

**Node.js and npm Setup**:
```bash
# Install Node.js 18+ via Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 20 (LTS)
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

**Global npm Tools**:
```bash
# Development and debugging tools
npm install -g @anthropic-ai/sdk
npm install -g @voltagent/core
npm install -g typescript
npm install -g ts-node
npm install -g nodemon
```

### Database Development Tools

**MongoDB Tools**:
```bash
# MongoDB Compass (GUI) - download from MongoDB website
# Or MongoDB Shell
npm install -g mongosh

# Verify connection
mongosh "mongodb://localhost:27017/openframe"
```

**Redis Tools**:
```bash
# Redis CLI (usually comes with Redis installation)
redis-cli

# RedisInsight (GUI) - download from Redis website
# Test connection
redis-cli ping  # Should return PONG
```

**Cassandra Tools**:
```bash
# cqlsh comes with Cassandra installation
cqlsh localhost 9042

# Alternative: DBeaver (universal database tool)
# Download from https://dbeaver.io/
```

### Message Broker Tools

**Kafka Development Tools**:
```bash
# Kafka CLI tools (if not using Docker)
# Download from https://kafka.apache.org/downloads

# Kafdrop (Web UI for Kafka) - runs in Docker
docker run -d --rm -p 9001:9000 \
    -e KAFKA_BROKERCONNECT=localhost:9092 \
    obsidiandynamics/kafdrop

# Access at http://localhost:9001
```

**NATS Tools**:
```bash
# NATS CLI
go install github.com/nats-io/natscli/nats@latest

# Test NATS connection
nats server check
```

## Environment Variables for Development

Create a development environment file (`~/.openframe-dev.env`):

```bash
# OpenFrame Development Environment
export OPENFRAME_ENV=development
export OPENFRAME_CONFIG_SERVER=http://localhost:8888
export OPENFRAME_PROFILE=development

# Database Configuration
export MONGODB_URI=mongodb://localhost:27017/openframe_dev
export MONGODB_DATABASE=openframe_dev
export CASSANDRA_CONTACT_POINTS=localhost:9042
export CASSANDRA_KEYSPACE=openframe_dev_logs
export REDIS_HOST=localhost
export REDIS_PORT=6379
export PINOT_CONTROLLER_URL=http://localhost:9000
export PINOT_BROKER_URL=http://localhost:8000

# Message Brokers
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export KAFKA_GROUP_ID=openframe-dev-group
export NATS_SERVERS=nats://localhost:4222
export NATS_CLUSTER_ID=openframe-dev-cluster

# Security and Authentication
export JWT_SECRET=dev-jwt-secret-key-not-for-production
export OAUTH2_CLIENT_SECRET=dev-oauth2-client-secret
export OPENFRAME_ENCRYPTION_KEY=dev-encryption-key-32-chars-long

# AI Integration (use your own API keys)
export ANTHROPIC_API_KEY=your-anthropic-api-key-here
export OPENAI_API_KEY=your-openai-api-key-here

# Logging Configuration
export LOGGING_LEVEL_ROOT=INFO
export LOGGING_LEVEL_COM_OPENFRAME=DEBUG
export LOGGING_FILE=/tmp/openframe-dev.log

# Development Features
export SPRING_DEVTOOLS_RESTART_ENABLED=true
export SPRING_H2_CONSOLE_ENABLED=false
export MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE=*
```

**Load environment variables automatically**:
```bash
# Add to ~/.bashrc or ~/.zshrc
if [ -f ~/.openframe-dev.env ]; then
    source ~/.openframe-dev.env
fi
```

## Editor Extensions and Plugins

### IntelliJ IDEA Extensions

**Code Quality**:
- **SonarLint** - Real-time code quality feedback
- **CheckStyle-IDEA** - Code style enforcement
- **PMDPlugin** - Static analysis tool
- **SpotBugs** - Bug detection

**Spring Framework**:
- **Spring Boot** - Enhanced Spring Boot support
- **Spring Data** - Database development assistance
- **Spring Security** - Security configuration help

**Database & Data**:
- **MongoDB** - MongoDB query and schema support
- **JPA Buddy** - JPA/Hibernate development assistance
- **Database Tools and SQL** - Built-in database support

### VS Code Extensions for Full-Stack Development

**Java Development**:
```json
{
  "recommendations": [
    "vscjava.vscode-java-pack",
    "pivotal.vscode-spring-boot",
    "redhat.java",
    "vscjava.vscode-maven"
  ]
}
```

**Frontend Development**:
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "GraphQL.vscode-graphql",
    "ms-vscode.vscode-json"
  ]
}
```

**DevOps & Infrastructure**:
```json
{
  "recommendations": [
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "humao.rest-client",
    "ms-vscode.vscode-yaml"
  ]
}
```

## Development Utilities

### API Testing and Development

**REST Client Configuration** (`.http` files):
```http
### Development Environment Variables
@baseUrl = http://localhost:8080
@authToken = your-jwt-token-here
@apiKey = your-api-key-here

### Test API Health
GET {{baseUrl}}/actuator/health
Accept: application/json

### Test Authentication
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "username": "admin@example.com",
  "password": "devpassword"
}

### Test GraphQL
POST {{baseUrl}}/graphql
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "query": "query { organizations { name id } }"
}
```

### Database Scripts

**MongoDB Development Queries** (`scripts/dev-mongo.js`):
```javascript
// Connect to development database
use openframe_dev;

// Find all tenants
db.tenants.find().pretty();

// Find devices by organization
db.machines.find({"organizationId": "your-org-id"}).pretty();

// Check recent events
db.events.find().sort({"timestamp": -1}).limit(10).pretty();

// Clean up development data (use with caution)
// db.dropDatabase();
```

**Cassandra Development Queries** (`scripts/dev-cassandra.cql`):
```sql
-- Connect to development keyspace
USE openframe_dev_logs;

-- Check recent log entries
SELECT * FROM unified_log_event 
ORDER BY timestamp DESC 
LIMIT 10;

-- Count logs by severity
SELECT severity, COUNT(*) 
FROM unified_log_event 
GROUP BY severity;
```

### Development Scripts

**Quick Development Setup** (`scripts/dev-setup.sh`):
```bash
#!/bin/bash
set -e

echo "Setting up OpenFrame development environment..."

# Load environment variables
source ~/.openframe-dev.env

# Start development dependencies
echo "Starting development databases and message brokers..."
docker compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Initialize databases
echo "Initializing development databases..."
./clients/openframe-client/scripts/setup_dev_init_config.sh

# Build all services
echo "Building OpenFrame services..."
mvn clean install -DskipTests -q

echo "✅ Development environment ready!"
echo "Start services with: ./scripts/start-all-services.sh"
```

### Hot Reload Configuration

**Spring Boot DevTools** (already included in dependencies):
```yaml
# application-development.yml
spring:
  devtools:
    restart:
      enabled: true
      additional-paths: src/main/java
    livereload:
      enabled: true
  thymeleaf:
    cache: false
```

**Frontend Hot Reload** (for the frontend service):
```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "dev:debug": "NODE_OPTIONS='--inspect' next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

## Troubleshooting Development Environment

### Common Issues and Solutions

**Java Version Conflicts**:
```bash
# Check all Java installations
ls /usr/lib/jvm/  # Linux
ls /Library/Java/JavaVirtualMachines/  # macOS

# Set specific Java version
export JAVA_HOME=/usr/lib/jvm/openjdk-21-jdk
update-alternatives --config java  # Linux
```

**Memory Issues During Development**:
```bash
# Increase Maven memory allocation
export MAVEN_OPTS="-Xmx2048m -Xms1024m"

# Increase JVM memory for applications
export JAVA_OPTS="-Xmx4g -Xms2g"
```

**Port Conflicts**:
```bash
# Find what's using a port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process using a port
kill $(lsof -t -i:8080)  # macOS/Linux
```

**Database Connection Issues**:
```bash
# Test MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Test Redis connection  
redis-cli ping

# Test Kafka connection
kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### Performance Optimization

**IDE Performance**:
- **Increase IDE heap size** to 2-4GB
- **Exclude generated directories** from indexing
- **Disable unnecessary plugins** to reduce memory usage
- **Use selective project import** for large codebases

**Development Database Performance**:
```bash
# MongoDB development optimizations
echo "db.adminCommand({setParameter: 1, logLevel: 1})" | mongosh

# Reduce Kafka retention for development
# Edit server.properties:
log.retention.hours=1
log.segment.bytes=104857600
```

## Verification Commands

After setup, verify your development environment:

```bash
# Check Java environment
java -version && mvn -version

# Check Node.js environment  
node --version && npm --version

# Test database connections
mongosh --eval "db.adminCommand('ping')" && echo "MongoDB OK"
redis-cli ping && echo "Redis OK"

# Test message brokers
kafka-topics.sh --bootstrap-server localhost:9092 --list > /dev/null && echo "Kafka OK"
nats server check && echo "NATS OK"

# Verify Docker setup
docker --version && docker compose version

# Test IDE integrations
echo "✅ Development environment verification complete!"
```

---

*Your development environment is now ready for OpenFrame development! Next, proceed to [Local Development](local-development.md) to start running the platform locally.*