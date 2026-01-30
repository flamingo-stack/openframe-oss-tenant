# Development Environment Setup

This guide will help you configure a complete development environment for OpenFrame, including IDEs, tools, extensions, and environment variables needed for efficient development.

## IDE Setup and Configuration

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA provides excellent support for Spring Boot, GraphQL, and the entire Java ecosystem used in OpenFrame.

#### Installation

```bash
# macOS with Homebrew
brew install --cask intellij-idea

# Windows with Chocolatey
choco install intellij-idea

# Linux (Ubuntu/Debian)
sudo snap install intellij-idea-ultimate --classic
```

#### Essential Plugins

Install these plugins for optimal OpenFrame development:

| Plugin | Purpose | Installation |
|--------|---------|-------------|
| **Spring Boot** | Spring framework support | Pre-installed in Ultimate |
| **GraphQL** | GraphQL schema and query support | `Preferences → Plugins → GraphQL` |
| **Docker** | Docker integration and management | `Preferences → Plugins → Docker` |
| **Database Tools and SQL** | Database connectivity | Pre-installed in Ultimate |
| **Kubernetes** | Kubernetes manifest editing | `Preferences → Plugins → Kubernetes` |
| **Maven Helper** | Enhanced Maven support | `Preferences → Plugins → Maven Helper` |

#### Configuration

1. **Java SDK Configuration**:
   ```
   File → Project Structure → SDKs → Add JDK → Select Java 21
   ```

2. **Maven Configuration**:
   ```
   Preferences → Build → Maven
   - Maven home path: /usr/local/maven (or your Maven installation)
   - User settings file: ~/.m2/settings.xml
   - Local repository: ~/.m2/repository
   ```

3. **Code Style**:
   ```
   Preferences → Editor → Code Style → Java
   - Import scheme: Load from openframe/.idea/codeStyles/
   ```

#### Useful Run Configurations

Create these run configurations for easy service startup:

```xml
<!-- API Service Run Configuration -->
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="API Service" type="SpringBootApplicationConfigurationType">
    <module name="openframe-api" />
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.api.ApiApplication" />
    <option name="ACTIVE_PROFILES" value="local" />
    <option name="VM_PARAMETERS" value="-Xmx2g -Dspring.profiles.active=local" />
  </configuration>
</component>
```

### VS Code (Recommended for Full-Stack Development)

VS Code provides excellent support for all technologies used in OpenFrame: Java, TypeScript, Vue.js, and Rust.

#### Installation

```bash
# macOS
brew install --cask visual-studio-code

# Windows
winget install Microsoft.VisualStudioCode

# Linux (Ubuntu/Debian)
sudo apt install code
```

#### Essential Extensions

Install these extensions for comprehensive OpenFrame support:

```bash
# Java development
code --install-extension vscjava.vscode-java-pack
code --install-extension vmware.vscode-spring-boot
code --install-extension GraphQL.vscode-graphql
code --install-extension vscjava.vscode-maven

# Frontend development
code --install-extension Vue.volar
code --install-extension Vue.vscode-typescript-vue-plugin
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode

# Rust development
code --install-extension rust-lang.rust-analyzer
code --install-extension tauri-apps.tauri-vscode

# DevOps and utilities
code --install-extension ms-vscode.vscode-docker
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --install-extension redhat.vscode-yaml
code --install-extension ms-vscode.vscode-json
```

#### VS Code Settings

Create `.vscode/settings.json` in your project root:

```json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/usr/lib/jvm/java-21-openjdk"
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "java.saveActions.organizeImports": true,
  
  "typescript.preferences.quoteStyle": "single",
  "typescript.suggest.autoImports": true,
  
  "rust-analyzer.cargo.buildScripts.enable": true,
  "rust-analyzer.checkOnSave.command": "clippy",
  
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    }
  },
  
  "[java]": {
    "editor.defaultFormatter": "redhat.java",
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

#### VS Code Tasks

Create `.vscode/tasks.json` for common development tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build All Services",
      "type": "shell",
      "command": "mvn",
      "args": ["clean", "install"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Start Local Development",
      "type": "shell",
      "command": "./scripts/run-mac.sh",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Frontend Dev Server",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "options": {
        "cwd": "openframe/services/openframe-frontend"
      },
      "group": "build"
    }
  ]
}
```

## Required Development Tools

### Java Development Kit (JDK)

OpenFrame requires Java 21 with specific configurations for optimal performance.

#### Installation and Configuration

```bash
# macOS with SDKMAN (recommended)
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh
sdk install java 21.0.1-open
sdk use java 21.0.1-open

# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# RHEL/CentOS
sudo dnf install java-21-openjdk-devel

# Windows (use installer from Eclipse Temurin)
# Download from: https://adoptium.net/temurin/releases/
```

#### Environment Variables

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# Java configuration
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"  # Adjust path as needed
export PATH="$JAVA_HOME/bin:$PATH"

# JVM tuning for development
export MAVEN_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC"
export GRADLE_OPTS="-Xmx4g -Xms2g"

# Verify installation
java --version
```

### Apache Maven

Maven is used for building all Java services and managing dependencies.

#### Installation

```bash
# macOS with Homebrew
brew install maven

# Ubuntu/Debian
sudo apt install maven

# RHEL/CentOS
sudo dnf install maven

# Windows with Chocolatey
choco install maven
```

#### Configuration

Create `~/.m2/settings.xml` for Maven configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <localRepository>${user.home}/.m2/repository</localRepository>
  
  <servers>
    <server>
      <id>github-openframe</id>
      <username>your-github-username</username>
      <password>${env.GITHUB_TOKEN}</password>
    </server>
  </servers>
  
  <profiles>
    <profile>
      <id>github</id>
      <repositories>
        <repository>
          <id>central</id>
          <url>https://repo.maven.apache.org/maven2</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>github</activeProfile>
  </activeProfiles>
</settings>
```

### Node.js and npm

Node.js is required for frontend development and build processes.

#### Installation

```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# macOS with Homebrew
brew install node@18

# Ubuntu/Debian using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows with Chocolatey
choco install nodejs --version 18.19.0
```

#### Global Package Configuration

Install global packages needed for development:

```bash
# Package managers and tools
npm install -g pnpm yarn

# Development utilities
npm install -g @vue/cli @tauri-apps/cli

# Type checking and linting
npm install -g typescript eslint prettier

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Rust Toolchain

Rust is used for the OpenFrame client agent and chat application.

#### Installation

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install additional components
rustup component add clippy rustfmt
rustup target add x86_64-pc-windows-gnu  # For cross-compilation

# Install useful cargo tools
cargo install cargo-watch cargo-edit cargo-audit
```

#### Rust Configuration

Create `~/.cargo/config.toml`:

```toml
[build]
jobs = 4  # Adjust based on your CPU cores

[target.x86_64-unknown-linux-gnu]
linker = "clang"
rustflags = ["-C", "link-arg=-fuse-ld=lld"]

[profile.dev]
debug = true
opt-level = 0

[profile.release]
debug = false
opt-level = 3
lto = true
codegen-units = 1
```

## Environment Variables

### Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# GitHub Access (required for private repositories)
GITHUB_TOKEN=your_personal_access_token
GITHUB_USERNAME=your_github_username

# Database Connections
MONGO_CONNECTION_STRING=mongodb://localhost:27017/openframe
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
PINOT_BROKER_URL=http://localhost:8000

# Authentication
JWT_SECRET_KEY=your-jwt-secret-key-change-this-in-production
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret

# Service Configuration
API_GATEWAY_PORT=8080
API_SERVICE_PORT=8081
AUTH_SERVICE_PORT=8082
CLIENT_SERVICE_PORT=8083
MANAGEMENT_SERVICE_PORT=8084

# Development Settings
SPRING_PROFILES_ACTIVE=local
LOG_LEVEL=DEBUG
ENABLE_DEBUG_ENDPOINTS=true
DISABLE_SECURITY_FOR_TESTING=false

# Feature Flags
ENABLE_CHAT_AI=true
ENABLE_DEVICE_MANAGEMENT=true
ENABLE_REAL_TIME_MONITORING=true
ENABLE_ANALYTICS=true

# External Service URLs
FLEET_MDM_API_URL=http://localhost:8080/api/fleet
TACTICAL_RMM_API_URL=http://localhost:8080/api/tactical
MESHCENTRAL_WS_URL=ws://localhost:4433/meshrelay.ashx
```

### Shell Profile Configuration

Add these to your `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# OpenFrame Development Environment
export OPENFRAME_HOME="$HOME/projects/openframe-oss-tenant"
export PATH="$OPENFRAME_HOME/scripts:$PATH"

# Load environment variables
if [ -f "$OPENFRAME_HOME/.env" ]; then
    export $(cat "$OPENFRAME_HOME/.env" | grep -v '#' | xargs)
fi

# Java and Maven configuration
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export MAVEN_HOME="/usr/share/maven"
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"

# Node.js configuration
export NODE_OPTIONS="--max-old-space-size=4096"

# Rust configuration
export CARGO_TARGET_DIR="$HOME/.cargo-target-cache"
export RUSTC_WRAPPER="sccache"  # If using sccache for compilation caching

# Development aliases
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-start="./scripts/run-mac.sh"  # Adjust for your OS
alias of-frontend="cd openframe/services/openframe-frontend && npm run dev"
alias of-logs="docker compose logs -f"
```

## Development Tools and Extensions

### Git Configuration

Configure Git for optimal OpenFrame development:

```bash
# Basic configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# OpenFrame-specific settings
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.autoSetupRemote true

# Useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Commit message template
git config --global commit.template ~/.gitmessage
```

Create `~/.gitmessage`:

```
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Type: feat, fix, docs, style, refactor, test, chore
# Scope: api, auth, client, frontend, docs, etc.
# Subject: Imperative mood, no period, max 50 chars
# Body: What and why, wrap at 72 chars
# Footer: Breaking changes, issue references
```

### Database Tools

#### MongoDB Compass (GUI Tool)

```bash
# macOS
brew install --cask mongodb-compass

# Windows
winget install MongoDB.Compass

# Linux
wget https://downloads.mongodb.com/compass/mongodb-compass_latest_amd64.deb
sudo dpkg -i mongodb-compass_latest_amd64.deb
```

#### DBeaver (Universal Database Tool)

```bash
# macOS
brew install --cask dbeaver-community

# Windows
choco install dbeaver

# Linux
sudo snap install dbeaver-ce
```

### API Testing Tools

#### Insomnia or Postman

```bash
# Insomnia (recommended for GraphQL)
# macOS
brew install --cask insomnia

# Postman (comprehensive API testing)
# macOS
brew install --cask postman
```

Import the OpenFrame API collection from `docs/api/insomnia-collection.json`.

## Development Workflow Setup

### Pre-commit Hooks

Install pre-commit hooks for code quality:

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run on all files (first time)
pre-commit run --all-files
```

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-json
      - id: check-yaml
      - id: check-xml

  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black-jupyter

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.0.0
    hooks:
      - id: prettier
        files: \.(js|ts|vue|json|md)$
```

### Development Scripts

Create helpful development scripts in your `~/bin` directory:

```bash
#!/bin/bash
# ~/bin/of-dev-setup.sh
# Quick development environment setup

set -e

echo "🚀 Setting up OpenFrame development environment..."

# Start required services
echo "📦 Starting Docker services..."
docker compose -f integrated-tools/docker-compose.yml up -d

# Build all services
echo "🏗️  Building Java services..."
mvn clean install -DskipTests

# Install frontend dependencies
echo "📱 Installing frontend dependencies..."
cd openframe/services/openframe-frontend
npm install
cd ../../..

echo "✅ Development environment ready!"
echo "🌐 Start the platform with: ./scripts/run-mac.sh"
```

Make it executable:

```bash
chmod +x ~/bin/of-dev-setup.sh
```

## Performance Optimization

### JVM Tuning for Development

Create `~/.mavenrc` for optimal Maven performance:

```bash
export MAVEN_OPTS="-Xmx4g -Xms2g -XX:+UseG1GC -XX:+UseStringDeduplication -Djava.awt.headless=true"
```

### Docker Performance

#### macOS Docker Configuration

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "features": {
    "buildkit": true
  },
  "resources": {
    "memory": 8192,
    "cpus": 4
  }
}
```

### Node.js Performance

```bash
# Enable faster Node.js operations
export NODE_OPTIONS="--max-old-space-size=4096 --experimental-worker"

# Use pnpm for faster package management
alias npm=pnpm
```

## Troubleshooting Environment Issues

### Common Java Issues

```bash
# Issue: Wrong Java version
java --version
# Expected: openjdk 21.x.x

# Solution: Set JAVA_HOME correctly
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export PATH="$JAVA_HOME/bin:$PATH"
```

### Common Node.js Issues

```bash
# Issue: Node version mismatch
node --version
# Expected: v18.x.x

# Solution: Use nvm to switch versions
nvm install 18
nvm use 18
nvm alias default 18
```

### Common Docker Issues

```bash
# Issue: Docker daemon not running
docker ps
# Error: Cannot connect to the Docker daemon

# Solution: Start Docker service
sudo systemctl start docker  # Linux
open -a Docker  # macOS
```

### IDE Performance Issues

If your IDE is running slowly:

1. **IntelliJ IDEA**:
   ```
   Help → Edit Custom VM Options
   Add: -Xmx8g -XX:+UseG1GC
   ```

2. **VS Code**:
   ```
   Settings → Extensions → disable unused extensions
   Settings → Files → exclude node_modules, target, .git
   ```

## Verification Checklist

Verify your development environment is properly configured:

- [ ] **Java 21** installed and `$JAVA_HOME` configured
- [ ] **Maven 3.9+** installed and configured
- [ ] **Node.js 18+** installed with npm/pnpm
- [ ] **Rust 1.70+** installed with cargo
- [ ] **Docker 24.0+** installed and running
- [ ] **IDE** configured with appropriate plugins
- [ ] **Environment variables** set in shell profile
- [ ] **Git** configured with user information and aliases
- [ ] **Database tools** installed (MongoDB Compass, DBeaver)
- [ ] **API testing tools** installed (Insomnia/Postman)
- [ ] **Pre-commit hooks** installed and working

Run this verification script:

```bash
#!/bin/bash
# Environment verification script

echo "🔍 Verifying OpenFrame development environment..."

# Check Java
if java --version | grep -q "21"; then
    echo "✅ Java 21 installed"
else
    echo "❌ Java 21 not found or wrong version"
fi

# Check Maven
if mvn --version | grep -q "3.9"; then
    echo "✅ Maven 3.9+ installed"
else
    echo "❌ Maven 3.9+ not found"
fi

# Check Node.js
if node --version | grep -q "v18"; then
    echo "✅ Node.js 18+ installed"
else
    echo "❌ Node.js 18+ not found"
fi

# Check Docker
if docker --version | grep -q "24"; then
    echo "✅ Docker 24+ installed"
else
    echo "❌ Docker 24+ not found"
fi

# Check Rust
if rustc --version | grep -q "1.7"; then
    echo "✅ Rust 1.70+ installed"
else
    echo "❌ Rust 1.70+ not found"
fi

echo "🏁 Environment check complete!"
```

## Next Steps

Once your development environment is configured:

1. **[Local Development Setup](./local-development.md)** - Get OpenFrame running locally
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
3. **[Testing Guide](../testing/overview.md)** - Run tests and validate your setup

> **Need Help?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance with environment setup or development questions.