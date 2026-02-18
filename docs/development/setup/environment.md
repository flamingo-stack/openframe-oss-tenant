# Development Environment Setup

This guide will help you set up a complete OpenFrame development environment with all necessary tools, IDE configuration, and development optimizations.

> **Prerequisites**: Ensure you've completed the [Prerequisites Guide](../../getting-started/prerequisites.md) and have OpenFrame running via the [Quick Start Guide](../../getting-started/quick-start.md).

## IDE Setup & Configuration

### IntelliJ IDEA (Recommended)

IntelliJ IDEA provides excellent support for Spring Boot, Maven, and Java development.

#### Installation & Basic Setup

1. **Download IntelliJ IDEA Ultimate** (recommended) or Community Edition
2. **Install Essential Plugins:**
   ```text
   - Spring Boot (usually included)
   - Spring Security
   - Maven Helper
   - Rainbow Brackets
   - SonarLint
   - GitToolBox
   - Docker
   - Database Navigator
   ```

3. **Configure Project SDK:**
   ```text
   File → Project Structure → Project Settings → Project
   - Project SDK: Select Java 21
   - Project language level: 21
   - Project compiler output: ./target
   ```

#### Import OpenFrame Project

1. **Open IntelliJ IDEA**
2. **Select "Open or Import"**
3. **Navigate to your cloned openframe-oss-tenant directory**
4. **Select the root `pom.xml` file**
5. **Choose "Open as Project"**
6. **Wait for Maven to import all modules** (this may take several minutes)

#### Configure Maven Settings

```text
File → Settings → Build, Execution, Deployment → Build Tools → Maven

General:
- Maven home path: /path/to/maven (or use bundled)
- User settings file: ~/.m2/settings.xml
- Local repository: ~/.m2/repository

Importing:
- Import Maven projects automatically: ✓
- Automatically download sources: ✓
- Automatically download documentation: ✓

Running:
- VM options for importer: -Xmx2048m
```

#### Configure Code Style

1. **Download OpenFrame code style configuration:**
   ```bash
   # Download Google Java Style
   curl -o ~/Downloads/intellij-java-google-style.xml \
     https://raw.githubusercontent.com/google/styleguide/gh-pages/intellij-java-google-style.xml
   ```

2. **Import code style:**
   ```text
   File → Settings → Editor → Code Style
   - Click gear icon → Import Scheme → IntelliJ IDEA code style XML
   - Select the downloaded XML file
   - Apply to Project
   ```

#### Configure Spring Boot Support

```text
File → Settings → Build, Execution, Deployment → Spring

Spring Boot:
- Enable Spring Boot support: ✓
- Show run dashboard: ✓

Spring:
- Enable Spring support: ✓
- Show profiles in run configurations: ✓
```

### Visual Studio Code

VS Code provides a lightweight alternative with excellent Java and Spring Boot support.

#### Required Extensions

Install these extensions:

```json
{
  "recommendations": [
    "vscjava.vscode-java-pack",
    "vscjava.vscode-spring-boot-dashboard",
    "vscjava.vscode-spring-initializr",
    "ms-vscode.vscode-docker",
    "ms-mssql.mssql",
    "mongodb.mongodb-vscode",
    "redhat.vscode-yaml",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

#### Workspace Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "java.home": "/path/to/java-21",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java-21"
    }
  ],
  "spring-boot.ls.logfile.on": true,
  "java.compile.nullAnalysis.mode": "automatic",
  "java.format.settings.url": "https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml",
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
      "name": "API Service",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "args": "",
      "vmArgs": "-Dspring.profiles.active=development,local"
    },
    {
      "type": "java",
      "name": "Authorization Server",
      "request": "launch", 
      "mainClass": "com.openframe.authz.OpenFrameAuthorizationServerApplication",
      "projectName": "openframe-authorization-server",
      "vmArgs": "-Dspring.profiles.active=development,local"
    },
    {
      "type": "java",
      "name": "Gateway Service",
      "request": "launch",
      "mainClass": "com.openframe.gateway.GatewayApplication", 
      "projectName": "openframe-gateway",
      "vmArgs": "-Dspring.profiles.active=development,local"
    }
  ]
}
```

## Development Environment Variables

### Core Environment Variables

Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Java Development
export JAVA_HOME="/path/to/java-21"
export MAVEN_HOME="/path/to/maven"
export PATH="$MAVEN_HOME/bin:$JAVA_HOME/bin:$PATH"

# OpenFrame Development
export OPENFRAME_ENV="development"
export OPENFRAME_PROFILE="local"
export SPRING_PROFILES_ACTIVE="development,local"

# Development Optimizations
export MAVEN_OPTS="-Xmx4g -XX:+UseG1GC -XX:+UseStringDeduplication"
export JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -Duser.timezone=UTC"

# Docker Development
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1

# Database URLs (for development)
export MONGODB_URI="mongodb://localhost:27017/openframe-dev"
export REDIS_URL="redis://localhost:6379"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Security (development only)
export JWT_SIGNING_KEY="dev-signing-key-change-in-production"
export ENCRYPTION_KEY="dev-encryption-key-32-chars-long"

# API Keys (development)
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export OPENAI_API_KEY="your-openai-api-key" 
```

### Service-Specific Variables

Create environment files for each service:

**`config/api-service.env`:**
```bash
SERVER_PORT=8080
SPRING_DATASOURCE_URL=mongodb://localhost:27017/openframe
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
```

**`config/gateway-service.env`:**
```bash
SERVER_PORT=8081
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=https://localhost:8082
CORS_ALLOWED_ORIGINS=https://localhost:3000,https://localhost:8080
RATE_LIMIT_ENABLED=false
```

**`config/authorization-server.env`:**
```bash
SERVER_PORT=8082
SPRING_DATASOURCE_URL=mongodb://localhost:27017/openframe-auth
REDIS_URL=redis://localhost:6379
OAUTH2_CLIENTS_FRONTEND_CLIENT_ID=openframe-frontend
```

## Development Tools & Extensions

### Database Tools

#### MongoDB Compass (GUI)
```bash
# Install via package manager
brew install --cask mongodb-compass  # macOS
# Or download from https://www.mongodb.com/products/compass

# Connection string for development:
mongodb://localhost:27017
```

#### Redis Desktop Manager
```bash
# Install RedisInsight (free official tool)
brew install --cask redisinsight  # macOS
# Or download from https://redis.com/redis-enterprise/redis-insight/

# Connection: localhost:6379
```

### API Development Tools

#### Postman Collections

Create a Postman workspace with OpenFrame collections:

```json
{
  "info": {
    "name": "OpenFrame Development",
    "description": "API collections for OpenFrame development"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://localhost:8081"
    },
    {
      "key": "authToken", 
      "value": "{{bearerToken}}"
    }
  ]
}
```

#### GraphQL Playground Access

- **URL**: https://localhost:8081/graphiql
- **Headers**:
  ```json
  {
    "Authorization": "Bearer your-dev-token",
    "Content-Type": "application/json"
  }
  ```

### Code Quality Tools

#### SonarLint Configuration

Install SonarLint plugin and configure quality profiles:

```xml
<!-- .sonarlint/sonar-project.properties -->
sonar.projectKey=openframe-oss-tenant
sonar.sources=src/main/java
sonar.tests=src/test/java
sonar.java.source=21
sonar.java.target=21
sonar.exclusions=**/target/**,**/node_modules/**
```

#### EditorConfig

Create `.editorconfig` in project root:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.java]
indent_size = 2
max_line_length = 100

[*.{yml,yaml}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

## Development Shortcuts & Scripts

### Maven Shortcuts

Create shell aliases for common tasks:

```bash
# Add to your shell profile
alias mci='mvn clean install'
alias mct='mvn clean test'
alias mcv='mvn clean verify'
alias mcs='mvn clean compile spring-boot:run'
alias mdt='mvn dependency:tree'
alias mef='mvn help:effective-pom'

# Multi-module shortcuts
alias openframe-build='mvn clean compile -T 1C'
alias openframe-test='mvn clean test -T 1C'
alias openframe-verify='mvn clean verify -T 1C'
```

### Development Scripts

#### Service Runner Script

Create `scripts/run-service.sh`:

```bash
#!/bin/bash

SERVICE_NAME=$1
PROFILE=${2:-"development,local"}

if [ -z "$SERVICE_NAME" ]; then
    echo "Usage: ./run-service.sh <service-name> [profile]"
    echo "Available services: api, gateway, auth, management, stream, client"
    exit 1
fi

case $SERVICE_NAME in
    "api")
        cd openframe/services/openframe-api
        mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
        ;;
    "gateway") 
        cd openframe/services/openframe-gateway
        mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
        ;;
    "auth")
        cd openframe/services/openframe-authorization-server
        mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
        ;;
    "management")
        cd openframe/services/openframe-management
        mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
        ;;
    "stream")
        cd openframe/services/openframe-stream
        mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
        ;;
    "client")
        cd openframe/services/openframe-client
        mvn spring-boot:run -Dspring-boot.run.profiles=$PROFILE
        ;;
    *)
        echo "Unknown service: $SERVICE_NAME"
        exit 1
        ;;
esac
```

#### Database Reset Script

Create `scripts/reset-dev-db.sh`:

```bash
#!/bin/bash

echo "Resetting development databases..."

# Stop services
docker-compose stop

# Remove data volumes
docker-compose down -v

# Restart with clean state
docker-compose up -d mongodb redis kafka cassandra pinot nats

# Wait for services to be ready
echo "Waiting for databases to be ready..."
sleep 30

# Verify connectivity
docker exec openframe-mongodb mongosh --eval "db.runCommand('ping')"
docker exec openframe-redis redis-cli ping

echo "Development databases reset complete!"
```

## Testing Environment Setup

### Unit Testing Configuration

Configure test profiles in `src/test/resources/application-test.yml`:

```yaml
spring:
  profiles:
    active: test
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe-test
  cache:
    type: simple
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: test-group
      
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: DEBUG
    org.springframework.kafka: WARN

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

### Integration Testing

Configure test containers for integration tests:

```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>mongodb</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
```

## Performance & Monitoring Setup

### JVM Monitoring

Configure JVM monitoring for development:

```bash
# Add to JAVA_OPTS for development
export JAVA_OPTS="\
-Dcom.sun.management.jmxremote \
-Dcom.sun.management.jmxremote.port=9999 \
-Dcom.sun.management.jmxremote.local.only=false \
-Dcom.sun.management.jmxremote.authenticate=false \
-Dcom.sun.management.jmxremote.ssl=false \
-XX:+UseG1GC \
-XX:+UseStringDeduplication \
-XX:MaxGCPauseMillis=200"
```

### Application Metrics

Enable detailed metrics for development:

```yaml
# application-development.yml
management:
  endpoints:
    web:
      exposure:
        include: "*"
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      environment: development
```

## Troubleshooting Development Environment

### Common Issues

**Maven Build Failures:**
```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Rebuild with clean slate
mvn clean compile -U -T 1C
```

**Port Conflicts:**
```bash
# Find processes using OpenFrame ports
lsof -i :8080,8081,8082,8083,8084,8085,8086

# Kill conflicting processes
kill -9 $(lsof -t -i:8080)
```

**Database Connection Issues:**
```bash
# Check Docker containers
docker-compose ps

# Restart infrastructure
docker-compose restart mongodb redis kafka

# Check logs
docker-compose logs mongodb
```

**IDE Performance Issues:**
```bash
# Increase IntelliJ memory (Help → Edit Custom VM Options)
-Xmx4g
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200

# Clear IntelliJ caches
File → Invalidate Caches and Restart
```

### Development Health Check

Create a script to verify your environment:

```bash
#!/bin/bash
echo "OpenFrame Development Environment Health Check"
echo "=============================================="

# Check Java
java --version && echo "✅ Java OK" || echo "❌ Java not found"

# Check Maven  
mvn --version && echo "✅ Maven OK" || echo "❌ Maven not found"

# Check Docker
docker --version && echo "✅ Docker OK" || echo "❌ Docker not found"

# Check services
curl -k -f https://localhost:8081/actuator/health >/dev/null 2>&1 && echo "✅ Gateway OK" || echo "❌ Gateway not responding"
curl -k -f https://localhost:8080/actuator/health >/dev/null 2>&1 && echo "✅ API OK" || echo "❌ API not responding"

# Check databases
docker exec openframe-mongodb mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1 && echo "✅ MongoDB OK" || echo "❌ MongoDB not responding"
docker exec openframe-redis redis-cli ping >/dev/null 2>&1 && echo "✅ Redis OK" || echo "❌ Redis not responding"

echo "Health check complete!"
```

## Next Steps

With your development environment fully configured, you're ready to:

1. **[Set up Local Development](local-development.md)** - Advanced development workflows and debugging
2. **[Explore the Architecture](../architecture/README.md)** - Understand the system design  
3. **[Review Security Patterns](../security/README.md)** - Learn the security model
4. **[Study Testing Strategies](../testing/README.md)** - Master the testing approach

Your development environment is now optimized for productive OpenFrame development! 🚀