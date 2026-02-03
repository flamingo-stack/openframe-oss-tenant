# Development Environment Setup

This guide walks you through setting up a complete OpenFrame development environment on your local machine. After following this guide, you'll be able to develop, test, and debug all OpenFrame components.

## Prerequisites Verification

Before proceeding, ensure all [prerequisites](../../getting-started/prerequisites.md) are installed and working:

```bash
# Verify Java 21+
java -version
javac -version

# Verify Maven 3.8+
mvn -version

# Verify Node.js 18+
node --version
npm --version

# Verify Docker and Docker Compose
docker --version
docker-compose --version

# Verify Git
git --version
```

## IDE Configuration

### IntelliJ IDEA Setup (Recommended for Java)

#### 1. Install Required Plugins

Go to **File → Settings → Plugins** and install:

- **Spring Boot** (should be bundled)
- **GraphQL** - For GraphQL schema development
- **Docker** - For container management
- **Kubernetes** - For deployment manifests
- **Database Tools and SQL** (bundled)

#### 2. Configure Java SDK

1. **File → Project Structure → SDKs**
2. **Add JDK** → Select your Java 21 installation
3. Set as **Project SDK**

#### 3. Configure Maven

1. **File → Settings → Build → Build Tools → Maven**
2. Set **Maven home directory** to your Maven installation
3. Set **User settings file** to `~/.m2/settings.xml`
4. Enable **Import Maven projects automatically**

#### 4. Configure Code Style

Download and import the OpenFrame code style:

```bash
# Download code style configuration (example)
curl -o openframe-idea-style.xml https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/.idea/codeStyles/openframe-style.xml
```

Import via **File → Settings → Editor → Code Style → Import Scheme**

### Visual Studio Code Setup (Recommended for Frontend)

#### 1. Install Essential Extensions

```bash
# Install via command line
code --install-extension Vue.volar
code --install-extension Vue.vscode-typescript-vue-plugin
code --install-extension GraphQL.vscode-graphql
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

#### 2. Configure Settings

Create `.vscode/settings.json` in your project root:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "vue.inlayHints.missingProps": true,
  "vue.inlayHints.optionsWrapper": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

#### 3. Configure Launch Configuration

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Frontend",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

### Rust Development Setup

#### 1. Install Rust Toolchain

```bash
# Install rustup (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install additional components
rustup component add clippy rustfmt
```

#### 2. IDE Configuration for Rust

**For VS Code:**
```bash
code --install-extension rust-lang.rust-analyzer
code --install-extension vadimcn.vscode-lldb
code --install-extension tauri-apps.tauri-vscode
```

**For IntelliJ:**
- Install **Rust** plugin
- Install **Toml** plugin for `Cargo.toml` files

## Environment Configuration

### 1. Clone and Initialize Repository

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Initialize git hooks (if available)
git config core.hooksPath .githooks
chmod +x .githooks/*
```

### 2. Set Up Environment Variables

Create development environment configuration:

```bash
# Create environment file
cp .env.example .env.development

# Edit with your settings
vim .env.development
```

**Example `.env.development`:**
```bash
# Database URLs
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security
JWT_SECRET=your-development-jwt-secret-key-min-64-chars-long-for-security
ENCRYPTION_KEY=your-32-character-dev-encryption-key-here

# Service URLs
OPENFRAME_BASE_URL=http://localhost:8080
OPENFRAME_FRONTEND_URL=http://localhost:3000
OPENFRAME_API_URL=http://localhost:8081
OPENFRAME_AUTH_URL=http://localhost:8082

# Development settings
SPRING_PROFILES_ACTIVE=dev
LOG_LEVEL=DEBUG
ENABLE_DEBUG_ENDPOINTS=true

# External integrations (optional for development)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FLEETDM_URL=http://localhost:8412
TACTICAL_RMM_URL=http://localhost:8000
```

### 3. Configure Local Databases

Start required databases using Docker Compose:

```bash
# Start development databases
docker-compose -f integrated-tools/docker-compose.yml up -d mongodb redis kafka zookeeper

# Verify services are running
docker-compose -f integrated-tools/docker-compose.yml ps
```

#### Initialize MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017

# Create development database
use openframe_dev

# Create initial admin user (optional)
db.createUser({
  user: "openframe_dev",
  pwd: "password",
  roles: ["readWrite"]
})
```

#### Test Redis Connection

```bash
# Test Redis connectivity
redis-cli ping
# Should return PONG
```

## Project Import and Configuration

### 1. Import Java Project in IntelliJ

1. **Open IntelliJ IDEA**
2. **File → Open** → Select the `openframe-oss-tenant` directory
3. **Import as Maven project** when prompted
4. **Trust the project** when asked
5. **Wait for indexing** and dependency resolution

#### Configure Run Configurations

Create run configurations for each service:

1. **Run → Edit Configurations**
2. **Add New → Spring Boot**
3. Configure for each service:

**API Service Configuration:**
- **Main class**: `com.openframe.api.ApiApplication`
- **Working directory**: `$PROJECT_DIR$/openframe/services/openframe-api`
- **Environment variables**: 
  ```
  SPRING_PROFILES_ACTIVE=dev;MONGODB_URI=mongodb://localhost:27017/openframe_dev
  ```
- **JVM options**: 
  ```
  -Xms512m -Xmx2g -XX:+UseG1GC -Dspring.devtools.restart.enabled=true
  ```

**Gateway Service Configuration:**
- **Main class**: `com.openframe.gateway.GatewayApplication`
- **Working directory**: `$PROJECT_DIR$/openframe/services/openframe-gateway`
- **Environment variables**: Include same base variables plus:
  ```
  OPENFRAME_API_SERVICE_URL=http://localhost:8081;OPENFRAME_AUTH_SERVICE_URL=http://localhost:8082
  ```

### 2. Frontend Project Setup

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Install global tools (optional but recommended)
npm install -g @vue/cli typescript

# Verify TypeScript configuration
npx tsc --noEmit

# Start development server to test
npm run dev
```

#### Configure Environment Variables

Create frontend environment files:

```bash
# Development environment
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:8080
VITE_GRAPHQL_ENDPOINT=http://localhost:8081/graphql
VITE_WS_ENDPOINT=ws://localhost:8080/ws
VITE_AUTH_BASE_URL=http://localhost:8082
VITE_ENABLE_DEBUG=true
EOF
```

### 3. Rust Client Setup

```bash
cd clients/openframe-client

# Check Rust toolchain
cargo --version
rustc --version

# Build debug version
cargo build

# Run tests
cargo test

# Set up development profile in Cargo.toml (should already exist)
[profile.dev]
debug = true
opt-level = 0
```

## Database Schema Setup

### 1. Run Database Migrations

OpenFrame uses code-first approach with MongoDB, so schemas are created automatically. However, you can initialize with sample data:

```bash
# Start the API service first to create collections
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring.profiles.active=dev

# In another terminal, create sample data
mongosh mongodb://localhost:27017/openframe_dev << 'EOF'
// Create sample tenant
db.tenants.insertOne({
  domain: "dev-tenant",
  name: "Development Tenant",
  status: "ACTIVE",
  createdAt: new Date()
})

// Create sample organization
db.organizations.insertOne({
  tenantId: ObjectId("..."),  // Use tenant ID from above
  name: "Development Organization",
  contactEmail: "dev@example.com",
  createdAt: new Date()
})
EOF
```

### 2. Verify Database Connectivity

Test all service database connections:

```bash
# Test MongoDB connection
curl http://localhost:8081/health | jq '.components.mongo'

# Test Redis connection  
curl http://localhost:8080/health | jq '.components.redis'

# Test Kafka connection (requires Stream service running)
curl http://localhost:8083/health | jq '.components.kafka'
```

## Development Workflow Setup

### 1. Configure Hot Reload

#### Java Services (Spring Boot DevTools)

Add to each service's `application-dev.yml`:

```yaml
spring:
  devtools:
    restart:
      enabled: true
      additional-paths: src/main/java
    livereload:
      enabled: true
```

#### Frontend Hot Reload

Should work automatically with Vite. Verify in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3001
    }
  }
})
```

### 2. Set Up Debugging

#### Java Services Debugging

Add JVM debug options to run configurations:
```bash
-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=*:5005
```

Use different ports for each service:
- API Service: `5005`
- Gateway Service: `5006` 
- Auth Service: `5007`
- Management Service: `5008`

#### Frontend Debugging

Enable source maps in `vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    sourcemap: true
  }
})
```

### 3. Configure Logging

#### Java Services Logging

Create `src/main/resources/logback-dev.xml`:

```xml
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <logger name="com.openframe" level="DEBUG"/>
    <logger name="org.springframework.security" level="DEBUG"/>
    <logger name="org.springframework.graphql" level="DEBUG"/>
    
    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

#### Frontend Logging

Configure console logging in development:

```typescript
// src/utils/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log('[DEBUG]', ...args)
    }
  },
  info: (...args: any[]) => console.info('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
}
```

## Verification

### 1. Test Service Startup

Start services in order and verify health:

```bash
# 1. Start Config Service
cd openframe/services/openframe-config
mvn spring-boot:run &
curl -f http://localhost:8888/health

# 2. Start Authorization Server  
cd openframe/services/openframe-authorization-server
mvn spring-boot:run &
curl -f http://localhost:8082/health

# 3. Start API Service
cd openframe/services/openframe-api  
mvn spring-boot:run &
curl -f http://localhost:8081/health

# 4. Start Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run &
curl -f http://localhost:8080/health

# 5. Start Frontend
cd openframe/services/openframe-frontend
npm run dev &
curl -f http://localhost:3000
```

### 2. Test Development Workflow

#### Java Hot Reload Test

1. **Make a small change** in a Java service (e.g., add a log statement)
2. **Save the file**
3. **Verify the service restarts** automatically
4. **Test the change** via API call

#### Frontend Hot Reload Test

1. **Make a change** in a Vue component
2. **Save the file**  
3. **Verify the browser updates** without refresh

#### Full Stack Test

1. **Make a GraphQL schema change** in the API service
2. **Regenerate TypeScript types** for frontend
3. **Update frontend code** to use new schema
4. **Verify end-to-end functionality**

## Common Issues and Solutions

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different ports in development
export SERVER_PORT=8090
```

### Database Connection Issues

```bash
# Check if MongoDB is running
docker-compose -f integrated-tools/docker-compose.yml ps mongodb

# Restart MongoDB if needed
docker-compose -f integrated-tools/docker-compose.yml restart mongodb

# Check MongoDB logs
docker-compose -f integrated-tools/docker-compose.yml logs mongodb
```

### Memory Issues

```bash
# Increase JVM heap size for development
export MAVEN_OPTS="-Xms1g -Xmx4g"

# Or set in IDE run configuration
-Xms1g -Xmx4g -XX:+UseG1GC
```

### Frontend Build Issues

```bash
# Clear node_modules and reinstall
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Restart with clean cache
npm run dev -- --force
```

## Next Steps

Now that your development environment is set up:

1. **[Local Development Guide](local-development.md)** - Learn the day-to-day development workflow
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
3. **[Testing Overview](../testing/overview.md)** - Learn how to write and run tests
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Prepare to contribute code

## Getting Help

If you encounter issues during setup:

1. **Check the logs** in each terminal window
2. **Verify prerequisites** are correctly installed
3. **Ask for help** in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. **Search existing issues** in the community Slack or documentation