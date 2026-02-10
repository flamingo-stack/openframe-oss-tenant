# Development Environment Setup

This guide walks you through setting up a complete OpenFrame development environment with IDEs, tools, and configurations optimized for productive development.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java)

**Download and Install**
- **Ultimate Edition** (preferred) or Community Edition
- Download from [JetBrains](https://www.jetbrains.com/idea/)

**Essential Plugins**
```text
Required Plugins:
- Spring Boot
- GraphQL
- Docker
- Kubernetes
- Database Tools and SQL

Recommended Plugins:
- SonarLint
- CheckStyle-IDEA
- SpotBugs
- Lombok
- GitToolBox
```

**Project Configuration**
1. Open OpenFrame project root directory
2. Configure SDK: **File** → **Project Structure** → **Project** → **SDK** → Java 21
3. Set Maven settings: **File** → **Settings** → **Build** → **Maven**
   - Maven home: Use bundled Maven or system Maven 3.9+
   - User settings file: `~/.m2/settings.xml`
4. Enable annotation processing: **Settings** → **Build** → **Compiler** → **Annotation Processors**

**Code Style Configuration**
```xml
<!-- Save as .idea/codeStyleSettings.xml -->
<component name="ProjectCodeStyleConfiguration">
  <code_scheme name="Project" version="173">
    <JavaCodeStyleSettings>
      <option name="IMPORT_LAYOUT_TABLE">
        <value>
          <package name="java" withSubpackages="true" static="false"/>
          <emptyLine/>
          <package name="javax" withSubpackages="true" static="false"/>
          <emptyLine/>
          <package name="org" withSubpackages="true" static="false"/>
          <emptyLine/>
          <package name="com.openframe" withSubpackages="true" static="false"/>
          <emptyLine/>
          <package name="" withSubpackages="true" static="false"/>
        </value>
      </option>
    </JavaCodeStyleSettings>
  </code_scheme>
</component>
```

### Visual Studio Code (Frontend & Rust)

**Essential Extensions**
```json
{
  "recommendations": [
    "vue.volar",
    "vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "rust-lang.rust-analyzer",
    "tamasfe.even-better-toml",
    "ms-vscode.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools"
  ]
}
```

**Workspace Settings**
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.complete.casing.tags": "kebab",
  "tailwindCSS.experimental.classRegex": [
    ["class:\\s*?[\"'`]([^\"'`]*).*?[\"'`]", "[\"'`]([^\"'`]*)[\"'`]"]
  ],
  "rust-analyzer.cargo.allFeatures": true,
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

## Development Tools

### Java Development Tools

**Maven Configuration**
Create or update `~/.m2/settings.xml`:
```xml
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <profiles>
    <profile>
      <id>github</id>
      <repositories>
        <repository>
          <id>central</id>
          <url>https://repo1.maven.org/maven2</url>
        </repository>
        <repository>
          <id>github</id>
          <url>https://maven.pkg.github.com/flamingo-stack/*</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
  
  <servers>
    <server>
      <id>github</id>
      <username>${env.GITHUB_USERNAME}</username>
      <password>${env.GITHUB_TOKEN}</password>
    </server>
  </servers>
  
  <activeProfiles>
    <activeProfile>github</activeProfile>
  </activeProfiles>
</settings>
```

**Java Development Kit**
```bash
# Verify Java 21 installation
java -version
# Expected: openjdk version "21.0.x"

# Configure JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk  # Linux
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home  # macOS

# Add to your shell profile (.bashrc, .zshrc)
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk' >> ~/.bashrc
```

### Frontend Development Tools

**Node.js and Package Managers**
```bash
# Verify Node.js 18+ 
node --version
npm --version

# Install pnpm (faster alternative to npm)
npm install -g pnpm

# Install Vue CLI (optional)
npm install -g @vue/cli

# Install TypeScript compiler globally
npm install -g typescript
```

**Frontend Dependencies**
```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Or with pnpm
pnpm install

# Verify TypeScript configuration
npx tsc --noEmit
```

### Rust Development Tools

**Rust Toolchain**
```bash
# Install rustup and Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install essential components
rustup component add rustfmt clippy
rustup target add x86_64-pc-windows-gnu  # For cross-compilation

# Install useful cargo tools
cargo install cargo-watch
cargo install cargo-audit  
cargo install cargo-outdated
```

**Rust Development Verification**
```bash
cd clients/openframe-client

# Check project builds
cargo check

# Run tests
cargo test

# Run with auto-reload during development
cargo watch -x check -x test -x run
```

## Environment Variables

### Development Environment File

Create `.env.development` in the project root:
```bash
# GitHub Access
GITHUB_USERNAME=your_github_username
GITHUB_TOKEN=your_github_personal_access_token

# Development Database URLs
MONGODB_URL=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# JWT Configuration  
JWT_SECRET=dev-secret-key-change-in-production
JWT_ISSUER=http://localhost:8088
JWT_AUDIENCE=openframe-dev

# Service URLs (for local development)
OPENFRAME_GATEWAY_URL=http://localhost:8088
OPENFRAME_API_URL=http://localhost:8082
OPENFRAME_CONFIG_URL=http://localhost:8888

# External Tool Integration (optional for dev)
TACTICAL_RMM_URL=http://localhost:8000
MESHCENTRAL_URL=http://localhost:4430

# AI Configuration (for Mingo development)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Debug and Development Flags
DEBUG=true
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=development
NODE_ENV=development
```

### Shell Environment Setup

Add to your shell profile (`.bashrc`, `.zshrc`, or `.bash_profile`):
```bash
# OpenFrame Development Environment
export OPENFRAME_HOME="$HOME/code/openframe-oss-tenant"
export GITHUB_USERNAME="your_github_username"
export GITHUB_TOKEN="your_github_token"

# Java Development
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"  # Adjust path as needed
export MAVEN_HOME="/usr/share/maven"
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"

# Rust Development
export PATH="$HOME/.cargo/bin:$PATH"

# Node.js Development
export NODE_OPTIONS="--max-old-space-size=8192"

# Docker Development
export COMPOSE_PROJECT_NAME="openframe-dev"

# Development aliases
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-logs="docker-compose logs -f"
alias of-restart="docker-compose restart"
alias of-down="docker-compose down"
alias of-up="docker-compose up -d"

# Navigation shortcuts
alias cd-of="cd $OPENFRAME_HOME"
alias cd-api="cd $OPENFRAME_HOME/openframe/services/openframe-api"
alias cd-frontend="cd $OPENFRAME_HOME/openframe/services/openframe-frontend"
alias cd-client="cd $OPENFRAME_HOME/clients/openframe-client"
```

## Database Development Setup

### MongoDB Development Instance

**Using Docker (Recommended)**
```bash
# Start MongoDB with development data
docker run -d \
  --name openframe-mongo-dev \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  -e MONGO_INITDB_DATABASE=openframe_dev \
  -v openframe-mongo-dev:/data/db \
  mongo:7

# Connect to MongoDB
docker exec -it openframe-mongo-dev mongosh
```

**MongoDB Tools**
```bash
# Install MongoDB tools
# Ubuntu/Debian
sudo apt install mongodb-clients

# macOS
brew install mongodb/brew/mongodb-database-tools

# Test connection
mongosh mongodb://admin:admin123@localhost:27017/openframe_dev
```

### Redis Development Cache

```bash
# Start Redis for caching
docker run -d \
  --name openframe-redis-dev \
  -p 6379:6379 \
  redis:7-alpine

# Test Redis connection
redis-cli ping
# Expected: PONG
```

### Apache Kafka Development

```bash
# Start Kafka using Docker Compose
cd integrated-tools
docker-compose -f docker-compose.kafka-dev.yml up -d

# Verify Kafka is running
docker exec -it kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

## IDE-Specific Configurations

### IntelliJ IDEA Run Configurations

**API Service Configuration**
```xml
<!-- Save as .idea/runConfigurations/OpenFrame_API.xml -->
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="OpenFrame API" type="SpringBootApplicationConfigurationType">
    <module name="openframe-api" />
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.api.ApiApplication" />
    <option name="ACTIVE_PROFILES" value="development" />
    <option name="VM_PARAMETERS" value="-Xmx2g -Dspring.profiles.active=development" />
    <option name="ENVIRONMENT_VARIABLES">
      <map>
        <entry key="GITHUB_TOKEN" value="$GITHUB_TOKEN$" />
        <entry key="MONGODB_URL" value="mongodb://localhost:27017/openframe_dev" />
      </map>
    </option>
  </configuration>
</component>
```

**Gateway Service Configuration**
```xml
<!-- Save as .idea/runConfigurations/OpenFrame_Gateway.xml -->
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="OpenFrame Gateway" type="SpringBootApplicationConfigurationType">
    <module name="openframe-gateway" />
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.gateway.GatewayApplication" />
    <option name="ACTIVE_PROFILES" value="development" />
    <option name="VM_PARAMETERS" value="-Xmx1g" />
  </configuration>
</component>
```

### VS Code Launch Configurations

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Frontend Dev Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Rust Client Debug",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/clients/openframe-client/target/debug/openframe-client",
      "args": [],
      "cwd": "${workspaceFolder}/clients/openframe-client"
    }
  ]
}
```

## Development Workflow Scripts

### Build Scripts

Create `scripts/dev-build.sh`:
```bash
#!/bin/bash
set -e

echo "🔨 Building OpenFrame Development Environment..."

# Build Java services
echo "Building Java services..."
mvn clean install -DskipTests

# Build frontend
echo "Building frontend..."
cd openframe/services/openframe-frontend
npm ci
npm run build
cd -

# Build Rust client
echo "Building Rust client..."
cd clients/openframe-client
cargo build
cd -

echo "✅ Build completed successfully!"
```

### Development Server Script

Create `scripts/dev-start.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Starting OpenFrame Development Services..."

# Start infrastructure services
docker-compose -f integrated-tools/docker-compose.dev.yml up -d

# Wait for services to be ready
echo "Waiting for infrastructure services..."
sleep 10

# Start Java services in background
echo "Starting API service..."
java -jar openframe/services/openframe-api/target/openframe-api.jar &
API_PID=$!

echo "Starting Gateway service..."  
java -jar openframe/services/openframe-gateway/target/openframe-gateway.jar &
GATEWAY_PID=$!

# Start frontend dev server
echo "Starting frontend development server..."
cd openframe/services/openframe-frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Development environment started!"
echo "API: http://localhost:8082"
echo "Gateway: http://localhost:8088" 
echo "Frontend: http://localhost:3000"

# Wait for services and cleanup on exit
trap "kill $API_PID $GATEWAY_PID $FRONTEND_PID; docker-compose -f integrated-tools/docker-compose.dev.yml down" EXIT
wait
```

## Verification and Testing

### Environment Verification Script

Create `scripts/dev-verify.sh`:
```bash
#!/bin/bash

echo "🔍 Verifying OpenFrame Development Environment..."

# Check Java
echo "Checking Java..."
java -version || echo "❌ Java not found"

# Check Maven
echo "Checking Maven..."
mvn -version || echo "❌ Maven not found"

# Check Node.js
echo "Checking Node.js..."
node --version || echo "❌ Node.js not found"

# Check Rust
echo "Checking Rust..."
rustc --version || echo "❌ Rust not found"

# Check Docker
echo "Checking Docker..."
docker --version || echo "❌ Docker not found"

# Test GitHub access
echo "Checking GitHub access..."
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user > /dev/null 2>&1 && echo "✅ GitHub access OK" || echo "❌ GitHub access failed"

# Test database connections
echo "Testing database connections..."
mongosh --eval "db.adminCommand('ismaster')" mongodb://localhost:27017 > /dev/null 2>&1 && echo "✅ MongoDB OK" || echo "❌ MongoDB connection failed"

redis-cli ping > /dev/null 2>&1 && echo "✅ Redis OK" || echo "❌ Redis connection failed"

echo "🎉 Environment verification complete!"
```

## Troubleshooting

### Common Development Issues

**Maven Build Failures**
```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Verify GitHub token access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Check Maven settings
mvn help:effective-settings
```

**Frontend Build Issues**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force

# Check Node.js version
node --version  # Should be 18+
```

**Rust Compilation Problems**
```bash
# Update Rust toolchain
rustup update

# Clear build cache
cargo clean

# Check toolchain
rustup show
```

## Next Steps

Once your development environment is set up:

1. **Test the setup**: Run the verification script
2. **Start development**: Follow [Local Development](local-development.md) guide
3. **Learn the architecture**: Read [Architecture Overview](../architecture/overview.md)
4. **Begin contributing**: Review [Contributing Guidelines](../contributing/guidelines.md)

---

**🎯 Environment Ready!** Your OpenFrame development environment is configured and ready for productive development work!