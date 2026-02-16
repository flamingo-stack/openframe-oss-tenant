# Development Environment Setup

This guide will help you set up a productive development environment for OpenFrame. Follow these steps to configure your IDE, install required extensions, and optimize your development workflow.

## IDE Recommendations

### Primary: Visual Studio Code

Visual Studio Code is the recommended IDE for full-stack OpenFrame development, providing excellent support for both Java/Spring Boot and React/TypeScript.

**Download**: [Visual Studio Code](https://code.visualstudio.com/)

#### Required Extensions

Install these essential extensions for OpenFrame development:

**Java Development:**
```text
Extension Pack for Java (Microsoft)
├── Language Support for Java (Red Hat)
├── Debugger for Java (Microsoft)  
├── Test Runner for Java (Microsoft)
├── Maven for Java (Microsoft)
├── Project Manager for Java (Microsoft)
└── IntelliCode (Microsoft)
```

**Spring Boot:**
```text
Spring Boot Extension Pack (VMware)
├── Spring Boot Tools (VMware)
├── Spring Initializr Java Support (Microsoft)
└── Spring Boot Dashboard (Microsoft)
```

**Frontend Development:**
```text
React/TypeScript Extensions:
├── ES7+ React/Redux/React-Native snippets
├── TypeScript Importer
├── Auto Rename Tag
├── Bracket Pair Colorizer
├── Prettier - Code formatter
└── ESLint
```

**General Productivity:**
```text
Development Tools:
├── GitLens — Git supercharged
├── Docker (Microsoft)
├── Kubernetes (Microsoft)
├── REST Client
├── Thunder Client (API testing)
└── Error Lens
```

#### VSCode Configuration

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
  "java.compile.nullAnalysis.mode": "automatic",
  "java.saveActions.organizeImports": true,
  "java.format.settings.url": ".vscode/java-formatter.xml",
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": "explicit",
    "source.fixAll.eslint": "explicit"
  },
  "files.associations": {
    "*.properties": "properties",
    "*.yml": "yaml",
    "*.yaml": "yaml"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  }
}
```

#### Launch Configuration

Create `.vscode/launch.json` for debugging:

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
      "args": "",
      "vmArgs": "-Dspring.profiles.active=dev"
    },
    {
      "type": "java", 
      "name": "OpenFrame Gateway",
      "request": "launch",
      "mainClass": "com.openframe.gateway.GatewayApplication",
      "projectName": "openframe-gateway",
      "vmArgs": "-Dspring.profiles.active=dev"
    },
    {
      "type": "node",
      "name": "Next.js Frontend",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/next/dist/bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "console": "integratedTerminal"
    }
  ]
}
```

### Alternative: IntelliJ IDEA

For Java-focused development, IntelliJ IDEA provides superior Java tooling:

**Download**: [IntelliJ IDEA](https://www.jetbrains.com/idea/)

#### Required Plugins

- **Spring Boot** (built-in in Ultimate)
- **Docker** integration
- **Database Tools and SQL** 
- **Kubernetes** support
- **GraphQL** syntax support
- **Lombok** plugin

#### IDEA Configuration

Configure IntelliJ for OpenFrame:

1. **Project SDK**: Set to Java 21
2. **Build Tools**: Enable Maven auto-import
3. **Code Style**: Import OpenFrame formatting rules
4. **Run Configurations**: Set up Spring Boot run configs

## Environment Variables

Set up development environment variables for consistent configuration across services.

### Global Environment Setup

Create `~/.openframe/dev.env`:

```bash
# Java Configuration
export JAVA_HOME=/path/to/java-21
export MAVEN_OPTS="-Xmx2g -XX:ReservedCodeCacheSize=1g"

# Spring Profiles
export SPRING_PROFILES_ACTIVE=dev,local

# Database Configuration  
export MONGODB_URI=mongodb://localhost:27017/openframe-dev
export REDIS_URI=redis://localhost:6379
export CASSANDRA_CONTACT_POINTS=127.0.0.1:9042

# Kafka Configuration
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081

# NATS Configuration
export NATS_URL=nats://localhost:4222

# Development Flags
export DEBUG_MODE=true
export LOG_LEVEL=DEBUG
export ENABLE_ACTUATOR_ENDPOINTS=true

# API Keys (for development)
export OPENFRAME_JWT_SECRET=development-secret-key
export OPENFRAME_API_KEY=dev-api-key
```

Load these in your shell profile (`~/.zshrc`, `~/.bashrc`):

```bash
# Load OpenFrame development environment
if [ -f ~/.openframe/dev.env ]; then
    source ~/.openframe/dev.env
fi
```

### Service-Specific Configuration

#### API Service Development
```bash
export OPENFRAME_API_PORT=8081
export OPENFRAME_API_DEBUG=true
export GRAPHQL_PLAYGROUND_ENABLED=true
```

#### Gateway Service Development  
```bash
export OPENFRAME_GATEWAY_PORT=8080
export CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
export JWT_COOKIE_SECURE=false
```

#### Frontend Development
```bash
export NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
export NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1
```

## Development Database Setup

### MongoDB Development Instance

Run MongoDB with development-friendly configuration:

```bash
# Using Docker (Recommended)
docker run -d \
  --name openframe-mongodb-dev \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -e MONGO_INITDB_DATABASE=openframe \
  -v openframe-mongodb-data:/data/db \
  mongo:7

# Create development database
docker exec -it openframe-mongodb-dev mongosh
```

```javascript
// In MongoDB shell
use openframe;
db.createUser({
  user: "openframe",
  pwd: "dev-password",
  roles: [
    { role: "readWrite", db: "openframe" }
  ]
});
```

### Redis Development Instance

```bash
# Using Docker
docker run -d \
  --name openframe-redis-dev \
  -p 6379:6379 \
  redis:7-alpine
```

### Kafka Development Setup

```bash
# Using Docker Compose (in project root)
docker compose -f integrated-tools/kafka/docker-compose.dev.yml up -d
```

## Development Scripts and Aliases

Add these helpful aliases to your shell configuration:

```bash
# OpenFrame Development Aliases
alias of-build='mvn clean install -DskipTests'
alias of-test='mvn test'
alias of-run='./scripts/run-mac.sh'
alias of-logs='docker compose -f integrated-tools/docker-compose.yml logs -f'
alias of-clean='mvn clean && docker system prune -f'

# Service-specific aliases
alias of-api='cd openframe/services/openframe-api && mvn spring-boot:run'
alias of-gateway='cd openframe/services/openframe-gateway && mvn spring-boot:run'
alias of-frontend='cd openframe/services/openframe-frontend && npm run dev'

# Database aliases
alias of-mongo='docker exec -it openframe-mongodb-dev mongosh'
alias of-redis='docker exec -it openframe-redis-dev redis-cli'

# Container management
alias of-up='docker compose -f integrated-tools/docker-compose.yml up -d'
alias of-down='docker compose -f integrated-tools/docker-compose.yml down'
alias of-restart='of-down && of-up'
```

## Git Configuration

### Git Hooks Setup

Install pre-commit hooks for code quality:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
cd openframe-oss-tenant
pre-commit install
```

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-merge-conflict
  
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3
  
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.44.0
    hooks:
      - id: eslint
        files: \.(js|ts|jsx|tsx)$
        additional_dependencies:
          - eslint@^8.44.0
          - typescript@^5.0.0
```

### Git Configuration

```bash
# Set up Git for OpenFrame development
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set up helpful Git aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

## Development Workflow Tools

### API Development and Testing

#### GraphQL Playground
Access GraphQL Playground at: `http://localhost:8081/graphql`

#### REST Client Configuration  
Create `api-tests.http` file:

```http
### Health Check
GET http://localhost:8080/health

### GraphQL Query
POST http://localhost:8081/graphql
Content-Type: application/json

{
  "query": "{ devices { id name status } }"
}

### API Authentication
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

### Database Development Tools

#### MongoDB Compass
Download [MongoDB Compass](https://www.mongodb.com/products/compass) for visual database exploration.

Connection string: `mongodb://admin:password@localhost:27017/openframe`

#### Redis Insight  
Download [RedisInsight](https://redis.com/redis-enterprise/redis-insight/) for Redis development.

Connection: `localhost:6379`

### Container and Kubernetes Development

#### Docker Desktop Extensions
- **Kubernetes** dashboard
- **Volumes** management  
- **Container** logs and metrics

#### kubectl Configuration
```bash
# Set up local Kubernetes context
kubectl config set-context openframe-dev \
  --cluster=docker-desktop \
  --user=docker-desktop \
  --namespace=openframe-dev
  
kubectl config use-context openframe-dev
```

## Development Performance Optimization

### Java Development Optimization

```bash
# Optimize Maven builds
export MAVEN_OPTS="-Xmx4g -XX:ReservedCodeCacheSize=1g -XX:+UseG1GC"

# Enable parallel builds
alias mvn-fast='mvn -T 1C'
```

### Node.js Development Optimization

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable faster npm installs
npm config set registry https://registry.npmjs.org/
npm config set prefer-online true
```

### IDE Performance Tuning

#### VSCode Optimization
Add to `settings.json`:

```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/target/**": true,
    "**/.git/objects/**": true,
    "**/build/**": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/build": true
  }
}
```

## Troubleshooting Development Environment

### Common Java Issues

**Problem**: `JAVA_HOME` not set correctly  
**Solution**:
```bash
# macOS
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Linux
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk

# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-21
```

**Problem**: Maven out of memory during builds  
**Solution**:
```bash
export MAVEN_OPTS="-Xmx4g -XX:ReservedCodeCacheSize=1g"
```

### Common Node.js Issues

**Problem**: Node.js version conflicts  
**Solution**: Use Node Version Manager:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 18
nvm install 18
nvm use 18
nvm alias default 18
```

**Problem**: npm permission errors  
**Solution**:
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Common Docker Issues

**Problem**: Docker daemon not running  
**Solution**: Start Docker Desktop or run:
```bash
# Linux
sudo systemctl start docker

# macOS
open /Applications/Docker.app
```

**Problem**: Docker out of disk space  
**Solution**:
```bash
# Clean up Docker resources
docker system prune -af
docker volume prune -f
```

## Next Steps

Once your development environment is configured:

1. 🏗️ **[Local Development Guide](local-development.md)** - Learn the development workflow
2. 🏛️ **[Architecture Overview](../architecture/README.md)** - Understand the system design  
3. 🧪 **[Testing Guide](../testing/README.md)** - Set up testing workflows
4. 🤝 **[Contributing Guidelines](../contributing/guidelines.md)** - Learn the contribution process

---

**Environment ready?** You're all set to start developing with OpenFrame! 🚀