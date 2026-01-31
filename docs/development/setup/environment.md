# Development Environment Setup

This guide walks you through configuring your development environment for OpenFrame development, including IDE setup, debugging tools, and essential extensions.

## IDE Configuration

### IntelliJ IDEA Ultimate (Recommended for Java)

IntelliJ IDEA provides the best experience for OpenFrame's Java services with comprehensive Spring Boot support.

#### Installation and Setup

```bash
# Download IntelliJ IDEA Ultimate
# Visit: https://www.jetbrains.com/idea/download/
# Note: Ultimate edition required for Spring Boot advanced features

# Alternative: Install via package manager
# macOS
brew install --cask intellij-idea

# Ubuntu/Debian
sudo snap install intellij-idea-ultimate --classic
```

#### Required Plugins

Navigate to **File** → **Settings** → **Plugins** and install:

| Plugin | Purpose | Essential |
|--------|---------|-----------|
| **Spring Boot** | Spring framework support | ✅ Required |
| **GraphQL** | GraphQL schema and query support | ✅ Required |
| **Docker** | Container management | ✅ Required |
| **Kubernetes** | K8s manifest editing | Recommended |
| **Database Tools** | MongoDB, Cassandra support | Recommended |
| **Maven Helper** | Dependency analysis | Recommended |

#### Project Import Configuration

1. **Open OpenFrame Project**:
   ```bash
   # Clone repository
   git clone https://github.com/flamingo-run/openframe.git
   cd openframe
   
   # Open in IntelliJ
   idea .  # or File → Open → select openframe directory
   ```

2. **Configure Project Structure**:
   - **File** → **Project Structure**
   - **Project SDK**: Select Java 21
   - **Language Level**: 21 - Pattern matching for switch
   - **Compiler Output**: `./target`

3. **Maven Configuration**:
   - **File** → **Settings** → **Build Tools** → **Maven**
   - **Maven Home Directory**: Use bundled Maven or specify system Maven
   - **User Settings File**: `~/.m2/settings.xml`
   - **Import**: Enable auto-import for Maven projects

#### Spring Boot Run Configurations

Create run configurations for each service:

```yaml
# openframe-api service
Main Class: com.openframe.api.ApiApplication
VM Options: -Xmx2g -Dspring.profiles.active=development
Program Arguments: --server.port=8081
Environment Variables: 
  - MONGODB_URI=mongodb://localhost:27017/openframe
  - REDIS_URL=redis://localhost:6379
```

```yaml
# openframe-gateway service  
Main Class: com.openframe.gateway.GatewayApplication
VM Options: -Xmx1g -Dspring.profiles.active=development
Program Arguments: --server.port=8080
Environment Variables:
  - API_SERVICE_URL=http://localhost:8081
```

### WebStorm (Recommended for Frontend)

WebStorm provides excellent Vue.js and TypeScript support for the OpenFrame frontend.

#### Installation and Configuration

```bash
# Download WebStorm
# Visit: https://www.jetbrains.com/webstorm/download/

# macOS installation
brew install --cask webstorm

# Ubuntu/Debian installation  
sudo snap install webstorm --classic
```

#### Essential Plugins

| Plugin | Purpose | Essential |
|--------|---------|-----------|
| **Vue.js** | Vue 3 support and templates | ✅ Required |
| **GraphQL** | GraphQL query development | ✅ Required |
| **Tailwind CSS** | Utility class autocomplete | ✅ Required |
| **Prettier** | Code formatting | Recommended |
| **ESLint** | JavaScript linting | Recommended |

#### Project Configuration

1. **Open Frontend Project**:
   ```bash
   cd openframe/services/openframe-frontend
   webstorm .
   ```

2. **Configure Node.js Interpreter**:
   - **File** → **Settings** → **Languages & Frameworks** → **Node.js**
   - **Node Interpreter**: Select Node.js 18+ installation
   - **Package Manager**: npm (recommended)

3. **TypeScript Configuration**:
   - **File** → **Settings** → **Languages & Frameworks** → **TypeScript**
   - **TypeScript Service**: Enable
   - **Compiler**: Use TypeScript from `node_modules`

4. **Vue.js Configuration**:
   - **File** → **Settings** → **Languages & Frameworks** → **Vue.js**
   - **Source**: `src` directory
   - **Templates**: Enable Vue 3 Composition API support

### Visual Studio Code (Alternative)

VS Code provides excellent cross-language support for the entire OpenFrame stack.

#### Installation and Extensions

```bash
# Install VS Code
# macOS
brew install --cask visual-studio-code

# Ubuntu/Debian
sudo apt update
sudo apt install code
```

#### Essential Extensions

```json
{
  "recommendations": [
    // Java Development
    "vscjava.vscode-java-pack",
    "vmware.vscode-spring-boot",
    "gabrielbb.vscode-lombok",
    
    // Frontend Development  
    "vue.volar",
    "bradlc.vscode-tailwindcss",
    "graphql.vscode-graphql",
    "esbenp.prettier-vscode",
    
    // Rust Development
    "rust-lang.rust-analyzer",
    "vadimcn.vscode-lldb",
    
    // DevOps
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    
    // General
    "eamodio.gitlens",
    "ms-vscode.vscode-json"
  ]
}
```

#### Workspace Configuration

Create `.vscode/settings.json`:

```json
{
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/usr/lib/jvm/java-21-openjdk"
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"]
  ],
  "rust-analyzer.cargo.features": "all"
}
```

## Development Tools Setup

### Git Configuration

Configure Git for OpenFrame development:

```bash
# Set global configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Configure OpenFrame-specific settings
cd openframe
git config core.autocrlf false  # Important for cross-platform development
git config pull.rebase true    # Prefer rebase over merge for pull

# Install Git hooks (optional)
# Enables pre-commit checks and automatic formatting
npm install -g @commitlint/cli @commitlint/config-conventional
```

### Database Tools

#### MongoDB Compass (GUI Tool)

```bash
# Install MongoDB Compass
# macOS
brew install --cask mongodb-compass

# Ubuntu/Debian
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# Windows
# Download from: https://www.mongodb.com/try/download/compass
```

**Connection String**: `mongodb://localhost:27017/openframe`

#### Redis Insight (Redis GUI)

```bash
# Install Redis Insight
# All platforms: https://redis.com/redis-enterprise/redis-insight/

# macOS
brew install --cask redis-insight

# Ubuntu/Debian
wget https://download.redisinsight.redis.com/latest/Redis-Insight-linux-x64.AppImage
chmod +x Redis-Insight-linux-x64.AppImage
```

**Connection**: Host: `localhost`, Port: `6379`

#### DBeaver (Multi-Database Tool)

For Cassandra and general database management:

```bash
# Install DBeaver Community
# macOS
brew install --cask dbeaver-community

# Ubuntu/Debian
sudo snap install dbeaver-ce

# Configure Cassandra Connection:
# Host: localhost
# Port: 9042
# Keyspace: openframe
```

### Container Management

#### Docker Desktop

Essential for running OpenFrame's infrastructure services:

```bash
# macOS
brew install --cask docker

# Ubuntu (Docker Engine)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout and login again

# Windows
# Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
```

**Configuration**:
- **Memory**: Allocate at least 8GB for OpenFrame development
- **CPUs**: Use all available CPU cores
- **Disk**: Reserve 100GB+ for images and volumes

#### K9s (Kubernetes Management)

For managing Kubernetes deployments:

```bash
# Install k9s
# macOS
brew install k9s

# Ubuntu/Debian
curl -sS https://webinstall.dev/k9s | bash

# Usage
k9s  # Launch interactive Kubernetes management
```

### API Development Tools

#### GraphQL Playground

Access the built-in playground:
- **URL**: http://localhost:8080/graphql
- **Headers**: Configure authentication tokens
- **Schema**: Auto-loaded from running services

#### Postman (REST API Testing)

```bash
# Install Postman
# macOS
brew install --cask postman

# Ubuntu/Debian
sudo snap install postman
```

**Import OpenFrame Collection**:
1. Download collection: `scripts/postman/OpenFrame.postman_collection.json`
2. Import into Postman
3. Configure environment variables for local development

#### Insomnia (Alternative API Client)

```bash
# Install Insomnia
# macOS
brew install --cask insomnia

# Ubuntu/Debian
sudo snap install insomnia
```

## Environment Variables Configuration

### Development Environment File

Create `.env.development` in the project root:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
CASSANDRA_HOSTS=localhost:9042

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081

# Application Configuration
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=DEBUG
JWT_SECRET=development-secret-key-change-in-production
ENCRYPTION_KEY=development-key-32-characters!!

# GitHub Integration
GITHUB_TOKEN=your_github_token_here

# External Services (Optional)
TACTICAL_RMM_URL=http://localhost:8001
MESHCENTRAL_URL=http://localhost:8002
FLEET_MDM_URL=http://localhost:8003

# Performance Tuning
JAVA_OPTS=-Xmx2g -Xms1g -XX:+EnableDynamicAgentLoading
NODE_OPTIONS=--max-old-space-size=4096

# Development Features
SPRING_DEVTOOLS_RESTART_ENABLED=true
VITE_HMR_PORT=3001
```

### Shell Configuration

Add to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# OpenFrame Development Aliases
alias of-build='mvn clean install -DskipTests'
alias of-test='mvn test'
alias of-api='cd openframe/services/openframe-api && mvn spring-boot:run'
alias of-gateway='cd openframe/services/openframe-gateway && mvn spring-boot:run'
alias of-frontend='cd openframe/services/openframe-frontend && npm run dev'
alias of-client='cd clients/openframe-client && cargo run'

# Docker aliases
alias of-infra='docker compose -f docker-compose.infrastructure.yml up -d'
alias of-logs='docker compose logs -f'
alias of-down='docker compose down'

# Development environment
export OPENFRAME_HOME="$HOME/projects/openframe"
export PATH="$OPENFRAME_HOME/scripts:$PATH"
```

## IDE-Specific Configuration

### IntelliJ IDEA Advanced Setup

#### Code Style Configuration

Import OpenFrame code style:

1. **File** → **Settings** → **Editor** → **Code Style**
2. **Import Scheme** → **IntelliJ IDEA code style XML**
3. Select: `scripts/ide/intellij/openframe-code-style.xml`

#### Live Templates

Create live templates for common patterns:

```xml
<!-- Spring Boot Service Template -->
<template name="ofservice" value="
@Service
@RequiredArgsConstructor
@Slf4j
public class $CLASS_NAME$ {
    
    private final $REPOSITORY$ $repository$;
    
    public $RETURN_TYPE$ $METHOD_NAME$($PARAM_TYPE$ $param$) {
        log.debug(&quot;$METHOD_NAME$ called with: {}&quot;, $param$);
        return $repository$.$repository_method$($param$);
    }
}
"/>

<!-- GraphQL DataFetcher Template -->
<template name="ofdatafetcher" value="
@DgsComponent
@RequiredArgsConstructor
@Slf4j
public class $CLASS_NAME$DataFetcher {
    
    private final $SERVICE$ $service$;
    
    @DgsQuery
    public $RETURN_TYPE$ $query_name$(DataFetchingEnvironment env) {
        log.debug(&quot;Executing $query_name$ query&quot;);
        return $service$.$method_name$();
    }
}
"/>
```

#### Debugging Configuration

Create debug configurations with environment-specific profiles:

```yaml
# Development Debug Configuration
VM Options: |
  -Xdebug
  -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005
  -Dspring.profiles.active=development
  -Dlogging.level.com.openframe=DEBUG
  
Environment Variables:
  MONGODB_URI: mongodb://localhost:27017/openframe-dev
  REDIS_URL: redis://localhost:6379/1
  JWT_SECRET: development-debug-secret
```

### WebStorm Advanced Setup

#### Vue.js Debugging

Configure Chrome debugging for Vue.js:

1. **Run** → **Edit Configurations** → **Add** → **JavaScript Debug**
2. **URL**: `http://localhost:3000`
3. **Browser**: Chrome
4. **Ensure source maps**: `npm run dev -- --sourcemap`

#### TypeScript Configuration

Enhance `tsconfig.json` for development:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ]
}
```

## Performance Optimization

### JVM Tuning for Development

Configure JVM options for optimal development performance:

```bash
# In your IDE or startup scripts
export JAVA_OPTS="
  -Xmx4g
  -Xms2g
  -XX:+UseG1GC
  -XX:G1HeapRegionSize=16m
  -XX:+EnableDynamicAgentLoading
  -XX:+UnlockExperimentalVMOptions
  -XX:+UseJVMCICompiler
  -Dspring.jmx.enabled=false
  -Dspring.output.ansi.enabled=ALWAYS
"
```

### Node.js Memory Settings

```bash
# For frontend development
export NODE_OPTIONS="--max-old-space-size=8192 --inspect"

# For build processes
export NODE_OPTIONS="--max-old-space-size=16384"
```

### Docker Development Optimization

Create `docker-compose.development.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7-jammy
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data_dev:/data/db
    command: mongod --wiredTigerCacheSizeGB 2
    
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data_dev:/data
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru

volumes:
  mongodb_data_dev:
  redis_data_dev:
```

## Troubleshooting Development Environment

### Common IDE Issues

#### IntelliJ IDEA Problems

```bash
# Clear IntelliJ caches
# File → Invalidate Caches and Restart

# Fix Maven import issues
mvn clean install -U
# Then: Right-click pom.xml → Maven → Reload Project

# Fix Spring Boot detection
# File → Project Structure → Modules
# Ensure Spring facet is added to modules
```

#### WebStorm Issues

```bash
# Clear WebStorm caches
# File → Invalidate Caches and Restart

# Fix TypeScript service
# File → Settings → TypeScript → Restart TypeScript Service

# Node.js modules not recognized
rm -rf node_modules package-lock.json
npm install
```

### Build Environment Issues

#### Java Version Conflicts

```bash
# Check Java versions
java --version
javac --version
mvn --version

# Set JAVA_HOME explicitly
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$JAVA_HOME/bin:$PATH"

# Verify correct version
which java
java --version
```

#### Maven Issues

```bash
# Clear local repository
rm -rf ~/.m2/repository

# Force update dependencies
mvn clean install -U

# Skip tests for faster builds
mvn clean install -DskipTests
```

#### Node.js Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Update npm itself
npm install -g npm@latest
```

### Memory and Performance Issues

#### Insufficient Memory

```bash
# Check system memory
free -h

# Monitor Java heap usage
jcmd <java-pid> GC.run_finalization
jcmd <java-pid> VM.memory

# Monitor Docker memory
docker stats

# Increase Docker memory allocation in Docker Desktop
# Settings → Resources → Memory → 16GB+
```

## Next Steps

Once your development environment is configured:

1. **Validate Setup**: Run the verification script in [Local Development](local-development.md)
2. **Clone and Build**: Follow the build process documentation
3. **Start Development**: Begin with a simple service modification
4. **Join Community**: Connect with other developers on OpenMSP Slack

> 💡 **Pro Tip**: Save your IDE configurations in version control by creating `scripts/ide/` directory with exported settings. This helps onboard new team members faster.

Your development environment is now configured for efficient OpenFrame development across Java, TypeScript, and Rust components. Continue with [Local Development](local-development.md) to start the platform locally.