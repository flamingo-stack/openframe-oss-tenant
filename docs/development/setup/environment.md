# Development Environment Setup

This guide helps you configure the perfect development environment for OpenFrame, covering IDE setup, required tools, environment variables, and editor configurations.

## IDE Recommendations

### Primary IDEs

**Java Development:**
- **IntelliJ IDEA Ultimate** (Recommended)
  - Excellent Spring Boot support
  - Built-in GraphQL tooling
  - Superior refactoring capabilities
  - Database integration

- **Eclipse with Spring Tools**
  - Free alternative
  - Good Maven integration
  - Spring Boot dashboard

**Frontend Development:**
- **VS Code** (Recommended)
  - Excellent Vue.js support via Vetur/Vue Language Features
  - TypeScript integration
  - GraphQL tooling
  - Integrated terminal

- **WebStorm**
  - Premium JetBrains option
  - Outstanding TypeScript support
  - Advanced refactoring

### Multi-Language IDEs

For full-stack development:

- **IntelliJ IDEA Ultimate** + JavaScript plugin
- **VS Code** with Java Extension Pack
- **Cursor** — AI-enhanced VS Code alternative

## Required Development Tools

### Core Tools Table

| Tool | Version | Purpose | Installation |
|------|---------|---------|-------------|
| **Java JDK** | 21+ | Backend development | `sdk install java 21.0.1-tem` |
| **Maven** | 3.9+ | Java build tool | `brew install maven` |
| **Node.js** | 18+ LTS | Frontend development | `nvm install --lts` |
| **npm** | 9+ | Package manager | Included with Node.js |
| **Docker** | 24+ | Containerization | `brew install --cask docker` |
| **Git** | 2.40+ | Version control | `brew install git` |

### Optional Tools

| Tool | Purpose | Installation |
|------|---------|-------------|
| **SDKMAN** | Java version management | `curl -s "https://get.sdkman.io" \| bash` |
| **NVM** | Node.js version management | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh \| bash` |
| **kubectl** | Kubernetes management | `brew install kubectl` |
| **Helm** | Kubernetes package manager | `brew install helm` |

### Installation Commands by Platform

**macOS (Homebrew):**
```bash
# Install development tools
brew install openjdk@21 maven node docker git
brew install --cask intellij-idea

# Link Java
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

**Ubuntu/Debian:**
```bash
# Install OpenJDK 21
sudo apt update
sudo apt install openjdk-21-jdk maven nodejs npm docker.io git

# Install VS Code
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update && sudo apt install code
```

**Windows (Chocolatey):**
```powershell
# Install via Chocolatey
choco install openjdk21 maven nodejs docker-desktop git
choco install intellijidea-ultimate

# Or use Windows Subsystem for Linux (WSL2)
wsl --install
```

## Environment Variables Configuration

### Core Development Variables

Create a `.env.development` file in your project root:

```bash
# === Tenant Configuration ===
TENANT_DOMAIN=dev.openframe.local
TENANT_NAME=Development Tenant
OPENFRAME_ENV=development

# === Database Configuration ===
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0

# === Kafka Configuration ===
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_CONSUMER_GROUP=openframe-dev

# === Security Configuration ===
JWT_SECRET=dev-secret-key-change-in-production-min-256-bits
ENCRYPTION_KEY=dev-encryption-key-32-characters
OAUTH2_ISSUER_URI=http://localhost:8081
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# === Service Ports ===
GATEWAY_PORT=8443
API_PORT=8082
AUTH_PORT=8081
FRONTEND_PORT=3000
MANAGEMENT_PORT=8084

# === Development Features ===
DEBUG_MODE=true
HOT_RELOAD=true
SKIP_EMAIL_VERIFICATION=true
ENABLE_DEV_TOOLS=true

# === External Services (Optional) ===
SMTP_HOST=localhost
SMTP_PORT=1025
HUBSPOT_API_KEY=your-dev-hubspot-key
```

### Platform-Specific Variables

**macOS:**
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export M2_HOME=/opt/homebrew/Cellar/maven/3.9.5/libexec
export PATH=$JAVA_HOME/bin:$M2_HOME/bin:$PATH
```

**Linux:**
```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export M2_HOME=/usr/share/maven
export PATH=$JAVA_HOME/bin:$M2_HOME/bin:$PATH
```

**Windows:**
```cmd
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.1.12-hotspot
set M2_HOME=C:\Program Files\Apache\apache-maven-3.9.5
set PATH=%JAVA_HOME%\bin;%M2_HOME%\bin;%PATH%
```

### Loading Environment Variables

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
# OpenFrame Development Environment
if [ -f ~/openframe-oss-tenant/.env.development ]; then
  export $(cat ~/openframe-oss-tenant/.env.development | grep -v '#' | xargs)
fi

# Java and Maven
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export M2_HOME=/opt/homebrew/Cellar/maven/3.9.5/libexec
export PATH=$JAVA_HOME/bin:$M2_HOME/bin:$PATH

# Node.js via NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

## IDE Configuration

### IntelliJ IDEA Setup

**1. Import Project:**
```text
File → Open → Select openframe-oss-tenant directory
Choose "Maven" project type
Import all modules
```

**2. Configure JDK:**
```text
File → Project Structure → Project Settings → Project
Project SDK: 21 (java version "21.0.1")
Project Language Level: 21 - Pattern matching for switch
```

**3. Install Required Plugins:**
```text
File → Settings → Plugins → Install:
- GraphQL (official)
- Docker (bundled)  
- Vue.js (official)
- Kubernetes (bundled)
- Spring Boot (bundled)
```

**4. Configure Code Style:**
```text
File → Settings → Editor → Code Style
Scheme: Default
Java → Tabs and Indents → Use tab character: false
Java → Tabs and Indents → Tab size: 4, Indent: 4
JavaScript → Tabs and Indents → Tab size: 2, Indent: 2
```

**5. Spring Boot Configuration:**
```text
File → Settings → Build → Compiler
Build project automatically: ✓
Advanced Settings → Compiler → Auto-make enabled for started applications
```

### VS Code Setup

**1. Install Extensions:**
```bash
# Core extensions
code --install-extension ms-vscode.vscode-java-pack
code --install-extension Vue.volar
code --install-extension ms-azuretools.vscode-docker
code --install-extension GraphQL.vscode-graphql

# Additional useful extensions
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension redhat.vscode-yaml
```

**2. Configure Settings:**

Create `.vscode/settings.json`:
```json
{
  "java.home": "/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home"
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "typescript.preferences.quoteStyle": "single",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "vue.server.hybridMode": false,
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[java]": {
    "editor.defaultFormatter": "redhat.java"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**3. Configure Launch Configurations:**

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Launch OpenFrame API",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "env": {
        "SPRING_PROFILES_ACTIVE": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Frontend Dev Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend"
    }
  ]
}
```

## Editor Extensions and Plugins

### Essential Extensions by Technology

**Java Development:**
- **SonarLint**: Code quality analysis
- **CheckStyle**: Code style enforcement
- **SpotBugs**: Bug detection
- **JPA Buddy**: JPA entity management

**Frontend Development:**
- **Vue Language Features (Volar)**: Vue 3 support
- **TypeScript Hero**: TypeScript refactoring
- **Auto Rename Tag**: HTML tag sync
- **Bracket Pair Colorizer**: Visual bracket matching

**GraphQL Development:**
- **GraphQL**: Syntax highlighting and validation
- **Apollo GraphQL**: Enhanced GraphQL tooling
- **GraphQL Voyager**: Schema visualization

**DevOps & Infrastructure:**
- **Docker**: Container management
- **Kubernetes**: K8s resource management
- **YAML**: YAML syntax support
- **Remote - SSH**: Remote development

### Code Quality Tools

**Java:**
```bash
# Install SpotBugs
mvn dependency:get -Dartifact=com.github.spotbugs:spotbugs-maven-plugin:4.7.3.6

# Install Checkstyle
mvn dependency:get -Dartifact=org.apache.maven.plugins:maven-checkstyle-plugin:3.3.0
```

**Frontend:**
```bash
cd openframe/services/openframe-frontend

# Install ESLint and Prettier
npm install --save-dev eslint prettier @typescript-eslint/parser
npm install --save-dev @vue/eslint-config-typescript
```

## Database Tools

### MongoDB Management

**MongoDB Compass** (Recommended):
```bash
# macOS
brew install --cask mongodb-compass

# Ubuntu
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb
```

**Connection String for Development:**
```text
mongodb://localhost:27017/openframe_dev
```

### Redis Management

**RedisInsight**:
```bash
# macOS  
brew install --cask redisinsight

# Or use Redis CLI
brew install redis
redis-cli -h localhost -p 6379
```

### Database IDE Integration

**IntelliJ Database Tool:**
```text
View → Tool Windows → Database
Add Data Source → MongoDB/Redis
Configure connection details
```

## Performance Optimization

### JVM Configuration

For development, create `openframe-dev.properties`:
```properties
# JVM Memory Settings
JAVA_OPTS=-Xmx4g -Xms2g -XX:+UseG1GC
MAVEN_OPTS=-Xmx2g -XX:+TieredCompilation -XX:TieredStopAtLevel=1

# Spring Boot Development
spring.devtools.restart.enabled=true
spring.devtools.livereload.enabled=true
spring.jpa.show-sql=true
logging.level.org.springframework=DEBUG
```

### Node.js Optimization

Configure npm for faster installs:
```bash
# Use npm cache
npm config set cache ~/.npm-cache

# Increase memory for Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Use faster registry (optional)
npm config set registry https://registry.npmjs.org/
```

### Docker Development

Optimize Docker for development:
```bash
# Increase Docker memory (macOS)
# Docker Desktop → Resources → Advanced → Memory: 8GB

# Use BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Configure Docker daemon
echo '{
  "debug": false,
  "experimental": false,
  "features": {
    "buildkit": true
  }
}' > ~/.docker/daemon.json
```

## Verification and Testing

### Environment Verification

Run this script to verify your setup:

```bash
#!/bin/bash
echo "=== OpenFrame Development Environment Check ==="

# Java
echo "Java Version:"
java --version

echo -e "\nMaven Version:"
mvn --version

# Node.js
echo -e "\nNode.js Version:"
node --version
npm --version

# Docker
echo -e "\nDocker Version:"
docker --version
docker compose version

# Environment Variables
echo -e "\nEnvironment Variables:"
echo "JAVA_HOME: `$JAVA_HOME`"
echo "M2_HOME: `$M2_HOME`"
echo "NODE_VERSION: `$NODE_VERSION`"

# Database Connectivity
echo -e "\nDatabase Connectivity:"
echo "Testing MongoDB..."
docker run --rm mongo:7 mongosh --eval "print('MongoDB connection test')" --quiet

echo "Testing Redis..."
docker run --rm redis:7 redis-cli ping

echo -e "\n=== Environment Check Complete ==="
```

### Quick Build Test

Verify your environment can build OpenFrame:

```bash
# Clone if not already done
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Test Java build
mvn clean compile -DskipTests

# Test frontend build
cd openframe/services/openframe-frontend
npm install
npm run build

echo "✅ Environment setup successful!"
```

## Troubleshooting

### Common Issues

**Java Issues:**
```bash
# Wrong Java version
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Maven not finding JDK
mvn -version  # Check Maven's Java version
```

**Node.js Issues:**
```bash
# Clear npm cache
npm cache clean --force

# Reset node_modules
rm -rf node_modules package-lock.json
npm install
```

**Docker Issues:**
```bash
# Docker daemon not running
sudo systemctl start docker  # Linux
open -a Docker  # macOS

# Permission denied
sudo usermod -aG docker `$USER`  # Logout/login required
```

**Environment Variables:**
```bash
# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc

# Check if variables are loaded
env | grep JAVA_HOME
```

## Next Steps

With your development environment set up:

1. **[Local Development Guide](local-development.md)** — Clone, build, and run OpenFrame
2. **[Architecture Overview](../architecture/overview.md)** — Understand the system design
3. **[Contributing Guidelines](../contributing/guidelines.md)** — Learn coding standards and workflow

---

Need help? Join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time developer support.