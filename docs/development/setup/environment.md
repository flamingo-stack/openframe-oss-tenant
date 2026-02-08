# Development Environment Setup

This guide walks you through setting up a productive development environment for OpenFrame, including IDE configuration, development tools, and debugging setup.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java)

IntelliJ IDEA provides excellent support for Spring Boot, GraphQL, and multi-module Maven projects.

#### Installation

```bash
# macOS
brew install intellij-idea

# Ubuntu/Debian (via Snap)
sudo snap install intellij-idea-community --classic

# Or download from: https://www.jetbrains.com/idea/
```

#### Required Plugins

Install these essential plugins via **File → Settings → Plugins**:

| Plugin | Purpose |
|--------|---------|
| **Spring Boot** | Spring Boot support and tooling |
| **GraphQL** | GraphQL schema and query support |
| **Lombok** | Java boilerplate code generation |
| **Maven Helper** | Advanced Maven project support |
| **Docker** | Docker container management |
| **Database Tools** | MongoDB and SQL database access |

#### Project Configuration

1. **Import Project**
   ```text
   File → Open → Select openframe-oss-tenant folder
   Choose "Import Maven projects automatically"
   ```

2. **Configure JDK**
   ```text
   File → Project Structure → Project Settings → Project
   Project SDK: 21 (OpenJDK 21)
   Project language level: 21
   ```

3. **Maven Settings**
   ```text
   File → Settings → Build Tools → Maven
   Maven home path: [Auto-detected or /usr/local/maven]
   User settings file: ~/.m2/settings.xml
   Local repository: ~/.m2/repository
   ```

4. **Spring Boot Configuration**
   ```text
   Run → Edit Configurations → Add New → Spring Boot
   Main class: com.openframe.api.ApiApplication
   Program arguments: --spring.profiles.active=development
   VM options: -Xmx2g -XX:+UseG1GC
   ```

### Visual Studio Code (Recommended for Frontend)

VS Code provides excellent TypeScript and React development support.

#### Installation

```bash
# macOS
brew install visual-studio-code

# Ubuntu/Debian
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update && sudo apt install code
```

#### Essential Extensions

Install these extensions via **Extensions** panel (Ctrl+Shift+X):

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "GraphQL.vscode-graphql",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-docker"
  ]
}
```

#### VS Code Settings

Create `.vscode/settings.json` in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/.turbo": true
  }
}
```

#### Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/openframe/services/openframe-frontend/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

## Development Tools Setup

### Git Configuration

Configure Git with your development preferences:

```bash
# Set up user information
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Configure useful aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit
git config --global alias.lg "log --oneline --graph --all"

# Set up merge tool (optional)
git config --global merge.tool vimdiff

# Enable colored output
git config --global color.ui auto
```

### Maven Configuration

Create or update `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
                             http://maven.apache.org/xsd/settings-1.0.0.xsd">
  
  <profiles>
    <profile>
      <id>development</id>
      <properties>
        <maven.test.skip>false</maven.test.skip>
        <spring.profiles.active>development</spring.profiles.active>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>development</activeProfile>
  </activeProfiles>
  
  <!-- Optional: Configure local repository -->
  <localRepository>${user.home}/.m2/repository</localRepository>
</settings>
```

### Node.js Configuration

Configure npm for optimal development:

```bash
# Set registry (if using private registry)
npm config set registry https://registry.npmjs.org/

# Configure cache location
npm config set cache ~/.npm-cache

# Set up global packages location
npm config set prefix ~/.npm-global

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH=~/.npm-global/bin:$PATH

# Install useful global packages
npm install -g typescript ts-node nodemon prettier eslint
```

### Docker Development Setup

Configure Docker for OpenFrame development:

```bash
# Create development Docker network
docker network create openframe-dev

# Set up shared volumes for faster builds
docker volume create openframe-maven-cache
docker volume create openframe-node-modules

# Configure Docker Compose override for development
```

Create `docker-compose.override.yml` in project root:

```yaml
version: '3.8'

services:
  mongodb:
    volumes:
      - mongodb-dev:/data/db
    ports:
      - "27017:27017"
    
  redis:
    ports:
      - "6379:6379"
    
  kafka:
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      - KAFKA_AUTO_CREATE_TOPICS_ENABLE=true

volumes:
  mongodb-dev:
```

## Environment Variables

### Development Environment File

Create `.env.development` in the project root:

```bash
# Application Configuration
SPRING_PROFILES_ACTIVE=development
SERVER_PORT=8080
MANAGEMENT_PORT=8081

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379/0
CASSANDRA_HOSTS=localhost:9042

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_GROUP_ID=openframe-dev

# Security Configuration
JWT_SECRET=dev-secret-key-replace-in-production
JWT_EXPIRATION=86400000
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_ENV=development

# Debug Configuration
LOGGING_LEVEL_ROOT=INFO
LOGGING_LEVEL_COM_OPENFRAME=DEBUG
SPRING_JPA_SHOW_SQL=true

# Development Features
SPRING_DEVTOOLS_RESTART_ENABLED=true
SPRING_DEVTOOLS_LIVERELOAD_ENABLED=true
```

### Shell Environment Setup

Add to your `~/.bashrc`, `~/.zshrc`, or `~/.profile`:

```bash
# OpenFrame Development Environment
export OPENFRAME_HOME="$HOME/code/openframe-oss-tenant"
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export MAVEN_HOME="/usr/local/maven"
export NODE_ENV="development"

# Path additions
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"

# Development aliases
alias of-start="cd $OPENFRAME_HOME && ./scripts/run-mac.sh"
alias of-stop="cd $OPENFRAME_HOME && docker-compose down"
alias of-logs="cd $OPENFRAME_HOME && docker-compose logs -f"
alias of-clean="cd $OPENFRAME_HOME && mvn clean && npm run clean"

# Useful functions
of-rebuild() {
    cd "$OPENFRAME_HOME"
    mvn clean install -DskipTests
    cd openframe/services/openframe-frontend
    npm run build
}

of-test() {
    cd "$OPENFRAME_HOME"
    mvn test
    cd openframe/services/openframe-frontend
    npm test
}
```

## Development Database Setup

### MongoDB Development Configuration

```bash
# Start MongoDB with development settings
docker run -d --name mongodb-dev \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -e MONGO_INITDB_DATABASE=openframe_dev \
  -v mongodb-dev:/data/db \
  mongo:7

# Create development user
docker exec -it mongodb-dev mongosh --eval "
  use openframe_dev
  db.createUser({
    user: 'openframe_dev',
    pwd: 'dev_password',
    roles: ['readWrite']
  })
"
```

### Redis Development Configuration

```bash
# Start Redis with development settings
docker run -d --name redis-dev \
  -p 6379:6379 \
  -v redis-dev:/data \
  redis:7 \
  redis-server --appendonly yes --maxmemory 1gb
```

### Database Tools

Install useful database management tools:

```bash
# MongoDB Compass (GUI)
# Download from: https://www.mongodb.com/products/compass

# Redis CLI tools
brew install redis  # macOS
sudo apt install redis-tools  # Ubuntu/Debian

# Database browser (optional)
brew install nosqlbooster-for-mongodb  # macOS
```

## Code Quality Tools

### Java Code Quality

Configure Checkstyle, SpotBugs, and PMD:

```bash
# Add to Maven pom.xml plugins section
# These are already configured in the project
mvn checkstyle:check
mvn spotbugs:check
mvn pmd:check
```

### TypeScript/JavaScript Quality

```bash
# Install ESLint and Prettier globally
npm install -g eslint prettier

# Run linting and formatting
cd openframe/services/openframe-frontend
npm run lint
npm run format

# Set up pre-commit hooks (optional)
npx husky-init && npm install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

### Rust Development Tools

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install useful Rust tools
cargo install cargo-watch    # Auto-rebuild on file changes
cargo install cargo-audit    # Security vulnerability scanning
cargo install cargo-outdated # Check for outdated dependencies

# Set up development environment for Rust client
cd clients/openframe-client
cargo watch -x check -x test -x run
```

## Performance and Monitoring

### Local Monitoring Setup

```bash
# Optional: Set up local Grafana and Prometheus
docker run -d --name grafana-dev \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest

docker run -d --name prometheus-dev \
  -p 9090:9090 \
  -v $PWD/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest
```

### JVM Profiling

Configure JVM for development profiling:

```bash
# Add JVM options for profiling
export MAVEN_OPTS="-Xmx2g -XX:+UseG1GC -XX:+PrintGC -Xloggc:gc.log"

# Enable JMX for monitoring
export JAVA_OPTS="$JAVA_OPTS -Dcom.sun.management.jmxremote.port=9999"
export JAVA_OPTS="$JAVA_OPTS -Dcom.sun.management.jmxremote.authenticate=false"
export JAVA_OPTS="$JAVA_OPTS -Dcom.sun.management.jmxremote.ssl=false"
```

## Troubleshooting Common Setup Issues

### IntelliJ IDEA Issues

```bash
# Clear IntelliJ caches
# File → Invalidate Caches and Restart

# Re-import Maven projects
# Maven panel → Reload All Projects

# Check Lombok annotation processing
# Settings → Build Tools → Compiler → Annotation Processors
# Enable annotation processing
```

### VS Code Issues

```bash
# Reload TypeScript service
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Clear Next.js cache
cd openframe/services/openframe-frontend
rm -rf .next
npm run build

# Reset ESLint
# Cmd/Ctrl + Shift + P → "ESLint: Restart ESLint Server"
```

### Maven/Dependencies Issues

```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Force update dependencies
mvn clean install -U

# Check for dependency conflicts
mvn dependency:tree
mvn dependency:analyze
```

### Node.js/npm Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install

# Check for version conflicts
npm ls --depth=0
npm audit fix
```

## Next Steps

With your development environment set up, you're ready to:

1. **[Local Development Setup](local-development.md)** - Run OpenFrame locally
2. **[Architecture Overview](../architecture/overview.md)** - Understand the codebase structure
3. **[Testing Guide](../testing/overview.md)** - Learn testing practices
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Make your first contribution

For additional help with environment setup, join the **#development** channel in the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).