# Development Environment Setup

This guide will help you set up a complete OpenFrame development environment with all the necessary tools, IDEs, and configurations for productive development.

## IDE Setup and Configuration

### IntelliJ IDEA (Recommended for Backend Development)

#### Installation and Initial Setup

1. **Download IntelliJ IDEA**
   - Download IntelliJ IDEA Ultimate (recommended) or Community Edition
   - Install with default settings

2. **Essential Plugins**
   ```
   Install these plugins via Settings → Plugins:
   • Spring Boot Assistant
   • GraphQL
   • Docker
   • Kubernetes
   • Lombok
   • SonarLint
   • Database Navigator
   • Maven Helper
   • Git Integration
   ```

3. **Java SDK Configuration**
   ```
   File → Project Structure → SDKs:
   • Add JDK 21 (OpenJDK or Oracle)
   • Set as Project SDK
   • Verify JAVA_HOME environment variable
   ```

#### Code Style Configuration

1. **Import Google Java Style**
   ```bash
   # Download Google Java Style Guide
   curl -O https://raw.githubusercontent.com/google/styleguide/gh-pages/intellij-java-google-style.xml
   
   # Import in IntelliJ:
   # Settings → Editor → Code Style → Java → Import Scheme
   ```

2. **Configure Auto-Formatting**
   ```
   Settings → Editor → Code Style:
   • Tab size: 2
   • Indent: 2
   • Continuation indent: 4
   • Keep line breaks: true
   • Wrap at margin: 100 characters
   ```

3. **Enable Auto-Import**
   ```
   Settings → Editor → General → Auto Import:
   ✓ Add unambiguous imports on the fly
   ✓ Optimize imports on the fly
   ✓ Show import popup for classes
   ```

#### Spring Boot Configuration

1. **Spring Boot Run Configuration**
   ```
   Run → Edit Configurations → Add New → Spring Boot:
   • Name: OpenFrame API Service
   • Main class: com.openframe.api.ApiApplication
   • VM options: -Xmx2g -Dspring.profiles.active=dev
   • Program arguments: --server.port=8082
   • Environment variables: See below
   ```

2. **Environment Variables Template**
   ```bash
   # Database Configuration
   MONGO_URI=mongodb://localhost:27017/openframe_dev
   REDIS_URI=redis://localhost:6379

   # Security Configuration  
   JWT_SECRET=dev-jwt-secret-change-in-production
   ENCRYPTION_KEY=12345678901234567890123456789012

   # External Services
   TACTICAL_RMM_URL=http://localhost:8080
   FLEET_MDM_URL=http://localhost:8080

   # Development Flags
   SPRING_PROFILES_ACTIVE=dev
   DEBUG=true
   LOG_LEVEL=DEBUG
   ```

#### Debug Configuration

1. **Remote Debug Setup**
   ```
   Run → Edit Configurations → Add New → Remote JVM Debug:
   • Name: OpenFrame Remote Debug
   • Host: localhost
   • Port: 5005
   • Use module classpath: openframe-api
   ```

2. **JVM Debug Options**
   ```bash
   # Add to VM options for debug mode:
   -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
   ```

### Visual Studio Code (Frontend Development)

#### Essential Extensions

1. **Vue.js Development**
   ```json
   {
     "recommendations": [
       "Vue.volar",
       "Vue.vscode-typescript-vue-plugin", 
       "bradlc.vscode-tailwindcss",
       "ms-vscode.vscode-typescript-next",
       "esbenp.prettier-vscode",
       "ms-vscode.vscode-eslint",
       "formulahendry.auto-rename-tag",
       "ms-vscode.vscode-json"
     ]
   }
   ```

2. **Additional Development Tools**
   ```json
   {
     "recommendations": [
       "ms-vscode.vscode-docker",
       "ms-kubernetes-tools.vscode-kubernetes-tools",
       "GraphQL.vscode-graphql",
       "ms-vscode.rest-client",
       "github.copilot"
     ]
   }
   ```

#### VS Code Configuration

1. **Settings Configuration**
   ```json
   {
     "editor.tabSize": 2,
     "editor.insertSpaces": true,
     "editor.formatOnSave": true,
     "editor.codeActionsOnSave": {
       "source.eslint.fixAll": true
     },
     "typescript.preferences.importModuleSpecifier": "relative",
     "vue.autoInsert.dotValue": true,
     "tailwindCSS.includeLanguages": {
       "vue": "html"
     }
   }
   ```

2. **Launch Configuration**
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Launch Chrome",
         "request": "launch", 
         "type": "chrome",
         "url": "http://localhost:3000",
         "webRoot": "${workspaceFolder}/openframe/services/openframe-frontend/src"
       }
     ]
   }
   ```

#### Frontend Development Workflow

1. **Package Manager Setup**
   ```bash
   # Use npm (recommended) or yarn
   cd openframe/services/openframe-frontend
   npm install
   
   # Verify installation
   npm run type-check
   npm run lint
   ```

2. **Development Server**
   ```bash
   # Start development server with hot reload
   npm run dev
   
   # Build for production testing
   npm run build
   npm run preview
   ```

### Rust Development (System Agent)

#### Rust Toolchain Setup

1. **Install Rust**
   ```bash
   # Install rustup (Rust toolchain manager)
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   
   # Install stable toolchain
   rustup toolchain install stable
   rustup default stable
   ```

2. **Development Tools**
   ```bash
   # Essential Rust tools
   cargo install cargo-watch    # Auto-reload on changes
   cargo install cargo-edit     # Easy dependency management  
   cargo install cargo-audit    # Security vulnerability scanning
   cargo install sccache        # Compilation caching
   ```

3. **VS Code Rust Extensions**
   ```json
   {
     "recommendations": [
       "rust-lang.rust-analyzer",
       "vadimcn.vscode-lldb",
       "serayuzgur.crates"
     ]
   }
   ```

#### Rust Development Configuration

1. **Cargo Configuration**
   ```toml
   # ~/.cargo/config.toml
   [build]
   rustc-wrapper = "sccache"  # Enable compilation caching
   
   [target.x86_64-unknown-linux-gnu]
   linker = "clang"
   rustflags = ["-C", "link-arg=-fuse-ld=lld"]
   ```

2. **Development Workflow**
   ```bash
   cd clients/openframe-client
   
   # Development build with auto-reload
   cargo watch -x "run"
   
   # Release build for testing
   cargo build --release
   
   # Run tests
   cargo test
   ```

## Development Tools and Extensions

### Database Tools

#### MongoDB Management

1. **MongoDB Compass** (Recommended)
   ```bash
   # Download from: https://www.mongodb.com/products/compass
   # Connect to: mongodb://localhost:27017/openframe_dev
   ```

2. **Command Line Tools**
   ```bash
   # Install MongoDB shell
   brew install mongosh  # macOS
   sudo apt install mongodb-mongosh  # Ubuntu

   # Connect and explore
   mongosh mongodb://localhost:27017/openframe_dev
   db.users.find().limit(5)
   ```

#### Redis Management

1. **Redis CLI**
   ```bash
   # Connect to Redis
   redis-cli -h localhost -p 6379
   
   # Common development commands
   KEYS *
   GET user:session:123
   FLUSHDB  # Clear database (dev only!)
   ```

2. **RedisInsight** (GUI Tool)
   ```bash
   # Download from: https://redis.com/redis-enterprise/redis-insight/
   # Connect to: redis://localhost:6379
   ```

### API Development Tools

#### GraphQL Development

1. **GraphQL Playground**
   ```
   Available at: http://localhost:8082/graphql
   
   Example queries to try:
   query {
     me {
       id
       email
       organization {
         name
       }
     }
   }
   ```

2. **GraphQL Schema Management**
   ```bash
   # Generate TypeScript types from schema
   cd openframe/services/openframe-frontend
   npm run graphql:codegen
   ```

#### REST API Testing

1. **Postman Configuration**
   ```json
   {
     "name": "OpenFrame API Collection",
     "variables": [
       {
         "key": "baseUrl",
         "value": "http://localhost:8080"
       },
       {
         "key": "authToken",  
         "value": "{{jwt_token}}"
       }
     ]
   }
   ```

2. **cURL Examples**
   ```bash
   # Authentication
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
   
   # API Call with JWT
   curl -X GET http://localhost:8080/api/devices \
     -H "Authorization: Bearer $JWT_TOKEN"
   ```

### Container and Orchestration Tools

#### Docker Development

1. **Docker Desktop Configuration**
   ```json
   {
     "builder": {
       "gc": {
         "defaultKeepStorage": "20GB"
       }
     },
     "experimental": false,
     "features": {
       "buildkit": true
     }
   }
   ```

2. **Development Compose Override**
   ```yaml
   # docker-compose.override.yml
   version: '3.8'
   services:
     mongodb:
       ports:
         - "27017:27017"
       environment:
         - MONGO_INITDB_ROOT_USERNAME=admin
         - MONGO_INITDB_ROOT_PASSWORD=password
     
     redis:
       ports:
         - "6379:6379"
       command: redis-server --appendonly yes
   ```

#### Kubernetes Development

1. **Local Kubernetes Setup**
   ```bash
   # Enable Kubernetes in Docker Desktop
   # Or install minikube
   brew install minikube  # macOS
   minikube start --memory=8192 --cpus=4
   ```

2. **kubectl Configuration**
   ```bash
   # Set up context for local development
   kubectl config set-context openframe-dev \
     --cluster=docker-desktop \
     --user=docker-desktop
   
   kubectl config use-context openframe-dev
   ```

## Environment Variables

### Development Environment Template

Create a `.env.local` file in your project root:

```bash
# ================================================
# OpenFrame Development Environment Variables
# ================================================

# Database Configuration
MONGO_URI=mongodb://localhost:27017/openframe_dev
MONGO_DATABASE=openframe_dev
REDIS_URI=redis://localhost:6379/0

# Security Configuration
JWT_SECRET=development-jwt-secret-change-for-production
JWT_EXPIRY=24h
ENCRYPTION_KEY=dev12345678901234567890123456789012
BCRYPT_ROUNDS=10

# Service URLs (Development)
OPENFRAME_GATEWAY_URL=http://localhost:8080
OPENFRAME_API_URL=http://localhost:8082
OPENFRAME_AUTH_URL=http://localhost:8081
OPENFRAME_CLIENT_URL=http://localhost:8084
OPENFRAME_FRONTEND_URL=http://localhost:3000

# External Tool Integration
TACTICAL_RMM_URL=http://localhost:8000
TACTICAL_RMM_TOKEN=dev-token
FLEET_MDM_URL=http://localhost:8080
FLEET_MDM_TOKEN=dev-fleet-token

# Message Queue Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# Development Flags
DEBUG=true
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=dev
NODE_ENV=development

# AI Configuration (Optional)
OPENAI_API_KEY=your-openai-key-here
OPENAI_MODEL=gpt-4-turbo

# Email Configuration (Development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASSWORD=test
```

### Environment Loading

1. **Java Services**
   ```java
   // application-dev.yml
   spring:
     profiles:
       active: dev
     config:
       import: optional:file:.env.local[.properties]
   ```

2. **Frontend Configuration**
   ```javascript
   // vite.config.ts
   export default defineConfig({
     envDir: '../../..',
     envPrefix: ['VITE_', 'OPENFRAME_'],
     // ... other config
   })
   ```

## Editor Extensions and Plugins

### File Type Associations

1. **GraphQL Files**
   ```json
   {
     "files.associations": {
       "*.graphqls": "graphql",
       "*.gql": "graphql"
     }
   }
   ```

2. **Configuration Files**
   ```json
   {
     "files.associations": {
       "*.yml": "yaml",
       "Dockerfile.*": "dockerfile"
     }
   }
   ```

### Productivity Extensions

1. **Code Generation**
   - **Lombok** (Java): Reduces boilerplate code
   - **Vue Snippets** (Vue.js): Common Vue patterns
   - **ES6 Snippets** (JavaScript/TypeScript): Modern JS patterns

2. **Code Quality**
   - **SonarLint**: Code quality and security
   - **ESLint**: JavaScript/TypeScript linting
   - **Prettier**: Code formatting
   - **GitLens**: Git integration enhancements

## Verification and Testing

### Environment Verification Script

Create a script to verify your development environment:

```bash
#!/bin/bash
# scripts/verify-dev-env.sh

echo "🔍 Verifying OpenFrame Development Environment..."

# Check Java
java_version=$(java -version 2>&1 | grep "openjdk version" | cut -d'"' -f2)
if [[ $java_version == 21* ]]; then
    echo "✅ Java 21: $java_version"
else
    echo "❌ Java 21 not found. Current: $java_version"
fi

# Check Node.js
node_version=$(node --version)
if [[ $node_version == v18* ]] || [[ $node_version == v20* ]]; then
    echo "✅ Node.js: $node_version"
else
    echo "❌ Node.js 18+ not found. Current: $node_version"
fi

# Check Docker
if docker --version > /dev/null 2>&1; then
    echo "✅ Docker: $(docker --version)"
else
    echo "❌ Docker not found"
fi

# Check Maven
if mvn --version > /dev/null 2>&1; then
    echo "✅ Maven: $(mvn --version | head -1)"
else
    echo "❌ Maven not found"
fi

# Check Rust (optional)
if cargo --version > /dev/null 2>&1; then
    echo "✅ Rust: $(cargo --version)"
else
    echo "⚠️  Rust not found (optional for system agent development)"
fi

echo "🚀 Environment verification complete!"
```

Make it executable and run:
```bash
chmod +x scripts/verify-dev-env.sh
./scripts/verify-dev-env.sh
```

## Next Steps

With your development environment set up:

1. **Continue to [Local Development Setup](local-development.md)** to start OpenFrame services
2. **Review [Architecture Overview](../architecture/overview.md)** to understand the system design
3. **Check [Contributing Guidelines](../contributing/guidelines.md)** for development workflows

## Troubleshooting

### Common Environment Issues

1. **Java Version Conflicts**
   ```bash
   # Check which Java versions are installed
   /usr/libexec/java_home -V  # macOS
   update-alternatives --list java  # Linux
   
   # Set JAVA_HOME explicitly
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   ```

2. **Node.js Version Manager**
   ```bash
   # Use nvm to manage Node.js versions
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

3. **Port Conflicts**
   ```bash
   # Check what's using a port
   lsof -i :8080  # macOS/Linux
   netstat -an | grep :8080  # Windows
   
   # Kill process using port
   kill -9 $(lsof -t -i :8080)
   ```

Need help with environment setup? Join our [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance!