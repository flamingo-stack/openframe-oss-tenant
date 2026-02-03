# Development Environment Setup

This guide helps you set up a complete development environment for OpenFrame, including IDEs, tools, and configurations optimized for productive development.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## IDE Setup & Configuration

### IntelliJ IDEA (Recommended for Java)

IntelliJ IDEA provides the best experience for OpenFrame's Java services.

#### Installation

```bash
# macOS (using Homebrew)
brew install --cask intellij-idea

# Linux (using Snap)
sudo snap install intellij-idea-community --classic

# Windows - Download from JetBrains website
```

#### Essential Plugins

Install these plugins for optimal OpenFrame development:

| Plugin | Purpose | Installation |
|--------|---------|--------------|
| **Spring Boot** | Spring Boot support | Bundled with IntelliJ |
| **GraphQL** | GraphQL schema support | `Preferences → Plugins → GraphQL` |
| **Docker** | Container management | Bundled with IntelliJ |
| **Database Navigator** | Database tool integration | `Preferences → Plugins` |
| **Lombok** | Lombok annotation support | `Preferences → Plugins → Lombok` |
| **Vue.js** | Vue.js support (if doing frontend) | `Preferences → Plugins → Vue.js` |

#### IntelliJ Configuration

**Java Settings:**
```text
File → Project Structure → Project Settings
- Project SDK: Java 21
- Project Language Level: 21 - Pattern matching for switch

File → Project Structure → Modules  
- For each module, set Language Level to 21
```

**Code Style:**
```text
Preferences → Editor → Code Style → Java
- Use Google Java Style (import from openframe-oss-tenant/.editorconfig)
- Tab size: 4
- Indent: 4
- Continuation indent: 8
```

**Build Configuration:**
```text
Preferences → Build, Execution, Deployment → Build Tools → Maven
✓ Work offline (for faster builds)
✓ Use plugin registry
Maven home directory: Use bundled
```

#### Import OpenFrame Project

1. **Open Project**: `File → Open` → Select `openframe-oss-tenant` directory
2. **Import as Maven Project**: IntelliJ will auto-detect the Maven structure
3. **Wait for Indexing**: Let IntelliJ index all files and dependencies
4. **Verify Setup**: Check that all modules appear in Project view

### VS Code (Great for Frontend & Multi-language)

VS Code is excellent for frontend development and general editing.

#### Essential Extensions

```bash
# Install VS Code extensions
code --install-extension Vue.volar
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension GraphQL.vscode-graphql-syntax
code --install-extension ms-azuretools.vscode-docker
code --install-extension redhat.java
code --install-extension vscjava.vscode-spring-boot-dashboard
```

#### VS Code Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java-21"
    }
  ],
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.server.hybridMode": true,
  "graphql-config.load.baseDir": "./openframe/services/openframe-frontend",
  "files.exclude": {
    "**/target": true,
    "**/node_modules": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/target": true,
    "**/node_modules": true
  }
}
```

#### VS Code Tasks

Create `.vscode/tasks.json` for common development tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All Services",
      "type": "shell",
      "command": "mvn clean install -DskipTests",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Start Frontend Dev Server",
      "type": "shell",
      "command": "npm run dev",
      "options": {
        "cwd": "${workspaceFolder}/openframe/services/openframe-frontend"
      },
      "group": "build"
    },
    {
      "label": "Run Tests",
      "type": "shell", 
      "command": "mvn test",
      "group": "test"
    }
  ]
}
```

## Database Tools

### MongoDB Compass

Essential for inspecting and managing MongoDB data during development.

#### Installation & Setup

```bash
# macOS
brew install --cask mongodb-compass

# Linux - Download from MongoDB website
# Windows - Download from MongoDB website
```

#### Connection Configuration

```text
Connection String: mongodb://localhost:27017/openframe
Database: openframe

Useful Collections:
- users: User accounts and profiles
- organizations: Client organizations
- devices: Managed devices
- logs: System and tool logs
- integrations: Tool connections
```

### Redis Desktop Manager

For inspecting Redis cache and session data.

```bash
# Alternative: RedisInsight (official Redis tool)
# Download from Redis website

# Connection:
Host: localhost
Port: 6379
Database: 0
```

## Git Configuration

### Git Setup for OpenFrame Development

```bash
# Configure Git for OpenFrame development
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set up useful aliases
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
git config alias.lg "log --oneline --decorate --all --graph"

# Configure line endings (important for cross-platform development)
git config core.autocrlf input  # Linux/macOS
git config core.autocrlf true   # Windows
```

### Pre-commit Hooks (Optional but Recommended)

```bash
# Install pre-commit
pip install pre-commit

# Set up hooks in the repository
cd openframe-oss-tenant
pre-commit install
```

This will run code formatting and basic checks before each commit.

## Environment Variables Configuration

### Development Environment File

Create a comprehensive `.env` file for development:

```bash
# Core Configuration
OPENFRAME_ENV=development
SPRING_PROFILES_ACTIVE=dev,local
LOG_LEVEL=DEBUG

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
PINOT_BROKER_URL=http://localhost:8099

# Message Streaming
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# Security Configuration (Development Only - Change for Production)
JWT_SECRET=development-jwt-secret-key-do-not-use-in-production
ENCRYPTION_KEY=development-encryption-key-32-chars
PKCE_ENABLED=true

# Service URLs (for local development)
GATEWAY_URL=http://localhost:8080
API_URL=http://localhost:8081
AUTH_URL=http://localhost:8082
FRONTEND_URL=http://localhost:3000

# External Tool Integration (Optional)
TACTICAL_RMM_URL=http://localhost:8000
TACTICAL_RMM_TOKEN=your-tactical-rmm-token-here

FLEETDM_URL=http://localhost:8080
FLEETDM_TOKEN=your-fleetdm-token-here

MESHCENTRAL_URL=https://localhost:4430
MESHCENTRAL_USER=admin
MESHCENTRAL_PASS=your-meshcentral-password

# Development Features
ENABLE_DEV_TOOLS=true
ENABLE_CORS=true
DISABLE_CSRF=true
ENABLE_H2_CONSOLE=false

# AI Configuration (Optional)
OPENAI_API_KEY=your-openai-api-key
MINGO_AI_ENABLED=true
FAE_AI_ENABLED=true

# Monitoring & Observability
PROMETHEUS_ENABLED=true
METRICS_EXPORT_ENABLED=true
TRACING_ENABLED=false
```

### Environment-Specific Configuration

Create additional `.env` files for different environments:

```bash
# .env.local - Local overrides
# .env.test - Test environment
# .env.staging - Staging environment
```

## Development Scripts & Aliases

### Bash Aliases for Development

Add these to your `.bashrc` or `.zshrc`:

```bash
# OpenFrame Development Aliases
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-start="./scripts/run-mac.sh"  # or run-linux.sh
alias of-frontend="cd openframe/services/openframe-frontend && npm run dev"
alias of-logs="docker-compose logs -f"

# Quick navigation
alias of-root="cd /path/to/openframe-oss-tenant"
alias of-services="cd /path/to/openframe-oss-tenant/openframe/services"
alias of-libs="cd /path/to/openframe-oss-tenant/openframe-oss-lib"

# Development shortcuts
alias of-clean="mvn clean && rm -rf node_modules && npm install"
alias of-reset="docker-compose down -v && docker-compose up -d mongodb redis kafka"
```

### PowerShell Aliases (Windows)

Add to your PowerShell profile:

```powershell
# OpenFrame Development Functions
function of-build { mvn clean install -DskipTests }
function of-test { mvn test }
function of-start { ./scripts/run-windows.ps1 }
function of-frontend { 
    Set-Location "openframe/services/openframe-frontend"
    npm run dev
}

# Quick navigation
function of-root { Set-Location "C:\path\to\openframe-oss-tenant" }
function of-services { Set-Location "C:\path\to\openframe-oss-tenant\openframe\services" }
```

## JVM & Node.js Performance Tuning

### JVM Configuration for Development

Create `setenv.sh` (or `setenv.bat` on Windows):

```bash
#!/bin/bash
# JVM tuning for OpenFrame development

export JAVA_OPTS="
  -Xmx4g
  -Xms2g
  -XX:MaxMetaspaceSize=512m
  -XX:+UseG1GC
  -XX:+UseStringDeduplication
  -Djava.awt.headless=true
  -Dspring.devtools.restart.enabled=true
  -Dspring.devtools.livereload.enabled=true
"

export MAVEN_OPTS="
  -Xmx2g
  -XX:+TieredCompilation
  -XX:TieredStopAtLevel=1
"
```

### Node.js Configuration

```bash
# Node.js memory and performance settings
export NODE_OPTIONS="--max-old-space-size=4096"
export NODE_ENV=development

# Enable faster builds
export DISABLE_ESLINT_PLUGIN=true  # Only during rapid development
```

## Development Workflow Setup

### Hot Reload Configuration

**Backend (Spring Boot DevTools)**:
Already configured in OpenFrame services for automatic restart on code changes.

**Frontend (Vite HMR)**:
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: true,
    port: 3000,
    hmr: {
      overlay: true
    }
  }
})
```

### Live Debugging Setup

**IntelliJ Debug Configuration**:
1. **Edit Configurations** → **+** → **Spring Boot**
2. **Name**: "OpenFrame API Debug"
3. **Main class**: `com.openframe.api.ApiApplication`
4. **VM options**: `-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005`
5. **Environment variables**: Load from `.env` file

**VS Code Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug OpenFrame API",
      "type": "java",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "vmArgs": "-Dspring.profiles.active=dev",
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017/openframe",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  ]
}
```

## Verification & Testing

### Environment Verification Script

Create `scripts/verify-dev-env.sh`:

```bash
#!/bin/bash
echo "Verifying OpenFrame Development Environment..."

# Check Java version
java_version=$(java -version 2>&1 | grep -oP '(?<=version\s")[^"]*')
if [[ $java_version == 21* ]]; then
    echo "✅ Java 21: $java_version"
else
    echo "❌ Java 21 required, found: $java_version"
fi

# Check Maven
mvn_version=$(mvn -version 2>&1 | head -n 1 | grep -oP '(?<=Maven\s)[^\s]*')
echo "✅ Maven: $mvn_version"

# Check Node.js
node_version=$(node -v)
echo "✅ Node.js: $node_version"

# Check Docker
docker_version=$(docker --version | grep -oP '(?<=version\s)[^,]*')
echo "✅ Docker: $docker_version"

# Check environment file
if [ -f .env ]; then
    echo "✅ .env file exists"
else
    echo "❌ .env file missing"
fi

echo "Environment verification complete!"
```

Run this script to verify your setup:

```bash
chmod +x scripts/verify-dev-env.sh
./scripts/verify-dev-env.sh
```

## Troubleshooting Common Setup Issues

### Java Version Issues

```bash
# Check active Java version
java -version
javac -version

# Switch Java versions (macOS with Homebrew)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Switch Java versions (Linux with update-alternatives)
sudo update-alternatives --config java
```

### IDE Performance Issues

**IntelliJ IDEA**:
- Increase heap size: `Help → Change Memory Settings → 4GB`
- Exclude target directories: `File → Project Structure → Modules → Exclude target folders`
- Disable unnecessary plugins: `Preferences → Plugins`

**VS Code**:
- Exclude large directories in `settings.json`
- Use Workspace Trust for better performance
- Limit TypeScript checking to open files

### Network Configuration Issues

```bash
# Check if ports are available
lsof -i :3000  # Frontend
lsof -i :8080  # Gateway
lsof -i :8081  # API

# Kill processes using required ports
sudo kill -9 $(lsof -ti:8080)
```

---

*🛠️ **Development environment ready!** Continue to [Local Development](local-development.md) to start running OpenFrame services locally.*