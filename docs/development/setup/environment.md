# Development Environment Setup

This guide will help you set up a complete development environment for OpenFrame. Follow these steps to configure your IDE, tools, and development workflow for maximum productivity.

## 🎯 Overview

Setting up an OpenFrame development environment involves:

1. **IDE Configuration**: Optimal setup for Java, TypeScript, and Rust development
2. **Development Tools**: Essential utilities and plugins
3. **Environment Variables**: Required configuration for local development
4. **Editor Extensions**: Language support and productivity enhancements
5. **Debugging Setup**: Debugging configuration for all components

## 💻 IDE Recommendations

### Primary Options

#### IntelliJ IDEA (Recommended for Java)
**Download**: [JetBrains IntelliJ IDEA](https://www.jetbrains.com/idea/)

**Required Plugins:**
```text
- Spring Boot
- GraphQL  
- Vue.js
- TypeScript
- Rust
- Docker
- Kubernetes
- Database Tools and SQL
```

**Configuration:**
```text
File → Settings → Build → Build Tools → Maven
✅ Import Maven projects automatically
✅ Automatically download sources
✅ Automatically download documentation

File → Settings → Languages & Frameworks → Node.js and NPM
Node interpreter: /usr/local/bin/node
Package manager: npm
```

#### Visual Studio Code (Great for Full-Stack)
**Download**: [VS Code](https://code.visualstudio.com/)

**Essential Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-java-pack",
    "vscjava.vscode-spring-boot-dashboard",
    "ms-vscode.vscode-typescript-next",
    "Vue.vscode-vue",
    "rust-lang.rust-analyzer",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "GraphQL.vscode-graphql",
    "bradlc.vscode-tailwindcss"
  ]
}
```

**Workspace Settings (`/.vscode/settings.json`):**
```json
{
  "java.home": "/path/to/java21",
  "java.configuration.maven.userSettings": "~/.m2/settings.xml",
  "typescript.preferences.quoteStyle": "double",
  "vue.inlayHints.missingProps": true,
  "rust-analyzer.checkOnSave.command": "clippy",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

### Alternative Options

#### Eclipse IDE
Good for Java-focused development with Spring Tool Suite.

#### Vim/Neovim
For advanced users with language server protocol (LSP) configuration.

## 🛠️ Required Development Tools

### 1. Java Development Kit (JDK) 21

```bash
# macOS (Homebrew)
brew install openjdk@21

# Linux (Ubuntu/Debian) 
sudo apt install openjdk-21-jdk

# Windows (Chocolatey)
choco install openjdk21

# Verify installation
java -version
javac -version
```

### 2. Apache Maven 3.9+

```bash
# macOS
brew install maven

# Linux
sudo apt install maven

# Windows
choco install maven

# Verify
mvn --version
```

### 3. Node.js 18+ & npm

```bash
# macOS
brew install node

# Linux (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows  
choco install nodejs

# Verify
node --version
npm --version
```

### 4. Rust & Cargo

```bash
# All platforms
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`

# Verify
rustc --version
cargo --version
```

### 5. Docker & Docker Compose

```bash
# macOS
brew install docker docker-compose

# Linux (Ubuntu)
sudo apt install docker.io docker-compose-plugin

# Windows - Download Docker Desktop

# Verify
docker --version
docker compose version
```

### 6. Git Configuration

```bash
# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Configure commit signing (recommended)
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_GPG_KEY_ID
```

## ⚙️ Environment Variables

### Development Environment Variables

Create a `.env` file in your project root:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0
CASSANDRA_HOSTS=localhost:9042
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Service URLs (for local development)
API_BASE_URL=http://localhost:8081
AUTH_BASE_URL=http://localhost:8082
GATEWAY_BASE_URL=http://localhost:8080
FRONTEND_BASE_URL=http://localhost:3000

# Security Configuration
JWT_SECRET=your-development-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key-here
COOKIE_SECURE=false  # Set true for HTTPS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# AI Configuration (optional)
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here

# Development Flags
OPENFRAME_ENV=development
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=dev
NODE_ENV=development

# External Tool Integration (optional for development)
FLEET_MDM_URL=https://your-fleet-instance.com
FLEET_MDM_TOKEN=your-fleet-api-token
TACTICAL_RMM_URL=https://your-rmm.domain.com  
TACTICAL_RMM_API_KEY=your-tactical-api-key
```

### Shell Configuration

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Java
export JAVA_HOME=/path/to/java21
export PATH=$JAVA_HOME/bin:$PATH

# Maven
export MAVEN_HOME=/path/to/maven
export PATH=$MAVEN_HOME/bin:$PATH
export MAVEN_OPTS="-Xmx4g -Xms2g"

# Node.js (if using version manager)
export PATH=$HOME/.npm-global/bin:$PATH

# Rust
export PATH=$HOME/.cargo/bin:$PATH

# OpenFrame specific
export OPENFRAME_DEV_HOME=/path/to/openframe-oss-tenant
export PATH=$OPENFRAME_DEV_HOME/scripts:$PATH

# Development aliases
alias of-start="./scripts/dev-start-services.sh"  
alias of-stop="./scripts/dev-stop-services.sh"
alias of-logs="./scripts/dev-logs.sh"
alias of-test="mvn test -DskipIntegrationTests=false"
```

## 🔧 IDE-Specific Configuration

### IntelliJ IDEA Setup

#### 1. Import Project
```text
File → Open → Select openframe-oss-tenant directory
✅ Import as Maven project
✅ Auto-import Maven projects
✅ Use Maven wrapper when available
```

#### 2. Configure Java SDK
```text
File → Project Structure → Project Settings → Project
Project SDK: Java 21 (openjdk-21)
Project Language Level: 21 - Pattern matching for switch
```

#### 3. Configure Spring Boot
```text
File → Settings → Build → Build Tools → Spring Boot
✅ Enable Spring Boot DevTools
✅ Automatically restart when classpath changes
```

#### 4. Code Style Configuration
```text
File → Settings → Editor → Code Style → Java
Scheme: Google (or create custom based on project standards)

File → Settings → Editor → Code Style → TypeScript  
Scheme: Default
✅ Use double quotes for strings
✅ Use semicolons
```

#### 5. Run Configurations

Create run configurations for each service:

**API Service:**
```text
Name: OpenFrame API
Main class: com.openframe.api.ApiApplication
VM options: -Xmx2g -Dspring.profiles.active=dev
Environment variables: Load from .env file
```

**Gateway Service:**
```text
Name: OpenFrame Gateway  
Main class: com.openframe.gateway.GatewayApplication
VM options: -Xmx1g -Dspring.profiles.active=dev
```

### VS Code Setup

#### 1. Workspace Configuration
Create `.vscode/settings.json`:

```json
{
  "java.configuration.detectJdksAtStart": false,
  "java.configuration.maven.userSettings": "~/.m2/settings.xml",
  "java.home": "/path/to/java21",
  "java.import.gradle.enabled": false,
  "java.debug.logLevel": "INFO",
  "spring-boot.ls.enabled": true,
  "typescript.preferences.quoteStyle": "double",
  "typescript.suggest.includeCompletionsForModuleExports": true,
  "vue.inlayHints.missingProps": true,
  "vue.inlayHints.inlineHandlerLeading": true,
  "rust-analyzer.cargo.allFeatures": false,
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

#### 2. Launch Configuration
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "OpenFrame API",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "env": {
        "SPRING_PROFILES_ACTIVE": "dev"
      },
      "vmArgs": "-Xmx2g"
    },
    {
      "type": "node",
      "request": "launch", 
      "name": "Frontend Dev Server",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "program": "npm",
      "args": ["run", "dev"]
    }
  ]
}
```

#### 3. Tasks Configuration  
Create `.vscode/tasks.json`:

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
        "panel": "new"
      }
    },
    {
      "label": "Run Tests",
      "type": "shell", 
      "command": "mvn",
      "args": ["test"],
      "group": "test"
    }
  ]
}
```

## 🐛 Debugging Configuration

### Backend Services (Java)

#### IntelliJ IDEA
1. **Set breakpoints** in Java source files
2. **Run in Debug mode** using the debug button
3. **Remote debugging** for containerized services:

```text
VM Options: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005
```

#### VS Code
Configure debugging in `launch.json` with `"request": "attach"` for remote debugging.

### Frontend (Vue.js)

#### Browser DevTools
1. **Vue DevTools**: Install browser extension
2. **Network Tab**: Monitor API requests and responses  
3. **Console**: Debug JavaScript errors and warnings

#### VS Code Debugging
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Frontend",
  "cwd": "${workspaceFolder}/openframe/services/openframe-frontend", 
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev", "--", "--inspect"]
}
```

### Client Agent (Rust)

#### Command Line Debugging
```bash
# Debug build with symbols
cargo build --debug

# Run with detailed logging
RUST_LOG=debug ./target/debug/openframe-client

# Use rust-gdb for debugging
rust-gdb ./target/debug/openframe-client
```

#### VS Code Debugging
Install the CodeLLDB extension and configure:

```json
{
  "type": "lldb",
  "request": "launch",
  "name": "Debug Client Agent",
  "cargo": {
    "args": ["build", "--bin=openframe-client"],
    "filter": {
      "name": "openframe-client", 
      "kind": "bin"
    }
  },
  "args": [],
  "cwd": "${workspaceFolder}/clients/openframe-client"
}
```

## 🔍 Code Quality Tools

### Java (Backend)

#### Checkstyle
Add to Maven `pom.xml`:

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.3.0</version>
  <configuration>
    <configLocation>checkstyle.xml</configLocation>
  </configuration>
</plugin>
```

#### SpotBugs
```xml
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <version>4.7.3.6</version>
</plugin>
```

### TypeScript/Vue (Frontend)

#### ESLint Configuration
```json
{
  "extends": [
    "@vue/typescript/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "vue/multi-word-component-names": "error"
  }
}
```

#### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2
}
```

### Rust (Client Agent)

#### Clippy Configuration  
In `Cargo.toml`:

```toml
[workspace.lints.clippy]
too_many_arguments = "allow"
module_inception = "allow"
```

#### Rustfmt Configuration
Create `.rustfmt.toml`:

```toml
max_width = 100
tab_spaces = 4
newline_style = "Unix"
use_small_heuristics = "Default"
```

## 🚀 Development Workflow Integration

### Pre-commit Hooks

Install and configure pre-commit:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
  - repo: https://github.com/psf/black  
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3
EOF

# Install hooks
pre-commit install
```

### Git Configuration

Configure Git for OpenFrame development:

```bash
# Set up commit message template
git config commit.template .gitmessage.txt

# Configure merge strategy
git config merge.ours.driver true

# Set up aliases
git config alias.co checkout
git config alias.br branch  
git config alias.ci commit
git config alias.st status
```

## 📝 Next Steps

With your environment set up:

1. **Proceed to [Local Development Guide](local-development.md)** to run OpenFrame locally
2. **Review [Architecture Overview](../architecture/README.md)** to understand the system design
3. **Check [Contributing Guidelines](../contributing/guidelines.md)** to learn the development process

## 🐛 Troubleshooting

### Common Environment Issues

#### Java Version Conflicts
```bash
# Check all Java versions
/usr/libexec/java_home -V  # macOS
update-alternatives --list java  # Linux

# Set specific version
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

#### Maven Memory Issues
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4g -Xms2g"

# For specific builds
mvn clean install -Dmax.memory=4g
```

#### Node.js Permission Issues
```bash
# Fix npm permissions (avoid sudo)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

#### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

## 🆘 Getting Help

- **Development Questions**: [OpenMSP Slack #dev](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Environment Issues**: GitHub Discussions
- **IDE Problems**: Check vendor-specific documentation

---

**Environment Ready?** Continue to [Local Development Setup](local-development.md) to start running OpenFrame locally!