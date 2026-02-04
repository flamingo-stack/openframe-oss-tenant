# Development Environment Setup

This guide will help you set up a complete development environment for OpenFrame, including IDE configuration, essential plugins, and development tools.

> **Prerequisites**: Ensure you have completed the [Prerequisites](../../getting-started/prerequisites.md) guide before proceeding.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA provides excellent support for Spring Boot, GraphQL, and multi-language development.

#### Installation

```bash
# Option 1: Download from JetBrains website
# https://www.jetbrains.com/idea/

# Option 2: Using package managers
# macOS
brew install --cask intellij-idea

# Linux (Snap)
sudo snap install intellij-idea-ultimate --classic

# Linux (Flatpak)
flatpak install flathub com.jetbrains.IntelliJ-IDEA-Ultimate
```

#### Essential Plugins

Install these plugins for optimal OpenFrame development:

```bash
# Core OpenFrame development plugins
- Spring Boot
- Spring Security  
- GraphQL
- Docker
- Kubernetes
- Vue.js
- TypeScript
- Rust (IntelliJ Ultimate only)
```

**Installation steps:**
1. **Open IntelliJ IDEA** → **Preferences** → **Plugins**
2. **Search and install** each plugin from the marketplace
3. **Restart IDE** when prompted

#### Project Configuration

1. **Import the project**:
   - **File** → **Open** → Select `openframe-oss-tenant` directory
   - Choose "Import project from external model" → **Maven**

2. **Configure JDK**:
   - **File** → **Project Structure** → **Project**
   - Set **Project SDK** to Java 21
   - Set **Project language level** to 21

3. **Configure Maven**:
   - **Preferences** → **Build Tools** → **Maven**
   - Set **Maven home directory** to your Maven installation
   - Enable **Import Maven projects automatically**

4. **Set up run configurations**:
   ```yaml
   # Example Spring Boot run configuration
   Name: OpenFrame API
   Main class: com.openframe.api.ApiApplication
   Module: openframe-api
   JVM options: -Xmx2g -Dspring.profiles.active=local
   Environment variables: MONGODB_URI=mongodb://localhost:27017/openframe
   ```

### Visual Studio Code (Recommended for Frontend/Multi-language)

VS Code offers excellent TypeScript/Vue.js support and works well across all OpenFrame technologies.

#### Installation

```bash
# Option 1: Download from Microsoft website
# https://code.visualstudio.com/

# Option 2: Using package managers
# macOS
brew install --cask visual-studio-code

# Linux (Debian/Ubuntu)
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update && sudo apt install code
```

#### Essential Extensions

Install the OpenFrame development extension pack:

```bash
# Install all extensions at once
code --install-extension vscjava.vscode-java-pack
code --install-extension Vue.volar  
code --install-extension Vue.vscode-typescript-vue-plugin
code --install-extension rust-lang.rust-analyzer
code --install-extension GraphQL.vscode-graphql
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-docker
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --install-extension Prisma.prisma
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
```

**Extension details:**

| Extension | Purpose | Configuration |
|-----------|---------|---------------|
| **Java Extension Pack** | Java development support | Auto-configured |
| **Volar** | Vue.js 3 support with TypeScript | Replaces deprecated Vetur |
| **Rust Analyzer** | Rust language support | Auto-detects Cargo projects |
| **GraphQL** | Schema validation and IntelliSense | Detects `.graphql` files |
| **Docker** | Container management | Integrates with Docker Compose |
| **Kubernetes Tools** | K8s manifest editing | YAML validation |

#### Workspace Configuration

Create a `.vscode/settings.json` file in the project root:

```json
{
  "java.home": "/path/to/java-21",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java-21"
    }
  ],
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.server.hybridMode": true,
  "rust-analyzer.server.path": "~/.cargo/bin/rust-analyzer",
  "eslint.workingDirectories": [
    "openframe/services/openframe-frontend",
    "clients/openframe-chat"
  ],
  "docker.dockerodeOptions": {
    "socketPath": "/var/run/docker.sock"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.git": true
  }
}
```

#### Recommended VS Code Tasks

Create `.vscode/tasks.json` for common development tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All Services",
      "type": "shell",
      "command": "mvn",
      "args": ["clean", "install", "-DskipTests"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Start Infrastructure",
      "type": "shell",
      "command": "docker",
      "args": ["compose", "-f", "integrated-tools/docker-compose.yml", "up", "-d"],
      "group": "build"
    },
    {
      "label": "Frontend Dev Server",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "options": {
        "cwd": "openframe/services/openframe-frontend"
      },
      "group": "build"
    }
  ]
}
```

## Development Environment Variables

### Core Environment Variables

Create a `.env` file in your project root for local development:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security Configuration  
JWT_SECRET=your-development-jwt-secret-min-256-bits
ENCRYPTION_KEY=your-development-encryption-key-32-chars
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Service Configuration
SPRING_PROFILES_ACTIVE=local
LOG_LEVEL=DEBUG
SERVER_PORT=8081

# Frontend Configuration
VITE_API_URL=http://localhost:8080
VITE_GRAPHQL_URL=http://localhost:8081/graphql
VITE_WS_URL=ws://localhost:8080/ws

# Development Tools
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_SWAGGER_UI=true
DEBUG_MODE=true
```

### Service-Specific Variables

Each service may require additional configuration:

#### API Service (openframe-api)
```bash
# GraphQL Configuration
GRAPHQL_SERVLET_MAPPING=/graphql
DGS_GRAPHQL_PLAYGROUND_ENABLED=true
DGS_GRAPHQL_INTROSPECTION_ENABLED=true

# Database Configuration
SPRING_DATA_MONGODB_URI=${MONGODB_URI}
SPRING_REDIS_URL=${REDIS_URL}

# Security Configuration
SPRING_SECURITY_OAUTH2_CLIENT_ENABLED=true
```

#### Frontend Service
```bash
# Development Server Configuration
VITE_HOST=0.0.0.0
VITE_PORT=3000
VITE_OPEN=true

# API Configuration
VITE_API_BASE_URL=http://localhost:8080
VITE_GRAPHQL_ENDPOINT=/graphql
VITE_AUTH_ENABLED=true

# Feature Flags
VITE_ENABLE_MINGO_CHAT=true
VITE_ENABLE_DEBUG_TOOLS=true
```

### Environment Variable Loading

#### For Java Services (Spring Boot)
Spring Boot automatically loads environment variables. You can also use:

```bash
# Option 1: Export variables
export MONGODB_URI=mongodb://localhost:27017/openframe

# Option 2: Use .env file with spring-dotenv
# Add to pom.xml: me.paulschwarz:spring-dotenv

# Option 3: IDE run configuration
# Set environment variables in your IDE's run configuration
```

#### For Frontend Services
```bash
# Vite automatically loads .env files
# Create environment-specific files:
.env                # Default environment variables
.env.local          # Local development (ignored by git)
.env.development    # Development environment
.env.production     # Production environment
```

#### For Rust Services
```bash
# Create a .env file in the client directory
cd clients/openframe-client
echo 'RUST_LOG=debug' > .env
echo 'OPENFRAME_SERVER_URL=http://localhost:8080' >> .env

# Load in Rust code using dotenv crate
```

## Database Setup for Development

### MongoDB Configuration

```bash
# Start MongoDB via Docker
docker run -d --name openframe-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -e MONGO_INITDB_DATABASE=openframe \
  mongo:7

# Create development database and user
docker exec -it openframe-mongo mongo admin

# In MongoDB shell:
db.createUser({
  user: "openframe",
  pwd: "openframe",
  roles: [
    { role: "readWrite", db: "openframe" },
    { role: "readWrite", db: "openframe_test" }
  ]
})
```

### Redis Configuration

```bash
# Start Redis via Docker  
docker run -d --name openframe-redis \
  -p 6379:6379 \
  redis:7-alpine

# Test connection
docker exec -it openframe-redis redis-cli ping
# Expected response: PONG
```

### Development Database Tools

#### MongoDB Compass (GUI)
- **Download**: [MongoDB Compass](https://www.mongodb.com/products/compass)
- **Connection**: `mongodb://openframe:openframe@localhost:27017/openframe`

#### Redis Insight (GUI)
- **Download**: [Redis Insight](https://redis.com/redis-enterprise/redis-insight/)
- **Connection**: `localhost:6379`

#### Command Line Tools
```bash
# MongoDB CLI
mongosh mongodb://openframe:openframe@localhost:27017/openframe

# Redis CLI
redis-cli -h localhost -p 6379
```

## Code Quality and Formatting

### Java Code Style

#### Maven Configuration
Add to your `pom.xml`:

```xml
<build>
  <plugins>
    <!-- Checkstyle -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-checkstyle-plugin</artifactId>
      <version>3.3.0</version>
      <configuration>
        <configLocation>checkstyle.xml</configLocation>
        <includeTestSourceDirectory>true</includeTestSourceDirectory>
        <failOnViolation>true</failOnViolation>
      </configuration>
    </plugin>
    
    <!-- SpotBugs -->
    <plugin>
      <groupId>com.github.spotbugs</groupId>
      <artifactId>spotbugs-maven-plugin</artifactId>
      <version>4.8.0.0</version>
    </plugin>
  </plugins>
</build>
```

#### IntelliJ Code Style
1. **Import code style**: **Preferences** → **Editor** → **Code Style** → **Java**
2. **Download**: [Google Java Style Guide](https://github.com/google/styleguide/blob/gh-pages/intellij-java-google-style.xml)
3. **Import scheme**: Click gear icon → **Import Scheme**

### Frontend Code Style

#### ESLint Configuration
Create `.eslintrc.js` in frontend directories:

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:prettier/recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'vue'],
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
};
```

#### Prettier Configuration
Create `.prettierrc` in project root:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf"
}
```

### Rust Code Style

```bash
# Format code
cargo fmt

# Lint code  
cargo clippy

# Security audit
cargo audit

# Create rustfmt configuration
echo 'max_width = 100
tab_spaces = 2
newline_style = "Unix"' > rustfmt.toml
```

## Development Scripts and Automation

### Custom Development Scripts

Create a `scripts/dev-helpers/` directory with utility scripts:

#### `scripts/dev-helpers/setup-dev-env.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Setting up OpenFrame development environment..."

# Check prerequisites
echo "✅ Checking prerequisites..."
java -version || { echo "❌ Java 21 required"; exit 1; }
mvn -version || { echo "❌ Maven 3.8+ required"; exit 1; }
node --version || { echo "❌ Node.js 18+ required"; exit 1; }
docker --version || { echo "❌ Docker required"; exit 1; }

# Start infrastructure
echo "🐳 Starting infrastructure services..."
docker compose -f integrated-tools/docker-compose.yml up -d

# Build services
echo "🔨 Building Java services..."
mvn clean install -DskipTests

# Install frontend dependencies  
echo "📦 Installing frontend dependencies..."
cd openframe/services/openframe-frontend && npm install

echo "✅ Development environment ready!"
echo "Next steps:"
echo "  - Run './scripts/run-mac.sh' to start all services"
echo "  - Open http://localhost:3000 for the web interface"
echo "  - Open http://localhost:8081/graphql for GraphQL playground"
```

#### `scripts/dev-helpers/run-service.sh`
```bash
#!/bin/bash
SERVICE_NAME=$1

if [ -z "$SERVICE_NAME" ]; then
  echo "Usage: $0 <service-name>"
  echo "Available services: api, gateway, management, stream, frontend"
  exit 1
fi

case $SERVICE_NAME in
  "api")
    cd openframe/services/openframe-api && mvn spring-boot:run
    ;;
  "gateway")
    cd openframe/services/openframe-gateway && mvn spring-boot:run
    ;;
  "management")
    cd openframe/services/openframe-management && mvn spring-boot:run
    ;;
  "stream")
    cd openframe/services/openframe-stream && mvn spring-boot:run
    ;;
  "frontend")
    cd openframe/services/openframe-frontend && npm run dev
    ;;
  *)
    echo "Unknown service: $SERVICE_NAME"
    exit 1
    ;;
esac
```

### Git Hooks

Set up pre-commit hooks for code quality:

#### `.git/hooks/pre-commit`
```bash
#!/bin/sh
# Pre-commit hook for OpenFrame

echo "🔍 Running pre-commit checks..."

# Java formatting check
echo "Checking Java code style..."
mvn checkstyle:check -q

# Frontend linting
echo "Linting frontend code..."
cd openframe/services/openframe-frontend
npm run lint:check

# Rust formatting
echo "Checking Rust code format..."
cd ../../clients/openframe-client
cargo fmt --check

echo "✅ Pre-commit checks passed!"
```

Make the hook executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Debugging and Troubleshooting

### Java Service Debugging

#### IntelliJ IDEA Debug Configuration
1. **Run** → **Edit Configurations**
2. **Add** → **Remote JVM Debug**
3. **Set parameters**:
   - **Host**: localhost
   - **Port**: 5005
   - **Command line**: `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005`

#### Start service with debugging:
```bash
# Option 1: Maven with debug
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Option 2: Java with debug
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -jar target/openframe-api.jar
```

### Frontend Debugging

#### Vue.js DevTools
```bash
# Install Vue DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/vuejs-devtools/
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/
```

#### Debug Configuration in VS Code
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/*"
      }
    }
  ]
}
```

### Common Development Issues

#### Issue: Port Conflicts
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Use alternative ports
export SERVER_PORT=8090
```

#### Issue: Memory Errors
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4g -Xms2g"

# Increase JVM memory for services
export JAVA_OPTS="-Xmx4g -Xms2g"
```

#### Issue: Database Connection
```bash
# Check if containers are running
docker ps

# Check container logs
docker logs openframe-mongo
docker logs openframe-redis

# Reset containers
docker compose -f integrated-tools/docker-compose.yml down -v
docker compose -f integrated-tools/docker-compose.yml up -d
```

---

Your development environment is now configured! Continue with the [Local Development Guide](local-development.md) to start running and modifying OpenFrame services.