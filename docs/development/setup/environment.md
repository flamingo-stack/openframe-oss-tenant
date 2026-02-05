# Development Environment Setup

This guide will help you configure a professional development environment for OpenFrame, including IDE setup, extensions, debugging tools, and development workflows.

> **Prerequisites**: Complete the [Quick Start Guide](../../getting-started/quick-start.md) and have OpenFrame running locally.

## IDE Configuration

### IntelliJ IDEA Setup (Recommended for Java Development)

IntelliJ IDEA provides the best experience for OpenFrame's Java microservices development.

#### Installation and Licensing

**Community Edition (Free):**
- Download from [JetBrains website](https://www.jetbrains.com/idea/download/)
- Includes all necessary features for OpenFrame development

**Ultimate Edition (Paid):**
- Enhanced Spring Boot support
- Database tools integration
- HTTP client tools
- Web development features

#### Essential Plugins

Install these plugins via **File → Settings → Plugins**:

| Plugin | Purpose | Required |
|--------|---------|----------|
| **Spring Boot** | Spring framework support | ✅ Yes |
| **Lombok** | Annotation processing | ✅ Yes |
| **GraphQL** | GraphQL schema and query support | ✅ Yes |
| **Docker** | Container management | ✅ Yes |
| **Kubernetes** | K8s manifest support | Recommended |
| **.env files support** | Environment variable files | Recommended |

#### IDE Configuration

**Java Settings:**
```text
File → Project Structure → Project Settings → Project
Project SDK: 21 (java version "21.0.x")
Project language level: 21 - Pattern matching for switch

File → Project Structure → Platform Settings → SDKs
Ensure Java 21 is configured with correct `$JAVA_HOME`
```

**Code Style:**
```text  
File → Settings → Editor → Code Style → Java
Scheme: Default
Tab size: 4
Indent: 4
Continuation indent: 8
☑ Use tab character: false
```

**Annotation Processing:**
```text
File → Settings → Build, Execution, Deployment → Compiler → Annotation Processors
☑ Enable annotation processing
Processor path: Use processor classpath
```

**Spring Boot Configuration:**
```text
File → Settings → Build, Execution, Deployment → Spring Boot
☑ Enable Spring Boot support
☑ Show profiles in gutter
```

#### Import OpenFrame Project

1. **Open IntelliJ IDEA**
2. **Select "Open"** and choose the `openframe-oss-tenant` directory  
3. **Wait for indexing** (this may take 5-10 minutes on first import)
4. **Configure Maven settings**:
   ```text
   File → Settings → Build, Execution, Deployment → Build Tools → Maven
   Maven home path: [path to your Maven installation]
   User settings file: ~/.m2/settings.xml
   ```

### Visual Studio Code Setup (Recommended for Frontend)

VS Code provides excellent TypeScript and Vue.js development experience.

#### Essential Extensions

Install these extensions via the Extensions panel (`Ctrl+Shift+X`):

**Frontend Development:**
- **Volar** (Vue Language Features) - Vue 3 support
- **TypeScript Importer** - Auto-import TypeScript modules  
- **GraphQL: Language Feature Support** - GraphQL syntax highlighting
- **Auto Rename Tag** - HTML/XML tag management
- **Bracket Pair Colorizer 2** - Visual bracket matching

**Full-Stack Development:**
- **Extension Pack for Java** - Complete Java development support
- **Spring Boot Extension Pack** - Spring framework tools
- **Docker** - Container management
- **Kubernetes** - K8s YAML support
- **REST Client** - API testing within VS Code

#### Workspace Configuration

Create `.vscode/settings.json` in the project root:

```json
{
  "typescript.preferences.quoteStyle": "single",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "vetur.validation.template": false,
  "vetur.validation.script": false,
  "vetur.validation.style": false,
  "java.home": "/path/to/java21",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java21"
    }
  ]
}
```

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Frontend Dev Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    },
    {
      "name": "Debug API Service",
      "type": "java",
      "request": "attach",
      "hostName": "localhost",
      "port": 5005
    }
  ]
}
```

## Development Tools Setup

### Database Management Tools

#### MongoDB Compass (Official GUI)

**Installation:**
- Download from [MongoDB website](https://www.mongodb.com/products/compass)
- Or install via package manager: `brew install mongodb-compass` (macOS)

**Connection Configuration:**
```text
Connection String: mongodb://localhost:27017
Database: openframe_development
```

**Useful Collections to Monitor:**
- `users` - User accounts and authentication
- `organizations` - Tenant organizations  
- `devices` - Managed devices and agents
- `integratedTools` - External tool configurations

#### Redis CLI and Desktop Manager

**Redis CLI:**
```bash
# Install redis-tools
brew install redis                    # macOS
sudo apt install redis-tools          # Ubuntu/Debian

# Connect to development Redis
redis-cli -h localhost -p 6379
127.0.0.1:6379> ping
PONG
```

**Redis Desktop Manager (Optional):**
- [RedisInsight](https://redis.com/redis-enterprise/redis-insight/) (Free, official)
- [Another Redis Desktop Manager](https://github.com/qishibo/AnotherRedisDesktopManager) (Open source)

### API Development Tools

#### GraphQL Playground

Access GraphQL Playground for API exploration:
- **URL**: http://localhost:8082/graphiql
- **Use cases**: Schema exploration, query testing, mutation development

**Example Queries:**
```graphql
# Get current user information
query GetMe {
  me {
    id
    name
    email
    organization {
      name
      slug
    }
  }
}

# List devices with pagination
query GetDevices($first: Int, $after: String) {
  devices(first: $first, after: $after) {
    edges {
      node {
        id
        name
        deviceType
        status
        lastSeen
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

#### Postman/Insomnia (REST API Testing)

**Postman Collection Setup:**
1. **Import OpenAPI spec** from http://localhost:8083/v3/api-docs
2. **Configure environment variables**:
   ```text
   base_url: http://localhost:8080
   auth_url: http://localhost:8081
   api_key: [your development API key]
   ```

### Container and Orchestration Tools

#### Docker Desktop Configuration

**Memory and CPU Settings:**
- **Memory**: 8GB minimum, 12GB+ recommended
- **CPU**: 4+ cores allocated
- **Disk Space**: 100GB+ for images and volumes

**Enable Features:**
- ☑ Kubernetes (if doing K8s development)
- ☑ Docker Compose V2
- ☑ Use containerd for pulling and storing images

#### K8s Development Tools (Optional)

**kubectl Configuration:**
```bash
# Verify kubectl installation
kubectl version --client

# Set up local context (if using Docker Desktop K8s)
kubectl config use-context docker-desktop

# Install Helm for chart management
brew install helm                     # macOS
# or download from https://helm.sh/docs/intro/install/
```

**K9s (Kubernetes TUI):**
```bash
# Install k9s for cluster management
brew install k9s                      # macOS
# or download from https://github.com/derailed/k9s
```

## Development Workflow Configuration

### Git Configuration

#### Git Hooks Setup

Create `.git/hooks/pre-commit` for code quality:

```bash
#!/bin/sh
# Pre-commit hook for OpenFrame

echo "Running pre-commit checks..."

# Check Java formatting
echo "Checking Java code formatting..."
cd openframe
mvn spotless:check
if [ $? -ne 0 ]; then
  echo "Java formatting issues found. Run 'mvn spotless:apply' to fix."
  exit 1
fi

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
cd services/openframe-frontend
npm run type-check
if [ $? -ne 0 ]; then
  echo "TypeScript compilation errors found."
  exit 1
fi

echo "Pre-commit checks passed!"
```

Make the hook executable:
```bash
chmod +x .git/hooks/pre-commit
```

#### Useful Git Aliases

Add these to your `~/.gitconfig`:

```ini
[alias]
    co = checkout
    br = branch
    ci = commit
    st = status
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
    
    # OpenFrame specific
    build-all = !mvn clean install -DskipTests
    quick-build = !mvn clean compile -DskipTests
    test-all = !mvn test
    frontend-dev = !cd openframe/services/openframe-frontend && npm run dev
```

### Environment Variables

#### Development Environment File

Create `.env.development` in project root:

```bash
# Development Environment Configuration

# Database URLs
MONGO_URL=mongodb://localhost:27017/openframe_development
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Service Ports
GATEWAY_PORT=8080
API_PORT=8082
AUTH_PORT=8081
MANAGEMENT_PORT=8083
CLIENT_PORT=8084
FRONTEND_PORT=3000

# Development Flags
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=DEBUG
ENABLE_CORS=true
DISABLE_CSRF=true

# Authentication
JWT_SECRET=development-secret-key-change-in-production
OAUTH_CLIENT_SECRET=development-oauth-secret

# External Integrations (optional for development)
FLEET_MDM_URL=https://fleet.example.com
TACTICAL_RMM_URL=https://tactical.example.com
MESHCENTRAL_URL=https://mesh.example.com
```

#### Shell Profile Configuration

Add to your `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# OpenFrame Development Environment
export OPENFRAME_HOME=~/projects/openframe-oss-tenant
export JAVA_HOME=/path/to/java21
export MAVEN_HOME=/path/to/maven
export NODE_VERSION=18

# Development aliases
alias of-start='cd $OPENFRAME_HOME && ./scripts/run-mac.sh --silent'
alias of-build='cd $OPENFRAME_HOME && mvn clean install -DskipTests'
alias of-test='cd $OPENFRAME_HOME && mvn test'
alias of-frontend='cd $OPENFRAME_HOME/openframe/services/openframe-frontend && npm run dev'
alias of-logs='cd $OPENFRAME_HOME && tail -f logs/*.log'

# Quick navigation
alias of='cd $OPENFRAME_HOME'
alias of-api='cd $OPENFRAME_HOME/openframe/services/openframe-api'
alias of-gateway='cd $OPENFRAME_HOME/openframe/services/openframe-gateway'
alias of-ui='cd $OPENFRAME_HOME/openframe/services/openframe-frontend'
```

## Debugging Configuration

### Java Service Debugging

#### IntelliJ IDEA Debug Configuration

1. **Create Remote Debug Configuration**:
   ```text
   Run → Edit Configurations → Add New → Remote JVM Debug
   Name: Debug API Service
   Host: localhost
   Port: 5005
   Use module classpath: openframe-api
   ```

2. **Start service with debug enabled**:
   ```bash
   cd openframe/services/openframe-api
   mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
   ```

3. **Attach debugger** in IntelliJ and set breakpoints

#### Debug Configuration for All Services

Create `debug-all-services.sh` script:

```bash
#!/bin/bash
# Start all services with debug ports

echo "Starting OpenFrame services with debugging enabled..."

# API Gateway - Debug port 5001
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5001" &

# API Service - Debug port 5005  
cd ../openframe-api
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005" &

# Add other services as needed...

echo "All services started with debugging. Attach to ports 5001-500x"
```

### Frontend Debugging

#### Vue.js DevTools

1. **Install browser extension**:
   - [Chrome](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

2. **Enable in development**:
   ```javascript
   // vite.config.ts is already configured for Vue DevTools
   app.config.devtools = true
   ```

#### Browser Debugging

**Chrome DevTools:**
- Open localhost:3000
- Press F12 or right-click → Inspect
- Use **Sources** tab for breakpoints in TypeScript code
- Use **Network** tab to monitor GraphQL requests
- Use **Application** tab to inspect localStorage and cookies

## Performance Monitoring

### Development Profiling

#### JVM Profiling

**JProfiler Integration** (if available):
```bash
# Start with profiling agent
java -agentpath:/path/to/jprofiler/bin/linux-x64/libjprofilerti.so=port=8849 -jar target/service.jar
```

**Built-in JVM Monitoring:**
```bash
# Monitor JVM memory and threads
jcmd <pid> VM.info
jcmd <pid> GC.run_finalization
jhat dump.hprof  # Analyze heap dumps
```

#### Frontend Performance

**Vue Performance Analysis:**
- Use Vue DevTools **Performance** tab
- Monitor component render times
- Analyze Pinia store performance
- Check bundle size with `npm run build --report`

**Browser Performance:**
- Chrome DevTools **Performance** tab
- **Lighthouse** audits for web vitals
- **Memory** tab for memory leak detection

### Production-Like Testing

#### Load Testing Setup

Create `k6-load-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 10 },  // Ramp up
    { duration: '10m', target: 10 }, // Stay at 10 users
    { duration: '5m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const response = http.get('http://localhost:8080/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

Run with:
```bash
k6 run k6-load-test.js
```

## Troubleshooting Development Environment

### Common Issues

**Java version conflicts:**
```bash
# Check active Java version
java -version
javac -version

# Set JAVA_HOME explicitly
export JAVA_HOME=/path/to/java21
```

**Maven dependency issues:**
```bash
# Clear local repository and reinstall
rm -rf ~/.m2/repository
mvn clean install -U
```

**Node.js/npm issues:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

**Docker/Database connectivity:**
```bash
# Verify Docker services
docker compose ps
docker compose logs mongodb

# Reset Docker state
docker compose down
docker system prune -f
docker compose up -d
```

## Next Steps

With your development environment configured, you're ready to:

1. **[Local Development Guide](local-development.md)** - Advanced development workflows and debugging
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
3. **[Testing Overview](../testing/overview.md)** - Learn testing strategies and tools
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Contribute to OpenFrame

---

**Need help?** Join our OpenMSP Slack community: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA