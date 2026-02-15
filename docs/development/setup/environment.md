# Development Environment Setup

This guide will help you set up a complete development environment for OpenFrame, including IDE configuration, essential tools, and development-specific settings.

## IDE Setup and Configuration

### IntelliJ IDEA Ultimate (Recommended for Backend)

**Installation:**
```bash
# macOS
brew install --cask intellij-idea

# Linux (using Snap)
sudo snap install intellij-idea-ultimate --classic

# Windows - Download from JetBrains website
```

**Essential Plugins:**
1. **Lombok** - Reduces Java boilerplate code
2. **GraphQL** - GraphQL schema support  
3. **Docker** - Container management
4. **Kubernetes** - K8s resource editing
5. **String Manipulation** - Text processing utilities
6. **GitToolBox** - Enhanced Git integration

**Configuration:**
```text
File → Settings → Build, Execution, Deployment → Build Tools → Maven
☑ Import Maven projects automatically
☑ Automatically download sources and documentation

File → Settings → Editor → Code Style → Java
- Tab size: 4
- Indent: 4  
- Continuation indent: 8
☑ Use tab character

File → Settings → Plugins
Install: Lombok, GraphQL, Docker, Kubernetes
```

**JVM Configuration (for large projects):**
```text
Help → Edit Custom VM Options
Add:
-Xmx4g
-XX:ReservedCodeCacheSize=512m
-XX:+UseG1GC
```

### Visual Studio Code (Frontend & General)

**Installation:**
```bash
# macOS
brew install --cask visual-studio-code

# Linux (Ubuntu/Debian)
sudo snap install code --classic

# Windows - Download from Microsoft
```

**Essential Extensions:**
```json
{
  "recommendations": [
    "vue.volar",
    "vue.vscode-typescript-vue-plugin", 
    "rust-lang.rust-analyzer",
    "graphql.vscode-graphql",
    "ms-vscode.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

**VS Code Settings (`.vscode/settings.json`):**
```json
{
  "typescript.preferences.useAliasesForRenames": false,
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "vue.inlayHints.missingProps": true,
  "vue.inlayHints.optionsWrapper": true,
  "rust-analyzer.check.command": "clippy",
  "files.associations": {
    "*.vue": "vue"
  }
}
```

## Development Tools Installation

### Java Development Kit 21

**Verify Installation:**
```bash
java -version
# Expected: openjdk version "21.0.x"
```

**Set `JAVA_HOME` (if needed):**
```bash
# macOS/Linux - Add to ~/.bashrc or ~/.zshrc
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64  # Linux

# Windows PowerShell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.x-hotspot"
```

### Maven Configuration

**Global Settings (`~/.m2/settings.xml`):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <spring.profiles.active>dev</spring.profiles.active>
        <skipTests>false</skipTests>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
</settings>
```

### Node.js and npm

**Version Management with nvm (recommended):**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

**Global npm packages for development:**
```bash
npm install -g @vue/cli @vitejs/plugin-vue typescript
```

### Rust Development Environment

**Rustup Installation:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**Development Components:**
```bash
# Install additional components
rustup component add clippy rustfmt rust-analyzer

# Install useful cargo tools
cargo install cargo-edit cargo-watch cargo-audit
```

### Docker Development Configuration

**Docker Compose Override for Development:**

Create `docker-compose.override.yml`:
```yaml
version: '3.8'
services:
  openframe-mongodb:
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password123
      - MONGO_INITDB_DATABASE=openframe_dev
    volumes:
      - mongodb_dev_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro

  openframe-kafka:
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      - KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT
      - KAFKA_ADVERTISED_LISTENERS=INTERNAL://kafka:29092,EXTERNAL://localhost:9092
      - KAFKA_INTER_BROKER_LISTENER_NAME=INTERNAL
    volumes:
      - kafka_dev_data:/var/lib/kafka/data

  openframe-redis:
    ports:
      - "6379:6379"
    environment:
      - REDIS_PASSWORD=redis123
    volumes:
      - redis_dev_data:/data

volumes:
  mongodb_dev_data:
  kafka_dev_data: 
  redis_dev_data:
```

## Environment Variables for Development

### Core Development Variables

Create `.env.development` in the project root:
```bash
# Database Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=openframe_dev
MONGODB_USERNAME=admin
MONGODB_PASSWORD=password123

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_GROUP_ID=openframe-dev

# Redis Configuration  
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# Security Configuration
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION_HOURS=24

# OAuth2 Development
OAUTH2_CLIENT_ID=dev-client-id
OAUTH2_CLIENT_SECRET=dev-client-secret
OAUTH2_REDIRECT_URI=http://localhost:8080/auth/callback

# Service URLs
API_GATEWAY_URL=http://localhost:8081
API_SERVICE_URL=http://localhost:8080
AUTH_SERVICE_URL=http://localhost:8082
CONFIG_SERVICE_URL=http://localhost:8888

# Development Flags
OPENFRAME_DEV_MODE=true
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=dev,local
```

### Service-Specific Environment Variables

**API Service (`openframe-api/.env`):**
```bash
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev
MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE=health,info,metrics,prometheus

# GraphQL Configuration
GRAPHQL_PLAYGROUND_ENABLED=true
GRAPHQL_INTROSPECTION_ENABLED=true

# Database
SPRING_DATA_MONGODB_URI=mongodb://admin:password123@localhost:27017/openframe_dev?authSource=admin
```

**Gateway Service (`openframe-gateway/.env`):**
```bash
SERVER_PORT=8081
SPRING_PROFILES_ACTIVE=dev

# JWT Configuration
JWT_PUBLIC_KEY_PATH=/path/to/public.key
JWT_ISSUER_URL=http://localhost:8082

# CORS Configuration (Development)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

## Hot Reload and Development Server Configuration

### Backend Hot Reload (Spring Boot DevTools)

**Add to each service's `pom.xml`:**
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**IntelliJ IDEA Configuration:**
1. **File → Settings → Build, Execution, Deployment → Compiler**
2. ☑ **Build project automatically**
3. **File → Settings → Advanced Settings**
4. ☑ **Allow auto-make to start even if developed application is currently running**

### Frontend Hot Module Replacement

**Vite Configuration (`openframe-frontend/vite.config.ts`):**
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      },
      '/graphql': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: true
  }
})
```

### Rust Development with Cargo Watch

```bash
# Install cargo-watch for automatic rebuilds
cargo install cargo-watch

# Auto-rebuild on changes
cd clients/openframe-client
cargo watch -x 'run'

# Run tests on changes
cargo watch -x 'test'
```

## Database Development Setup

### MongoDB Development Database

**Connection String:**
```text
mongodb://admin:password123@localhost:27017/openframe_dev?authSource=admin
```

**Useful MongoDB Tools:**
```bash
# MongoDB Compass (GUI)
brew install --cask mongodb-compass

# MongoDB shell  
brew install mongosh

# Connect to development database
mongosh "mongodb://admin:password123@localhost:27017/openframe_dev?authSource=admin"
```

**Development Data Seeding:**
```javascript
// scripts/mongo-seed-dev.js
db = db.getSiblingDB('openframe_dev');

// Create development admin user
db.users.insertOne({
  email: 'dev@openframe.local',
  password: '$2a$10$hashedpassword',
  role: 'ADMIN',
  organization: 'dev-org',
  createdAt: new Date()
});

// Create development organization  
db.organizations.insertOne({
  name: 'Development Organization',
  domain: 'dev.openframe.local',
  contactEmail: 'dev@openframe.local',
  createdAt: new Date()
});
```

### Redis Development Setup

**Connection and Testing:**
```bash
# Connect to Redis CLI
redis-cli -h localhost -p 6379 -a redis123

# Test basic operations
SET test:key "Hello OpenFrame"
GET test:key
KEYS *
```

## Debug Configuration

### Java Service Debugging

**IntelliJ Remote Debug Configuration:**
1. **Run → Edit Configurations → Add New → Remote JVM Debug**
2. **Host:** `localhost`
3. **Port:** `5005` (or service-specific port)
4. **Command line arguments:** `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005`

**Maven Debug Mode:**
```bash
# Start service with debug port
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

### Frontend Debugging

**Vue DevTools Setup:**
1. **Install browser extension:** Vue.js devtools
2. **Enable in development:**
   ```typescript
   // main.ts
   import { createApp } from 'vue'
   import App from './App.vue'

   const app = createApp(App)

   if (import.meta.env.DEV) {
     app.config.performance = true
   }

   app.mount('#app')
   ```

**VS Code Debug Configuration (`.vscode/launch.json`):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch", 
      "name": "Launch Chrome for Vue",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/src/*"
      }
    }
  ]
}
```

## Development Scripts

### Useful Development Commands

Create `scripts/dev-setup.sh`:
```bash
#!/bin/bash

# Start development infrastructure
echo "🚀 Starting OpenFrame development environment..."

# Start infrastructure containers
docker compose -f integrated-tools/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for infrastructure..."
sleep 30

# Build all services
echo "🔨 Building services..."
mvn clean install -DskipTests

# Start config server first
echo "⚙️  Starting config server..."
cd openframe/services/openframe-config
mvn spring-boot:run &
CONFIG_PID=$!

# Wait for config server
sleep 15

# Start other services
echo "🌐 Starting API services..."
cd ../openframe-api
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005" &
API_PID=$!

cd ../openframe-gateway  
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5006" &
GATEWAY_PID=$!

# Start frontend
echo "💻 Starting frontend..."
cd ../openframe-frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Development environment ready!"
echo "📝 Service URLs:"
echo "  - Frontend: http://localhost:3000"  
echo "  - API: http://localhost:8080"
echo "  - Gateway: http://localhost:8081"
echo "  - Config: http://localhost:8888"
echo ""
echo "🔧 Debug Ports:"
echo "  - API Service: 5005"
echo "  - Gateway: 5006"

# Save PIDs for cleanup
echo "$CONFIG_PID $API_PID $GATEWAY_PID $FRONTEND_PID" > .dev-pids

trap 'kill $(cat .dev-pids); rm -f .dev-pids' EXIT
wait
```

**Make script executable:**
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

## Code Quality Tools

### Java Code Quality

**Checkstyle Configuration (`.checkstyle.xml`):**
```xml
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Check Configuration 1.3//EN"
        "https://checkstyle.org/dtds/configuration_1_3.dtd">
<module name="Checker">
    <module name="TreeWalker">
        <module name="Indentation">
            <property name="basicOffset" value="4"/>
            <property name="tabWidth" value="4"/>
        </module>
        <module name="LineLength">
            <property name="max" value="120"/>
        </module>
    </module>
</module>
```

### Frontend Code Quality

**ESLint Configuration (`.eslintrc.js`):**
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off'
  }
}
```

**Prettier Configuration (`.prettierrc`):**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## Next Steps

Your development environment is now ready! Next steps:

1. **[Local Development Guide](local-development.md)** - Learn how to run and debug OpenFrame locally
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system architecture
3. **[Testing Overview](../testing/overview.md)** - Set up testing workflows
4. **Join the Community** - [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for development questions

## Troubleshooting

### Common Setup Issues

**Java Version Conflicts:**
```bash
# Check all Java versions
/usr/libexec/java_home -V  # macOS
update-java-alternatives --list  # Linux

# Set specific version
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

**Node Version Issues:**
```bash
# Reset npm cache
npm cache clean --force

# Reinstall node modules
rm -rf node_modules package-lock.json
npm install
```

**Docker Permission Issues:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

Your development environment is now fully configured for OpenFrame development! 🚀