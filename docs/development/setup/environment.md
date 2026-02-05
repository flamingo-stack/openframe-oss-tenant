# Development Environment Setup

This guide will help you set up a complete development environment for OpenFrame, including IDE configuration, development tools, and environment variables.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Java Development)

IntelliJ IDEA provides excellent support for OpenFrame's Java microservices.

#### Installation

```bash
# Using JetBrains Toolbox (recommended)
# Download from https://www.jetbrains.com/toolbox-app/

# Or direct download
# https://www.jetbrains.com/idea/download/
```

#### Configuration

1. **Import Project**
   - Open IntelliJ IDEA
   - Select "Open or Import"
   - Navigate to the cloned repository
   - Select the root `pom.xml`
   - Choose "Open as Maven Project"

2. **Java SDK Configuration**
   ```
   File → Project Structure → Project Settings → Project
   Project SDK: 21 (java version "21.0.1")
   Project language level: 21 - Pattern matching for switch
   ```

3. **Maven Configuration**
   ```
   File → Settings → Build, Execution, Deployment → Build Tools → Maven
   Maven home path: /usr/local/maven (or your Maven installation)
   User settings file: ~/.m2/settings.xml
   Local repository: ~/.m2/repository
   ```

4. **Code Style**
   ```
   File → Settings → Editor → Code Style → Java
   Import scheme: Google Style (download from https://github.com/google/styleguide)
   ```

5. **Plugins (Install these essential plugins)**
   - **Spring Boot**: Spring Boot support
   - **GraphQL**: GraphQL schema support
   - **Docker**: Docker integration
   - **Kubernetes**: K8s manifest support
   - **Database Tools**: Built-in database support

#### Run Configurations

Create run configurations for each service:

```xml
<!-- API Service Run Configuration -->
<configuration name="OpenFrame API Service" type="SpringBootApplicationConfigurationType">
    <module name="openframe-api-service" />
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.api.ApiApplication" />
    <option name="ALTERNATIVE_JRE_PATH_ENABLED" value="true" />
    <option name="ALTERNATIVE_JRE_PATH" value="21" />
    <option name="PROGRAM_PARAMETERS" value="--spring.profiles.active=dev" />
    <option name="VM_PARAMETERS" value="-Xmx2048m -Xms512m" />
</configuration>
```

### Visual Studio Code (Recommended for Frontend Development)

VS Code provides excellent TypeScript and React support.

#### Installation

```bash
# Download from https://code.visualstudio.com/
# Or via package manager:

# macOS
brew install --cask visual-studio-code

# Ubuntu
sudo snap install --classic code

# Windows
winget install Microsoft.VisualStudioCode
```

#### Essential Extensions

Install these extensions for optimal OpenFrame development:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "GraphQL.vscode-graphql",
    "GraphQL.vscode-graphql-syntax",
    "rust-lang.rust-analyzer",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-azuretools.vscode-docker"
  ]
}
```

#### Settings Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.graphql": "graphql",
    "*.gql": "graphql"
  }
}
```

#### Launch Configuration

Create `.vscode/launch.json` for debugging:

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
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Java Service",
      "type": "java",
      "request": "attach",
      "hostName": "localhost",
      "port": 5005
    }
  ]
}
```

### Rust Development (for OpenFrame Client)

#### Rust Installation

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

#### VS Code Rust Setup

If using VS Code for Rust development:

1. Install `rust-analyzer` extension
2. Configure settings:

```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.features": "all"
}
```

## Development Tools

### Package Managers

#### Node.js Version Management

Use `nvm` to manage Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify versions
node --version  # v20.10.0
npm --version   # 10.2.3
```

#### Java Version Management

Use `jenv` or `SDKMAN!` to manage Java versions:

```bash
# SDKMAN! (recommended)
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 21
sdk install java 21.0.1-open
sdk use java 21.0.1-open

# Verify
java --version
```

### Database Tools

#### MongoDB Compass

GUI tool for MongoDB development:

```bash
# Download from https://www.mongodb.com/products/compass
# Or via package manager:

# macOS
brew install --cask mongodb-compass

# Ubuntu
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb
```

#### Redis Desktop Manager

GUI for Redis development:

```bash
# Download from https://resp.app/
# Or use redis-cli for command line access
```

### Container and Kubernetes Tools

#### Docker Desktop

```bash
# Download from https://www.docker.com/products/docker-desktop/
# Ensure Docker Compose v2 is included
```

#### Kubectl and Helm

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm
```

## Environment Variables

### Development Environment File

Create a `.env.development` file in the project root:

```bash
# === Core Configuration ===
NODE_ENV=development
LOG_LEVEL=DEBUG
ENABLE_DEBUG_LOGGING=true

# === Database Connections ===
MONGODB_URI=mongodb://localhost:27017/openframe_dev
MONGODB_DATABASE=openframe_dev

CASSANDRA_CONTACT_POINTS=localhost:9042
CASSANDRA_KEYSPACE=openframe_dev
CASSANDRA_DATACENTER=datacenter1

REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379

# === Message Queue ===
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC_PREFIX=openframe_dev_

# === Apache Pinot ===
PINOT_BROKER_URL=http://localhost:8099
PINOT_CONTROLLER_URL=http://localhost:9000

# === Service URLs (Development) ===
API_BASE_URL=http://localhost:8080
AUTH_SERVER_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3000
CLIENT_SERVICE_URL=http://localhost:8083

# === Security Configuration ===
JWT_SECRET=dev-super-secret-jwt-key-for-development-only-do-not-use-in-production
JWT_EXPIRATION_HOURS=24
REFRESH_TOKEN_EXPIRATION_DAYS=30

ENCRYPTION_KEY=dev-32-character-encryption-key-12
AES_ALGORITHM=AES/GCB/NoPadding

# === OAuth Providers (Development) ===
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=your-azure-app-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id

# === External Tool Integration (Optional) ===
FLEETDM_URL=http://localhost:8412
FLEETDM_API_TOKEN=your-fleet-dev-token

TACTICAL_RMM_URL=http://localhost:8000
TACTICAL_RMM_API_KEY=your-tactical-dev-key

MESHCENTRAL_URL=http://localhost:4430
MESHCENTRAL_USER=admin
MESHCENTRAL_PASSWORD=dev-password

# === Development Features ===
ENABLE_GRAPHQL_PLAYGROUND=true
ENABLE_SWAGGER_UI=true
ENABLE_ACTUATOR_ENDPOINTS=true

# === Hot Reload Configuration ===
SPRING_DEVTOOLS_RESTART_ENABLED=true
SPRING_DEVTOOLS_LIVERELOAD_ENABLED=true

# === Frontend Development ===
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_AUTH_URL=http://localhost:9000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_ENVIRONMENT=development

# === Agent Development ===
AGENT_LOG_LEVEL=debug
AGENT_SERVER_URL=http://localhost:8083
AGENT_HEARTBEAT_INTERVAL=30
```

### IntelliJ Environment Variables

Configure environment variables in IntelliJ run configurations:

```
File → Run/Debug Configurations → Templates → Spring Boot
Environment Variables:
  SPRING_PROFILES_ACTIVE=dev
  LOG_LEVEL=DEBUG
  MONGODB_URI=mongodb://localhost:27017/openframe_dev
```

### VS Code Environment Variables

Configure in `.vscode/launch.json`:

```json
{
  "env": {
    "NODE_ENV": "development",
    "NEXT_PUBLIC_API_URL": "http://localhost:8080",
    "LOG_LEVEL": "debug"
  }
}
```

## Development Scripts

### Useful Development Commands

Create these aliases in your shell configuration:

```bash
# Add to ~/.bashrc or ~/.zshrc

# OpenFrame aliases
alias of-build="mvn clean install -DskipTests"
alias of-build-full="mvn clean install"
alias of-start="./scripts/dev-start.sh"
alias of-stop="./scripts/dev-stop.sh"
alias of-logs="docker-compose -f docker-compose.dev.yml logs -f"

# Frontend aliases
alias of-frontend="cd openframe/services/openframe-frontend && npm run dev"
alias of-frontend-build="cd openframe/services/openframe-frontend && npm run build"
alias of-frontend-test="cd openframe/services/openframe-frontend && npm run test"

# Database aliases
alias of-mongo="docker exec -it mongodb mongosh openframe_dev"
alias of-redis="docker exec -it redis redis-cli"
alias of-cassandra="docker exec -it cassandra cqlsh"
```

### Development Startup Script

Create `scripts/dev-start.sh`:

```bash
#!/bin/bash
set -e

echo "Starting OpenFrame development environment..."

# Start infrastructure services
echo "Starting infrastructure services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
./scripts/wait-for-services.sh

# Build the platform
echo "Building OpenFrame..."
mvn clean install -DskipTests -T 4

# Start services in development mode
echo "Starting OpenFrame services..."
concurrently \
  "cd openframe/services/openframe-config && mvn spring-boot:run -Dspring-boot.run.profiles=dev" \
  "cd openframe/services/openframe-authorization-server && mvn spring-boot:run -Dspring-boot.run.profiles=dev" \
  "cd openframe/services/openframe-api && mvn spring-boot:run -Dspring-boot.run.profiles=dev" \
  "cd openframe/services/openframe-gateway && mvn spring-boot:run -Dspring-boot.run.profiles=dev" \
  "cd openframe/services/openframe-management && mvn spring-boot:run -Dspring-boot.run.profiles=dev" \
  "cd openframe/services/openframe-client && mvn spring-boot:run -Dspring-boot.run.profiles=dev" \
  "cd openframe/services/openframe-stream && mvn spring-boot:run -Dspring-boot.run.profiles=dev"

echo "OpenFrame development environment started!"
echo "Frontend: http://localhost:3000"
echo "API Gateway: http://localhost:8080"
echo "GraphQL Playground: http://localhost:8080/graphql"
```

### Service Health Check Script

Create `scripts/wait-for-services.sh`:

```bash
#!/bin/bash

# Wait for MongoDB
echo -n "Waiting for MongoDB..."
until docker exec mongodb mongosh --eval "print('MongoDB is ready')" >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " Ready!"

# Wait for Cassandra
echo -n "Waiting for Cassandra..."
until docker exec cassandra cqlsh -e "DESCRIBE KEYSPACES;" >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " Ready!"

# Wait for Redis
echo -n "Waiting for Redis..."
until docker exec redis redis-cli ping >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " Ready!"

# Wait for Kafka
echo -n "Waiting for Kafka..."
until docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list >/dev/null 2>&1; do
  echo -n "."
  sleep 1
done
echo " Ready!"

echo "All services are ready!"
```

## Editor Extensions and Plugins

### Additional Useful Extensions

#### IntelliJ IDEA Plugins
- **SonarLint**: Code quality analysis
- **CheckStyle-IDEA**: Code style checking
- **Maven Helper**: Advanced Maven support
- **Rainbow Brackets**: Bracket pair colorizer
- **GitToolBox**: Enhanced Git integration

#### VS Code Extensions
- **GitLens**: Supercharged Git capabilities
- **Thunder Client**: API testing
- **REST Client**: HTTP request testing
- **Error Lens**: Inline error highlighting
- **Bracket Pair Colorizer**: Visual bracket matching

## Verification

### Environment Verification

Run this verification script:

```bash
#!/bin/bash

echo "=== OpenFrame Development Environment Verification ==="

# Check Java
echo -n "Java 21: "
if java -version 2>&1 | grep -q "21\."; then echo "✓"; else echo "✗"; fi

# Check Maven
echo -n "Maven 3.8+: "
if mvn -version 2>&1 | grep -q "Apache Maven 3\.[89]"; then echo "✓"; else echo "✗"; fi

# Check Node.js
echo -n "Node.js 18+: "
if node --version | grep -qE "v(18|19|20)\."; then echo "✓"; else echo "✗"; fi

# Check Docker
echo -n "Docker: "
if docker --version >/dev/null 2>&1; then echo "✓"; else echo "✗"; fi

# Check Rust
echo -n "Rust: "
if rustc --version >/dev/null 2>&1; then echo "✓"; else echo "✗"; fi

# Check environment variables
echo -n "Environment file: "
if [[ -f ".env.development" ]]; then echo "✓"; else echo "✗"; fi

echo "=== Verification Complete ==="
```

## Next Steps

Once your development environment is set up:

1. Continue to [Local Development Guide](local-development.md)
2. Review [Architecture Overview](../architecture/overview.md)
3. Check out [Testing Guide](../testing/overview.md)
4. Read [Contributing Guidelines](../contributing/guidelines.md)

---

**Need help?** Join our development community on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time support from other developers.