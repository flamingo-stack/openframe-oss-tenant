# Development Environment Setup

This guide will help you set up a comprehensive development environment for OpenFrame. By the end of this guide, you'll have all the tools and configurations needed for productive OpenFrame development.

## IDE Recommendations and Setup

### Primary IDE: IntelliJ IDEA

**Recommended for Java backend development:**

**Community Edition (Free):**
- Full Maven support
- Excellent Spring Boot integration
- Built-in Git integration
- Database tools

**Ultimate Edition (Paid):**
- Advanced Spring Framework support
- Built-in HTTP client
- Docker integration
- JavaScript/TypeScript support

**Essential Plugins:**
```text
- Lombok
- Spring Boot
- MongoDB
- Kafka
- Docker
- Kubernetes
- GraphQL
```

**IntelliJ Configuration:**
1. **Java SDK**: Configure Java 21 SDK
2. **Maven**: Enable auto-import and offline work
3. **Code Style**: Import OpenFrame code style settings
4. **Run Configurations**: Set up service launch configurations

### Frontend Development: Visual Studio Code

**Essential Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "GraphQL.vscode-graphql",
    "ms-playwright.playwright",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json"
  ]
}
```

**VS Code Settings:**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Required Development Tools

### Java Development Kit (JDK) 21

**Installation Methods:**

**macOS (Homebrew):**
```bash
# Install OpenJDK 21
brew install openjdk@21

# Link it to system Java
sudo ln -sfn $(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

**Linux (Ubuntu/Debian):**
```bash
# Install OpenJDK 21
sudo apt update
sudo apt install openjdk-21-jdk

# Set as default
sudo update-alternatives --config java
```

**Windows:**
1. Download OpenJDK 21 from [Adoptium](https://adoptium.net/)
2. Run installer as administrator
3. Set `JAVA_HOME` environment variable

**Verification:**
```bash
java -version
# Expected: openjdk version "21.0.0" or later

javac -version
# Expected: javac 21.0.0 or later
```

### Maven 3.9+

**Installation:**

**macOS:**
```bash
brew install maven
```

**Linux:**
```bash
sudo apt install maven
```

**Configuration (`~/.m2/settings.xml`):**
```xml
<settings>
  <localRepository>${user.home}/.m2/repository</localRepository>
  <profiles>
    <profile>
      <id>openframe-dev</id>
      <properties>
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

### Node.js 18+ and Package Manager

**Node.js Installation:**
```bash
# Using Node Version Manager (Recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
nvm alias default 18
```

**Verify Installation:**
```bash
node --version  # v18.0.0 or later
npm --version   # 8.0.0 or later
```

**Alternative Package Managers:**
```bash
# Install pnpm (faster, more efficient)
npm install -g pnpm

# Install yarn (if preferred)
npm install -g yarn
```

### Rust Development (For Desktop Client)

**Install Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`
```

**Install Tauri CLI:**
```bash
cargo install tauri-cli
```

**Platform-specific dependencies:**

**macOS:**
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## Environment Variables for Development

### Core Environment Variables

Create a `.env` file in your home directory or project root:

```bash
# Java Development
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export M2_HOME=/usr/share/maven
export PATH=$PATH:$JAVA_HOME/bin:$M2_HOME/bin

# Spring Boot Profiles
export SPRING_PROFILES_ACTIVE=development
export OPENFRAME_ENV=development

# Logging Configuration
export OPENFRAME_LOG_LEVEL=DEBUG
export LOGGING_LEVEL_COM_OPENFRAME=DEBUG

# Database Configuration
export MONGODB_URI=mongodb://localhost:27017/openframe_dev
export MONGODB_DATABASE=openframe_dev

# Redis Configuration
export REDIS_URL=redis://localhost:6379/0

# Kafka Configuration
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export KAFKA_AUTO_CREATE_TOPICS=true

# NATS Configuration
export NATS_URL=nats://localhost:4222

# AI Configuration (Optional for development)
export ANTHROPIC_API_KEY=your_anthropic_api_key_here
export OPENAI_API_KEY=your_openai_api_key_here

# Security Configuration
export JWT_SIGNING_KEY=dev-signing-key-change-in-production
export ENCRYPTION_KEY=dev-encryption-key-change-in-production
```

### Development-Specific Variables

```bash
# Development Optimizations
export MAVEN_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1g"
export NODE_OPTIONS="--max-old-space-size=4096"

# Docker Development
export COMPOSE_PROJECT_NAME=openframe_dev
export DOCKER_BUILDKIT=1

# Local Development URLs
export OPENFRAME_GATEWAY_URL=https://localhost:8080
export OPENFRAME_FRONTEND_URL=http://localhost:3000

# Development Certificates
export OPENFRAME_TLS_CERT_PATH=~/.mkcert/localhost.pem
export OPENFRAME_TLS_KEY_PATH=~/.mkcert/localhost-key.pem
```

### Platform-Specific Environment Setup

#### macOS Development Environment

**Shell Configuration (`.zshrc` or `.bash_profile`):**
```bash
# OpenFrame Development Environment
export OPENFRAME_DEV_HOME="$HOME/Development/openframe"
export PATH="$PATH:$OPENFRAME_DEV_HOME/bin"

# macOS-specific paths
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export OPENFRAME_DATA_DIR="$HOME/Library/Application Support/OpenFrame"
export OPENFRAME_LOGS_DIR="$HOME/Library/Logs/OpenFrame"

# Development database paths
export MONGODB_DATA_DIR="$HOME/Development/data/mongodb"
export REDIS_DATA_DIR="$HOME/Development/data/redis"
```

#### Linux Development Environment

**Shell Configuration (`.bashrc` or `.zshrc`):**
```bash
# OpenFrame Development Environment
export OPENFRAME_DEV_HOME="$HOME/development/openframe"
export PATH="$PATH:$OPENFRAME_DEV_HOME/bin"

# Linux-specific paths
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export OPENFRAME_DATA_DIR="$HOME/.config/openframe"
export OPENFRAME_LOGS_DIR="$HOME/.local/share/openframe/logs"

# Development database paths
export MONGODB_DATA_DIR="$HOME/development/data/mongodb"
export REDIS_DATA_DIR="$HOME/development/data/redis"
```

#### Windows Development Environment (WSL2)

**Shell Configuration (`.bashrc`):**
```bash
# OpenFrame Development Environment
export OPENFRAME_DEV_HOME="/mnt/c/Development/openframe"
export PATH="$PATH:$OPENFRAME_DEV_HOME/bin"

# Windows-specific paths via WSL2
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export OPENFRAME_DATA_DIR="/mnt/c/Users/$USER/AppData/Roaming/OpenFrame"
export OPENFRAME_LOGS_DIR="/mnt/c/Users/$USER/AppData/Local/OpenFrame/logs"

# WSL2-specific optimizations
export DOCKER_HOST=tcp://localhost:2375
export DISPLAY=$(ip route list default | awk '{print $3}'):0.0
```

## Editor Extensions and Plugins

### IntelliJ IDEA Setup

**Import Code Style:**
1. Download OpenFrame code style configuration
2. Go to **Settings** → **Editor** → **Code Style**
3. Import scheme from `dev-tools/intellij-codestyle.xml`

**Live Templates:**
Create custom live templates for common OpenFrame patterns:

```xml
<!-- OpenFrame Spring Boot Controller -->
<template name="ofctrl" value="@RestController
@RequestMapping(&quot;/api/$ENDPOINT$&quot;)
@Slf4j
@RequiredArgsConstructor
public class $CLASS$Controller {
    
    private final $SERVICE$ $FIELD$;
    
    $END$
}" description="OpenFrame REST Controller" toReformat="true" toShortenFQNames="true">
  <variable name="ENDPOINT" expression="" defaultValue="" alwaysStopAt="true" />
  <variable name="CLASS" expression="" defaultValue="" alwaysStopAt="true" />
  <variable name="SERVICE" expression="" defaultValue="" alwaysStopAt="true" />
  <variable name="FIELD" expression="lowercaseAndDash(CLASS)" defaultValue="" alwaysStopAt="false" />
</template>
```

### Visual Studio Code Configuration

**Workspace Settings (`.vscode/settings.json`):**
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.env.*": "properties"
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

**Launch Configuration (`.vscode/launch.json`):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/next",
      "args": ["dev"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug API Service",
      "type": "java",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api"
    }
  ]
}
```

## Development Database Setup

### MongoDB Development Instance

**Using Docker (Recommended):**
```bash
# Start MongoDB with persistent data
docker run -d \
  --name openframe-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:6.0
```

**Local Installation:**
```bash
# macOS
brew install mongodb/brew/mongodb-community

# Linux
sudo apt install mongodb-server

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Development Database Initialization:**
```bash
# Connect to MongoDB
mongosh

# Create development database and user
use openframe_dev
db.createUser({
  user: "openframe_dev",
  pwd: "dev_password",
  roles: [
    { role: "readWrite", db: "openframe_dev" }
  ]
})
```

### Redis Development Instance

**Using Docker:**
```bash
docker run -d \
  --name openframe-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Local Installation:**
```bash
# macOS
brew install redis

# Linux
sudo apt install redis-server

# Start service
redis-server
```

## Testing Environment Setup

### Unit Testing Configuration

**JUnit 5 Configuration:**
```xml
<!-- pom.xml addition -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Test Environment Variables:**
```bash
export SPRING_PROFILES_ACTIVE=test
export MONGODB_URI=mongodb://localhost:27017/openframe_test
export REDIS_URL=redis://localhost:6379/1
```

### Integration Testing

**Testcontainers Setup:**
```xml
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
```

## Performance Optimization for Development

### JVM Tuning for Development

**Maven JVM Options:**
```bash
export MAVEN_OPTS="-Xmx4g -Xms1g -XX:MaxMetaspaceSize=1g -XX:+UseG1GC"
```

**Spring Boot Development Options:**
```bash
export JAVA_OPTS="-Xmx2g -Xms512m -XX:+UseZGC -Dspring.jpa.show-sql=false"
```

### Node.js Performance Tuning

```bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable source maps for debugging
export NODE_ENV=development
export GENERATE_SOURCEMAP=true
```

## Troubleshooting Common Setup Issues

### Java Issues

**Multiple Java Versions:**
```bash
# List available Java versions (macOS)
/usr/libexec/java_home -V

# Switch to Java 21 (macOS)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Linux alternative management
sudo update-alternatives --config java
```

**Maven Memory Issues:**
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4g -XX:MaxPermSize=1g"

# Clear Maven cache if needed
rm -rf ~/.m2/repository
```

### Node.js Issues

**Node Version Conflicts:**
```bash
# Check current version
node --version

# Switch to correct version
nvm use 18

# Clean npm cache
npm cache clean --force
```

**Permission Issues (Linux/macOS):**
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Database Connection Issues

**MongoDB Connection Problems:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo journalctl -u mongod

# Test connection
mongosh --eval "db.adminCommand('ping')"
```

**Redis Connection Problems:**
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli ping
```

## Development Workflow Integration

### Git Hooks Setup

**Pre-commit Hook:**
```bash
#!/bin/sh
# Run tests before commit
mvn test
npm run test

# Run linting
npm run lint
```

**Commit Message Template:**
```text
# Title: <type>(<scope>): <description>
# 
# Body: Explain *what* and *why* vs. *how*
#
# Footer: Reference issues and breaking changes
#
# Types:
# feat: new feature
# fix: bug fix
# docs: documentation only changes
# style: formatting, missing semi colons, etc; no code change
# refactor: refactoring production code
# test: adding tests, refactoring test; no production code change
# chore: updating build tasks, package manager configs, etc
```

### Development Scripts

Create helpful development scripts in `scripts/` directory:

**`scripts/dev-setup.sh`:**
```bash
#!/bin/bash
# Development environment setup script
echo "Setting up OpenFrame development environment..."

# Check prerequisites
./scripts/check-prereqs.sh

# Install dependencies
mvn clean install -DskipTests
npm install --prefix openframe/services/openframe-frontend

# Setup development database
./scripts/setup-dev-db.sh

# Start development services
./scripts/start-dev-services.sh

echo "Development environment ready!"
```

## Next Steps

With your development environment configured:

1. **[Local Development](local-development.md)**: Learn how to run OpenFrame locally
2. **[Architecture Overview](../architecture/README.md)**: Understand the system design
3. **[Contributing Guidelines](../contributing/guidelines.md)**: Start contributing to the project

---

**Your development environment is now ready!** 🎉

> **💡 Pro Tip**: Keep your `~/.env` file updated with the latest configuration changes. Consider using tools like `direnv` to automatically load project-specific environment variables.