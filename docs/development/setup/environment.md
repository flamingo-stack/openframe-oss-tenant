# Development Environment Setup

This guide helps you set up an optimal development environment for OpenFrame. We'll configure your IDE, install necessary tools, and establish a productive development workflow.

## Recommended Development Setup

### IDE Recommendations

OpenFrame is a polyglot platform, so choose an IDE that supports multiple languages well:

#### IntelliJ IDEA Ultimate (Recommended)
Best for Java backend development with excellent Spring Boot support:

```bash
# Install via JetBrains Toolbox
curl -fsSL https://raw.githubusercontent.com/nagygergo/jetbrains-toolbox-install/master/toolbox.sh | bash

# Or download directly
# https://www.jetbrains.com/idea/download/
```

**Required Plugins:**
- **Spring Boot** - Spring framework support
- **Database Tools** - MongoDB, Cassandra integration
- **GraphQL** - Schema editing and query support
- **Docker** - Container management
- **Vue.js** - Frontend development support
- **TypeScript** - Language support

#### Visual Studio Code (Alternative)
Great for frontend development and general purpose:

```bash
# Install VSCode
curl -L "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64" -o vscode.deb
sudo dpkg -i vscode.deb

# Or via snap
sudo snap install code --classic
```

**Essential Extensions:**
```json
{
  "recommendations": [
    "ms-vscode.vscode-spring-initializr",
    "vmware.vscode-boot-dev-pack",
    "ms-vscode.vscode-java-pack",
    "Vue.volar",
    "ms-vscode.vscode-typescript-next",
    "GraphQL.vscode-graphql",
    "ms-azuretools.vscode-docker",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode"
  ]
}
```

### Java Development Setup

#### Java 21 Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS with Homebrew
brew install openjdk@21

# Verify installation
java --version
javac --version

# Set JAVA_HOME (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
export PATH="$JAVA_HOME/bin:$PATH"
```

#### Maven Configuration

Create or update your Maven settings for optimal development:

```xml
<!-- ~/.m2/settings.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <maven.compiler.release>21</maven.compiler.release>
        <spring.profiles.active>dev</spring.profiles.active>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
  
  <!-- Increase memory for builds -->
  <properties>
    <maven.opts>-Xmx2g -XX:MaxPermSize=512m</maven.opts>
  </properties>
</settings>
```

#### Java Code Formatting

Install Google Java Format for consistent code style:

```bash
# Download Google Java Format
curl -L "https://github.com/google/google-java-format/releases/latest/download/google-java-format-1.19.2-all-deps.jar" \
  -o ~/.local/bin/google-java-format.jar

# Create wrapper script
cat > ~/.local/bin/gjf << 'EOF'
#!/bin/bash
java -jar ~/.local/bin/google-java-format.jar "$@"
EOF

chmod +x ~/.local/bin/gjf

# Format files
gjf --replace src/main/java/**/*.java
```

### Frontend Development Setup

#### Node.js and npm

```bash
# Install Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

#### Frontend Tooling

```bash
# Global development tools
npm install -g @vue/cli@latest
npm install -g typescript
npm install -g eslint
npm install -g prettier

# Verify installations
vue --version
tsc --version
eslint --version
prettier --version
```

#### Vue.js Development Configuration

Create optimal Vue.js development settings:

```json
// .vscode/settings.json (for VSCode users)
{
  "vue.codeActions.enabled": true,
  "vue.complete-functions.enabled": true,
  "typescript.preferences.quoteStyle": "single",
  "typescript.format.semicolons": "remove",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Database Development Tools

#### MongoDB Tools

```bash
# MongoDB Compass (GUI)
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# MongoDB Shell
sudo apt install mongodb-mongosh

# Verify connection to development database
mongosh "mongodb://localhost:27017/openframe_dev"
```

#### Redis Tools

```bash
# Redis CLI (included with Redis)
redis-cli

# RedisInsight (GUI) - Download from Redis website
# https://redis.com/redis-enterprise/redis-insight/

# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### Cassandra Tools

```bash
# cqlsh (Cassandra Query Language Shell)
pip install cqlsh

# Test Cassandra connection
cqlsh localhost 9042

# Optional: DataStax DevCenter for GUI
# Download from DataStax website
```

### Container Development Setup

#### Docker Configuration

Optimize Docker for development:

```bash
# Create Docker daemon configuration for development
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "features": {
    "buildkit": true
  }
}
EOF

# Restart Docker daemon
sudo systemctl restart docker

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for group changes to take effect
```

#### Docker Compose Optimizations

Create development-specific compose override:

```yaml
# docker-compose.override.yml (in project root)
version: '3.8'
services:
  # Development-specific overrides
  openframe-mongodb:
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data_dev:/data/db
  
  openframe-redis:
    ports:
      - "6379:6379"
      
  openframe-kafka:
    ports:
      - "9092:9092"
    environment:
      KAFKA_LOG_RETENTION_HOURS: 24  # Shorter retention for dev

volumes:
  mongodb_data_dev:
```

### Git Configuration

#### Git Setup for OpenFrame Development

```bash
# Configure Git identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'

# Configure merge strategy
git config --global merge.ours.driver true
git config --global pull.rebase false

# Set up commit message template
cat > ~/.gitmessage << 'EOF'
# Type: Brief summary (50 chars max)
#
# Detailed explanation (if needed)
#
# Types: feat, fix, docs, style, refactor, test, chore
EOF

git config --global commit.template ~/.gitmessage
```

#### Pre-commit Hooks

Install pre-commit hooks for code quality:

```bash
# Install pre-commit
pip install pre-commit

# In your OpenFrame repository
cat > .pre-commit-config.yaml << 'EOF'
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

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.0.0
    hooks:
      - id: prettier
        files: \.(js|ts|jsx|tsx|json|css|md|vue)$
EOF

# Install the hooks
pre-commit install

# Test hooks
pre-commit run --all-files
```

## Development Workflow Setup

### Environment Variables

Create a development environment configuration:

```bash
# Create .env file in project root
cat > .env << 'EOF'
# Development Environment Configuration
NODE_ENV=development
SPRING_PROFILES_ACTIVE=dev

# Database URLs
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
PINOT_CONTROLLER_HOST=localhost

# Security (use random values for development)
JWT_SECRET=dev-jwt-secret-key-not-for-production
ENCRYPTION_KEY=dev-encryption-key-32-characters

# Service Ports
GATEWAY_PORT=8080
API_PORT=8082
AUTH_PORT=8081
MANAGEMENT_PORT=8083
FRONTEND_PORT=3000

# Debug Settings
DEBUG=true
LOG_LEVEL=DEBUG
ENABLE_DEBUG_ENDPOINTS=true
EOF

# Load environment variables
source .env
```

### Development Scripts

Create helpful development scripts:

```bash
# Create scripts directory
mkdir -p scripts/dev

# Build all services script
cat > scripts/dev/build-all.sh << 'EOF'
#!/bin/bash
set -e

echo "🏗️  Building OpenFrame services..."

# Build Java services
echo "📦 Building Java services..."
mvn clean install -DskipTests

# Build frontend
echo "🎨 Building frontend..."
cd openframe/services/openframe-frontend
npm install
npm run build
cd ../../../

echo "✅ Build completed successfully!"
EOF

chmod +x scripts/dev/build-all.sh

# Development server script
cat > scripts/dev/start-dev.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting OpenFrame development environment..."

# Start infrastructure services
echo "📊 Starting infrastructure services..."
docker compose -f integrated-tools/docker-compose.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 30

# Start backend services in development mode
echo "🔧 Starting backend services..."
# (This would typically start services with hot reload)

# Start frontend development server
echo "🎨 Starting frontend development server..."
cd openframe/services/openframe-frontend
npm run dev &
cd ../../../

echo "✅ Development environment ready!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 API Gateway: http://localhost:8080"
echo "📊 GraphQL Playground: http://localhost:8080/graphiql"
EOF

chmod +x scripts/dev/start-dev.sh
```

## IDE-Specific Configurations

### IntelliJ IDEA Setup

#### Project Configuration

1. **Import Project**:
   - File → Open → Select OpenFrame root directory
   - Choose "Maven" when prompted
   - Enable "Auto-import Maven projects"

2. **Configure Module Structure**:
   ```text
   openframe-oss-tenant/
   ├── openframe (Maven Module)
   │   ├── services (Maven Module)
   │   └── libs (Maven Module)
   ├── clients (Rust Module)
   └── openframe-frontend (Node.js Module)
   ```

3. **Set up Run Configurations**:
   - **Gateway Service**: Main class `com.openframe.gateway.GatewayApplication`
   - **API Service**: Main class `com.openframe.api.ApiApplication`
   - **Frontend**: npm script `dev`

#### Useful Plugins for IntelliJ

```text
Essential Plugins:
- Spring Boot (bundled)
- Database Tools (bundled)  
- Docker (bundled)
- GraphQL
- Vue.js
- Rust
- MongoDB Plugin
- Kafka Plugin
```

### VSCode Setup

#### Workspace Configuration

```json
// .vscode/settings.json
{
  "java.home": "/usr/lib/jvm/java-21-openjdk-amd64",
  "java.configuration.maven.userSettings": "~/.m2/settings.xml",
  "java.format.settings.url": "https://raw.githubusercontent.com/google/styleguide/gh-pages/eclipse-java-google-style.xml",
  
  "typescript.preferences.quoteStyle": "single",
  "javascript.preferences.quoteStyle": "single",
  
  "eslint.workingDirectories": ["openframe/services/openframe-frontend"],
  "prettier.configPath": "openframe/services/openframe-frontend/.prettierrc",
  
  "docker.enableDockerComposeLanguageService": true,
  
  "files.exclude": {
    "**/target": true,
    "**/node_modules": true,
    "**/.next": true
  }
}
```

## Testing Your Setup

### Verify Java Development Environment

```bash
# Check Java compilation
cd openframe
mvn compile -q
echo "✅ Java compilation successful"

# Check code formatting
mvn spotless:check -q
echo "✅ Java formatting check passed"

# Run unit tests  
mvn test -Dtest=*Test -q
echo "✅ Java tests passed"
```

### Verify Frontend Development Environment

```bash
# Check Node.js setup
cd openframe/services/openframe-frontend
npm install
echo "✅ Dependencies installed"

# Check TypeScript compilation
npm run type-check
echo "✅ TypeScript compilation successful"

# Check linting
npm run lint
echo "✅ Linting passed"

# Check formatting
npm run format:check
echo "✅ Formatting check passed"
```

### Verify Database Connections

```bash
# Test MongoDB
mongosh "mongodb://localhost:27017/openframe_dev" --eval "db.runCommand({ping: 1})"

# Test Redis  
redis-cli ping

# Test Cassandra
cqlsh -e "SELECT cluster_name FROM system.local;"

echo "✅ All database connections successful"
```

## Troubleshooting Common Issues

### Java Build Issues

```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Reload Maven project
mvn dependency:resolve -U

# Check Java version conflicts
update-alternatives --config java
```

### Frontend Issues

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
nvm list
nvm use 20
```

### Docker Issues

```bash
# Reset Docker completely
docker system prune -a --volumes

# Check Docker daemon
systemctl status docker

# Verify Docker Compose
docker compose version
```

## What's Next?

With your development environment configured:

1. **Start Development**: Continue to [Local Development](local-development.md)
2. **Understand Architecture**: Review [Architecture Overview](../architecture/overview.md)
3. **Learn Contributing**: Read [Contributing Guidelines](../contributing/guidelines.md)

---

Your development environment is now ready for OpenFrame development! The next step is to get the platform running locally for development work.