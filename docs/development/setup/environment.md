# Development Environment Setup

This guide walks you through setting up your development environment for OpenFrame. We'll configure IDEs, essential tools, and editor extensions to maximize your productivity when developing with the OpenFrame platform.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java)

IntelliJ IDEA provides the best experience for Spring Boot development with excellent support for all OpenFrame technologies.

#### Installation

**Option 1: JetBrains Toolbox (Recommended)**
1. Download from https://www.jetbrains.com/toolbox/
2. Install IntelliJ IDEA Ultimate (free for open source development)

**Option 2: Direct Download**
1. Download from https://www.jetbrains.com/idea/
2. Install Ultimate edition for full Spring Boot support

#### Essential Plugins

Install these plugins via **File → Settings → Plugins**:

```text
✅ Spring Boot (bundled)
✅ Spring Data (bundled) 
✅ Spring Security (bundled)
✅ Database Navigator
✅ Docker
✅ Kubernetes
✅ GraphQL
✅ Rust (for client development)
✅ Lombok
✅ SonarLint
✅ GitToolBox
✅ Rainbow Brackets
✅ String Manipulation
```

#### Configuration

**1. Project SDK Setup**
```text
File → Project Structure → Project Settings → Project
- Project SDK: Java 21 (Eclipse Temurin)
- Project Language Level: 21
```

**2. Maven Configuration**
```text
File → Settings → Build, Execution, Deployment → Build Tools → Maven
- Maven home directory: /path/to/maven
- User settings file: ~/.m2/settings.xml
- Local repository: ~/.m2/repository
✅ Import Maven projects automatically
✅ Generate sources and documentation
```

**3. Spring Boot Configuration**
```text
File → Settings → Build, Execution, Deployment → Application Servers
- Add Spring Boot server
- Configure auto-restart for development
```

**4. Database Tools**
```text
Database Navigator → Add Connection
- MongoDB: mongodb://admin:admin123@localhost:27017/openframe
- Redis: redis://localhost:6379
```

### Visual Studio Code (Multi-Language Support)

Excellent choice for full-stack development with strong support for Java, Rust, TypeScript, and configuration files.

#### Installation

```bash
# macOS
brew install --cask visual-studio-code

# Ubuntu/Debian
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
sudo apt update
sudo apt install code

# Windows
# Download from https://code.visualstudio.com/
```

#### Essential Extensions

Install via **Extensions (Ctrl+Shift+X)**:

**Java Development:**
```text
✅ Extension Pack for Java (Microsoft)
✅ Spring Boot Extension Pack (VMware)
✅ Maven for Java (Microsoft)
✅ Debugger for Java (Microsoft)
✅ Test Runner for Java (Microsoft)
```

**Rust Development:**
```text
✅ rust-analyzer (The Rust Programming Language)
✅ Even Better TOML (tamasfe)
✅ CodeLLDB (Vadim Chugunov)
```

**Web Development:**
```text
✅ TypeScript and JavaScript (Microsoft)
✅ Tailwind CSS IntelliSense
✅ Auto Rename Tag
✅ Bracket Pair Colorizer
✅ ES7+ React/Redux/React-Native snippets
```

**DevOps & Configuration:**
```text
✅ Docker (Microsoft)
✅ Kubernetes (Microsoft)
✅ YAML (Red Hat)
✅ XML Tools (Josh Johnson)
✅ GraphQL (GraphQL Foundation)
```

**Productivity:**
```text
✅ GitLens (GitKraken)
✅ Thunder Client (RangaV)
✅ SonarLint (SonarSource)
✅ Prettier (Prettier)
✅ ESLint (Microsoft)
```

#### VS Code Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "java.home": "/path/to/java21",
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "/path/to/java21",
      "default": true
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "java.debug.settings.hotCodeReplace": "auto",
  "spring-boot.ls.java.home": "/path/to/java21",
  "rust-analyzer.cargo.buildScripts.enable": true,
  "rust-analyzer.procMacro.enable": true,
  "files.associations": {
    "*.yml": "yaml",
    "*.yaml": "yaml"
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

Create `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Debug API Service",
      "request": "launch",
      "mainClass": "com.openframe.api.ApiApplication",
      "projectName": "openframe-api",
      "args": "",
      "vmArgs": "-Dspring.profiles.active=dev"
    },
    {
      "type": "java",
      "name": "Debug Gateway Service", 
      "request": "launch",
      "mainClass": "com.openframe.gateway.GatewayApplication",
      "projectName": "openframe-gateway",
      "vmArgs": "-Dspring.profiles.active=dev"
    },
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Rust Client",
      "cargo": {
        "args": ["build", "--bin=openframe-client", "--package=openframe-client"],
        "filter": {
          "name": "openframe-client",
          "kind": "bin"
        }
      },
      "args": [],
      "cwd": "${workspaceFolder}/clients/openframe-client"
    }
  ]
}
```

## Required Development Tools

### 1. Version Control

**Git Configuration:**
```bash
# Set global configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false

# Useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'
```

### 2. Build Tools

**Maven Configuration** (`~/.m2/settings.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
          http://maven.apache.org/xsd/settings-1.0.0.xsd">
    
    <localRepository>${user.home}/.m2/repository</localRepository>
    
    <profiles>
        <profile>
            <id>openframe-dev</id>
            <properties>
                <spring.profiles.active>dev</spring.profiles.active>
                <maven.test.skip>false</maven.test.skip>
            </properties>
        </profile>
    </profiles>
    
    <activeProfiles>
        <activeProfile>openframe-dev</activeProfile>
    </activeProfiles>
    
</settings>
```

**Node.js Tool Configuration** (`.npmrc`):
```bash
# Create in project root
echo "registry=https://registry.npmjs.org/" > .npmrc
echo "save-exact=true" >> .npmrc
echo "engine-strict=true" >> .npmrc
```

### 3. Database Tools

#### MongoDB Tools

**Install MongoDB Compass (GUI)**:
```bash
# macOS
brew install --cask mongodb-compass

# Ubuntu/Debian
wget https://downloads.mongodb.com/compass/mongodb-compass_1.40.4_amd64.deb
sudo dpkg -i mongodb-compass_1.40.4_amd64.deb

# Windows
# Download from https://www.mongodb.com/try/download/compass
```

**Connection String for Development**:
```text
mongodb://admin:admin123@localhost:27017/openframe?authSource=admin
```

#### Redis Tools

**Install Redis GUI Tools**:
```bash
# RedisInsight (Official GUI)
# Download from https://redis.com/redis-enterprise/redis-insight/

# Or use redis-cli for command line
redis-cli -h localhost -p 6379
```

### 4. API Development Tools

#### HTTP Client Tools

**1. Thunder Client (VS Code Extension)**
- Install via Extensions marketplace
- Create requests directly in VS Code
- Supports environment variables

**2. Postman (Standalone)**
```bash
# macOS
brew install --cask postman

# Ubuntu (Snap)
sudo snap install postman

# Windows
# Download from https://www.postman.com/downloads/
```

**3. HTTPie (Command Line)**
```bash
# macOS
brew install httpie

# Ubuntu/Debian
sudo apt install httpie

# Test OpenFrame API
http GET https://localhost:8443/health --verify=no
```

#### GraphQL Tools

**GraphQL Playground Configuration**:
```javascript
// Add to browser bookmarks
javascript:(function(){window.open('https://localhost:8443/graphql','_blank')})()
```

## Environment Variables Configuration

### Development Environment File

Create `.env.development` in project root:

```bash
# Java Environment
JAVA_HOME=/path/to/java21
JAVA_OPTS=-Xmx2g -XX:+UseG1GC -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005

# Spring Profiles
SPRING_PROFILES_ACTIVE=dev

# Database Configuration
MONGODB_URI=mongodb://admin:admin123@localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# AI Configuration
ANTHROPIC_API_KEY=your_anthropic_key_here

# OpenFrame Configuration
OPENFRAME_ENV=development
OPENFRAME_LOG_LEVEL=DEBUG

# External Services
GITHUB_TOKEN=your_github_token
DOCKER_HOST=unix:///var/run/docker.sock
```

### Shell Profile Configuration

Add to your `~/.bashrc`, `~/.zshrc`, or equivalent:

```bash
# OpenFrame Development Environment
export OPENFRAME_DEV_HOME="$HOME/workspace/openframe-oss-tenant"

# Load development environment if in OpenFrame directory
if [[ "$PWD" == *"openframe"* ]]; then
    if [ -f ".env.development" ]; then
        set -a
        source .env.development
        set +a
        echo "🔥 OpenFrame dev environment loaded"
    fi
fi

# Useful aliases for OpenFrame development
alias of-build="mvn clean install -DskipTests"
alias of-test="mvn test"
alias of-run-gateway="java -jar openframe/services/openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar"
alias of-run-api="java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar"
alias of-logs="docker-compose logs -f"
alias of-reset-db="docker-compose down && docker volume rm \$(docker volume ls -q) && docker-compose up -d"

# Quick navigation
alias of-gateway="cd $OPENFRAME_DEV_HOME/openframe/services/openframe-gateway"
alias of-api="cd $OPENFRAME_DEV_HOME/openframe/services/openframe-api"
alias of-client="cd $OPENFRAME_DEV_HOME/clients/openframe-client"
```

## Debugging Configuration

### Java Application Debugging

**IntelliJ IDEA Debug Configuration**:
1. **Run → Edit Configurations**
2. **Add New → Application**
3. **Configure for each service**:
   ```text
   Main Class: com.openframe.api.ApiApplication
   VM Options: -Dspring.profiles.active=dev -Xdebug
   Program Arguments: --server.port=8080
   Working Directory: $MODULE_WORKING_DIR$
   Environment Variables: SPRING_PROFILES_ACTIVE=dev
   ```

**VS Code Debug Configuration** (see launch.json above)

### Remote Debugging

**Enable Remote Debugging on Services**:
```bash
# API Service with remote debugging
java -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005 \
     -jar openframe-api-1.0.0-SNAPSHOT.jar

# Gateway Service with remote debugging  
java -Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5006 \
     -jar openframe-gateway-1.0.0-SNAPSHOT.jar
```

**Connect IDE to Remote Debugger**:
- **IntelliJ**: Run → Attach to Process → Select JVM with debug port
- **VS Code**: Add remote attach configuration to launch.json

### Database Debugging

**MongoDB Query Profiling**:
```javascript
// Connect via mongosh
mongosh "mongodb://admin:admin123@localhost:27017/openframe"

// Enable profiling for slow operations
db.setProfilingLevel(2, { slowms: 100 })

// View profile data
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

**Redis Monitoring**:
```bash
# Monitor Redis commands
redis-cli monitor

# Check Redis performance
redis-cli --latency-history
```

## Performance Monitoring Tools

### Application Performance

**1. Spring Boot Actuator Endpoints**:
```bash
# Health check
curl https://localhost:8080/actuator/health

# Metrics
curl https://localhost:8080/actuator/metrics

# Environment info
curl https://localhost:8080/actuator/env
```

**2. JVM Monitoring**:
```bash
# JConsole (GUI)
jconsole

# VisualVM (Advanced profiling)
# Download from https://visualvm.github.io/

# Command line tools
jps    # List Java processes
jstat  # JVM statistics
jmap   # Memory maps
jstack # Thread dumps
```

### System Monitoring

**htop/top for System Resources**:
```bash
# Install htop (better than top)
# macOS
brew install htop

# Ubuntu/Debian
sudo apt install htop
```

**Docker Stats**:
```bash
# Monitor Docker container resource usage
docker stats

# Detailed container inspection
docker inspect openframe-mongodb
```

## Code Quality Tools

### Static Analysis

**SonarLint Configuration**:
1. Install SonarLint plugin in IDE
2. Configure rules for Java and JavaScript/TypeScript
3. Enable automatic analysis on save

**Checkstyle Configuration** (`.checkstyle.xml`):
```xml
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC
    "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
    "https://checkstyle.org/dtds/configuration_1_3.dtd">

<module name="Checker">
    <property name="charset" value="UTF-8"/>
    <property name="severity" value="warning"/>
    <property name="fileExtensions" value="java, properties, xml"/>
    
    <module name="TreeWalker">
        <module name="OuterTypeFilename"/>
        <module name="IllegalTokenText"/>
        <module name="AvoidEscapedUnicodeCharacters"/>
        <module name="LineLength">
            <property name="max" value="120"/>
        </module>
        <module name="AvoidStarImport"/>
        <module name="OneTopLevelClass"/>
        <module name="NoLineWrap"/>
        <module name="EmptyBlock"/>
        <module name="NeedBraces"/>
        <module name="LeftCurly"/>
        <module name="RightCurly"/>
        <module name="WhitespaceAround"/>
        <module name="OneStatementPerLine"/>
        <module name="MultipleVariableDeclarations"/>
        <module name="ArrayTypeStyle"/>
        <module name="MissingSwitchDefault"/>
        <module name="FallThrough"/>
        <module name="UpperEll"/>
        <module name="ModifierOrder"/>
        <module name="EmptyLineSeparator"/>
        <module name="SeparatorWrap"/>
        <module name="PackageName"/>
        <module name="TypeName"/>
        <module name="MemberName"/>
        <module name="ParameterName"/>
        <module name="CatchParameterName"/>
        <module name="LocalVariableName"/>
        <module name="ClassTypeParameterName"/>
        <module name="MethodTypeParameterName"/>
        <module name="InterfaceTypeParameterName"/>
        <module name="NoFinalizer"/>
        <module name="GenericWhitespace"/>
        <module name="Indentation"/>
        <module name="AbbreviationAsWordInName"/>
        <module name="OverloadMethodsDeclarationOrder"/>
        <module name="VariableDeclarationUsageDistance"/>
        <module name="CustomImportOrder"/>
        <module name="MethodParamPad"/>
        <module name="OperatorWrap"/>
        <module name="AnnotationLocation"/>
        <module name="NonEmptyAtclauseDescription"/>
        <module name="MethodName"/>
    </module>
</module>
```

### Code Formatting

**Prettier Configuration** (`.prettierrc`):
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Environment Verification

### Verification Script

Create `scripts/verify-dev-env.sh`:

```bash
#!/bin/bash

echo "🔍 Verifying OpenFrame Development Environment..."
echo "=================================================="

# Java
echo "☕ Java Version:"
java -version 2>&1 | head -1
if java -version 2>&1 | grep -q "21"; then
    echo "✅ Java 21 detected"
else
    echo "❌ Java 21 not found"
fi

# Maven
echo -e "\n📦 Maven Version:"
mvn -version | head -1
if command -v mvn &> /dev/null; then
    echo "✅ Maven available"
else
    echo "❌ Maven not found"
fi

# Node.js
echo -e "\n🟢 Node.js Version:"
node --version
if node --version | grep -q "v18\|v19\|v20"; then
    echo "✅ Node.js 18+ detected"
else
    echo "❌ Node.js 18+ not found"
fi

# Rust
echo -e "\n🦀 Rust Version:"
rustc --version
if command -v rustc &> /dev/null; then
    echo "✅ Rust available"
else
    echo "❌ Rust not found"
fi

# Docker
echo -e "\n🐳 Docker Version:"
docker --version
if command -v docker &> /dev/null; then
    echo "✅ Docker available"
else
    echo "❌ Docker not found"
fi

# Database connectivity
echo -e "\n🗄️ Database Connectivity:"
if docker ps | grep -q mongodb; then
    echo "✅ MongoDB container running"
else
    echo "❌ MongoDB container not running"
fi

if docker ps | grep -q redis; then
    echo "✅ Redis container running"
else
    echo "❌ Redis container not running"
fi

# Environment variables
echo -e "\n🔧 Environment Variables:"
if [ -n "$JAVA_HOME" ]; then
    echo "✅ JAVA_HOME set: $JAVA_HOME"
else
    echo "❌ JAVA_HOME not set"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY configured"
else
    echo "❌ ANTHROPIC_API_KEY not set"
fi

echo -e "\n🎉 Environment verification complete!"
```

**Run verification**:
```bash
chmod +x scripts/verify-dev-env.sh
./scripts/verify-dev-env.sh
```

## Next Steps

Your development environment is now configured! Next steps:

1. **[Local Development](local-development.md)** - Clone, build, and run OpenFrame locally
2. **[Architecture Overview](../architecture/README.md)** - Understand the system design
3. **[Security Guidelines](../security/README.md)** - Learn secure development practices
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Prepare to contribute code

## Troubleshooting

### Common IDE Issues

**IntelliJ not recognizing Spring Boot**:
- File → Invalidate Caches and Restart
- Reimport Maven project
- Verify Spring Boot plugin is enabled

**VS Code Java issues**:
- Ctrl+Shift+P → "Java: Restart Projects"
- Check Extension Pack for Java is installed
- Verify java.home setting in settings.json

**Performance Issues**:
- Increase IDE memory allocation
- Exclude `target/`, `node_modules/`, `.git/` from indexing
- Close unused projects

Need help? Join the OpenMSP Slack community: https://www.openmsp.ai/ 🚀