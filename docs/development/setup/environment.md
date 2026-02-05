# Development Environment Setup

This guide covers setting up your development environment for OpenFrame, including IDE configuration, development tools, and editor plugins that will enhance your productivity.

## IDE Recommendations

### Primary IDEs

| IDE | Best For | Strengths |
|-----|----------|-----------|
| **IntelliJ IDEA Ultimate** | Java backend services | Excellent Spring Boot support, built-in database tools |
| **VS Code** | Full-stack development | Great for TypeScript/Vue, Rust support, lightweight |
| **WebStorm** | Frontend development | Advanced TypeScript/Vue features, refactoring tools |

### IDE Setup Instructions

#### IntelliJ IDEA Ultimate

**Installation:**
```bash
# macOS
brew install --cask intellij-idea

# Linux (snap)
sudo snap install intellij-idea-ultimate --classic

# Or download from JetBrains website
```

**Required Plugins:**
1. **Spring Boot** - Pre-installed
2. **GraphQL** - For .graphqls files
3. **Docker** - Container management
4. **Database Tools** - Pre-installed
5. **Vue.js** - Frontend support
6. **Rust** - If working on client

**Configuration:**
1. **Import Project**: File → Open → Select `openframe-oss-tenant` directory
2. **Set JDK**: File → Project Structure → Project SDK → Java 21
3. **Maven Settings**: File → Settings → Build Tools → Maven
   - Maven home: `/usr/share/maven` (or Homebrew path)
   - User settings file: `~/.m2/settings.xml`
4. **Code Style**: Import `./ide/intellij/OpenFrame-CodeStyle.xml`

#### VS Code

**Installation:**
```bash
# Install VS Code
curl -fSsL https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64 -o vscode.deb
sudo dpkg -i vscode.deb

# Or via package manager
brew install --cask visual-studio-code
```

**Essential Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-java-pack",
    "vmware.vscode-spring-boot",
    "GraphQL.vscode-graphql",
    "Vue.volar",
    "ms-vscode.vscode-typescript-next",
    "rust-lang.rust-analyzer",
    "ms-azuretools.vscode-docker",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

**Workspace Configuration** (`.vscode/settings.json`):
```json
{
  "java.configuration.updateBuildConfiguration": "automatic",
  "java.compile.nullAnalysis.mode": "automatic",
  "spring-boot.ls.java.home": "/usr/lib/jvm/java-21-openjdk",
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": false,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Development Tools Setup

### Java Development Tools

#### Maven Configuration

**Global Settings** (`~/.m2/settings.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <profiles>
    <profile>
      <id>openframe-dev</id>
      <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>openframe-dev</activeProfile>
  </activeProfiles>
</settings>
```

#### Spring Boot Developer Tools

**Enable DevTools** (automatically included in development):
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-devtools</artifactId>
  <scope>runtime</scope>
  <optional>true</optional>
</dependency>
```

**DevTools Configuration** (`application-dev.yml`):
```yaml
spring:
  devtools:
    restart:
      enabled: true
      exclude: "static/**,public/**,templates/**"
    livereload:
      enabled: true
      port: 35729
  h2:
    console:
      enabled: true # For testing
```

### Frontend Development Tools

#### Node.js Version Management

**Using NVM (recommended):**
```bash
# Install Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verify versions
node --version  # v20.x.x
npm --version   # 10.x.x
```

#### Vue.js Developer Tools

**Browser Extensions:**
- **Chrome**: [Vue DevTools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- **Firefox**: [Vue DevTools](https://addons.mozilla.org/firefox/addon/vue-js-devtools/)

**Vite Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      port: 3001
    }
  },
  optimizeDeps: {
    include: ['vue', 'pinia', '@apollo/client']
  }
})
```

### Rust Development Tools

#### Rust Toolchain

**Install Rust and Components:**
```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install additional components
rustup component add rustfmt clippy rust-src

# Install cargo tools
cargo install cargo-watch cargo-edit cargo-audit
```

#### VS Code Rust Configuration

**Settings for Rust** (`.vscode/settings.json`):
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.inlayHints.typeHints.enable": true,
  "rust-analyzer.inlayHints.parameterHints.enable": true
}
```

## Environment Variables

### Development Environment File

Create `.env.development` in the project root:

```bash
# OpenFrame Configuration
OPENFRAME_ENV=development
OPENFRAME_HOME=/path/to/openframe-oss-tenant

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
CASSANDRA_CONTACT_POINTS=localhost:9042
PINOT_BROKER_URL=http://localhost:8000

# Security Configuration
JWT_SECRET=development-secret-change-in-production
OAUTH2_CLIENT_ID=openframe-dev
OAUTH2_CLIENT_SECRET=dev-secret

# API Configuration
GATEWAY_PORT=8080
API_PORT=8081
AUTH_PORT=8082
MANAGEMENT_PORT=8083
STREAM_PORT=8084
EXTERNAL_API_PORT=8085

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8080
VITE_GRAPHQL_URL=http://localhost:8080/graphql
VITE_WS_URL=ws://localhost:8080/ws

# Logging Configuration
LOG_LEVEL=DEBUG
LOG_ROOT_LEVEL=INFO
```

### Shell Profile Setup

**Add to `.bashrc` or `.zshrc`:**
```bash
# OpenFrame Development
export OPENFRAME_HOME="$HOME/workspace/openframe-oss-tenant"
export PATH="$OPENFRAME_HOME/scripts:$PATH"

# Java
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export MAVEN_OPTS="-Xmx2g -XX:ReservedCodeCacheSize=1g"

# Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Rust
export PATH="$HOME/.cargo/bin:$PATH"
export RUST_BACKTRACE=1

# Development aliases
alias of-start="cd $OPENFRAME_HOME && ./scripts/run-linux.sh"
alias of-frontend="cd $OPENFRAME_HOME/openframe/services/openframe-frontend && npm run dev"
alias of-client="cd $OPENFRAME_HOME/clients/openframe-client && cargo run"
alias of-logs="docker compose logs -f"
alias of-reset="docker compose down && docker compose up -d"
```

## Git Configuration

### Git Hooks

**Pre-commit Hook** (`.git/hooks/pre-commit`):
```bash
#!/bin/bash
set -e

echo "Running pre-commit checks..."

# Java formatting check
if git diff --cached --name-only | grep -E '\.(java)$' > /dev/null; then
    echo "Checking Java formatting..."
    mvn spotless:check -q
fi

# TypeScript/Vue linting
if git diff --cached --name-only | grep -E '\.(ts|vue|js)$' > /dev/null; then
    echo "Running ESLint..."
    cd openframe/services/openframe-frontend
    npm run lint:check
    cd ../../..
fi

# Rust formatting
if git diff --cached --name-only | grep -E '\.(rs)$' > /dev/null; then
    echo "Checking Rust formatting..."
    cd clients/openframe-client
    cargo fmt -- --check
    cargo clippy -- -D warnings
    cd ../..
fi

echo "Pre-commit checks passed!"
```

**Make executable:**
```bash
chmod +x .git/hooks/pre-commit
```

### Git Configuration

```bash
# Set user information
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Useful aliases
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
git config alias.visual '!gitk'

# Better diffs for binary files
git config diff.bin.textconv hexdump
git config diff.bin.binary true
```

## Database Tools

### MongoDB Compass

**Installation:**
```bash
# Download and install MongoDB Compass
# macOS
brew install --cask mongodb-compass

# Linux
wget https://downloads.mongodb.com/compass/mongodb-compass_latest_amd64.deb
sudo dpkg -i mongodb-compass_latest_amd64.deb
```

**Connection String:**
```text
mongodb://localhost:27017/openframe
```

### DBeaver (Multi-database tool)

**Installation:**
```bash
# macOS
brew install --cask dbeaver-community

# Linux
sudo snap install dbeaver-ce
```

**Supported Connections:**
- MongoDB (via MongoDB plugin)
- Redis (via Redis plugin)  
- Cassandra (built-in support)

## Container Tools

### Docker Desktop

**macOS/Windows:**
- Download from [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Configure resources: 8GB RAM, 4 CPUs

**Linux:**
```bash
# Install Docker Engine
sudo apt update
sudo apt install docker.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
```

### Docker Compose Configuration

**Override for Development** (`docker-compose.override.yml`):
```yaml
version: '3.8'
services:
  mongodb:
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=openframe
    volumes:
      - ./data/mongo:/data/db

  kafka:
    environment:
      - KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
    ports:
      - "9092:9092"

  redis:
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  pinot-controller:
    ports:
      - "9000:9000"
```

## Testing Tools

### API Testing

**Postman Collections:**
```bash
# Import OpenFrame collection
curl -O https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/postman/OpenFrame-API.postman_collection.json
```

**Thunder Client (VS Code):**
- Install Thunder Client extension
- Import collection from `./postman/` directory

### Load Testing

**K6 Installation:**
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Performance Monitoring

### JVM Monitoring

**VisualVM:**
```bash
# macOS
brew install --cask visualvm

# Connect to local Java processes
# Use PID or JMX connection
```

**Application Performance Monitoring:**
```yaml
# application-dev.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

### Frontend Performance

**Vue DevTools Performance:**
1. Install Vue DevTools browser extension
2. Enable Performance tab
3. Profile component renders and updates

**Lighthouse CI:**
```bash
npm install -g @lhci/cli
lhci autorun --upload.target=temporary-public-storage
```

## Troubleshooting Environment Issues

### Java Issues
```bash
# Check Java version
java --version
javac --version

# Clear Maven cache
rm -rf ~/.m2/repository

# Reset JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"  # Linux
```

### Node.js Issues
```bash
# Clear npm cache
npm cache clean --force

# Reset node_modules
rm -rf node_modules package-lock.json
npm install

# Check Node version
nvm current
nvm list
```

### Docker Issues
```bash
# Reset Docker
docker system prune -a
docker compose down
docker compose up -d

# Check container logs
docker compose logs mongodb
docker compose logs kafka
```

## Next Steps

Now that your environment is configured:

1. **[Local Development Guide](local-development.md)** - Learn to run and debug OpenFrame locally
2. **Start Development** - Pick up a beginner-friendly issue
3. **Join Community** - Get help on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

Your development environment is now ready for OpenFrame development! 🚀