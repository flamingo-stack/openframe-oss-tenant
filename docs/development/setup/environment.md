# Development Environment Setup

This guide will help you set up a complete development environment for OpenFrame, including IDEs, development tools, and environment variables.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java)

IntelliJ IDEA provides excellent support for Spring Boot, Maven, and the Java ecosystem.

#### Installation

```bash
# macOS (using Homebrew)
brew install --cask intellij-idea

# Download directly from JetBrains
# https://www.jetbrains.com/idea/download/
```

#### Recommended Plugins

```text
Essential Plugins:
- Spring Boot (built-in)
- Maven Integration (built-in)
- Database Tools and SQL (built-in)
- Docker (built-in)
- Kubernetes (built-in)

Additional Plugins:
- GraphQL
- MongoDB Plugin
- Vue.js
- REST Client
- SonarLint
- GitToolBox
- Rainbow Brackets
- String Manipulation
```

#### Project Setup

1. **Import Project**:
   - File → Open → Select `openframe-oss-tenant` directory
   - Choose "Import as Maven project"
   - Wait for indexing to complete

2. **Configure JDK**:
   - File → Project Structure → Project Settings → Project
   - Set Project SDK to Java 21
   - Set Project language level to 21

3. **Configure Spring Boot**:
   - Run/Debug Configurations → Add New → Spring Boot
   - Set main class: `com.openframe.gateway.GatewayApplication`
   - Set working directory to project root
   - Add environment variables (see below)

#### Useful IDE Settings

```text
Code Style:
- Editor → Code Style → Java → Tabs and Indents
  - Use tab character: false
  - Tab size: 4
  - Indent: 4
  - Continuation indent: 8

Live Templates:
- @RestController class template
- @Service class template
- Test method templates
```

### Visual Studio Code (Recommended for Frontend)

VS Code is excellent for Vue.js, TypeScript, and general web development.

#### Installation

```bash
# macOS
brew install --cask visual-studio-code

# Or download from https://code.visualstudio.com/
```

#### Recommended Extensions

```json
{
  "recommendations": [
    "Vue.volar",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "GraphQL.vscode-graphql",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-azuretools.vscode-docker",
    "GitLab.gitlab-workflow",
    "GitHub.vscode-pull-request-github"
  ]
}
```

#### VS Code Configuration

Create `.vscode/settings.json` in project root:

```json
{
  "typescript.preferences.preferTypeOnlyAutoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "vue.complete.casing.tags": "kebab",
  "vue.complete.casing.props": "camel",
  "emmet.includeLanguages": {
    "vue": "html"
  },
  "files.associations": {
    "*.vue": "vue"
  }
}
```

## Development Tools

### Java Development

#### Maven Configuration

Create or update `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <localRepository>${user.home}/.m2/repository</localRepository>
  
  <profiles>
    <profile>
      <id>development</id>
      <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <maven.compiler.release>21</maven.compiler.release>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>development</activeProfile>
  </activeProfiles>
</settings>
```

#### Java Memory Settings

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Java memory settings for development
export JAVA_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC -XX:+UseStringDeduplication"
export MAVEN_OPTS="-Xmx2g -Xms1g"
```

### Frontend Development

#### Node.js Version Management

Use nvm (Node Version Manager) for managing Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify versions
node --version  # v18.x.x
npm --version   # 9.x.x
```

#### Global npm Packages

Install useful global packages:

```bash
npm install -g \
  @vue/cli \
  @vueuse/cli \
  typescript \
  eslint \
  prettier \
  npm-check-updates \
  serve \
  http-server
```

### Database Tools

#### MongoDB Compass

Visual MongoDB management tool:

```bash
# macOS
brew install --cask mongodb-compass

# Or download from https://www.mongodb.com/products/compass
```

#### Redis CLI

Command-line Redis client:

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt install redis-tools

# Connect to local Redis
redis-cli -h localhost -p 6379
```

#### Cassandra Tools

CQL shell for Cassandra:

```bash
# Install cqlsh
pip install cqlsh

# Connect to local Cassandra
cqlsh localhost 9042
```

### API Development Tools

#### HTTPie

Modern command-line HTTP client:

```bash
# Install
pip install httpie

# Example usage
http GET http://localhost:8080/api/health
http POST http://localhost:8080/graphql query='{ organizations { edges { node { id name } } } }'
```

#### Postman

GUI API testing tool:

1. Download from https://www.postman.com/
2. Import OpenFrame API collection (if available)
3. Set up environment variables for local development

### Docker Development

#### Docker Desktop

```bash
# macOS
brew install --cask docker

# Or download from https://www.docker.com/products/docker-desktop
```

#### Docker Compose

Ensure Docker Compose v2 is available:

```bash
# Check version
docker-compose --version

# Should be 2.0.0 or higher
```

#### Useful Docker Aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Docker aliases
alias dc='docker-compose'
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dpsa='docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

## Environment Variables

### Development Environment File

Create `.env.local` in project root:

```bash
# Core Configuration
OPENFRAME_ENV=development
SPRING_PROFILES_ACTIVE=local,dev

# Service URLs
GATEWAY_URL=http://localhost:8080
API_URL=http://localhost:8081
AUTH_URL=http://localhost:8082
CLIENT_URL=http://localhost:8083
FRONTEND_URL=http://localhost:3000

# Database URLs
MONGODB_URI=mongodb://admin:password@localhost:27017/openframe_dev?authSource=admin
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
CASSANDRA_CONTACT_POINTS=localhost:9042
PINOT_BROKER_URL=http://localhost:8099

# Security Configuration
JWT_SECRET=dev-secret-key-change-in-production
JWT_ISSUER=http://localhost:8082
OAUTH_CLIENT_ID=openframe-dev
OAUTH_CLIENT_SECRET=dev-secret

# Kafka Topics
KAFKA_TOPIC_DEVICES=openframe.devices.dev
KAFKA_TOPIC_EVENTS=openframe.events.dev
KAFKA_TOPIC_LOGS=openframe.logs.dev

# Debug Configuration
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY=TRACE

# Performance Tuning
OPENFRAME_CACHE_ENABLED=true
OPENFRAME_METRICS_ENABLED=true
OPENFRAME_TRACING_ENABLED=false
```

### Shell Environment Setup

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# OpenFrame Development Environment
export OPENFRAME_DEV_HOME="$HOME/workspace/openframe-oss-tenant"
export PATH="$OPENFRAME_DEV_HOME/scripts:$PATH"

# Load development environment variables
if [ -f "$OPENFRAME_DEV_HOME/.env.local" ]; then
  export $(grep -v '^#' "$OPENFRAME_DEV_HOME/.env.local" | xargs)
fi

# Java Development
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"  # Linux
# export JAVA_HOME="/usr/local/opt/openjdk@21"    # macOS
export PATH="$JAVA_HOME/bin:$PATH"

# Maven Configuration
export MAVEN_HOME="/usr/local/maven"
export PATH="$MAVEN_HOME/bin:$PATH"

# Node.js Development
export PATH="$HOME/.nvm/versions/node/v18.x.x/bin:$PATH"

# Rust Development (if building client)
export PATH="$HOME/.cargo/bin:$PATH"

# Development Aliases
alias of-start='cd $OPENFRAME_DEV_HOME && ./scripts/run-mac.sh'
alias of-stop='pkill -f "openframe" || true'
alias of-logs='cd $OPENFRAME_DEV_HOME && tail -f logs/*.log'
alias of-build='cd $OPENFRAME_DEV_HOME && mvn clean install -DskipTests'
alias of-test='cd $OPENFRAME_DEV_HOME && mvn test'
alias of-frontend='cd $OPENFRAME_DEV_HOME/openframe/services/openframe-frontend && npm run dev'
```

### IDE Environment Variables

#### IntelliJ IDEA Run Configuration

In Run/Debug Configurations → Environment Variables:

```text
OPENFRAME_ENV=development
SPRING_PROFILES_ACTIVE=local,dev
MONGODB_URI=mongodb://admin:password@localhost:27017/openframe_dev?authSource=admin
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
JWT_SECRET=dev-secret-key-change-in-production
JWT_ISSUER=http://localhost:8082
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
```

#### VS Code Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Frontend Dev Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
      "args": ["--host", "0.0.0.0"],
      "env": {
        "NODE_ENV": "development",
        "VITE_API_URL": "http://localhost:8080",
        "VITE_WS_URL": "ws://localhost:8080"
      }
    }
  ]
}
```

## Performance Optimization

### JVM Tuning

For development, add to IDE VM options:

```text
-Xmx4g
-Xms2g
-XX:+UseG1GC
-XX:+UseStringDeduplication
-XX:+EnableDynamicAgentLoading
-Dspring.devtools.restart.enabled=true
-Dspring.devtools.livereload.enabled=true
-Djava.awt.headless=true
```

### Database Configuration

#### MongoDB Development Settings

```javascript
// Connect to MongoDB and configure for development
use openframe_dev;

// Enable profiling for slow queries
db.setProfilingLevel(2, { slowms: 100 });

// Create useful indexes
db.devices.createIndex({ "organizationId": 1, "status": 1 });
db.events.createIndex({ "timestamp": -1, "organizationId": 1 });
db.users.createIndex({ "email": 1 }, { unique: true });
```

#### Redis Development Configuration

```bash
# Connect to Redis and set up development keys
redis-cli

# Set up development cache with longer TTL
SET development:cache:enabled "true"
SET development:cache:ttl "3600"
```

### Frontend Development Server

#### Vite Configuration

Update `vite.config.ts` for development:

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/graphql': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
  },
})
```

## Troubleshooting

### Common Issues

#### Java Version Conflicts

```bash
# Check all Java installations
/usr/libexec/java_home -V  # macOS
update-alternatives --list java  # Linux

# Set specific version
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

#### Port Conflicts

```bash
# Find process using port 8080
lsof -i :8080
netstat -tulpn | grep 8080

# Kill process
kill -9 <PID>
```

#### Node.js Module Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update packages
npm update
```

#### Database Connection Issues

```bash
# Test MongoDB connection
mongosh mongodb://admin:password@localhost:27017/openframe_dev

# Test Redis connection
redis-cli ping

# Test Kafka connection
kafka-console-consumer --bootstrap-server localhost:9092 --topic test --from-beginning
```

### Debug Configurations

#### Enable Debug Logging

```yaml
# application-local.yml
logging:
  level:
    com.openframe: DEBUG
    org.springframework.security: TRACE
    org.springframework.web: DEBUG
    org.mongodb.driver: DEBUG
```

#### JVM Debug Options

```bash
# Enable remote debugging
export JAVA_OPTS="$JAVA_OPTS -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
```

## Next Steps

Now that your development environment is set up:

1. **Follow the [Local Development Guide](local-development.md)** to start all services
2. **Review the [Architecture Overview](../architecture/overview.md)** to understand the system
3. **Check the [Testing Overview](../testing/overview.md)** to learn about testing practices
4. **Read the [Contributing Guidelines](../contributing/guidelines.md)** before making changes

---

**Environment setup complete!** You're ready to start developing with OpenFrame.