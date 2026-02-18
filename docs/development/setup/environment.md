# Development Environment Setup

This guide will help you configure your development environment for working with OpenFrame OSS Tenant. We'll cover IDE setup, development tools, and environment configuration for optimal productivity.

> **Prerequisites:** Ensure you've completed the [Prerequisites](../../getting-started/prerequisites.md) and [Quick Start](../../getting-started/quick-start.md) guides first.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA Ultimate provides the best experience for Spring Boot development.

#### Installation & Setup

1. **Download IntelliJ IDEA Ultimate** from [JetBrains](https://www.jetbrains.com/idea/)
2. **Import the project:**
   - File → Open → Select `openframe-oss-tenant` directory
   - Choose "Import as Maven project"

#### Essential Plugins

Install these plugins for optimal development:

```text
✅ Spring Boot (bundled)
✅ GraphQL (bundled) 
✅ Docker
✅ Database Navigator
✅ Rainbow Brackets
✅ SonarLint
✅ GitToolBox
✅ Key Promoter X
```

**To install plugins:**
1. File → Settings → Plugins
2. Search for each plugin and click Install

#### Project Configuration

**1. Configure JDK:**
- File → Project Structure → Project Settings → Project
- Set Project SDK to Java 21
- Set Project language level to "21 - Pattern matching for switch"

**2. Configure Maven:**
- File → Settings → Build, Execution, Deployment → Build Tools → Maven
- Set Maven home path to your Maven installation
- Check "Import Maven projects automatically"

**3. Configure Code Style:**
- File → Settings → Editor → Code Style → Java
- Import Google Java Style Guide or use project-specific settings

**4. Enable Annotation Processing:**
- File → Settings → Build, Execution, Deployment → Compiler → Annotation Processors
- Check "Enable annotation processing"

### Visual Studio Code (Alternative)

VS Code is excellent for frontend development and provides good Java support.

#### Essential Extensions

```bash
# Java development
code --install-extension vscjava.vscode-java-pack
code --install-extension pivotal.vscode-spring-boot
code --install-extension vscjava.vscode-gradle

# Frontend development
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension GraphQL.vscode-graphql

# Rust development (for client apps)
code --install-extension rust-lang.rust-analyzer
code --install-extension tauri-apps.tauri-vscode

# General productivity
code --install-extension ms-vscode.vscode-docker
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --install-extension GitLab.gitlab-workflow
```

#### VS Code Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.maven.downloadSources": true,
  "java.format.settings.profile": "GoogleStyle",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.exclude": {
    "**/target": true,
    "**/node_modules": true,
    "**/.git": true
  }
}
```

## Development Tools Configuration

### Maven Configuration

Create or update `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
                              http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <localRepository>/path/to/your/.m2/repository</localRepository>
  
  <profiles>
    <profile>
      <id>openframe-development</id>
      <properties>
        <spring.profiles.active>development</spring.profiles.active>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>openframe-development</activeProfile>
  </activeProfiles>
</settings>
```

### Node.js Configuration

Configure npm for the frontend development:

```bash
# Set up npm configuration
npm config set save-exact true
npm config set engine-strict true

# Configure registry (if using private registry)
npm config set registry https://registry.npmjs.org/

# Set up global packages
npm install -g @types/node typescript ts-node
npm install -g yarn pnpm
```

### Git Configuration

Set up Git hooks and configuration:

```bash
# Configure Git for the project
git config user.name "Your Name"
git config user.email "your.email@company.com"

# Enable useful Git features
git config --global pull.rebase true
git config --global init.defaultBranch main
git config --global core.autocrlf input
```

## Environment Variables

### Development Profile

Create `application-development.yml` in each service's `src/main/resources/`:

```yaml
spring:
  profiles:
    active: development
    
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
    
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,env,configprops
        
server:
  port: ${SERVER_PORT:8080}
```

### Environment Variables File

Create `.env` file in your project root:

```bash
# OpenFrame Configuration
OPENFRAME_ENV=development
OPENFRAME_LOG_LEVEL=DEBUG
OPENFRAME_CONFIG_SERVER=http://localhost:8888

# Database Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=openframe_dev

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DATABASE=0

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081

# NATS Configuration
NATS_SERVER_URL=nats://localhost:4222

# JWT Configuration
JWT_ISSUER_URI=http://localhost:8081
JWT_AUDIENCE=openframe-api

# External APIs
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

Load these variables in your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc
if [ -f ~/projects/openframe-oss-tenant/.env ]; then
    export $(grep -v '^#' ~/projects/openframe-oss-tenant/.env | xargs)
fi
```

## Docker Development Environment

### Docker Compose for Dependencies

Create `docker-compose.dev.yml` for development dependencies:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
  
  kafka:
    image: confluentinc/cp-kafka:latest
    ports:
      - "9092:9092"
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper
  
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  nats:
    image: nats:2.9-alpine
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["--jetstream", "--http_port", "8222"]

volumes:
  mongodb_data:
  redis_data:
```

Start development dependencies:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Database Setup

### MongoDB Development Database

Connect and set up the development database:

```bash
# Connect to MongoDB
mongosh mongodb://admin:password@localhost:27017

# Create development database
use openframe_dev

# Create a development user
db.createUser({
  user: "openframe_dev",
  pwd: "dev_password",
  roles: ["readWrite"]
})

# Create initial collections and indexes (optional)
db.tenants.createIndex({ "domain": 1 }, { unique: true })
db.users.createIndex({ "email": 1, "tenantId": 1 }, { unique: true })
```

### Redis Development Configuration

Test Redis connection:

```bash
# Connect to Redis
redis-cli

# Test basic commands
SET test-key "Hello OpenFrame"
GET test-key
DEL test-key
```

## Debugging Configuration

### IntelliJ IDEA Debug Configuration

1. **Create Spring Boot run configuration:**
   - Run → Edit Configurations → Add New → Spring Boot
   - Name: "OpenFrame API Service"
   - Main class: `com.openframe.api.ApiApplication`
   - VM options: `-Dspring.profiles.active=development -Xdebug -Xmx2G`
   - Program arguments: `--spring.config.location=classpath:application.yml,classpath:application-development.yml`

2. **Create debug configuration:**
   - Copy the run configuration
   - Name: "OpenFrame API Service (Debug)"
   - Enable "Debug mode"

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Debug OpenFrame API",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "args": [],
      "vmArgs": "-Dspring.profiles.active=development",
      "env": {
        "SPRING_PROFILES_ACTIVE": "development"
      }
    }
  ]
}
```

## Performance Optimization

### JVM Tuning for Development

Add these JVM options for better development performance:

```bash
# Memory settings
-Xms1G -Xmx4G

# GC settings for development
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200

# Development-specific optimizations
-Dspring.jpa.hibernate.ddl-auto=update
-Dspring.jpa.show-sql=true
-Dlogging.level.org.springframework.web=DEBUG
```

### Maven Build Optimization

Add to `~/.mavenrc`:

```bash
export MAVEN_OPTS="-Xmx2G -XX:+TieredCompilation -XX:TieredStopAtLevel=1"
```

## Useful Development Aliases

Add these aliases to your shell profile:

```bash
# OpenFrame development aliases
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-run-api="cd openframe/services/openframe-api && mvn spring-boot:run"
alias of-run-auth="cd openframe/services/openframe-authorization-server && mvn spring-boot:run"
alias of-run-gateway="cd openframe/services/openframe-gateway && mvn spring-boot:run"
alias of-run-frontend="cd openframe/services/openframe-frontend && npm run dev"

# Docker development
alias of-deps-up="docker-compose -f docker-compose.dev.yml up -d"
alias of-deps-down="docker-compose -f docker-compose.dev.yml down"
alias of-deps-logs="docker-compose -f docker-compose.dev.yml logs -f"

# Useful shortcuts
alias of-logs="tail -f logs/*.log"
alias of-clean="mvn clean && docker system prune -f"
```

## Troubleshooting Development Issues

### Common Problems

**Java Version Issues:**
```bash
# Check Java version
java -version
javac -version

# Set JAVA_HOME if needed
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

**Maven Build Failures:**
```bash
# Clear Maven cache
rm -rf ~/.m2/repository/com/openframe
mvn clean install -U
```

**Port Conflicts:**
```bash
# Find what's using a port
lsof -i :8080
netstat -tulpn | grep :8080

# Kill process using port
kill -9 <PID>
```

**Database Connection Issues:**
```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017

# Test Redis connection
redis-cli ping
```

### IDE-Specific Issues

**IntelliJ IDEA:**
- Clear caches: File → Invalidate Caches and Restart
- Reimport Maven: Maven panel → Refresh icon
- Check Project Structure: File → Project Structure

**VS Code:**
- Reload window: Ctrl+Shift+P → "Developer: Reload Window"
- Clear workspace: Remove `.vscode` folder and restart
- Java issues: Ctrl+Shift+P → "Java: Refresh Projects"

## Next Steps

With your development environment configured:

1. **[Local Development Guide](local-development.md)** - Learn the development workflow
2. **[Architecture Overview](../architecture/README.md)** - Understand the system design
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Code standards and contribution process

---

Your development environment is now optimized for OpenFrame OSS Tenant development! You should have a productive setup for both backend and frontend development.