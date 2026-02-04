# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame. Follow these steps to configure your IDE, tools, and workspace for optimal productivity.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Backend)

IntelliJ IDEA provides excellent support for Java, Spring Boot, and the OpenFrame tech stack.

#### Installation
```bash
# macOS with Homebrew
brew install --cask intellij-idea

# Or download from JetBrains website
# https://www.jetbrains.com/idea/
```

#### Essential Plugins
Install these plugins for OpenFrame development:

| Plugin | Purpose | Installation |
|--------|---------|-------------|
| **Spring Boot** | Spring Boot support | Built-in |
| **GraphQL** | GraphQL schema and queries | `File` → `Settings` → `Plugins` |
| **Docker** | Container management | Built-in |
| **SonarLint** | Code quality analysis | Marketplace |
| **Lombok** | Java boilerplate reduction | Marketplace |
| **Maven Helper** | Maven dependency management | Marketplace |

#### Project Configuration

1. **Open OpenFrame Project**:
   ```
   File → Open → Select openframe-oss-tenant directory
   ```

2. **Configure Project SDK**:
   ```
   File → Project Structure → Project Settings → Project
   Project SDK: Java 21
   Language Level: 21 - Pattern matching for switch
   ```

3. **Maven Configuration**:
   ```
   File → Settings → Build Tools → Maven
   Maven home path: /usr/local/bin/mvn (or your Maven installation)
   User settings file: ~/.m2/settings.xml
   Local repository: ~/.m2/repository
   ```

4. **Code Style Settings**:
   ```
   File → Settings → Editor → Code Style → Java
   Import: openframe/.editorconfig (if available)
   Scheme: Google Java Style (modified)
   ```

### Visual Studio Code (Recommended for Frontend)

VS Code provides excellent TypeScript and Vue.js development experience.

#### Installation
```bash
# macOS with Homebrew
brew install --cask visual-studio-code

# Or download from Microsoft
# https://code.visualstudio.com/
```

#### Essential Extensions

```bash
# Install via command palette (Cmd/Ctrl+Shift+P)
ext install volar-team.volar                    # Vue 3 support
ext install bradlc.vscode-tailwindcss          # Tailwind CSS
ext install esbenp.prettier-vscode             # Code formatting
ext install dbaeumer.vscode-eslint             # TypeScript linting
ext install ms-vscode.vscode-typescript-next   # TypeScript support
ext install GraphQL.vscode-graphql            # GraphQL support
ext install ms-azuretools.vscode-docker       # Docker support
```

#### Workspace Configuration

Create `.vscode/settings.json` in the frontend directory:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.format.enable": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "volar.takeOverMode.enabled": false,
  "typescript.tsdk": "./node_modules/typescript/lib",
  "files.associations": {
    "*.vue": "vue"
  }
}
```

## Development Tools Installation

### Java Development Kit (JDK) 21

#### Using SDKMAN (Recommended)
```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 21
sdk install java 21.0.1-oracle
sdk use java 21.0.1-oracle

# Verify installation
java -version
```

#### Platform-Specific Installation

##### macOS
```bash
# With Homebrew
brew install openjdk@21

# Add to shell profile
echo 'export PATH="/usr/local/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/usr/local/opt/openjdk@21"' >> ~/.zshrc
source ~/.zshrc
```

##### Linux (Ubuntu/Debian)
```bash
# Install OpenJDK 21
sudo apt update
sudo apt install openjdk-21-jdk

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
source ~/.bashrc
```

##### Windows
```powershell
# Install via Chocolatey
choco install openjdk21

# Or download from Oracle/Eclipse Temurin
# Set JAVA_HOME environment variable
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-21", "Machine")
```

### Node.js and npm

#### Using Node Version Manager (Recommended)

##### macOS/Linux
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 9.x.x
```

##### Windows
```powershell
# Install nvm-windows
# Download from: https://github.com/coreybutler/nvm-windows/releases

# Install Node.js 18
nvm install 18.0.0
nvm use 18.0.0

# Verify
node -v
npm -v
```

### Maven Build Tool

#### Installation

##### macOS
```bash
brew install maven
```

##### Linux
```bash
sudo apt install maven
```

##### Windows
```powershell
choco install maven
```

#### Configuration

Create `~/.m2/settings.xml` for Maven configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings>
  <profiles>
    <profile>
      <id>openframe-dev</id>
      <properties>
        <maven.test.skip>false</maven.test.skip>
        <spring.profiles.active>dev</spring.profiles.active>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>openframe-dev</activeProfile>
  </activeProfiles>
</settings>
```

### Docker Development Environment

#### Docker Desktop Installation

##### macOS
```bash
# Via Homebrew
brew install --cask docker

# Or download from docker.com
```

##### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

##### Windows
Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)

#### Docker Configuration for Development

Configure Docker Desktop settings:

1. **Memory**: Increase to 8GB minimum (16GB recommended)
2. **CPU**: Allocate at least 4 cores
3. **Disk**: Ensure 50GB+ available space

Create `.docker/config.json`:
```json
{
  "experimental": "enabled",
  "debug": true
}
```

## Environment Variables for Development

### Essential Variables

Create a `.env.dev` file in your project root:

```bash
# Development Environment Configuration
NODE_ENV=development
SPRING_PROFILES_ACTIVE=dev

# Database URLs (for local Docker services)
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=openframe_dev

CASSANDRA_HOST=localhost
CASSANDRA_PORT=9042
CASSANDRA_KEYSPACE=openframe_dev

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DATABASE=0

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security (use strong values in production)
JWT_SECRET_KEY=dev-super-secret-key-change-in-production
ENCRYPTION_SECRET_KEY=dev-aes-256-encryption-key-change-me

# Application Ports
OPENFRAME_GATEWAY_PORT=8080
OPENFRAME_API_PORT=8081
OPENFRAME_AUTHZ_PORT=8082
OPENFRAME_FRONTEND_PORT=3000

# Debug Configuration
LOG_LEVEL=DEBUG
ENABLE_DEBUG_ENDPOINTS=true

# External Service URLs (optional for development)
TACTICAL_RMM_URL=http://localhost:8000
MESHCENTRAL_URL=http://localhost:4430
```

### Load Environment Variables

#### Bash/Zsh
```bash
# Add to ~/.bashrc or ~/.zshrc
source /path/to/openframe-oss-tenant/.env.dev
export $(cat /path/to/openframe-oss-tenant/.env.dev | xargs)
```

#### PowerShell
```powershell
# Add to PowerShell profile
Get-Content /path/to/openframe-oss-tenant/.env.dev | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
```

## Editor Extensions and Plugins

### Essential VS Code Extensions for Frontend

```json
{
  "recommendations": [
    "Vue.volar",
    "bradlc.vscode-tailwindcss", 
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "GraphQL.vscode-graphql",
    "ms-azuretools.vscode-docker",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### IntelliJ IDEA Plugins for Backend

Access via `File` → `Settings` → `Plugins`:

- **Spring Boot** - Framework support
- **GraphQL** - Query language support  
- **Docker** - Container management
- **SonarLint** - Code quality
- **Lombok** - Java annotations
- **Maven Helper** - Dependency analysis
- **Database Tools** - MongoDB, Redis support

## Verification Steps

### Test Java Environment
```bash
# Verify Java installation
java -version
javac -version

# Test Maven
mvn -version

# Quick build test
cd openframe-oss-tenant
mvn clean compile -pl openframe/services/openframe-api
```

### Test Node.js Environment
```bash
# Verify Node installation
node -v
npm -v

# Test frontend build
cd openframe/services/openframe-frontend
npm install
npm run type-check
npm run build:dev
```

### Test Docker Environment
```bash
# Verify Docker installation
docker --version
docker-compose --version

# Test container startup
cd integrated-tools
docker-compose up -d mongodb redis
docker ps
```

### IDE Configuration Test

#### IntelliJ IDEA
1. Open OpenFrame project
2. Navigate to `openframe/services/openframe-api/src/main/java/com/openframe/api/ApiApplication.java`
3. Right-click → `Run 'ApiApplication'`
4. Should start without errors

#### VS Code
1. Open `openframe/services/openframe-frontend`
2. Open Command Palette (`Cmd/Ctrl+Shift+P`)
3. Run `TypeScript: Select TypeScript Version` → `Use Workspace Version`
4. Run `npm run dev` in terminal
5. Should serve frontend at http://localhost:3000

## Common Setup Issues

### Java Version Conflicts
```bash
# Check active Java version
java -version

# List installed versions (with SDKMAN)
sdk list java

# Switch version
sdk use java 21.0.1-oracle
```

### Node.js Permission Issues
```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Docker Memory Issues
1. Open Docker Desktop
2. Go to `Settings` → `Resources` → `Memory`
3. Increase to 8GB minimum
4. Apply & Restart Docker

### Port Conflicts
```bash
# Find processes using common ports
lsof -ti:8080,8081,3000 | xargs kill -9

# Or use platform-specific commands
netstat -tuln | grep :8080  # Linux
lsof -i :8080              # macOS
netstat -an | findstr :8080 # Windows
```

## Next Steps

With your development environment ready:

1. **Start Local Development**: Follow [Local Development Guide](local-development.md)
2. **Understand Architecture**: Review [Architecture Overview](../architecture/overview.md)
3. **Begin Contributing**: Read [Contributing Guidelines](../contributing/guidelines.md)

---

Your development environment is now configured for OpenFrame development! 🎉