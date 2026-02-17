# Development Environment Setup

This guide will help you set up a complete development environment for OpenFrame. We'll configure your IDE, install necessary tools, set up debugging capabilities, and optimize your workflow for productive development.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA provides excellent support for Spring Boot and the OpenFrame tech stack.

#### Installation
```bash
# Install via snap (Linux)
sudo snap install intellij-idea-ultimate --classic

# Or download from JetBrains website
# https://www.jetbrains.com/idea/download/
```

#### Essential Plugins
Install these plugins for optimal OpenFrame development:

```text
Required Plugins:
├── Spring Boot Support (built-in)
├── Database Navigator (database management)
├── Docker Integration (container management)  
├── Kubernetes (if deploying to K8s)
├── .env File Support (environment variables)
└── GraphQL (for API development)

Optional but Recommended:
├── SonarLint (code quality)
├── GitToolBox (enhanced Git integration)
├── Rainbow Brackets (code readability)
├── String Manipulation (text utilities)
└── Key Promoter X (shortcut learning)
```

#### IDE Configuration

**Project Structure Setup:**
1. **Open the openframe-oss-tenant project**
2. **Configure Project SDK**: File → Project Structure → SDKs → Add JDK 21
3. **Set Language Level**: Project Settings → Project → Language Level: 21
4. **Configure Maven**: Build Tools → Maven → Use Maven from SDK

**Code Style Configuration:**
1. **Import code style**: File → Settings → Code Style → Import Scheme
2. **Configure Checkstyle**: Settings → Tools → Checkstyle → Add OpenFrame rules
3. **Set up formatting**: Editor → Code Style → Java → Set from predefined style

### VS Code (Alternative/Frontend Development)

For TypeScript/frontend development or if you prefer a lightweight editor:

#### Essential Extensions
```json
{
  "recommendations": [
    "ms-vscode.vscode-java-pack",
    "vscjava.vscode-spring-boot-dashboard",
    "ms-python.python",
    "bradlc.vscode-tailwindcss",
    "GraphQL.vscode-graphql",
    "ms-vscode.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
```

#### VS Code Settings
Create `.vscode/settings.json` in project root:
```json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
  "java.configuration.maven.userSettings": "~/.m2/settings.xml",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Required Development Tools

### Java Development Environment

#### Java 21 Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS (using Homebrew)
brew install openjdk@21

# Verify installation
java --version
javac --version
```

#### Maven Configuration
Create or update `~/.m2/settings.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <profiles>
    <profile>
      <id>openframe-dev</id>
      <properties>
        <spring.profiles.active>local</spring.profiles.active>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>openframe-dev</activeProfile>
  </activeProfiles>
</settings>
```

### Frontend Development Tools

#### Node.js and Package Managers
```bash
# Install Node.js 18+ (using nvm - recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x

# Optional: Install Yarn
npm install -g yarn
```

### Database Tools

#### MongoDB Compass (GUI)
```bash
# Download from MongoDB website
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# Or install via snap
sudo snap install mongodb-compass
```

#### Redis CLI Tools
```bash
# Ubuntu/Debian
sudo apt install redis-tools

# macOS
brew install redis

# Test connection
redis-cli ping
```

### Container and Orchestration Tools

#### Docker and Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose v2
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### Kubernetes Tools (Optional)
```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# minikube (for local K8s development)
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

## Environment Variables Configuration

### Development Environment File

Create `.env.development` in project root:
```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
CASSANDRA_CONTACT_POINTS=localhost:9042
REDIS_URL=redis://localhost:6379

# Message Queues
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# Security Configuration  
JWT_SIGNING_KEY=development-key-change-in-production
OAUTH2_CLIENT_ID=openframe-dev-client
OAUTH2_CLIENT_SECRET=dev-secret

# API Configuration
API_BASE_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# AI Services (Optional - for Mingo development)
ANTHROPIC_API_KEY=your-anthropic-key-here
OPENAI_API_KEY=your-openai-key-here

# Logging
LOG_LEVEL=DEBUG
ROOT_LOG_LEVEL=INFO

# Development Features
SPRING_DEVTOOLS_RESTART_ENABLED=true
SPRING_JPA_SHOW_SQL=true
```

### IDE Environment Configuration

#### IntelliJ IDEA Run Configurations
Create run configurations for each service:

1. **API Service Configuration:**
   ```text
   Name: OpenFrame API Service
   Main Class: com.openframe.api.ApiApplication
   VM Options: -Dspring.profiles.active=local
   Environment Variables: Load from .env.development
   Working Directory: $PROJECT_DIR$
   ```

2. **Authorization Server Configuration:**
   ```text
   Name: OpenFrame Auth Server
   Main Class: com.openframe.authz.OpenFrameAuthorizationServerApplication
   VM Options: -Dspring.profiles.active=local
   Program Arguments: --server.port=8081
   ```

3. **Gateway Service Configuration:**
   ```text
   Name: OpenFrame Gateway
   Main Class: com.openframe.gateway.GatewayApplication
   VM Options: -Dspring.profiles.active=local
   Program Arguments: --server.port=8080
   ```

### Shell Environment Setup

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
# OpenFrame Development Environment
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export MAVEN_HOME=/usr/share/maven
export PATH=$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH

# Development aliases
alias of-build='mvn clean install -DskipTests'
alias of-test='mvn test'
alias of-services='docker-compose up -d mongodb kafka redis nats cassandra'
alias of-logs='docker-compose logs -f'

# Node.js environment
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Editor Extensions and Plugins

### IntelliJ IDEA Extensions

#### Code Quality & Analysis
```text
SonarLint Configuration:
1. Install SonarLint plugin
2. Connect to SonarQube server (if available)
3. Configure rule sets for OpenFrame standards
4. Enable real-time analysis
```

#### Database Integration
```text
Database Navigator Setup:
1. Install Database Navigator plugin
2. Configure MongoDB connection:
   - Host: localhost:27017
   - Database: openframe_dev
   - Authentication: None (for local dev)
3. Configure Redis connection:
   - Host: localhost:6379
```

### VS Code Extensions Configuration

#### Java Development
```json
{
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.saveActions.organizeImports": true,
  "java.format.settings.url": "https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml",
  "sonarlint.rules": {
    "java:S1135": "off",
    "java:S1075": "off"
  }
}
```

#### TypeScript/Frontend
```json
{
  "typescript.updateImportsOnFileMove.enabled": "always",
  "eslint.workingDirectories": ["openframe/services/openframe-frontend"],
  "prettier.configPath": "./openframe/services/openframe-frontend/.prettierrc"
}
```

## Debugging Configuration

### Backend Debugging (Java)

#### IntelliJ IDEA Debug Setup
1. **Remote Debug Configuration:**
   ```text
   Configuration Type: Remote JVM Debug
   Name: OpenFrame Remote Debug
   Host: localhost
   Port: 5005
   Command line arguments: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
   ```

2. **Spring Boot Debug:**
   ```text
   Enable Spring Boot DevTools in pom.xml:
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-devtools</artifactId>
       <scope>runtime</scope>
   </dependency>
   ```

#### Debug Environment Variables
```bash
# Add to service startup
JAVA_OPTS="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### Frontend Debugging

#### Browser DevTools Integration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug OpenFrame Frontend",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src"
    }
  ]
}
```

## Development Workflow Optimization

### Git Configuration

```bash
# Configure Git for OpenFrame development
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Useful Git aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
```

### Pre-commit Hooks

Create `.pre-commit-config.yaml`:
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-json
      - id: check-yaml
      
  - repo: local
    hooks:
      - id: maven-test
        name: Maven Test
        entry: mvn test
        language: system
        pass_filenames: false
```

### Performance Optimization

#### JVM Tuning for Development
```bash
# Add to IDE VM options or environment
-Xmx4g
-Xms2g
-XX:+UseG1GC
-XX:+UseStringDeduplication
-XX:+OptimizeStringConcat
```

#### Docker Development Optimization
```yaml
# docker-compose.override.yml for development
version: '3.8'
services:
  mongodb:
    volumes:
      - ./data/mongodb:/data/db
    
  kafka:
    environment:
      - KAFKA_LOG_RETENTION_HOURS=1
      - KAFKA_LOG_SEGMENT_BYTES=536870912
```

## Verification and Testing

### Environment Verification Script

Create `scripts/verify-dev-env.sh`:
```bash
#!/bin/bash
echo "🔍 Verifying OpenFrame Development Environment..."

# Check Java
echo "☕ Java Version:"
java --version

# Check Maven  
echo "📦 Maven Version:"
mvn --version

# Check Node.js
echo "📦 Node.js Version:"
node --version

# Check Docker
echo "🐳 Docker Version:"
docker --version

# Check Database Connections
echo "🗄️ Testing Database Connections..."
mongo --eval "db.adminCommand('ismaster')" || echo "❌ MongoDB not running"
redis-cli ping || echo "❌ Redis not running"

echo "✅ Environment verification complete!"
```

Make it executable and run:
```bash
chmod +x scripts/verify-dev-env.sh
./scripts/verify-dev-env.sh
```

## Next Steps

With your development environment configured:

1. **Proceed to [Local Development](./local-development.md)** to learn how to run OpenFrame locally
2. **Review [Architecture Overview](../architecture/README.md)** to understand the system design
3. **Check [Contributing Guidelines](../contributing/guidelines.md)** for development workflows

Your OpenFrame development environment is now ready! You have all the tools and configuration needed to contribute effectively to the platform. 🎉