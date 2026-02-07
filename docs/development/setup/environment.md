# Development Environment Setup

This guide helps you configure your development environment for OpenFrame development, including IDE setup, required plugins, and optimal configurations for productive development.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA provides excellent support for Spring Boot, Maven, and the OpenFrame technology stack.

#### Installation
```bash
# macOS with Homebrew
brew install --cask intellij-idea

# Or download from JetBrains website
# https://www.jetbrains.com/idea/
```

#### Required Plugins
Install these plugins via **Settings** → **Plugins**:

| Plugin | Purpose |
|---------|---------|
| **Spring Boot** | Spring application support |
| **Kubernetes** | Kubernetes YAML and deployment support |
| **Docker** | Docker and Docker Compose integration |
| **GraphQL** | GraphQL schema and query support |
| **Vue.js** | Vue.js template and component support |
| **Database Tools and SQL** | Database integration |
| **Lombok** | Java code generation support |

#### Configuration Settings

**Java SDK Configuration:**
1. Go to **File** → **Project Structure** → **Project**
2. Set **Project SDK** to Java 21
3. Set **Project Language Level** to "21 - Pattern matching for switch"

**Maven Configuration:**
1. **Settings** → **Build Tools** → **Maven**
2. Set **Maven home directory** to your Maven installation
3. Enable **Import Maven projects automatically**
4. Set **JVM Options** for Maven: `-Xmx4g -XX:MaxMetaspaceSize=1g`

**Code Style:**
1. **Settings** → **Editor** → **Code Style** → **Java**
2. Import the OpenFrame code style settings:
```bash
# Download the code style configuration
curl -o intellij-openframe-codestyle.xml \
  https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/.idea/codeStyles/intellij-openframe-codestyle.xml

# Import via Settings → Editor → Code Style → Java → Gear Icon → Import Scheme
```

### Visual Studio Code (Recommended for Frontend Development)

VS Code provides excellent TypeScript, Vue.js, and multi-language support.

#### Installation
```bash
# macOS with Homebrew
brew install --cask visual-studio-code

# Linux (Ubuntu/Debian)
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code
```

#### Essential Extensions

Install these extensions via the Extensions panel (`Ctrl+Shift+X`):

**Java & Spring:**
```bash
# Install Java Extension Pack
code --install-extension vscjava.vscode-java-pack

# Install Spring Boot Extensions
code --install-extension vmware.vscode-spring-boot
code --install-extension vscjava.vscode-spring-boot-dashboard
```

**Frontend Development:**
```bash
# Vue.js support
code --install-extension Vue.volar

# TypeScript support
code --install-extension ms-vscode.vscode-typescript-next

# GraphQL support
code --install-extension GraphQL.vscode-graphql

# Prettier code formatting
code --install-extension esbenp.prettier-vscode

# ESLint linting
code --install-extension dbaeumer.vscode-eslint
```

**DevOps & Infrastructure:**
```bash
# Docker support
code --install-extension ms-azuretools.vscode-docker

# Kubernetes support
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools

# YAML support
code --install-extension redhat.vscode-yaml
```

**Rust Development:**
```bash
# Rust Analyzer
code --install-extension rust-lang.rust-analyzer

# Crates support
code --install-extension serayuzgur.crates
```

#### VS Code Settings

Create `.vscode/settings.json` in your workspace:

```json
{
  "java.home": "/path/to/java21",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java21",
      "default": true
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": true,
  "prettier.configPath": ".prettierrc",
  "eslint.workingDirectories": [
    "openframe/services/openframe-frontend"
  ],
  "files.associations": {
    "*.yml": "yaml",
    "docker-compose*.yml": "dockercompose"
  },
  "rust-analyzer.cargo.features": "all"
}
```

### Eclipse IDE (Alternative for Java)

If you prefer Eclipse for Java development:

#### Installation
```bash
# Download Eclipse IDE for Enterprise Java Developers
# https://www.eclipse.org/downloads/packages/

# macOS with Homebrew
brew install --cask eclipse-jee
```

#### Required Plugins
- **Spring Tools 4 (ST4)**: Spring Boot development
- **m2e (Maven Integration)**: Maven project support
- **Docker Tools**: Docker integration
- **TypeScript IDE**: If working with frontend code

## Environment Variables

Set these environment variables in your shell profile (`.bashrc`, `.zshrc`, etc.):

### Required Variables
```bash
# Java Development
export JAVA_HOME="/path/to/java21"
export PATH="$JAVA_HOME/bin:$PATH"

# Maven Configuration
export MAVEN_HOME="/path/to/maven"
export PATH="$MAVEN_HOME/bin:$PATH"
export MAVEN_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1g"

# Docker Configuration
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Node.js Configuration
export NODE_OPTIONS="--max-old-space-size=8192"
```

### Development-Specific Variables
```bash
# OpenFrame Development
export SPRING_PROFILES_ACTIVE="local,dev"
export LOG_LEVEL="DEBUG"
export OPENFRAME_ENV="development"

# Database Configuration (for local development)
export MONGO_HOST="localhost"
export MONGO_PORT="27017"
export REDIS_HOST="localhost"  
export REDIS_PORT="6379"

# GitHub Access (for private dependencies)
export GITHUB_TOKEN="ghp_xxxxxxxxxx"

# Docker Registry (if using private registry)
export DOCKER_REGISTRY="your-registry.com"
```

## Git Configuration

Configure Git for OpenFrame development:

### Basic Configuration
```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Set default branch name
git config --global init.defaultBranch main

# Enable helpful features
git config --global pull.rebase false
git config --global push.default simple
git config --global core.autocrlf input  # Linux/Mac
git config --global core.autocrlf true   # Windows
```

### OpenFrame-Specific Configuration
```bash
# Set up useful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit
git config --global alias.ps push
git config --global alias.pl pull

# Configure merge tool (if using IntelliJ)
git config --global merge.tool intellij
git config --global mergetool.intellij.cmd 'idea merge $(cd $(dirname "$LOCAL") && pwd)/$(basename "$LOCAL") $(cd $(dirname "$REMOTE") && pwd)/$(basename "$REMOTE") $(cd $(dirname "$BASE") && pwd)/$(basename "$BASE") $(cd $(dirname "$MERGED") && pwd)/$(basename "$MERGED")'
```

### SSH Key Setup (for GitHub Access)
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your.email@company.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub | pbcopy  # macOS
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard  # Linux

# Add the key to your GitHub account
# Go to GitHub → Settings → SSH and GPG keys → New SSH key
```

## Database Tools

### MongoDB Compass (Recommended)
GUI tool for MongoDB development and debugging:

```bash
# macOS
brew install --cask mongodb-compass

# Linux/Windows: Download from MongoDB website
# https://www.mongodb.com/products/compass
```

**Connection Settings for Local Development:**
```bash
Connection String: mongodb://localhost:27017
Database: openframe_local
```

### Redis CLI
Command-line interface for Redis:

```bash
# macOS
brew install redis

# Ubuntu/Debian  
sudo apt-get install redis-tools

# Connect to local Redis
redis-cli -h localhost -p 6379
```

### DBeaver (Universal Database Tool)
For managing multiple database types:

```bash
# macOS
brew install --cask dbeaver-community

# Ubuntu/Debian
sudo snap install dbeaver-ce
```

## Docker Development Setup

### Docker Configuration
Optimize Docker for development:

```bash
# Create or edit ~/.docker/daemon.json
{
  "experimental": true,
  "features": {
    "buildkit": true
  },
  "insecure-registries": ["localhost:5000"],
  "registry-mirrors": [
    "https://mirror.gcr.io"
  ]
}
```

### Docker Compose Override
Create `docker-compose.override.yml` for local development customizations:

```yaml
version: '3.8'
services:
  mongo:
    ports:
      - "27017:27017"
    volumes:
      - "./data/mongo:/data/db"
  
  redis:
    ports:
      - "6379:6379"
  
  kafka:
    ports:
      - "9092:9092"
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
```

## Browser Extensions for Development

### GraphQL Development
- **GraphQL Playground**: Interactive GraphQL IDE
- **Apollo Client Devtools**: Debug GraphQL queries and cache

### Vue.js Development  
- **Vue.js devtools**: Debug Vue components and Pinia stores

### General Development
- **JSON Viewer**: Format and inspect JSON responses
- **Redux DevTools**: Debug application state (works with Pinia)

## Terminal Setup

### Recommended Terminal: iTerm2 (macOS) / Alacritty (Cross-platform)

```bash
# macOS - iTerm2
brew install --cask iterm2

# Cross-platform - Alacritty
brew install --cask alacritty  # macOS
sudo snap install alacritty    # Linux
```

### Shell Configuration (Zsh Recommended)

```bash
# Install Oh My Zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Useful plugins for development
plugins=(git maven docker docker-compose node npm yarn rust)

# Add to ~/.zshrc
```

### Useful CLI Tools
```bash
# HTTP testing
brew install httpie

# JSON processing
brew install jq

# File searching
brew install fzf

# Modern ls replacement
brew install exa

# Modern cat replacement  
brew install bat

# Docker management
brew install lazydocker
```

## Performance Optimization

### Java Development
```bash
# Increase IntelliJ memory
# Edit idea.vmoptions file:
-Xms2g
-Xmx8g
-XX:MaxMetaspaceSize=2g

# Speed up Maven builds
export MAVEN_OPTS="-Xmx4g -XX:+TieredCompilation -XX:TieredStopAtLevel=1"
```

### Node.js Development
```bash
# Increase Node.js memory for large builds
export NODE_OPTIONS="--max-old-space-size=8192"

# Enable npm performance features
npm config set progress=false
npm config set audit=false
```

### Docker Performance
```bash
# Allocate more resources to Docker Desktop
# Settings → Resources:
# CPUs: 4-8 cores
# Memory: 8-16 GB
# Disk: 100+ GB
```

## Debugging Configuration

### Java Remote Debugging
```bash
# Add to your service startup command
-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005

# Connect from IDE to localhost:5005
```

### Frontend Debugging
```bash
# Vue.js devtools integration
cd openframe/services/openframe-frontend
npm run dev -- --debug

# TypeScript debugging in VS Code
# Create .vscode/launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch", 
      "name": "Debug Frontend",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/vite",
      "args": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Troubleshooting Common Issues

### Java Version Conflicts
```bash
# List all Java installations (macOS)
/usr/libexec/java_home -V

# Set specific Java version
export JAVA_HOME=`/usr/libexec/java_home -v 21`

# Verify version
java -version
```

### Maven Issues
```bash
# Clear Maven cache
mvn dependency:purge-local-repository

# Force update dependencies
mvn clean install -U

# Skip tests for faster builds
mvn clean install -DskipTests
```

### Docker Issues
```bash
# Reset Docker to defaults
docker system prune -a
docker volume prune

# Restart Docker service
sudo systemctl restart docker  # Linux
# or restart Docker Desktop
```

### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Reset node_modules
rm -rf node_modules package-lock.json
npm install

# Use correct Node version
nvm use 18  # if using nvm
```

## Next Steps

After setting up your development environment:

1. **Continue to [Local Development Setup](local-development.md)** to get OpenFrame running locally
2. **Review [Architecture Overview](../architecture/overview.md)** to understand the system design
3. **Check [Contributing Guidelines](../contributing/guidelines.md)** for development workflow

---

Your development environment is now optimized for OpenFrame development! You're ready to build, test, and contribute to the platform.