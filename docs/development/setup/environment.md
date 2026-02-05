# Development Environment Setup

This guide will help you configure your development environment for contributing to OpenFrame. We'll cover IDE setup, development tools, and productivity enhancements.

## IDE Configurations

### IntelliJ IDEA (Recommended for Java)

IntelliJ IDEA provides excellent Spring Boot integration and Java development tools.

#### Installation and Setup

1. **Install IntelliJ IDEA**
   ```bash
   # macOS with Homebrew
   brew install --cask intellij-idea

   # Or download from JetBrains website
   # https://www.jetbrains.com/idea/
   ```

2. **Configure Java SDK**
   - Open IntelliJ IDEA
   - Go to **File** → **Project Structure** → **Project**
   - Set **Project SDK** to Java 21
   - Set **Project language level** to 21

3. **Import OpenFrame Project**
   ```bash
   # Clone the repository first
   git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
   ```
   
   - In IntelliJ: **File** → **Open**
   - Select the `openframe-oss-tenant` directory
   - Choose **Import as Maven project**
   - Wait for dependency resolution

#### Essential IntelliJ Plugins

Install these plugins for optimal OpenFrame development:

```text
Required Plugins:
├── Spring Boot (usually pre-installed)
├── Lombok Plugin
├── Maven Helper
├── Docker
├── GraphQL
└── Database Navigator

Optional but Useful:
├── SonarLint (code quality)
├── GitToolBox (Git integration)
├── Rainbow Brackets
├── Key Promoter X (shortcuts learning)
└── String Manipulation
```

#### IntelliJ Configuration

1. **Code Style Settings**
   - Go to **Preferences** → **Editor** → **Code Style** → **Java**
   - Import the code style file (if available in `/docs/development/code-style/intellij-code-style.xml`)
   - Or configure manually:
     ```text
     Tab size: 4
     Indent: 4  
     Continuation indent: 8
     Line length: 120 characters
     ```

2. **Live Templates for OpenFrame**
   
   Create custom live templates for common OpenFrame patterns:
   
   **REST Controller Template** (Abbreviation: `ofrest`)
   ```java
   @RestController
   @RequestMapping("/api/v1/$PATH$")
   @Validated
   @Slf4j
   public class $NAME$Controller {
       
       private final $SERVICE$ $FIELD$;
       
       public $NAME$Controller($SERVICE$ $FIELD$) {
           this.$FIELD$ = $FIELD$;
       }
       
       $END$
   }
   ```
   
   **GraphQL DataFetcher Template** (Abbreviation: `ofgql`)
   ```java
   @DgsComponent
   @Slf4j
   public class $NAME$DataFetcher {
       
       private final $SERVICE$ $FIELD$;
       
       public $NAME$DataFetcher($SERVICE$ $FIELD$) {
           this.$FIELD$ = $FIELD$;
       }
       
       @DgsQuery
       public $RETURN_TYPE$ $METHOD_NAME$(@InputArgument $INPUT_TYPE$ input) {
           $END$
       }
   }
   ```

3. **Run Configurations**

   Set up run configurations for easy service startup:
   
   **API Gateway Configuration:**
   ```text
   Name: OpenFrame Gateway
   Main class: com.openframe.gateway.GatewayApplication
   VM options: -Xmx512m -Dspring.profiles.active=dev
   Working directory: $MODULE_WORKING_DIR$
   Environment variables:
     SERVER_PORT=8081
     SPRING_PROFILES_ACTIVE=dev
   ```
   
   **API Service Configuration:**
   ```text
   Name: OpenFrame API
   Main class: com.openframe.api.ApiApplication  
   VM options: -Xmx768m -Dspring.profiles.active=dev
   Working directory: $MODULE_WORKING_DIR$
   Environment variables:
     SERVER_PORT=8080
     SPRING_PROFILES_ACTIVE=dev
   ```

### VS Code (Frontend & Multi-language)

VS Code is excellent for TypeScript/React development and provides good support for the entire stack.

#### Installation and Setup

1. **Install VS Code**
   ```bash
   # macOS with Homebrew
   brew install --cask visual-studio-code
   
   # Ubuntu/Debian
   sudo snap install code --classic
   ```

2. **Essential Extensions**
   
   Install these extensions for OpenFrame development:
   
   ```bash
   # Frontend Development
   code --install-extension ms-vscode.vscode-typescript-next
   code --install-extension bradlc.vscode-tailwindcss
   code --install-extension esbenp.prettier-vscode
   code --install-extension dbaeumer.vscode-eslint
   
   # Java Development  
   code --install-extension vscjava.vscode-java-pack
   code --install-extension vmware.vscode-spring-boot
   code --install-extension vscjava.vscode-lombok
   
   # Rust Development
   code --install-extension rust-lang.rust-analyzer
   code --install-extension serayuzgur.crates
   
   # General Development
   code --install-extension ms-vscode.vscode-docker
   code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
   code --install-extension GraphQL.vscode-graphql
   code --install-extension humao.rest-client
   
   # Git & Collaboration
   code --install-extension eamodio.gitlens
   code --install-extension github.vscode-pull-request-github
   ```

#### VS Code Configuration

1. **Settings Configuration** (`settings.json`)
   ```json
   {
     "typescript.preferences.importModuleSpecifier": "relative",
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.rulers": [80, 120],
     "files.trimTrailingWhitespace": true,
     "java.configuration.runtimes": [
       {
         "name": "JavaSE-21",
         "path": "/usr/lib/jvm/java-21-openjdk-amd64"
       }
     ],
     "java.compile.nullAnalysis.mode": "automatic",
     "rust-analyzer.checkOnSave.command": "clippy",
     "tailwindCSS.includeLanguages": {
       "typescript": "typescript",
       "typescriptreact": "typescriptreact"
     }
   }
   ```

2. **Workspace Configuration** (`.vscode/settings.json`)
   ```json
   {
     "typescript.preferences.includePackageJsonAutoImports": "on",
     "eslint.workingDirectories": [
       "openframe/services/openframe-frontend"
     ],
     "java.project.sourcePaths": [
       "openframe-oss-lib",
       "openframe/services"
     ]
   }
   ```

3. **Launch Configuration** (`.vscode/launch.json`)
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "OpenFrame Frontend",
         "type": "node",
         "request": "launch",
         "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
         "runtimeExecutable": "npm",
         "runtimeArgs": ["run", "dev"]
       },
       {
         "name": "API Gateway",
         "type": "java",
         "request": "launch",
         "mainClass": "com.openframe.gateway.GatewayApplication",
         "projectName": "openframe-gateway",
         "args": "--spring.profiles.active=dev"
       }
     ]
   }
   ```

## Development Tools Configuration

### Git Configuration

Configure Git for optimal OpenFrame development workflow:

```bash
# Set up your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Useful Git aliases for OpenFrame development
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# OpenFrame-specific aliases
git config --global alias.feature 'checkout -b feature/'
git config --global alias.bugfix 'checkout -b bugfix/'

# Configure pull behavior
git config --global pull.rebase true

# Set up Git hooks (optional)
git config --global core.hooksPath .githooks
```

### Docker Configuration

Optimize Docker for OpenFrame development:

1. **Docker Desktop Settings**
   - **Memory**: Allocate at least 8GB RAM
   - **CPU**: Use at least 4 CPU cores
   - **Disk**: Reserve 50GB+ for images and containers

2. **Docker Compose Override**
   
   Create `docker-compose.override.yml` for local development:
   ```yaml
   version: '3.8'
   
   services:
     mongodb:
       ports:
         - "27017:27017"
       volumes:
         - mongodb_data:/data/db
         - ./scripts/mongodb-init.js:/docker-entrypoint-initdb.d/init.js:ro
       environment:
         MONGO_INITDB_ROOT_USERNAME: openframe
         MONGO_INITDB_ROOT_PASSWORD: development
         MONGO_INITDB_DATABASE: openframe_dev
   
     redis:
       ports:
         - "6379:6379"
       volumes:
         - redis_data:/data
       command: redis-server --appendonly yes
   
     kafka:
       ports:
         - "9092:9092"
       environment:
         KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
         KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
   
   volumes:
     mongodb_data:
     redis_data:
   ```

### Environment Variables Management

Create environment-specific configurations:

1. **Development Environment** (`.env.dev`)
   ```bash
   # Database Configuration
   MONGODB_URI=mongodb://openframe:development@localhost:27017/openframe_dev?authSource=admin
   REDIS_URL=redis://localhost:6379/0
   
   # Application Configuration
   SPRING_PROFILES_ACTIVE=dev
   LOGGING_LEVEL_ROOT=INFO
   LOGGING_LEVEL_COM_OPENFRAME=DEBUG
   
   # Security Configuration
   JWT_SECRET=dev-jwt-secret-change-for-production
   JWT_EXPIRATION=3600
   
   # Integration Configuration
   TACTICAL_RMM_BASE_URL=http://localhost:8000
   FLEET_MDM_BASE_URL=http://localhost:8080
   
   # Frontend Configuration
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
   NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8081
   
   # AI Configuration
   OPENAI_API_KEY=your-openai-key-for-development
   ANTHROPIC_API_KEY=your-anthropic-key-for-development
   ```

2. **Test Environment** (`.env.test`)
   ```bash
   # Override for testing
   MONGODB_URI=mongodb://localhost:27017/openframe_test
   REDIS_URL=redis://localhost:6379/1
   SPRING_PROFILES_ACTIVE=test
   LOGGING_LEVEL_ROOT=WARN
   ```

## Productivity Enhancements

### Terminal Configuration

#### Oh My Zsh (macOS/Linux)

```bash
# Install Oh My Zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Add useful plugins to ~/.zshrc
plugins=(git maven docker kubectl helm)

# Add OpenFrame-specific aliases
echo '# OpenFrame Development Aliases' >> ~/.zshrc
echo 'alias of-build="mvn clean install -DskipTests"' >> ~/.zshrc
echo 'alias of-test="mvn test"' >> ~/.zshrc  
echo 'alias of-run="./scripts/run-mac.sh --dev"' >> ~/.zshrc
echo 'alias of-frontend="cd openframe/services/openframe-frontend && npm run dev"' >> ~/.zshrc
echo 'alias of-logs="docker-compose logs -f"' >> ~/.zshrc
```

#### PowerShell (Windows)

Create a PowerShell profile with OpenFrame shortcuts:

```powershell
# Create/edit PowerShell profile
notepad $PROFILE

# Add these functions
function Of-Build { mvn clean install -DskipTests }
function Of-Test { mvn test }
function Of-Run { .\scripts\run-windows.ps1 -Dev }
function Of-Frontend { 
    Set-Location "openframe\services\openframe-frontend"
    npm run dev
}

# Add aliases
Set-Alias ofb Of-Build
Set-Alias oft Of-Test
Set-Alias ofr Of-Run
Set-Alias off Of-Frontend
```

### Database Tools

#### MongoDB Compass (GUI)

```bash
# Install MongoDB Compass
# macOS
brew install --cask mongodb-compass

# Or download from https://www.mongodb.com/products/compass

# Connection string for local development
mongodb://openframe:development@localhost:27017/openframe_dev?authSource=admin
```

#### Redis CLI Tools

```bash
# Install redis-cli tools
# macOS
brew install redis

# Connect to local Redis
redis-cli -h localhost -p 6379

# Useful Redis commands for OpenFrame
KEYS openframe:*
MONITOR  # Watch real-time commands
INFO memory
```

### API Testing Tools

#### REST Client (VS Code)

Create `.vscode/requests.http` for API testing:

```http
### Test Health Endpoint
GET http://localhost:8081/actuator/health

### Login Request
POST http://localhost:8081/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}

### Get Devices (requires auth)
GET http://localhost:8081/api/v1/devices
Authorization: Bearer {{authToken}}

### GraphQL Query
POST http://localhost:8081/graphql
Content-Type: application/json

{
  "query": "{ devices { id name status } }"
}
```

#### Postman Collection

Export/import Postman collections for OpenFrame API endpoints:

```json
{
  "info": {
    "name": "OpenFrame API",
    "description": "Complete API collection for OpenFrame development"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{jwtToken}}",
        "type": "string"
      }
    ]
  }
}
```

## Development Workflow Scripts

Create custom scripts for common development tasks:

### Build and Test Script

```bash
#!/bin/bash
# scripts/dev-build.sh

echo "🔧 OpenFrame Development Build"
echo "=============================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
mvn clean

# Build core libraries first
echo "📚 Building core libraries..."
mvn install -pl openframe-oss-lib -am -DskipTests

# Build services
echo "⚙️  Building services..."
mvn install -pl openframe/services -am -DskipTests

# Install frontend dependencies
echo "🎨 Installing frontend dependencies..."
cd openframe/services/openframe-frontend
npm install
cd ../../../

# Run tests
echo "🧪 Running tests..."
mvn test

echo "✅ Build complete!"
```

### Development Stack Script

```bash
#!/bin/bash
# scripts/dev-stack.sh

echo "🚀 Starting OpenFrame Development Stack"
echo "======================================"

# Start infrastructure
echo "🗄️  Starting infrastructure..."
docker-compose up -d mongodb redis

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 10

# Start services in background
echo "🌐 Starting Gateway..."
java -jar openframe/services/openframe-gateway/target/openframe-gateway-*.jar &

echo "🔐 Starting Authorization Server..."  
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-*.jar &

echo "📡 Starting API Service..."
java -jar openframe/services/openframe-api/target/openframe-api-*.jar &

echo "🎨 Starting Frontend..."
cd openframe/services/openframe-frontend && npm run dev &

echo "✅ Development stack started!"
echo "📱 Frontend: http://localhost:3000"
echo "🌐 Gateway: http://localhost:8081"
echo "📡 API: http://localhost:8080"
```

## Next Steps

Now that your development environment is configured:

1. **Test Your Setup**: Run through the [Local Development](local-development.md) guide
2. **Explore the Architecture**: Review the [Architecture Overview](../architecture/overview.md)
3. **Make Your First Change**: Follow the [Contributing Guidelines](../contributing/guidelines.md)

Your development environment is now optimized for OpenFrame development! 🎉