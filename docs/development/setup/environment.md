# Development Environment Setup

This guide helps you configure an optimal development environment for OpenFrame. We'll set up IDEs, tools, extensions, and configurations for efficient development across the Java backend, TypeScript frontend, and Rust client components.

## IDE Recommendations

### Primary IDEs

| Language/Stack | Recommended IDE | Alternative |
|----------------|-----------------|-------------|
| **Java (Backend)** | IntelliJ IDEA Ultimate | IntelliJ IDEA Community, Eclipse |
| **TypeScript/Vue (Frontend)** | VS Code | WebStorm |
| **Rust (Client)** | VS Code | CLion, RustRover |
| **Documentation** | VS Code | Any Markdown editor |

### IDE Download Links

- **IntelliJ IDEA**: https://www.jetbrains.com/idea/
- **VS Code**: https://code.visualstudio.com/
- **WebStorm**: https://www.jetbrains.com/webstorm/

## IntelliJ IDEA Setup (Java Development)

### Required Plugins

Install these plugins for optimal Java development:

```bash
# Essential plugins (install via IDE):
# - Spring Boot
# - GraphQL
# - Docker
# - Kubernetes
# - Database Tools (built-in Ultimate)
```

#### Installation Steps

1. **Open IntelliJ IDEA** → **File** → **Settings** → **Plugins**
2. **Search and Install**:

| Plugin | Purpose | Required |
|--------|---------|----------|
| **Spring Boot** | Spring framework support | ✅ Yes |
| **GraphQL** | GraphQL schema support | ✅ Yes |
| **Docker** | Docker integration | ✅ Yes |
| **SonarLint** | Code quality analysis | 🔄 Recommended |
| **Lombok** | Java annotation processing | ✅ Yes |
| **Database Tools** | Database integration | 🔄 Ultimate only |

### Project Configuration

#### Import OpenFrame Project

1. **Clone Repository**:
   ```bash
   git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Import Project**:
   - **File** → **Open** → Select `openframe-oss-tenant` folder
   - Choose **"Import project from external model"** → **Maven**
   - Click **Next** → **Next** → **Finish**

3. **Project Structure Configuration**:
   - **File** → **Project Structure**
   - **Project SDK**: Java 21
   - **Language Level**: 21 (Preview features)
   - **Modules**: Auto-detected Maven modules

#### Java Configuration

```bash
# Set Java options in IntelliJ
# Help → Edit Custom VM Options
-Xms2g
-Xmx8g
-XX:+UseG1GC
-XX:+UseStringDeduplication
```

#### Code Style Settings

1. **File** → **Settings** → **Editor** → **Code Style** → **Java**
2. **Import Scheme**: 
   - Download: https://github.com/google/styleguide/blob/gh-pages/intellij-java-google-style.xml
   - **Import** → Apply Google Java Style

### Build Configuration

#### Maven Settings

1. **File** → **Settings** → **Build, Execution, Deployment** → **Build Tools** → **Maven**
2. **Configuration**:

| Setting | Value | Purpose |
|---------|-------|---------|
| **Maven Home** | Auto-detect or `/usr/local/maven` | Maven installation |
| **User Settings File** | `~/.m2/settings.xml` | Custom Maven config |
| **Local Repository** | `~/.m2/repository` | Dependency cache |
| **Import Maven Projects** | ✅ Automatically | Auto-import changes |

#### VM Options for Tests

```xml
<!-- Add to Maven run configuration -->
-Dspring.profiles.active=test
-Dlogging.level.org.springframework=WARN
```

### Database Configuration

#### MongoDB Integration

1. **Database Tools** → **New** → **MongoDB**
2. **Configuration**:
   - **Host**: localhost
   - **Port**: 27017
   - **Database**: openframe
   - **Authentication**: None (development)

#### Redis Integration

1. **Database Tools** → **New** → **Redis**
2. **Configuration**:
   - **Host**: localhost
   - **Port**: 6379
   - **Password**: None (development)

## VS Code Setup (Frontend & Rust)

### Essential Extensions

Install these extensions for Vue.js, TypeScript, and Rust development:

#### Vue.js & TypeScript Extensions

```json
{
  "recommendations": [
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin", 
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml"
  ]
}
```

#### Rust Extensions

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "tamasfe.even-better-toml",
    "serayuzgur.crates",
    "vadimcn.vscode-lldb"
  ]
}
```

### Workspace Settings

Create `.vscode/settings.json` in project root:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "vue.autoInsert.dotValue": true,
  "vue.autoInsert.parentheses": true,
  "vue.autoInsert.bracketSpacing": true,
  "eslint.workingDirectories": ["openframe/services/openframe-frontend"],
  "prettier.configPath": "openframe/services/openframe-frontend/.prettierrc",
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.autoreload": true,
  "files.watcherExclude": {
    "**/target/**": true,
    "**/node_modules/**": true,
    "**/.git/**": true
  }
}
```

### Tasks Configuration

Create `.vscode/tasks.json` for common development tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All Java Services",
      "type": "shell",
      "command": "mvn",
      "args": ["clean", "install", "-DskipTests"],
      "group": "build",
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "Start Frontend Dev",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "options": {
        "cwd": "${workspaceFolder}/openframe/services/openframe-frontend"
      },
      "group": "build"
    },
    {
      "label": "Build Rust Client",
      "type": "shell",
      "command": "cargo",
      "args": ["build"],
      "options": {
        "cwd": "${workspaceFolder}/clients/openframe-client"
      },
      "group": "build"
    }
  ]
}
```

### Launch Configuration

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Rust Client",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/clients/openframe-client/target/debug/openframe-client",
      "args": [],
      "cwd": "${workspaceFolder}/clients/openframe-client",
      "preLaunchTask": "Build Rust Client"
    },
    {
      "name": "Attach to Java Service",
      "type": "java",
      "request": "attach",
      "hostName": "localhost", 
      "port": 8000
    }
  ]
}
```

## Environment Variables Configuration

### Development Environment File

Create `.env` in project root:

```bash
# Development Environment Configuration

# Database URLs
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security Settings (Development Only)
JWT_SECRET=development-jwt-secret-32-characters-minimum-length
ENCRYPTION_KEY=dev-encryption-key-exactly-32-chars

# External Services
TACTICAL_RMM_URL=http://localhost:8001
FLEETDM_URL=http://localhost:8080
MESHCENTRAL_URL=https://localhost:443

# Logging
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_OPENFRAME=DEBUG

# GitHub Integration (Required)
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Spring Profiles
SPRING_PROFILES_ACTIVE=development,local
```

### IDE Environment Integration

#### IntelliJ IDEA

1. **Run/Debug Configurations** → **Edit Configurations**
2. **Environment Variables**: Load from `.env` or set manually
3. **VM Options**: `-Dspring.profiles.active=development`

#### VS Code

Install **DotENV extension** to automatically load `.env` files:

```json
{
  "terminal.integrated.env.osx": {
    "SPRING_PROFILES_ACTIVE": "development"
  },
  "terminal.integrated.env.linux": {
    "SPRING_PROFILES_ACTIVE": "development"  
  }
}
```

## Code Quality Tools

### Java Code Quality

#### SpotBugs Configuration

Add to your IDE or use Maven:

```bash
# Run SpotBugs analysis
mvn spotbugs:check

# Generate report
mvn spotbugs:gui
```

#### Checkstyle Integration

1. **IntelliJ**: Install **CheckStyle-IDEA** plugin
2. **Configuration**: Import Google Java Style rules
3. **Enable**: Real-time checking in editor

### Frontend Code Quality

#### ESLint Configuration

The frontend includes ESLint configuration. In VS Code:

1. **Install ESLint extension**
2. **Enable**: Auto-fix on save
3. **Configuration**: Automatically detected from `package.json`

#### Prettier Integration

```bash
cd openframe/services/openframe-frontend

# Format all files
npm run format

# Check formatting
npm run format:check
```

### Rust Code Quality

#### Clippy Configuration

```bash
cd clients/openframe-client

# Run Clippy linting
cargo clippy -- -D warnings

# Auto-fix where possible
cargo clippy --fix
```

#### Rustfmt Integration

```bash
# Format Rust code
cargo fmt

# Check formatting
cargo fmt -- --check
```

## Development Server Configuration

### Java Services Debug Mode

Start Java services with remote debugging enabled:

```bash
# API Service with debugging
export JAVA_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:8000"
mvn spring-boot:run -pl openframe-api

# Gateway Service with debugging  
export JAVA_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:8001"
mvn spring-boot:run -pl openframe-gateway
```

### Frontend Hot Reload

```bash
cd openframe/services/openframe-frontend

# Start with hot reload
npm run dev

# Custom port
npm run dev -- --port 3000
```

### Database Development Tools

#### MongoDB Compass

- **Download**: https://www.mongodb.com/products/compass
- **Connection**: `mongodb://localhost:27017`
- **Database**: `openframe`

#### Redis CLI

```bash
# Connect to Redis
redis-cli

# Monitor commands
redis-cli monitor

# View memory usage
redis-cli info memory
```

## Performance Optimization

### IDE Performance

#### IntelliJ IDEA Memory Settings

```bash
# Increase heap size for large projects
# Help → Edit Custom VM Options
-Xms4g
-Xmx12g
-XX:ReservedCodeCacheSize=1g
```

#### VS Code Performance

```json
{
  "files.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/target": true,
    "**/dist": true
  }
}
```

### Build Performance

```bash
# Maven parallel builds
mvn -T 1C clean install

# Skip tests during development
mvn clean install -DskipTests

# Specific module builds
mvn clean install -pl openframe-api -am
```

## Troubleshooting Environment Issues

### Common Java Issues

#### Wrong Java Version

```bash
# Check current version
java --version

# Set JAVA_HOME (macOS)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Set JAVA_HOME (Linux)
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
```

#### Maven Dependencies

```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Re-download dependencies
mvn dependency:resolve

# Force update snapshots
mvn clean install -U
```

### Frontend Issues

#### Node.js Version

```bash
# Check version
node --version

# Use correct version with nvm
nvm install 18
nvm use 18
```

#### npm Cache Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Rust Issues

#### Cargo Cache

```bash
# Clear Cargo cache
cargo clean

# Update Rust toolchain
rustup update
```

#### Missing Dependencies

```bash
# Install build dependencies (Linux)
sudo apt-get install build-essential pkg-config libssl-dev

# Install build dependencies (macOS)
xcode-select --install
```

## Next Steps

🎉 **Environment Setup Complete!** Your development environment is now configured for optimal OpenFrame development.

### Immediate Next Steps

> **Ready to Code?**
> 
> 1. **[Local Development Guide](local-development.md)** - Clone, build, and run OpenFrame
> 2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
> 3. **[Testing Guide](../testing/overview.md)** - Learn the testing approach

### Additional Resources

- **Code Style Guide**: Follow established Java and TypeScript conventions
- **Performance Tips**: Monitor resource usage during development
- **Debugging Tools**: Use IDE debuggers and browser dev tools effectively

---

**Environment ready!** Continue to [Local Development](local-development.md) to start building and running OpenFrame.