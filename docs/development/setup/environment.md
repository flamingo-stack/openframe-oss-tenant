# Development Environment Setup

This guide helps you configure a productive development environment for working with OpenFrame. We'll cover IDE setup, required tools, editor extensions, and development-specific environment variables.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA Ultimate provides the best experience for Spring Boot and Java development.

**Installation:**
```bash
# macOS (using Homebrew)
brew install --cask intellij-idea

# Windows (using Chocolatey)
choco install intellij-idea

# Or download from: https://www.jetbrains.com/idea/
```

**Essential Plugins:**
Install these plugins via **File → Settings → Plugins**:

| Plugin | Purpose |
|--------|---------|
| **Spring Boot** | Spring Boot support and run configurations |
| **GraphQL** | GraphQL schema and query support |
| **Docker** | Docker compose and container management |
| **Kubernetes** | K8s manifest support |
| **Database Tools** | MongoDB, Redis, Cassandra integration |
| **SonarLint** | Code quality and security analysis |

**Project Configuration:**

1. **Import Project**: Open the root `pom.xml` as a Maven project
2. **SDK Setup**: Configure Java 21 SDK
   - **File → Project Structure → Project Settings → Project**
   - Set Project SDK to Java 21
   - Set Language Level to 21
3. **Code Style**: Import OpenFrame code style
   - **File → Settings → Editor → Code Style → Java**
   - Import scheme from `scripts/intellij-codestyle.xml` (if available)
4. **Spring Boot Run Configurations**: 
   - Create run configurations for each service
   - Set active profiles: `dev,local`

### Visual Studio Code (Recommended for Frontend/Rust)

VS Code provides excellent TypeScript/React and Rust development experience.

**Essential Extensions:**

**TypeScript/React:**
```text
ES7+ React/Redux/React-Native snippets
TypeScript Importer
Prettier - Code formatter
ESLint
Auto Rename Tag
Bracket Pair Colorizer
GitLens
Thunder Client (API testing)
```

**Rust Development:**
```text
rust-analyzer
CodeLLDB (debugging)
crates
Better TOML
Error Lens
```

**General Development:**
```text
Docker
Kubernetes
GraphQL
MongoDB for VS Code
Redis for VS Code
YAML
```

**VS Code Settings for OpenFrame:**

Create `.vscode/settings.json` in the project root:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.associations": {
    "*.md": "markdown"
  },
  "rust-analyzer.cargo.features": "all"
}
```

### Alternative IDEs

| IDE | Best For | Notes |
|-----|----------|-------|
| **Eclipse IDE** | Java development | Free alternative to IntelliJ |
| **WebStorm** | Frontend development | JetBrains IDE for web development |
| **Atom** | Lightweight editing | Good for documentation editing |
| **Neovim/Vim** | Terminal-based | For advanced users |

## Required Development Tools

### Version Control
```bash
# Git (latest version)
git --version  # Should be 2.30+

# Configure Git for OpenFrame development
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false
```

### Java Development Tools

**Java 21 JDK** (Required):
```bash
# Verify Java installation
java -version
javac -version

# Set JAVA_HOME (add to your shell profile)
export JAVA_HOME=/path/to/java-21
export PATH=`$JAVA_HOME/bin:$PATH`
```

**Maven 3.8+**:
```bash
# Verify Maven installation
mvn --version

# Configure Maven for OpenFrame (optional)
# Create ~/.m2/settings.xml with custom repositories
```

**Spring Boot CLI** (Optional but useful):
```bash
# macOS
brew install springboot

# Windows
choco install springbootcli

# Verify installation
spring --version
```

### Frontend Development Tools

**Node.js 18+ and NPM**:
```bash
# Using Node Version Manager (recommended)
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # v18.x.x
npm --version   # 9.x.x+
```

**Frontend Build Tools**:
```bash
# Install global development tools
npm install -g @typescript-eslint/cli
npm install -g prettier
npm install -g vite

# Yarn (alternative to npm)
npm install -g yarn
```

### Rust Development Tools

**Rust Toolchain**:
```bash
# Install via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add to PATH
source ~/.cargo/env

# Install additional components
rustup component add clippy rustfmt
rustup component add rust-analyzer

# Verify installation
rustc --version
cargo --version
clippy --version
```

### Database and Infrastructure Tools

**Database Management:**

```bash
# MongoDB Compass (GUI)
# Download from: https://www.mongodb.com/products/compass

# Redis CLI
npm install -g redis-cli
# Or via package manager:
# brew install redis (includes redis-cli)
# apt install redis-tools
```

**Container Tools:**
```bash
# Docker and Docker Compose
docker --version     # 24.0+
docker compose version  # 2.0+

# Kubernetes CLI (for deployment)
kubectl version --client

# Helm (for K8s deployments)
helm version
```

## Environment Variables for Development

Create a development environment configuration file. Choose your preferred method:

### Option 1: .env File (Recommended)

Create `.env` in the project root:

```bash
# Development Environment Configuration
OPENFRAME_ENV=development
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=dev,local

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/1
CASSANDRA_HOSTS=localhost:9042

# Message Queuing
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# Security Configuration (Development Only)
JWT_SECRET=dev-jwt-secret-256-bit-key-change-in-production
ENCRYPTION_KEY=dev-encryption-key-32-chars-long

# External APIs (Optional - for testing integrations)
TACTICAL_RMM_URL=https://demo-tactical.example.com
TACTICAL_RMM_TOKEN=your-dev-token
FLEET_MDM_URL=https://demo-fleet.example.com
MESHCENTRAL_URL=https://demo-mesh.example.com

# Development Features
ENABLE_DEBUG_ENDPOINTS=true
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_H2_CONSOLE=false
SPRING_JPA_SHOW_SQL=true

# Frontend Development
REACT_APP_API_URL=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080/ws
REACT_APP_ENV=development
```

### Option 2: Shell Profile Configuration

Add to your `~/.bashrc`, `~/.zshrc`, or `~/.profile`:

```bash
# OpenFrame Development Environment
export OPENFRAME_ENV=development
export LOG_LEVEL=DEBUG
export MONGODB_URI=mongodb://localhost:27017/openframe_dev
export REDIS_URL=redis://localhost:6379/1
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export NATS_URL=nats://localhost:4222

# Security (Development)
export JWT_SECRET=dev-jwt-secret-256-bit-key-change-in-production
export ENCRYPTION_KEY=dev-encryption-key-32-chars-long

# Development Tools
export MAVEN_OPTS="-Xmx2g -Xms1g"
export NODE_OPTIONS="--max-old-space-size=4096"
```

### Option 3: IDE-Specific Configuration

**IntelliJ IDEA Run Configurations:**
1. Edit run configuration for each service
2. Add environment variables in **Environment Variables** section
3. Set **Active Profiles**: `dev,local`

**VS Code Launch Configuration:**
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "OpenFrame API Service",
      "type": "java",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "env": {
        "SPRING_PROFILES_ACTIVE": "dev,local",
        "MONGODB_URI": "mongodb://localhost:27017/openframe_dev",
        "LOG_LEVEL": "DEBUG"
      }
    }
  ]
}
```

## Editor Extensions and Plugins

### IntelliJ IDEA Extensions

**Code Quality & Formatting:**
```text
CheckStyle-IDEA          # Code style checking
SpotBugs                 # Bug detection
SonarLint               # Code quality analysis  
Google Java Format      # Google style formatting
```

**Development Productivity:**
```text
Key Promoter X          # Shortcut learning
Rainbow Brackets        # Bracket highlighting
String Manipulation     # Text manipulation tools
Maven Helper            # Maven dependency analysis
Spring Assistant        # Spring Boot project generator
```

**Database & Infrastructure:**
```text
Database Navigator      # Database integration
Kubernetes             # K8s resource management
Docker                 # Container management
MongoDB Plugin         # MongoDB integration
```

### VS Code Extensions Configuration

**TypeScript Development:**
```json
{
  "typescript.suggest.autoImports": true,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

**React Development:**
```json
{
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  },
  "emmet.triggerExpansionOnTab": true
}
```

## Development-Specific Configuration

### Hot Reload Configuration

**Spring Boot DevTools** (Java):
Add to service `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

**Frontend Hot Reload** (React):
```bash
# Start with hot reload enabled
npm run dev

# Or with custom configuration
FAST_REFRESH=true npm run dev
```

### Debugging Configuration

**Java Debugging** (IntelliJ):
1. Set breakpoints in code
2. Use **Debug** mode for run configurations  
3. Enable **Remote JVM Debug** for containerized services

**Frontend Debugging** (Chrome DevTools):
1. Install React Developer Tools
2. Enable source maps in Vite configuration
3. Use VS Code debugger for server-side debugging

**Rust Debugging** (VS Code):
```json
{
  "type": "lldb",
  "request": "launch",
  "name": "Debug OpenFrame Client",
  "program": "${workspaceFolder}/clients/openframe-client/target/debug/openframe-client",
  "args": ["--config", "dev-config.toml"]
}
```

## Verification Checklist

Verify your development environment setup:

### ✅ Core Tools
```bash
java --version          # Java 21+
mvn --version          # Maven 3.8+
node --version         # Node 18+
npm --version          # npm 9+
rustc --version        # Rust 1.75+
git --version          # Git 2.30+
docker --version       # Docker 24.0+
```

### ✅ IDE Configuration
- [ ] IDE plugins installed and configured
- [ ] Code style and formatting rules applied
- [ ] Project imported and building successfully  
- [ ] Run configurations created for services

### ✅ Environment Variables
- [ ] Development environment variables configured
- [ ] Database connection strings set for development
- [ ] Security keys configured (development only)
- [ ] External API credentials configured (optional)

### ✅ Development Features
- [ ] Hot reload working for frontend
- [ ] Live reload working for backend (DevTools)
- [ ] Debugging configuration tested
- [ ] Code formatting and linting working

## Troubleshooting Common Setup Issues

### Java Issues
```bash
# Multiple Java versions
update-java-alternatives --list  # Linux
/usr/libexec/java_home -V        # macOS

# Set specific version
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### Node.js Issues
```bash  
# Clear npm cache
npm cache clean --force

# Reset node_modules
rm -rf node_modules package-lock.json
npm install
```

### IDE Performance
```bash
# Increase IntelliJ memory
# Edit idea.vmoptions or idea64.vmoptions
-Xms1024m
-Xmx4096m
-XX:ReservedCodeCacheSize=1024m
```

---

**Next Step**: With your development environment configured, proceed to [Local Development](local-development.md) to clone, build, and run OpenFrame locally.