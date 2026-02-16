# Development Environment Setup

This guide helps you configure the optimal development environment for OpenFrame. We'll set up IDEs, development tools, editor extensions, and environment variables for efficient development workflow.

> **Prerequisites**: Complete the [Prerequisites](../../getting-started/prerequisites.md) first - you'll need Java 21, Node.js 18+, Docker, and Maven installed.

## IDE Setup & Configuration

### IntelliJ IDEA (Recommended for Backend)

IntelliJ IDEA provides the best experience for Spring Boot development:

#### Installation & Licensing

```bash
# Install IntelliJ IDEA Ultimate (recommended)
# Download from: https://www.jetbrains.com/idea/download/

# Or install via package manager (Ubuntu/Debian)
sudo snap install intellij-idea-ultimate --classic

# Community Edition (free alternative)
sudo snap install intellij-idea-community --classic
```

#### Essential IntelliJ Plugins

**Core Development:**
- **Spring Boot** (bundled) - Spring Boot support and tooling
- **Maven** (bundled) - Build tool integration
- **Docker** - Container management from IDE
- **Database Tools** (Ultimate only) - MongoDB, Redis connections

**Code Quality:**
- **SonarLint** - Real-time code quality analysis
- **CheckStyle-IDEA** - Code style enforcement
- **Save Actions** - Auto-format on save

**Productivity:**
- **RestfulTool** - Test REST endpoints directly
- **Rainbow Brackets** - Better bracket matching
- **GitToolBox** - Enhanced Git integration

#### IntelliJ Configuration

**Import OpenFrame Project:**
1. **File > Open** → Select `openframe-oss-tenant` directory
2. **Import Maven projects automatically** when prompted
3. **Set Project SDK** to Java 21
4. **Enable annotation processing** (Settings > Build > Compiler > Annotation Processors)

**Configure Code Style:**
```text
File > Settings > Editor > Code Style > Java
- Import scheme from: .editorconfig (if available)
- Indent: 4 spaces
- Continuation indent: 8 spaces  
- Keep line breaks in declarations
```

**Set up Run Configurations:**
```text
Run/Debug Configurations:
1. ApiApplication (openframe-api module)
   - Main class: com.openframe.api.ApiApplication
   - VM options: -Dspring.profiles.active=dev
   - Environment variables: Load from .env

2. GatewayApplication (openframe-gateway module)  
   - Main class: com.openframe.gateway.GatewayApplication
   - VM options: -Dspring.profiles.active=dev

3. AuthorizationServerApplication (openframe-authorization-server module)
   - Main class: com.openframe.authz.OpenFrameAuthorizationServerApplication
   - VM options: -Dspring.profiles.active=dev
```

### Visual Studio Code (Frontend & General)

VS Code provides excellent support for TypeScript, React, and general development:

#### Installation

```bash
# Install Visual Studio Code
sudo snap install --classic code

# Or via apt (Ubuntu/Debian)
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

#### Essential VS Code Extensions

**Install all at once:**
```bash
# Core Language Support
code --install-extension ms-vscode.vscode-java-pack
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss

# React/Next.js Development
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension ms-vscode.vscode-json
code --install-extension ms-vscode.vscode-eslint
code --install-extension esbenp.prettier-vscode

# Docker & Database
code --install-extension ms-azuretools.vscode-docker
code --install-extension mongodb.mongodb-vscode

# Git & Productivity
code --install-extension eamodio.gitlens
code --install-extension ms-vscode.vscode-git-graph
code --install-extension streetsidesoftware.code-spell-checker

# API Development
code --install-extension humao.rest-client
code --install-extension ms-vscode.vscode-graphql

# Code Quality
code --install-extension ms-vscode.vscode-sonarlint
code --install-extension ms-vscode.vscode-todo-highlight
```

#### VS Code Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/usr/lib/jvm/java-21-openjdk-amd64"
    }
  ],
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact"
  ],
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  },
  "files.associations": {
    "*.env*": "dotenv"
  }
}
```

## Development Environment Variables

### Create Development `.env` File

Create a comprehensive `.env` file in your project root:

```bash
# Copy from example
cp .env.example .env

# Edit with your configuration
nano .env
```

### Complete Development Configuration

```bash
#################################################################
# OPENFRAME DEVELOPMENT ENVIRONMENT
#################################################################

# Application Configuration
OPENFRAME_DOMAIN=localhost
OPENFRAME_PROTOCOL=https
NODE_ENV=development
SPRING_PROFILES_ACTIVE=dev

# Database URLs
MONGO_URI=mongodb://localhost:27017/openframe-dev
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# PostgreSQL (if using for auth storage)
POSTGRES_URL=jdbc:postgresql://localhost:5432/openframe_auth
POSTGRES_USERNAME=openframe
POSTGRES_PASSWORD=dev_password

# Security Configuration
JWT_SECRET=development_jwt_secret_minimum_256_bits_required_for_security_purposes_only
REGISTRATION_SECRET=openframe-development-registration-secret
ENCRYPTION_KEY=dev_encryption_key_32_characters_min

# OAuth2 Development (Configure for your environment)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-azure-app-id
MICROSOFT_CLIENT_SECRET=your-microsoft-azure-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id

# AI Configuration (Optional for development)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
VOLTAGENT_API_KEY=your-voltagent-api-key

# Tool Integrations (Configure as available)
FLEET_SERVER_URL=https://your-fleet-server.com
FLEET_API_TOKEN=your-fleet-api-token
TACTICAL_RMM_URL=https://your-tacticalrmm.com
TACTICAL_RMM_API_KEY=your-tactical-api-key
MESHCENTRAL_URL=https://your-meshcentral.com
MESHCENTRAL_USERNAME=admin-user
MESHCENTRAL_PASSWORD=admin-password

# Logging Configuration
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
LOGGING_FILE_NAME=logs/openframe-dev.log

# Development Features
DEBUG_MODE=true
HOT_RELOAD_ENABLED=true
MOCK_INTEGRATIONS=false

# Frontend Development
NEXT_PUBLIC_API_URL=https://localhost:8080
NEXT_PUBLIC_WS_URL=wss://localhost:8080
NEXT_PUBLIC_AUTH_URL=https://localhost:8081
```

> **Security Note**: Never commit the `.env` file to version control. Add it to `.gitignore`.

### Environment Variable Validation

Create a validation script `scripts/validate-env.sh`:

```bash
#!/bin/bash
set -euo pipefail

echo "🔍 Validating development environment variables..."

# Required variables
REQUIRED_VARS=(
    "OPENFRAME_DOMAIN"
    "MONGO_URI" 
    "REDIS_URL"
    "KAFKA_BROKERS"
    "JWT_SECRET"
    "REGISTRATION_SECRET"
)

# Check each required variable
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Validate JWT secret length
JWT_LENGTH=${#JWT_SECRET}
if [ $JWT_LENGTH -lt 32 ]; then
    echo "❌ JWT_SECRET must be at least 32 characters (current: $JWT_LENGTH)"
    exit 1
fi

echo "✅ All environment variables are valid!"
```

Make it executable and run:
```bash
chmod +x scripts/validate-env.sh
./scripts/validate-env.sh
```

## Database Development Tools

### MongoDB Compass (GUI)

```bash
# Install MongoDB Compass for GUI database management
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# Or via snap
sudo snap install mongodb-compass
```

**Connection String for Development:**
```text
mongodb://localhost:27017/openframe-dev
```

### Redis CLI Tools

```bash
# Install Redis CLI tools
sudo apt install redis-tools

# Connect to local Redis
redis-cli -h localhost -p 6379

# Test connection
redis-cli ping
# Should return: PONG
```

### Kafka Development Tools

**Kafka CLI Tools:**
```bash
# These come with the Kafka Docker container
# Access via docker compose:
docker compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list

# Create development topic
docker compose exec kafka kafka-topics \
    --bootstrap-server localhost:9092 \
    --create --topic test-events \
    --partitions 3 --replication-factor 1
```

**Optional GUI Tool (Kafdrop):**
```yaml
# Add to docker-compose.yml for development
kafdrop:
  image: obsidiandynamics/kafdrop
  ports:
    - "9000:9000"
  environment:
    KAFKA_BROKERCONNECT: kafka:29092
  depends_on:
    - kafka
```

Access at http://localhost:9000

## Browser Development Tools

### Chrome/Edge DevTools Extensions

**Install these browser extensions:**

1. **React Developer Tools** - Debug React components
2. **Apollo Client Devtools** - GraphQL debugging (if using)
3. **JSON Formatter** - Pretty-print JSON responses  
4. **CORS Toggle** - Disable CORS for development
5. **Web Vitals** - Performance monitoring

### Firefox Developer Edition

Alternative browser with advanced debugging features:
```bash
# Install Firefox Developer Edition
sudo snap install firefox-developer-edition
```

## Git Configuration

### Configure Git for OpenFrame Development

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@domain.com"

# Set up useful aliases
git config --global alias.co checkout
git config --global alias.br branch  
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Configure line ending handling
git config --global core.autocrlf false
git config --global core.eol lf

# Set up default branch
git config --global init.defaultBranch main

# Configure merge tool (optional)
git config --global merge.tool vimdiff
```

### Pre-commit Hooks (Optional)

Set up pre-commit hooks for code quality:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-merge-conflict
      - id: check-yaml
      - id: check-json

  - repo: https://github.com/psf/black
    rev: 22.10.0
    hooks:
      - id: black
        language_version: python3
EOF
```

## Development Scripts & Utilities

### Create Development Helper Scripts

**`scripts/dev-start.sh` - Start development environment:**
```bash
#!/bin/bash
set -euo pipefail

echo "🚀 Starting OpenFrame development environment..."

# Start infrastructure
docker compose up -d mongodb redis kafka
echo "⏳ Waiting for infrastructure to be ready..."
sleep 30

# Start backend services in background
echo "🔧 Starting backend services..."
cd openframe/services/openframe-authorization-server
java -jar target/*.jar > logs/auth.log 2>&1 &
AUTH_PID=$!

cd ../openframe-api  
java -jar target/*.jar > logs/api.log 2>&1 &
API_PID=$!

cd ../openframe-gateway
java -jar target/*.jar > logs/gateway.log 2>&1 &
GATEWAY_PID=$!

# Start frontend
cd ../openframe-frontend
echo "🎨 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

# Save PIDs for cleanup
echo $AUTH_PID > /tmp/openframe-auth.pid
echo $API_PID > /tmp/openframe-api.pid  
echo $GATEWAY_PID > /tmp/openframe-gateway.pid
echo $FRONTEND_PID > /tmp/openframe-frontend.pid

echo "✅ OpenFrame development environment started!"
echo "🌐 Frontend: https://localhost:3000"
echo "🔧 API: https://localhost:8080"
echo "🔐 Auth: https://localhost:8081"
```

**`scripts/dev-stop.sh` - Stop development environment:**
```bash
#!/bin/bash

echo "🛑 Stopping OpenFrame development environment..."

# Kill background processes
[ -f /tmp/openframe-auth.pid ] && kill $(cat /tmp/openframe-auth.pid) && rm /tmp/openframe-auth.pid
[ -f /tmp/openframe-api.pid ] && kill $(cat /tmp/openframe-api.pid) && rm /tmp/openframe-api.pid
[ -f /tmp/openframe-gateway.pid ] && kill $(cat /tmp/openframe-gateway.pid) && rm /tmp/openframe-gateway.pid  
[ -f /tmp/openframe-frontend.pid ] && kill $(cat /tmp/openframe-frontend.pid) && rm /tmp/openframe-frontend.pid

# Stop Docker services
docker compose down

echo "✅ OpenFrame development environment stopped!"
```

Make scripts executable:
```bash
chmod +x scripts/dev-start.sh scripts/dev-stop.sh
```

## Performance & Monitoring Tools

### JVM Monitoring (Backend)

**Add JVM options to your run configurations:**
```text
VM Options:
-Xms512m -Xmx2g
-XX:+UseG1GC
-XX:+EnableJVMCI  
-XX:+PrintGCDetails
-Djava.awt.headless=true
```

**Enable actuator endpoints in application-dev.yml:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,beans,env
  endpoint:
    health:
      show-details: always
```

### Frontend Performance Monitoring

**Add to Next.js config:**
```javascript
// next.config.js
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
  
  // Development optimizations
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization.splitChunks = false;
    }
    return config;
  }
};
```

## Troubleshooting Development Environment

### Common Issues & Solutions

**Java version conflicts:**
```bash
# Check current Java version
java -version

# Switch Java versions
sudo update-alternatives --config java
```

**Node.js version issues:**
```bash
# Use Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Docker permission issues:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

**Port already in use:**
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process
sudo kill -9 <PID>
```

**Environment variables not loading:**
```bash
# Verify .env file exists and has correct permissions
ls -la .env
# Should show: -rw------- (permissions 600)

# Source environment manually
source .env
```

### Development Health Checks

**Create `scripts/health-check.sh`:**
```bash
#!/bin/bash

echo "🏥 OpenFrame Development Health Check"
echo "=================================="

# Check services
curl -f https://localhost:8081/actuator/health > /dev/null && echo "✅ Auth Server" || echo "❌ Auth Server"
curl -f https://localhost:8080/health > /dev/null && echo "✅ API Service" || echo "❌ API Service"  
curl -f https://localhost:3000 > /dev/null && echo "✅ Frontend" || echo "❌ Frontend"

# Check databases
docker compose ps mongodb | grep -q Up && echo "✅ MongoDB" || echo "❌ MongoDB"
docker compose ps redis | grep -q Up && echo "✅ Redis" || echo "❌ Redis" 
docker compose ps kafka | grep -q Up && echo "✅ Kafka" || echo "❌ Kafka"

echo "=================================="
```

## Next Steps

Your development environment is now configured! Next:

1. **[Local Development Guide](local-development.md)** - Start coding with hot reload
2. **[Architecture Overview](../architecture/README.md)** - Understand the system design
3. **[Testing Overview](../testing/README.md)** - Learn the testing approach
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing

## Getting Help

- **OpenMSP Slack**: https://www.openmsp.ai/ - Use `#development` channel
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

---

**🎉 Development environment ready!** You're all set to build amazing features for OpenFrame.