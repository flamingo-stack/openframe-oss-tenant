# Development Environment Setup

This guide helps you set up a complete development environment for OpenFrame. Whether you're developing core features, creating integrations, or contributing to the frontend, this guide has you covered.

## Overview

The OpenFrame development environment includes:

- **Java development** for backend services
- **Node.js/TypeScript** for frontend development  
- **Rust** for client agent development (optional)
- **Database services** running in Docker
- **IDE configuration** for optimal productivity

Let's get started!

---

## IDE Recommendations

### Primary: IntelliJ IDEA

IntelliJ IDEA provides the best OpenFrame development experience:

#### Installation

- **Ultimate Edition** (recommended for full features)
- **Community Edition** (sufficient for basic development)
- Download from [JetBrains](https://www.jetbrains.com/idea/)

#### Required Plugins

```text
✅ Spring Boot (bundled)
✅ GraphQL (for schema development)
✅ Vue.js (for frontend work)
✅ Rust (if developing agent)
✅ Docker (for container management)
✅ Database Tools (for MongoDB/Redis access)
```

#### Configuration

1. **Import OpenFrame Project**
   ```text
   File → Open → Select openframe-oss-tenant directory
   Choose "Open as Project"
   ```

2. **Configure JDK**
   ```text
   File → Project Structure → Project
   Project SDK: Java 21 (Oracle/OpenJDK)
   Project Language Level: 21 - Sealed types
   ```

3. **Maven Integration**
   ```text
   View → Tool Windows → Maven
   Enable: "Import Maven Projects Automatically"
   ```

### Alternative: Visual Studio Code

For lightweight development or frontend-focused work:

#### Required Extensions

```bash
# Install recommended extensions
code --install-extension redhat.java
code --install-extension vscjava.vscode-java-pack
code --install-extension octref.vetur
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension GraphQL.vscode-graphql
code --install-extension rust-lang.rust-analyzer
```

#### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "java.home": "/path/to/java-21",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java-21"
    }
  ],
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "vue.features.codeActions.enabled": true,
  "graphql.languageService.enable": true
}
```

---

## Required Development Tools

### Java Development Kit (JDK)

OpenFrame requires Java 21 or later:

#### Installation Options

**macOS (Homebrew)**
```bash
# Install OpenJDK 21
brew install openjdk@21

# Set JAVA_HOME
echo 'export JAVA_HOME=/opt/homebrew/opt/openjdk@21' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Linux (Ubuntu/Debian)**
```bash
# Install OpenJDK 21
sudo apt update
sudo apt install openjdk-21-jdk

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Windows**
```powershell
# Download and install OpenJDK 21 from https://adoptium.net/
# Set environment variables:
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-21.0.0.35-hotspot", "Machine")
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:JAVA_HOME\bin", "Machine")
```

#### Verification

```bash
java -version
# Expected output:
# openjdk version "21.0.0" 2023-09-19
# OpenJDK Runtime Environment (build 21.0.0+35)
# OpenJDK 64-Bit Server VM (build 21.0.0+35, mixed mode, sharing)

javac -version
# Expected output:
# javac 21.0.0
```

### Apache Maven

Build automation for Java projects:

#### Installation

**macOS**
```bash
brew install maven
```

**Linux**
```bash
sudo apt install maven  # Ubuntu/Debian
sudo yum install maven  # CentOS/RHEL
```

**Windows**
```powershell
# Download from https://maven.apache.org/download.cgi
# Extract and add to PATH
[Environment]::SetEnvironmentVariable("MAVEN_HOME", "C:\apache-maven-3.9.6", "Machine")
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;$env:MAVEN_HOME\bin", "Machine")
```

#### Configuration

Create `~/.m2/settings.xml` for development:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
                              https://maven.apache.org/xsd/settings-1.0.0.xsd">
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

#### Verification

```bash
mvn -version
# Expected output:
# Apache Maven 3.9.6
# Maven home: /opt/apache-maven-3.9.6
# Java version: 21.0.0
```

### Node.js and npm

Frontend development tools:

#### Installation

**Using Node Version Manager (recommended)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install and use Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default lts/*
```

**Direct installation**
- Download from [nodejs.org](https://nodejs.org/) (LTS version)
- Or use package managers: `brew install node` (macOS)

#### Verification

```bash
node --version
# Expected output: v18.19.0 or later

npm --version  
# Expected output: 10.2.0 or later
```

### Rust (Optional)

For client agent development:

#### Installation

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install additional components
rustup component add rustfmt clippy
```

#### Verification

```bash
rustc --version
# Expected output: rustc 1.77.0 or later

cargo --version
# Expected output: cargo 1.77.0 or later
```

---

## Database and Infrastructure Setup

### Docker Desktop

Required for running development databases and integrated tools:

#### Installation

- **macOS/Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/) + Docker Compose

#### Configuration

Allocate sufficient resources:
```text
Memory: 8 GB minimum (16 GB recommended)
CPU: 4 cores minimum
Disk: 50 GB available space
```

### Development Services

Start required infrastructure services:

```bash
# Clone OpenFrame repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Start development infrastructure
docker compose -f integrated-tools/docker-compose.yml up -d

# Verify services are running
docker compose -f integrated-tools/docker-compose.yml ps
```

**Expected services:**
```text
mongodb         mongo:7.0               Up
redis           redis:7.0               Up  
kafka           confluentinc/cp-kafka   Up
cassandra       cassandra:4.1           Up
tactical-rmm    tactical/tactical-rmm   Up
meshcentral     meshcentral/web         Up
```

---

## IDE-Specific Configuration

### IntelliJ IDEA Setup

#### 1. Project Import and Configuration

```bash
# Open IntelliJ IDEA
# File → Open → Select openframe-oss-tenant directory
```

**Project Structure Configuration:**
```text
File → Project Structure → Project
  Project SDK: 21 (java version "21.0.0")
  Project language level: 21 - Sealed types, pattern matching for switch

File → Project Structure → Modules
  Automatically detected modules should include:
  - openframe-api
  - openframe-gateway  
  - openframe-frontend
  - openframe-client (if Rust plugin installed)
```

#### 2. Run Configurations

Create run configurations for development:

**API Service Configuration:**
```text
Run → Edit Configurations → Add New → Spring Boot
  Name: OpenFrame API Service
  Main class: com.openframe.api.ApiApplication
  VM options: -Xmx2g -Dspring.profiles.active=development
  Environment variables: 
    MONGODB_URI=mongodb://localhost:27017/openframe_dev
    KAFKA_BOOTSTRAP_SERVERS=localhost:9092
  Use classpath of module: openframe-api
```

**Gateway Service Configuration:**
```text
Run → Edit Configurations → Add New → Spring Boot
  Name: OpenFrame Gateway
  Main class: com.openframe.gateway.GatewayApplication
  VM options: -Xmx1g -Dspring.profiles.active=development
  Program arguments: --server.port=8080
```

**Frontend Development Configuration:**
```text
Run → Edit Configurations → Add New → npm
  Name: Frontend Dev Server
  Command: run
  Scripts: dev
  Package.json: openframe/services/openframe-frontend/package.json
```

#### 3. Code Style Configuration

Import OpenFrame code style:

```text
File → Settings → Editor → Code Style
  Scheme: Import Scheme → IntelliJ IDEA code style XML
  Select: .idea/codeStyles/OpenFrame.xml (from repository)
```

**Key formatting rules:**
- **Java**: 4 spaces, 120 character line limit
- **TypeScript**: 2 spaces, 100 character line limit
- **Import organization**: Automated with import optimization

#### 4. Live Templates

Install OpenFrame live templates for faster coding:

```text
File → Settings → Editor → Live Templates
  Add Template Group: "OpenFrame"
  
Common templates:
  - `ofservice` → Spring Boot service class template
  - `ofcontroller` → REST controller template  
  - `oftest` → JUnit test class template
  - `vuecomp` → Vue component template
```

### VS Code Setup

#### 1. Workspace Configuration

Create `.vscode/openframe.code-workspace`:

```json
{
  "folders": [
    { "name": "OpenFrame Backend", "path": "./openframe" },
    { "name": "OpenFrame Frontend", "path": "./openframe/services/openframe-frontend" },
    { "name": "OpenFrame Client", "path": "./clients/openframe-client" }
  ],
  "settings": {
    "java.configuration.workspaces": ["./openframe"],
    "typescript.preferences.includePackageJsonAutoImports": "auto",
    "vue.features.codeActions.enabled": true
  }
}
```

#### 2. Debug Configurations

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
      "vmArgs": "-Dspring.profiles.active=development"
    },
    {
      "type": "node",
      "name": "Frontend Dev Server",
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

#### 3. Task Configuration

Create `.vscode/tasks.json` for common development tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build OpenFrame Backend",
      "type": "shell", 
      "command": "mvn",
      "args": ["clean", "compile", "-DskipTests"],
      "group": "build",
      "presentation": { "echo": true, "reveal": "always" }
    },
    {
      "label": "Start Development Services",
      "type": "shell",
      "command": "docker",
      "args": ["compose", "-f", "integrated-tools/docker-compose.yml", "up", "-d"],
      "group": "build"
    }
  ]
}
```

---

## Environment Variables Configuration

### Development Environment File

Create `.env.development` in the project root:

```bash
# Application Configuration
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=DEBUG
SERVER_PORT=8080

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
MONGODB_DATABASE=openframe_dev
CASSANDRA_CONTACT_POINTS=localhost:9042
CASSANDRA_KEYSPACE=openframe_dev
REDIS_URL=redis://localhost:6379
REDIS_DATABASE=0

# Kafka Configuration  
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CONSUMER_GROUP_ID=openframe-dev
KAFKA_AUTO_OFFSET_RESET=earliest

# Security Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_EXPIRATION=3600000
ENCRYPTION_KEY=dev-encryption-key-32-chars-long
ENCRYPTION_ALGORITHM=AES/GCM/NoPadding

# External Integration URLs
TACTICAL_RMM_URL=http://localhost:8000
TACTICAL_RMM_API_KEY=dev-api-key
MESHCENTRAL_URL=http://localhost:4430
MESHCENTRAL_USERNAME=admin
MESHCENTRAL_PASSWORD=admin
FLEET_URL=http://localhost:8412
FLEET_API_TOKEN=dev-fleet-token

# Development Flags
ENABLE_CORS=true
DISABLE_CSRF_PROTECTION=true
ENABLE_H2_CONSOLE=false
MOCK_EXTERNAL_SERVICES=false
ENABLE_SWAGGER_UI=true
ENABLE_GRAPHQL_PLAYGROUND=true

# Logging Configuration
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_OPENFRAME=DEBUG
LOGGING_LEVEL_SPRINGFRAMEWORK=WARN
LOGGING_PATTERN_CONSOLE=%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n
```

### IDE Environment Variable Loading

#### IntelliJ IDEA

Install the `.env files support` plugin:

```text
File → Settings → Plugins
Search: ".env files support"
Install and restart IntelliJ
```

The plugin automatically loads `.env.development` in run configurations.

#### VS Code

Use the `DotENV` extension:

```bash
code --install-extension mikestead.dotenv
```

Add to VS Code settings:
```json
{
  "dotenv.enableAutocloaking": false,
  "files.associations": {
    "*.env.*": "dotenv"
  }
}
```

---

## Verification and Testing

### Environment Verification

Run this verification script to ensure everything is working:

```bash
#!/bin/bash
# save as check-dev-environment.sh

echo "🔍 Checking OpenFrame Development Environment..."
echo

# Check Java
echo "☕ Java Version:"
java -version 2>&1 | head -1
echo

# Check Maven  
echo "🔧 Maven Version:"
mvn -version 2>&1 | head -1
echo

# Check Node.js
echo "🟢 Node.js Version:"
node --version
echo

# Check npm
echo "📦 npm Version:"
npm --version
echo

# Check Docker
echo "🐳 Docker Version:"
docker --version
echo

# Check services
echo "🛠️ Development Services Status:"
docker compose -f integrated-tools/docker-compose.yml ps
echo

# Check ports
echo "🔌 Port Availability:"
for port in 8080 8081 8082 3000 27017 9092 6379; do
  if lsof -i :$port > /dev/null 2>&1; then
    echo "  Port $port: ❌ In use"
  else
    echo "  Port $port: ✅ Available"  
  fi
done

echo
echo "✅ Environment check complete!"
```

### Build Verification

Test that all components build successfully:

```bash
# Test Java backend build
echo "Building OpenFrame backend..."
mvn clean compile -DskipTests
if [ $? -eq 0 ]; then
  echo "✅ Backend build successful"
else
  echo "❌ Backend build failed"
  exit 1
fi

# Test frontend build
echo "Building OpenFrame frontend..."
cd openframe/services/openframe-frontend
npm install
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Frontend build successful"
else
  echo "❌ Frontend build failed"
  exit 1
fi

# Test Rust client (if available)
if command -v cargo &> /dev/null; then
  echo "Building OpenFrame client..."
  cd ../../../clients/openframe-client
  cargo check
  if [ $? -eq 0 ]; then
    echo "✅ Client build successful"
  else
    echo "❌ Client build failed"
    exit 1
  fi
fi
```

---

## Troubleshooting Common Issues

### Java/Maven Issues

**Problem**: Wrong Java version
```bash
# Solution: Check JAVA_HOME
echo $JAVA_HOME
# Should point to Java 21 installation

# Fix on macOS
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Fix on Linux
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

**Problem**: Maven compilation errors
```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Reimport dependencies
mvn clean install -U
```

### Node.js/Frontend Issues

**Problem**: Node.js version conflicts
```bash
# Use nvm to manage versions
nvm install 18
nvm use 18
nvm alias default 18
```

**Problem**: npm permission errors
```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Docker Issues

**Problem**: Permission denied (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

**Problem**: Port conflicts
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or change OpenFrame ports in configuration
```

### Database Connection Issues

**Problem**: MongoDB connection refused
```bash
# Check MongoDB status
docker compose -f integrated-tools/docker-compose.yml logs mongodb

# Restart MongoDB
docker compose -f integrated-tools/docker-compose.yml restart mongodb
```

**Problem**: Kafka startup issues
```bash
# Check Kafka logs
docker compose -f integrated-tools/docker-compose.yml logs kafka

# Clean Kafka data (development only)
docker compose -f integrated-tools/docker-compose.yml down -v
docker compose -f integrated-tools/docker-compose.yml up -d
```

---

## Next Steps

Your development environment is now ready! Here's what to do next:

1. **[Local Development Guide](local-development.md)**: Learn how to run OpenFrame locally
2. **[Architecture Overview](../architecture/overview.md)**: Understand the system design
3. **[Contributing Guidelines](../contributing/guidelines.md)**: Learn the development workflow

## Getting Help

- **Documentation**: Check the detailed guides in this development section
- **Community**: Join the OpenMSP Slack for development discussions
- **Issues**: Report environment setup problems on GitHub

Happy coding! 🚀