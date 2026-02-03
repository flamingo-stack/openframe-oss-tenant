# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame. Follow these steps to configure your IDE, tools, and development workflow.

## IDE Recommendations and Setup

### Primary IDE Options

| IDE | Best For | OpenFrame Support |
|-----|----------|-------------------|
| **IntelliJ IDEA Ultimate** | Java backend development | Excellent Spring Boot support |
| **VS Code** | Frontend & full-stack | Great TypeScript/Vue.js support |
| **Eclipse IDE** | Java development | Good Spring Tool Suite integration |
| **WebStorm** | Frontend development | Excellent Vue.js/React support |

### Recommended: IntelliJ IDEA + VS Code Combo

For the best OpenFrame development experience:
- **IntelliJ IDEA**: Backend Java services
- **VS Code**: Frontend applications and documentation

## IntelliJ IDEA Configuration

### Required Plugins

Install these essential plugins:

```text
File > Settings > Plugins > Browse repositories:

✅ Spring Boot
✅ GraphQL  
✅ Database Navigator
✅ Docker
✅ Kubernetes
✅ SonarLint
✅ CheckStyle-IDEA
✅ SpotBugs
✅ Lombok
```

### Project Import

1. **Open Project**:
   ```
   File > Open > [select openframe-oss-tenant directory]
   ```

2. **Maven Configuration**:
   ```
   File > Settings > Build Tools > Maven
   ✅ Import Maven projects automatically
   ✅ Download sources
   ✅ Download documentation  
   Maven home: Use bundled (3.9.x)
   ```

3. **Java SDK Setup**:
   ```
   File > Project Structure > Project Settings > Project
   Project SDK: 21 (java version "21.0.x")
   Project language level: 21 - Sealed types, etc.
   ```

### Code Style Configuration

Import the OpenFrame code style:

```xml
<!-- Save as openframe-codestyle.xml -->
File > Settings > Editor > Code Style > Import Scheme
```

Key formatting rules:
- **Indentation**: 4 spaces (no tabs)
- **Line length**: 120 characters
- **Import organization**: java.*, javax.*, then third-party, then com.openframe.*

### Run Configurations

Create run configurations for each service:

#### API Service Configuration
```yaml
Name: OpenFrame API Service
Main class: com.openframe.api.ApiApplication
Module: openframe-api
VM options: -Dspring.profiles.active=dev -Xmx2g
Environment variables:
  SPRING_PROFILES_ACTIVE: dev
  LOG_LEVEL: DEBUG
```

#### Gateway Service Configuration  
```yaml
Name: OpenFrame Gateway
Main class: com.openframe.gateway.GatewayApplication
Module: openframe-gateway
VM options: -Dspring.profiles.active=dev -Xmx1g
```

## VS Code Configuration

### Essential Extensions

Install these extensions for frontend development:

```bash
# Open VS Code and install:
code --install-extension Vue.volar
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-json
code --install-extension GraphQL.vscode-graphql
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --install-extension ms-azuretools.vscode-docker
```

### Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "eslint.workingDirectories": [
    "openframe/services/openframe-frontend",
    "clients/openframe-chat"
  ],
  "prettier.configPath": "./prettier.config.js",
  "tailwindCSS.includeLanguages": {
    "vue": "html",
    "typescript": "javascript"
  },
  "files.associations": {
    "*.vue": "vue"
  }
}
```

### Launch Configurations

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Frontend Dev Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    },
    {
      "name": "Chat UI Dev Server",  
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/clients/openframe-chat",
      "runtimeExecutable": "npm", 
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

## Development Tools Setup

### Java Development Kit (JDK)

#### Install JDK 21

**Using SDKMAN (Recommended)**:
```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install and use JDK 21
sdk install java 21.0.2-amzn
sdk use java 21.0.2-amzn
sdk default java 21.0.2-amzn

# Verify installation
java --version
```

**Manual Installation**:
- Download from [Adoptium OpenJDK](https://adoptium.net/)
- Set `JAVA_HOME` environment variable
- Update `PATH` to include `$JAVA_HOME/bin`

### Maven Configuration

#### Global Maven Settings

Create/update `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <localRepository>${user.home}/.m2/repository</localRepository>
  
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <maven.test.skip>false</maven.test.skip>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
</settings>
```

#### Development Build Profile

For faster development builds:

```bash
# Skip tests for faster builds
mvn clean install -DskipTests

# Compile only (no packaging)  
mvn compile

# Run specific module tests
mvn test -pl openframe-api-service-core
```

### Node.js and npm Setup

#### Install Node.js

**Using NVM (Recommended)**:
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verify installation
node --version  # Should be 18.x or 20.x
npm --version   # Should be 9.x+
```

#### Global npm Packages

Install useful development tools:

```bash
# Essential development tools
npm install -g @vue/cli
npm install -g vite
npm install -g typescript
npm install -g eslint
npm install -g prettier

# OpenFrame CLI (external repository)
npm install -g @openframe/cli
```

### Database Tools

#### MongoDB Tools

```bash
# Install MongoDB Shell
brew install mongosh  # macOS
# or
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -  # Ubuntu
```

#### Cassandra Tools

```bash
# Install cqlsh
pip3 install cqlsh

# Or use Docker
docker run --rm -it --network host cassandra:4.1 cqlsh localhost
```

#### Redis CLI

```bash
# Install redis-cli
brew install redis  # macOS
sudo apt install redis-tools  # Ubuntu

# Test connection
redis-cli ping
```

## Environment Variables for Development

### Create Development Environment File

Create `dev/.env.development`:

```bash
# Database URLs
MONGODB_URI=mongodb://localhost:27017/openframe_dev
CASSANDRA_CONTACT_POINTS=localhost:9042
REDIS_URL=redis://localhost:6379
PINOT_BROKER_URL=http://localhost:8000

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SECURITY_PROTOCOL=PLAINTEXT

# Security Settings (Development Only)
JWT_SECRET=dev-jwt-secret-not-for-production
ENCRYPTION_KEY=dev-encryption-key-32-chars-long

# Logging
LOG_LEVEL=DEBUG
SPRING_PROFILES_ACTIVE=dev

# Development Features
ENABLE_DEV_TOOLS=true
HOT_RELOAD=true
CORS_ENABLED=true
```

### Load Environment Variables

**For Bash/Zsh**:
```bash
# Add to ~/.bashrc or ~/.zshrc
export $(cat dev/.env.development | xargs)
```

**For Fish Shell**:
```fish
# Add to ~/.config/fish/config.fish  
for line in (cat dev/.env.development)
    set -gx (string split "=" $line)
end
```

## Editor Extensions and Plugins

### Recommended VS Code Extensions Configuration

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "Vue.volar",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss", 
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode",
    "GraphQL.vscode-graphql",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "ms-azuretools.vscode-docker",
    "redhat.java",
    "vscjava.vscode-spring-boot-dashboard",
    "SonarSource.sonarlint-vscode"
  ]
}
```

### Development Productivity Tips

#### Code Snippets

Create custom code snippets for common OpenFrame patterns:

**Java Service Snippet** (`.vscode/java.json`):
```json
{
  "OpenFrame Service": {
    "prefix": "ofservice",
    "body": [
      "@Service",
      "public class ${1:ServiceName} {",
      "",
      "    private static final Logger log = LoggerFactory.getLogger(${1:ServiceName}.class);",
      "",
      "    public ${1:ServiceName}() {",
      "        log.info(\"Initializing ${1:ServiceName}\");",
      "    }",
      "",
      "    $0",
      "}"
    ]
  }
}
```

## Verification and Testing

### Verify Development Environment

Run this verification script:

```bash
#!/bin/bash
echo "🔍 Verifying OpenFrame Development Environment..."

# Check Java
echo "Java Version:"
java --version

# Check Maven  
echo -e "\nMaven Version:"
mvn --version

# Check Node.js
echo -e "\nNode.js Version:"
node --version

# Check npm
echo -e "\nnpm Version:"
npm --version

# Check Docker
echo -e "\nDocker Version:"
docker --version

# Check environment variables
echo -e "\nEnvironment Variables:"
echo "JAVA_HOME: $JAVA_HOME"
echo "NODE_ENV: $NODE_ENV"
echo "SPRING_PROFILES_ACTIVE: $SPRING_PROFILES_ACTIVE"

echo -e "\n✅ Development environment verification complete!"
```

### Test Development Build

```bash
# Test Java services build
cd openframe
mvn clean compile -DskipTests

# Test frontend build
cd services/openframe-frontend  
npm install
npm run build

# Test chat UI build
cd ../../clients/openframe-chat
npm install
npm run build

echo "✅ All builds successful!"
```

## Next Steps

With your development environment configured:

1. **Continue to**: [Local Development Guide](local-development.md)
2. **Review**: [Architecture Overview](../architecture/overview.md)  
3. **Start**: [Contributing Guidelines](../contributing/guidelines.md)

---

Your development environment is now ready for OpenFrame development! You have all the tools and configurations needed to build, test, and contribute to the platform.