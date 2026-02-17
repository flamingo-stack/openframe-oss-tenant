# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame, including IDE configuration, development tools, and environment variables.

## IDE Setup

### IntelliJ IDEA (Recommended)

IntelliJ IDEA provides excellent Spring Boot and React support.

**Installation:**
```bash
# macOS (Homebrew)
brew install --cask intellij-idea

# Linux (Snap)
sudo snap install intellij-idea-ultimate --classic

# Windows (Chocolatey)
choco install intellij-idea
```

**Required Plugins:**
1. **Spring Boot** - Pre-installed in Ultimate edition
2. **Lombok** - For annotation processing
3. **GraphQL** - For Netflix DGS schema editing
4. **Database Tools** - MongoDB support
5. **Docker** - Container management

**Configuration:**
1. **Set Java SDK** to JDK 21:
   - File → Project Structure → SDKs → Add JDK 21
   
2. **Configure Maven**:
   - Settings → Build Tools → Maven
   - Maven home directory: `/usr/share/maven` (or Homebrew path)
   - User settings file: `~/.m2/settings.xml`

3. **Enable Annotation Processing**:
   - Settings → Build → Compiler → Annotation Processors
   - ✅ Enable annotation processing

4. **Set up code style**:
   - Import `.editorconfig` from repository root
   - Settings → Code Style → Import Scheme

### VS Code Setup

VS Code works well for frontend development and can handle backend Java development.

**Required Extensions:**

```bash
# Install via command line
code --install-extension vscjava.vscode-java-pack
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-eslint
code --install-extension formulahendry.auto-rename-tag
code --install-extension ms-vscode.vscode-json
```

**Extension List:**
- **Java Extension Pack** - Complete Java development
- **Spring Boot Tools** - Spring Boot support
- **TypeScript** - Enhanced TypeScript support
- **Tailwind CSS IntelliSense** - CSS framework support
- **ESLint** - JavaScript/TypeScript linting
- **Auto Rename Tag** - HTML/JSX tag synchronization
- **MongoDB for VS Code** - Database management

**VS Code Settings** (`settings.json`):
```json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/usr/lib/jvm/java-21-openjdk"
    }
  ],
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"]
  ],
  "eslint.workingDirectories": ["openframe/services/openframe-frontend"]
}
```

## Development Tools

### Java Development Tools

**Maven Configuration** (`~/.m2/settings.xml`):
```xml
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <spring.profiles.active>dev</spring.profiles.active>
        <maven.test.skip>false</maven.test.skip>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
  
  <servers>
    <server>
      <id>openframe-repo</id>
      <username>${env.MAVEN_USERNAME}</username>
      <password>${env.MAVEN_PASSWORD}</password>
    </server>
  </servers>
</settings>
```

**Lombok Setup:**

Lombok reduces boilerplate code with annotations.

```bash
# Verify Lombok is working
java -jar ~/.m2/repository/org/projectlombok/lombok/*/lombok-*.jar version
```

For IntelliJ IDEA:
1. Install Lombok plugin
2. Enable annotation processing
3. Restart IDE

### Frontend Development Tools

**Node.js Version Management:**

Use `nvm` to manage Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x+
```

**Global npm packages:**
```bash
npm install -g @types/node typescript ts-node
npm install -g @next/cli
npm install -g eslint prettier
```

**Browser Extensions for Development:**
- **React Developer Tools** - Component inspection
- **Redux DevTools** - State debugging  
- **GraphQL Network Inspector** - GraphQL query debugging
- **JSON Viewer** - Format JSON responses

### Database Tools

**MongoDB Compass:**
```bash
# macOS
brew install --cask mongodb-compass

# Ubuntu/Debian  
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# Windows
choco install mongodb-compass
```

**MongoDB Shell:**
```bash
# Install mongosh
npm install -g mongosh

# Connect to local development database
mongosh "mongodb://localhost:27017/openframe_dev"
```

**Redis CLI (for caching):**
```bash
# Ubuntu/Debian
sudo apt install redis-tools

# macOS
brew install redis

# Connect to local Redis
redis-cli -p 6379
```

### API Development Tools

**Postman or Insomnia:**
```bash
# Postman
sudo snap install postman

# Insomnia (lightweight alternative)
sudo snap install insomnia
```

**cURL Configuration** (`.curlrc`):
```bash
# ~/.curlrc
-w "\ntime_total: %{time_total}s\n"
-s
-S
--compressed
```

**HTTPie (modern cURL alternative):**
```bash
# Installation
pip install httpie

# Usage examples
http GET localhost:8080/api/health
http POST localhost:8080/api/devices name="Test Device" 
```

## Environment Variables

### Development Environment File

Create a `.env.development` file in the project root:

```bash
# Database Configuration
MONGO_URI=mongodb://localhost:27017
MONGO_DATABASE=openframe_dev
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=dev-secret-change-in-production-environments
JWT_EXPIRATION=86400
REFRESH_TOKEN_EXPIRATION=2592000

# Application URLs
OPENFRAME_BASE_URL=https://localhost:3000
API_BASE_URL=https://localhost:8080
AUTHORIZATION_SERVER_URL=https://localhost:8081
GATEWAY_URL=https://localhost:8082

# External Service URLs (for integration testing)
FLEET_URL=https://localhost:8080/tools/fleetmdm-server
TACTICAL_URL=https://localhost:8080/tools/tactical-rmm

# Kafka Configuration (optional for development)
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081

# NATS Configuration
NATS_URL=nats://localhost:4222

# Development Flags
NODE_ENV=development
SPRING_PROFILES_ACTIVE=dev
DEBUG_MODE=true
HOT_RELOAD=true

# Logging Configuration  
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
LOGGING_LEVEL_ORG_SPRINGFRAMEWORK=WARN

# OpenFrame Client Agent Configuration
OPENFRAME_CLIENT_LOG_LEVEL=DEBUG
OPENFRAME_CLIENT_METRICS_ENABLED=true
```

### Service-Specific Environment Variables

**API Service** (`.env.api`):
```bash
SERVER_PORT=8080
MANAGEMENT_SERVER_PORT=8081

# Database connection pooling
MONGO_CONNECTION_POOL_MAX_SIZE=10
MONGO_CONNECTION_POOL_MIN_SIZE=2

# GraphQL Configuration
GRAPHQL_SCHEMA_INTROSPECTION=true
GRAPHQL_SCHEMA_PLAYGROUND=true
```

**Frontend Service** (`.env.frontend`):
```bash
# Next.js Configuration
PORT=3000
NODE_ENV=development

# API Configuration
NEXT_PUBLIC_API_URL=https://localhost:8080
NEXT_PUBLIC_AUTH_URL=https://localhost:8081
NEXT_PUBLIC_WEBSOCKET_URL=wss://localhost:8082

# Feature Flags
NEXT_PUBLIC_ENABLE_MINGO=true
NEXT_PUBLIC_ENABLE_FLEET_INTEGRATION=true
NEXT_PUBLIC_ENABLE_TACTICAL_INTEGRATION=true

# Development Features
NEXT_PUBLIC_SHOW_DEBUG_INFO=true
NEXT_PUBLIC_ENABLE_REACT_DEVTOOLS=true
```

### Loading Environment Variables

**For Backend Services:**
```bash
# Using Spring Boot profiles
export SPRING_PROFILES_ACTIVE=dev

# Or set in application-dev.yml
spring:
  profiles: dev
  config:
    import: optional:file:.env.development
```

**For Frontend:**
```bash
# Next.js automatically loads .env.local, .env.development
# Ensure variables start with NEXT_PUBLIC_ for client-side access
```

**Using direnv (recommended):**
```bash
# Install direnv
sudo apt install direnv  # Ubuntu/Debian
brew install direnv      # macOS

# Add to shell profile
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc

# Create .envrc file
echo 'dotenv .env.development' > .envrc
direnv allow .
```

### Environment Validation

Create an environment validation script:

```bash
#!/bin/bash
# scripts/validate-env.sh

echo "Validating development environment..."

# Check required variables
required_vars=(
    "MONGO_URI"
    "JWT_SECRET" 
    "OPENFRAME_BASE_URL"
    "API_BASE_URL"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Check service connectivity
echo "Checking service connectivity..."

# MongoDB
if mongosh --eval "db.runCommand('ping')" "$MONGO_URI" >/dev/null 2>&1; then
    echo "✅ MongoDB connection successful"
else
    echo "❌ MongoDB connection failed"
fi

# Redis (optional)
if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
    echo "✅ Redis connection successful"
else
    echo "⚠️  Redis not available (optional)"
fi

echo "Environment validation complete!"
```

Make it executable and run:
```bash
chmod +x scripts/validate-env.sh
./scripts/validate-env.sh
```

## Development Certificates

### SSL Certificate Setup

For HTTPS in development:

```bash
# Install mkcert
brew install mkcert  # macOS
# or download from https://github.com/FiloSottile/mkcert/releases

# Install local CA
mkcert -install

# Generate certificates for development domains
mkcert localhost 127.0.0.1 ::1 openframe.local

# This creates:
# localhost+3.pem (certificate)
# localhost+3-key.pem (private key)
```

**Configure services to use certificates:**

**Backend (application-dev.yml):**
```yaml
server:
  port: 8080
  ssl:
    enabled: true
    key-store: classpath:certificates/localhost+3.p12
    key-store-password: changeme
    key-store-type: PKCS12
```

**Frontend (next.config.js):**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://localhost:8080/api/:path*'
      }
    ]
  }
}

module.exports = nextConfig
```

## Development Shortcuts

### Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# OpenFrame development aliases
alias of-start='./scripts/dev-start-all.sh'
alias of-stop='./scripts/dev-stop-all.sh'
alias of-logs='./scripts/dev-tail-logs.sh'
alias of-test='mvn clean test'
alias of-build='mvn clean install -DskipTests'

# Service-specific shortcuts
alias api-start='mvn spring-boot:run -pl openframe/services/openframe-api'
alias frontend-start='cd openframe/services/openframe-frontend && npm run dev'
alias mongo-dev='mongosh mongodb://localhost:27017/openframe_dev'

# Git shortcuts for OpenFrame
alias of-status='git status'
alias of-pull='git pull origin main'
alias of-push='git push origin $(git branch --show-current)'
```

### Hot Reload Configuration

**Backend Hot Reload (Spring Boot DevTools):**

Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**Frontend Hot Reload (Next.js):**
```bash
# Fast refresh is enabled by default in Next.js
npm run dev
```

### Debugging Configuration

**Java Debug Configuration:**
```bash
# Enable remote debugging
export JAVA_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"

# Start service with debugging
mvn spring-boot:run -pl openframe/services/openframe-api -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
```

**Frontend Debug Configuration:**
```bash
# Enable React profiler
export NODE_ENV=development
export NEXT_PUBLIC_DEBUG=true

# Start with debugging
npm run dev -- --inspect
```

## Next Steps

With your development environment configured:

1. **[Local Development Guide](local-development.md)** - Clone and run the project locally
2. **[Architecture Overview](../architecture/README.md)** - Understand the system design  
3. **[Testing Guide](../testing/README.md)** - Learn testing strategies
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing

## Troubleshooting

### Common IDE Issues

**IntelliJ not recognizing Lombok:**
1. Install Lombok plugin
2. Enable annotation processing
3. Reimport Maven projects
4. Restart IDE

**VS Code Java errors:**
1. Clean workspace: `Ctrl+Shift+P` → "Java: Clean Workspace"
2. Verify Java home: Check Java extension settings
3. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

### Environment Issues

**Port conflicts:**
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process
sudo kill -9 <PID>
```

**Certificate issues:**
```bash
# Regenerate certificates
mkcert -uninstall
mkcert -install
mkcert localhost 127.0.0.1 ::1
```

**Permission issues:**
```bash
# Fix npm permission issues
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

Need help? Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for developer support.