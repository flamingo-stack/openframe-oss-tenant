# Development Environment Setup

This guide walks you through setting up a complete OpenFrame development environment. Follow these steps to configure your IDE, tools, and development workspace for contributing to the OpenFrame platform.

## Overview

Setting up a proper development environment includes:

1. **[IDE Configuration](#ide-configuration)** - IntelliJ IDEA and VSCode setup
2. **[Development Tools](#development-tools)** - Required build tools and utilities  
3. **[Environment Variables](#environment-variables)** - Local development configuration
4. **[Editor Extensions](#editor-extensions)** - Productivity plugins and extensions
5. **[Code Quality Tools](#code-quality-tools)** - Linting, formatting, and analysis

## IDE Configuration

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA is the preferred IDE for OpenFrame backend development.

#### Installation

```bash
# Ubuntu/Debian
sudo snap install intellij-idea-ultimate --classic

# macOS with Homebrew
brew install --cask intellij-idea

# Windows
# Download from https://www.jetbrains.com/idea/
```

#### Essential Plugins

Install these plugins via **Settings → Plugins → Marketplace**:

| Plugin | Purpose | Auto-Install |
|--------|---------|--------------|
| **Spring Boot** | Spring Boot support and tools | ✅ |
| **GraphQL** | GraphQL schema and query support | ✅ |
| **Docker** | Container management | ✅ |
| **Database Tools and SQL** | Database integration | ✅ |
| **Lombok** | Annotation processing | ✅ |
| **SonarLint** | Code quality analysis | ❌ |
| **GitToolBox** | Enhanced Git integration | ❌ |

#### Project Configuration

1. **Import the Project**:
   ```bash
   git clone https://github.com/flamingo-run/openframe.git
   cd openframe
   ```

2. **Open in IntelliJ**:
   - File → Open → Select `openframe` directory
   - Choose "Trust Project" when prompted
   - Wait for Maven indexing to complete

3. **Configure SDK**:
   - File → Project Structure → Project Settings → Project
   - Set Project SDK: **Java 21**
   - Set Project language level: **21 - Sealed types, always-strict floating-point semantics**

4. **Code Style Configuration**:
   ```bash
   # Download Google Java format config
   curl -L https://raw.githubusercontent.com/google/styleguide/gh-pages/intellij-java-google-style.xml \
     -o intellij-java-google-style.xml
   ```
   
   Then import via **Settings → Editor → Code Style → Java → Import Scheme**

#### IntelliJ Run Configurations

Create run configurations for easy service startup:

1. **API Service Configuration**:
   - Run → Edit Configurations → Add New → Spring Boot
   - Main class: `com.openframe.api.ApiApplication`
   - Module: `openframe-api`
   - VM options: `-Xmx2g -Dspring.profiles.active=development`
   - Environment variables: `SPRING_CONFIG_LOCATION=classpath:application-dev.yml`

2. **Gateway Service Configuration**:
   - Main class: `com.openframe.gateway.GatewayApplication`
   - Module: `openframe-gateway`
   - VM options: `-Xmx1g -Dspring.profiles.active=development`

### VSCode (Recommended for Frontend/Full-Stack)

VSCode is excellent for frontend development and full-stack workflows.

#### Installation & Extensions

```bash
# Install VSCode
# Ubuntu/Debian
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update && sudo apt install code

# macOS with Homebrew  
brew install --cask visual-studio-code

# Windows
# Download from https://code.visualstudio.com/
```

#### Essential Extensions

Install via **Extensions Panel (Ctrl+Shift+X)**:

```json
{
  "recommendations": [
    "vue.volar",
    "@vue/typescript-plugin", 
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "redhat.java",
    "vscjava.vscode-spring-boot-dashboard",
    "ms-vscode.vscode-docker",
    "rust-lang.rust-analyzer",
    "tamasfe.even-better-toml",
    "ms-vscode.vscode-graphql"
  ]
}
```

Or install all at once:
```bash
# Create extensions list
cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "vue.volar",
    "@vue/typescript-plugin",
    "bradlc.vscode-tailwindcss", 
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "redhat.java",
    "rust-lang.rust-analyzer"
  ]
}
EOF

# Install recommended extensions
code --install-extension $(cat .vscode/extensions.json | jq -r '.recommendations[]')
```

#### VSCode Configuration

Create workspace settings:

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": true,
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.format.settings.url": "https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml",
  "rust-analyzer.check.command": "clippy"
}
```

#### VSCode Tasks

Create build tasks:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Backend",
      "type": "shell",
      "command": "mvn",
      "args": ["clean", "compile"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always"
      }
    },
    {
      "label": "Build Frontend",
      "type": "shell",
      "command": "npm",
      "args": ["run", "build"],
      "options": {
        "cwd": "${workspaceFolder}/openframe/services/openframe-frontend"
      },
      "group": "build"
    },
    {
      "label": "Build Client",
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

## Development Tools

### Build Tools Installation

#### Java Development Tools

```bash
# Install Maven
# Ubuntu/Debian
sudo apt update && sudo apt install maven

# macOS with Homebrew
brew install maven

# Windows with Chocolatey
choco install maven

# Verify installation
mvn --version
```

#### Node.js Development Tools

```bash
# Install Node.js and npm
# Ubuntu/Debian - using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS with Homebrew
brew install node@18

# Windows with Chocolatey
choco install nodejs

# Install global tools
npm install -g @vue/cli typescript ts-node

# Verify installation
node --version
npm --version
```

#### Rust Development Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install additional tools
cargo install cargo-watch cargo-edit cargo-audit

# Verify installation
rustc --version
cargo --version
```

### Database Tools

#### Database Client Tools

```bash
# MongoDB Compass (GUI)
# Download from https://www.mongodb.com/products/compass

# MongoDB Shell
sudo apt install mongodb-mongosh  # Ubuntu/Debian
brew install mongosh              # macOS

# Redis CLI
sudo apt install redis-tools      # Ubuntu/Debian  
brew install redis               # macOS

# Cassandra CLI (cqlsh)
pip install cassandra-driver cqlsh
```

#### Database Management Scripts

Create convenient database management scripts:

```bash
# scripts/db-reset.sh
#!/bin/bash
set -e

echo "Resetting development databases..."

# Stop services
docker compose -f integrated-tools/docker-compose.base.yml down

# Remove volumes (careful! This deletes all data)
docker volume rm $(docker volume ls -q | grep openframe) 2>/dev/null || true

# Start fresh
docker compose -f integrated-tools/docker-compose.base.yml up -d

# Wait for services
sleep 30

# Run migrations
mvn flyway:migrate -pl openframe-api

echo "Database reset complete!"
```

Make it executable:
```bash
chmod +x scripts/db-reset.sh
```

## Environment Variables

### Development Environment File

Create `.env.development` for local development:

```bash
# Core Configuration
NODE_ENV=development
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=DEBUG

# Database URLs
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0
CASSANDRA_CONTACT_POINTS=localhost:9042
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
PINOT_BROKER_URL=http://localhost:8000

# Security Configuration
JWT_SECRET=dev-super-secure-jwt-secret-change-in-production
ENCRYPTION_KEY=dev-32-char-encryption-key-12345
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Service URLs
OPENFRAME_API_URL=http://localhost:8081
OPENFRAME_GATEWAY_URL=http://localhost:8080
OPENFRAME_AUTH_URL=http://localhost:9000
OPENFRAME_FRONTEND_URL=http://localhost:3000

# OAuth Development Keys (optional)
GOOGLE_CLIENT_ID=your-dev-google-client-id
GOOGLE_CLIENT_SECRET=your-dev-google-client-secret
AZURE_CLIENT_ID=your-dev-azure-client-id
AZURE_CLIENT_SECRET=your-dev-azure-client-secret

# Feature Flags
ENABLE_MINGO_AI=true
ENABLE_FAE_AI=false
ENABLE_ADVANCED_ANALYTICS=true

# Development Tools
HOT_RELOAD=true
SOURCE_MAPS=true
WEBPACK_DEV_SERVER=true
```

### Loading Environment Variables

#### For Java Services (Spring Boot)

```yaml
# config/application-dev.yml
spring:
  profiles: development
  datasource:
    url: ${MONGODB_URI}
  redis:
    url: ${REDIS_URL}
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS}

logging:
  level:
    com.openframe: ${LOG_LEVEL:DEBUG}
    org.springframework.security: DEBUG
    
server:
  port: 8081
```

#### For Frontend (Node.js)

```javascript
// openframe/services/openframe-frontend/.env.development
VITE_API_URL=http://localhost:8080
VITE_WEBSOCKET_URL=ws://localhost:8080/ws
VITE_ENABLE_DEV_TOOLS=true
VITE_LOG_LEVEL=debug
```

#### For Rust Client

```bash
# clients/openframe-client/.env
RUST_LOG=openframe=debug,info
OPENFRAME_SERVER_URL=http://localhost:8080
OPENFRAME_CONFIG_PATH=./config/development.toml
```

## Editor Extensions & Productivity Tools

### Code Formatting & Linting

#### Java (Google Java Format)

```bash
# Install google-java-format
mkdir -p ~/.m2
cat > ~/.m2/settings.xml << 'EOF'
<settings>
  <profiles>
    <profile>
      <id>google-format</id>
      <properties>
        <google.java.format.version>1.17.0</google.java.format.version>
      </properties>
    </profile>
  </profiles>
</settings>
EOF
```

#### TypeScript/Vue (ESLint + Prettier)

```bash
cd openframe/services/openframe-frontend

# Install dev dependencies
npm install --save-dev \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  prettier eslint-plugin-prettier eslint-config-prettier \
  eslint-plugin-vue @vue/eslint-config-typescript

# Create ESLint config
cat > .eslintrc.js << 'EOF'
module.exports = {
  extends: [
    '@vue/typescript/recommended',
    'plugin:vue/vue3-recommended',
    'prettier'
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-unused-vars': 'error'
  }
}
EOF

# Create Prettier config
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
EOF
```

#### Rust (Rustfmt + Clippy)

```bash
cd clients/openframe-client

# Install formatting tools
rustup component add rustfmt clippy

# Create rustfmt config
cat > rustfmt.toml << 'EOF'
max_width = 100
hard_tabs = false
tab_spaces = 4
newline_style = "Unix"
use_small_heuristics = "Default"
EOF
```

## Code Quality Tools

### SonarQube (Code Analysis)

```bash
# Start SonarQube with Docker
docker run -d --name sonarqube \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  -p 9001:9000 sonarqube:latest

# Wait for startup
sleep 60

# Run analysis
mvn sonar:sonar \
  -Dsonar.projectKey=openframe \
  -Dsonar.host.url=http://localhost:9001 \
  -Dsonar.login=admin \
  -Dsonar.password=admin
```

### Pre-commit Hooks

Set up pre-commit hooks to maintain code quality:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
  
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3
        
  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.0.0-alpha.9-for-vscode
    hooks:
      - id: prettier
        files: \.(js|ts|jsx|tsx|vue|css|md|json|yaml|yml)$
EOF

# Install hooks
pre-commit install
```

## Verification & Testing

### Verify Development Setup

Run this verification script to ensure everything is configured correctly:

```bash
#!/bin/bash
# scripts/verify-dev-setup.sh

echo "🔍 Verifying OpenFrame Development Setup..."

# Check Java
echo "☕ Java version:"
java --version || echo "❌ Java not found"

# Check Node.js
echo "📦 Node.js version:"
node --version || echo "❌ Node.js not found"

# Check Rust
echo "🦀 Rust version:"  
rustc --version || echo "❌ Rust not found"

# Check Docker
echo "🐳 Docker version:"
docker --version || echo "❌ Docker not found"

# Check databases
echo "🗄️  Database connectivity:"
docker compose -f integrated-tools/docker-compose.base.yml ps

# Test builds
echo "🔨 Testing builds..."
mvn compile -q && echo "✅ Java build works" || echo "❌ Java build failed"

cd openframe/services/openframe-frontend
npm run type-check && echo "✅ TypeScript compilation works" || echo "❌ TypeScript compilation failed"
cd ../../..

cd clients/openframe-client  
cargo check && echo "✅ Rust compilation works" || echo "❌ Rust compilation failed"
cd ../..

echo "✅ Development setup verification complete!"
```

Make it executable and run:
```bash
chmod +x scripts/verify-dev-setup.sh
./scripts/verify-dev-setup.sh
```

## Troubleshooting Common Issues

### Java Issues

| Problem | Solution |
|---------|----------|
| **Wrong Java version** | `update-alternatives --config java` (Linux) or use SDKMAN |
| **Maven build fails** | Clear cache: `mvn dependency:purge-local-repository` |
| **OutOfMemoryError** | Increase heap: `export MAVEN_OPTS="-Xmx4g"` |

### Node.js Issues

| Problem | Solution |
|---------|----------|
| **npm install fails** | Clear cache: `npm cache clean --force` |
| **Permission errors** | Use nvm or fix npm permissions |
| **Module not found** | Delete node_modules and package-lock.json, reinstall |

### Docker Issues

| Problem | Solution |
|---------|----------|
| **Permission denied** | Add user to docker group: `sudo usermod -aG docker $USER` |
| **Port conflicts** | Check with `netstat -tlnp` and stop conflicting services |
| **Container won't start** | Check logs: `docker logs [container-name]` |

## Next Steps

With your development environment configured, you're ready to:

1. **[Set up local development](./local-development.md)** - Run OpenFrame services locally
2. **[Understand the architecture](../architecture/overview.md)** - Learn the system design
3. **[Run the test suite](../testing/overview.md)** - Verify everything works
4. **[Make your first contribution](../contributing/guidelines.md)** - Join the development effort

## Additional Resources

- **[IntelliJ IDEA Documentation](https://www.jetbrains.com/help/idea/)**
- **[VSCode Java Extension Pack](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack)**
- **[Vue.js Tooling Guide](https://vuejs.org/guide/scaling-up/tooling.html)**
- **[Rust Development Tools](https://forge.rust-lang.org/)**

---

💡 **Having trouble?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help with development setup!