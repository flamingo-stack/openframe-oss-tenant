# Development Environment Setup

This guide helps you set up a complete development environment for OpenFrame, including IDE configuration, development tools, and debugging setup.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Backend)

IntelliJ IDEA provides excellent support for Java, Spring Boot, and our full technology stack:

#### Installation and Configuration
```bash
# Download IntelliJ IDEA Ultimate (recommended for full features)
# Or IntelliJ IDEA Community Edition (free, sufficient for most development)

# Import the project
File → Open → Select openframe/ directory
# Choose "Import as Maven project" when prompted
```

#### Essential Plugins
Install these plugins for optimal OpenFrame development:

| Plugin | Purpose | Installation |
|--------|---------|-------------|
| **Spring Boot** | Spring framework support | Bundled with Ultimate |
| **GraphQL** | GraphQL schema support | `Plugins → Browse → "GraphQL"` |
| **Docker** | Docker integration | Bundled with Ultimate |
| **Kubernetes** | K8s manifest support | `Plugins → Browse → "Kubernetes"` |
| **MongoDB Plugin** | Database integration | `Plugins → Browse → "Mongo Plugin"` |
| **Lombok** | Annotation processing | `Plugins → Browse → "Lombok"` |

#### Project Configuration
```bash
# Configure Project SDK
File → Project Structure → Project Settings → Project
Project SDK: 21 (OpenJDK 21)
Project language level: 21 - Pattern matching for switch

# Configure Maven
File → Settings → Build Tools → Maven
Maven home directory: (auto-detected)
User settings file: ~/.m2/settings.xml
Local repository: ~/.m2/repository

# Enable annotation processing (required for Lombok)
File → Settings → Build Tools → Compiler → Annotation Processors
✓ Enable annotation processing
```

#### Run Configurations
Create run configurations for each service:

```bash
# API Service Configuration
Name: OpenFrame API
Main class: com.openframe.api.ApiApplication  
VM options: -Dspring.profiles.active=development
Working directory: $MODULE_DIR$/openframe/services/openframe-api

# Gateway Service Configuration  
Name: OpenFrame Gateway
Main class: com.openframe.gateway.GatewayApplication
VM options: -Dspring.profiles.active=development
Working directory: $MODULE_DIR$/openframe/services/openframe-gateway

# Config Service Configuration
Name: OpenFrame Config
Main class: com.openframe.config.ConfigServerApplication
VM options: -Dspring.profiles.active=development
Working directory: $MODULE_DIR$/openframe/services/openframe-config
```

### Visual Studio Code (Recommended for Frontend)

VS Code provides excellent TypeScript and Vue.js support:

#### Extensions for OpenFrame Development
```json
{
  "recommendations": [
    "Vue.vscode-official",           // Vue 3 support
    "bradlc.vscode-tailwindcss",     // Tailwind CSS IntelliSense  
    "ms-vscode.vscode-typescript-next", // TypeScript support
    "GraphQL.vscode-graphql",        // GraphQL syntax support
    "ms-vscode.vscode-json",         // JSON support
    "esbenp.prettier-vscode",        // Code formatting
    "ms-vscode.vscode-eslint",       // JavaScript linting
    "ms-kubernetes-tools.vscode-kubernetes-tools", // Kubernetes
    "ms-azuretools.vscode-docker"    // Docker support
  ]
}
```

#### Workspace Configuration
Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.server.hybridMode": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.eslint.fixAll": true
  },
  "files.associations": {
    "*.vue": "vue"
  },
  "tailwindCSS.includeLanguages": {
    "vue": "html"
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
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["dev"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Tests",
      "type": "node", 
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vitest",
      "args": ["run"],
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "console": "integratedTerminal"
    }
  ]
}
```

## Required Development Tools

### Java Development Kit (JDK) 21

OpenFrame requires JDK 21 for modern Java features:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS (using Homebrew)
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc

# Windows (using Chocolatey)
choco install openjdk21

# Verify installation
java --version
# Expected: openjdk 21.x.x
```

### Maven 3.9+

Maven is used for building Java services:

```bash
# Ubuntu/Debian  
sudo apt install maven

# macOS
brew install maven

# Windows
choco install maven

# Verify installation
mvn --version
# Expected: Apache Maven 3.9.x
```

### Node.js 18.17+ and npm

Required for frontend development:

```bash
# Install Node.js LTS
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS  
brew install node

# Windows
choco install nodejs

# Verify installation
node --version  # Should be 18.17+
npm --version   # Should be 9.0+

# Install yarn (optional but recommended)
npm install -g yarn
```

### Git

Version control is essential:

```bash
# Configure Git with your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Configure useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

### Docker and Docker Compose

Required for running dependent services:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker compose version
```

## Environment Variables

### Development Environment File

Create a `.env.development` file in the project root:

```bash
# Application Configuration
OPENFRAME_ENVIRONMENT=development
OPENFRAME_LOG_LEVEL=DEBUG
OPENFRAME_PROFILE=development

# Database URLs (using Docker containers)
MONGODB_URI=mongodb://localhost:27017/openframe_dev
CASSANDRA_CONTACT_POINTS=localhost:9042
CASSANDRA_KEYSPACE=openframe_dev
REDIS_URL=redis://localhost:6379/0
PINOT_BROKER_URL=http://localhost:8000

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_SCHEMA_REGISTRY_URL=http://localhost:8081

# Security Configuration
JWT_SECRET=development-secret-key-change-in-production-32chars
JWT_EXPIRATION_TIME=3600000
ENCRYPTION_KEY=dev-encryption-key-32-characters

# External API Configuration (optional for development)
TACTICAL_RMM_URL=http://localhost:8005
FLEET_MDM_URL=http://localhost:8006
MESHCENTRAL_URL=http://localhost:4430

# Frontend Configuration
VITE_API_URL=http://localhost:8080
VITE_GRAPHQL_URL=http://localhost:8080/graphql
VITE_WS_URL=ws://localhost:8080/ws

# Development Features
VITE_ENABLE_DEVTOOLS=true
VITE_MOCK_API=false
VITE_DEBUG_MODE=true
```

### IDE Environment Variables

#### IntelliJ IDEA
Set environment variables in run configurations:
```bash
# Go to Run → Edit Configurations
# Select configuration → Environment Variables
# Add variables from .env.development
```

#### VS Code
Add to `.vscode/settings.json`:
```json
{
  "terminal.integrated.env.linux": {
    "VITE_API_URL": "http://localhost:8080",
    "VITE_GRAPHQL_URL": "http://localhost:8080/graphql"
  }
}
```

## Editor Extensions and Plugins

### Code Quality Tools

#### Prettier (Code Formatting)
```bash
# Install globally
npm install -g prettier

# Project configuration (.prettierrc)
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true
}
```

#### ESLint (JavaScript/TypeScript Linting)
```bash
# Install in frontend project
cd openframe/services/openframe-frontend
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Configuration (.eslintrc.js)
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'vue'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended'
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error'
  }
};
```

#### CheckStyle (Java Code Style)
```xml
<!-- Add to pom.xml -->
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.2.2</version>
  <configuration>
    <configLocation>checkstyle.xml</configLocation>
    <encoding>UTF-8</encoding>
    <consoleOutput>true</consoleOutput>
    <failsOnError>true</failsOnError>
  </configuration>
  <executions>
    <execution>
      <id>validate</id>
      <phase>validate</phase>
      <goals>
        <goal>check</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

## Debugging Configuration

### Java Services Debugging

#### IntelliJ IDEA Debug Configuration
```bash
# For each service run configuration:
VM options: -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005

# Use different ports for each service:
# API Service: 5005
# Gateway Service: 5006  
# Management Service: 5007
# Stream Service: 5008
```

#### Remote Debugging
```bash
# Start service with debug enabled
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -jar target/openframe-api.jar

# Connect debugger from IDE:
Run → Attach to Process → Select JVM process
```

### Frontend Debugging

#### Browser DevTools Integration
```javascript
// Enable Vue DevTools in development
// Add to main.ts
if (import.meta.env.DEV) {
  const app = createApp(App);
  app.config.performance = true;
  app.config.devtools = true;
}
```

#### VS Code Debugging with Chrome
```json
{
  "name": "Launch Chrome with Debugging",
  "type": "chrome", 
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/src",
  "sourceMapPathOverrides": {
    "webpack:///src/*": "${webRoot}/*"
  }
}
```

### Database Debugging Tools

#### MongoDB Compass
```bash
# Install MongoDB Compass
# Connect to: mongodb://localhost:27017
# Database: openframe_dev

# Useful queries for debugging:
db.machines.find({status: "ONLINE"}).limit(10)
db.organizations.find({}).projection({name: 1, createdAt: 1})
db.events.find({timestamp: {$gte: ISODate("2024-01-01")}})
```

#### Redis CLI
```bash
# Connect to Redis
redis-cli -h localhost -p 6379

# Useful commands:
KEYS *                    # List all keys
GET user:session:123      # Get specific key
MONITOR                   # Watch all Redis operations
INFO                      # Redis server info
```

## Performance Monitoring Setup

### Local Prometheus and Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### Application Metrics

```java
// Add to Spring Boot services
@RestController
public class MetricsController {
    
    @Autowired
    private MeterRegistry meterRegistry;
    
    @GetMapping("/actuator/metrics/custom")
    public Map<String, Object> customMetrics() {
        return Map.of(
            "active_users", meterRegistry.counter("openframe.users.active").count(),
            "api_requests", meterRegistry.counter("openframe.api.requests").count()
        );
    }
}
```

## Development Workflow Tools

### Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black
        language_version: python3

# Install hooks
pre-commit install
```

### Automated Testing Setup

```bash
# Backend testing with Maven
mvn test                          # Run unit tests
mvn integration-test             # Run integration tests  
mvn verify                       # Run all tests with coverage

# Frontend testing with npm
cd openframe/services/openframe-frontend
npm run test                     # Run unit tests
npm run test:e2e                # Run E2E tests
npm run test:coverage           # Generate coverage report
```

## Troubleshooting Common Setup Issues

### Java Issues

#### Wrong Java Version
```bash
# Check current version
java --version

# Switch versions (Ubuntu/Debian)
sudo update-alternatives --config java

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
```

#### Maven Build Issues
```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Force dependency update
mvn clean install -U

# Skip tests if needed
mvn clean install -DskipTests
```

### Node.js Issues

#### Node Version Conflicts
```bash
# Use Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18.17.0
nvm use 18.17.0
nvm alias default 18.17.0
```

#### npm Install Failures
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use yarn if npm fails
yarn install
```

### Docker Issues

#### Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended for development)
sudo docker ps
```

#### Container Startup Issues
```bash
# Check container logs
docker logs <container-name>

# Check container resource usage
docker stats

# Restart containers
docker compose down && docker compose up -d
```

## Next Steps

With your development environment configured:

1. **[Local Development Setup](./local-development.md)** - Start OpenFrame services locally
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
3. **[Testing Overview](../testing/overview.md)** - Learn testing strategies

Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for development support and questions!