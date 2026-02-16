# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame. Follow the sections relevant to your development focus area.

## 🎯 Development Environment Types

### Full Stack Developer
Complete setup for frontend, backend, and client agent development.

### Frontend Developer  
Node.js, TypeScript, React development tools.

### Backend Developer
Java, Spring Boot, database tools.

### Client Agent Developer
Rust toolchain and cross-platform build tools.

## ☕ Java Backend Development

### Java Development Kit (JDK)

OpenFrame requires Java 21 or higher.

#### Installation Options

**Option 1: SDKMAN (Recommended)**
```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 21
sdk install java 21.0.1-tem
sdk use java 21.0.1-tem

# Verify installation
java --version
```

**Option 2: Package Manager**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS with Homebrew
brew install openjdk@21

# Windows with Chocolatey
choco install openjdk21
```

#### Environment Variables

Set `$JAVA_HOME` permanently:

**Linux/macOS (.bashrc or .zshrc):**
```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

**Windows (System Properties > Environment Variables):**
```text
JAVA_HOME=C:\Program Files\Java\jdk-21
PATH=%JAVA_HOME%\bin;%PATH%
```

### Apache Maven

Maven is used for Java project build management.

#### Installation

**Linux/macOS:**
```bash
# Using package manager
sudo apt install maven       # Ubuntu/Debian  
brew install maven           # macOS

# Or download from Apache Maven
wget https://downloads.apache.org/maven/maven-3/3.9.5/binaries/apache-maven-3.9.5-bin.tar.gz
tar xzf apache-maven-3.9.5-bin.tar.gz
sudo mv apache-maven-3.9.5 /opt/maven
```

**Windows:**
- Download from [Apache Maven](https://maven.apache.org/download.cgi)
- Extract to `C:\Program Files\Apache\maven`
- Add to PATH: `C:\Program Files\Apache\maven\bin`

#### Configuration

**Settings.xml Location:**
```bash
# Linux/macOS
~/.m2/settings.xml

# Windows  
%USERPROFILE%\.m2\settings.xml
```

**Basic settings.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
          http://maven.apache.org/xsd/settings-1.0.0.xsd">
  <localRepository>${user.home}/.m2/repository</localRepository>
</settings>
```

#### Verification

```bash
mvn --version
# Expected output:
# Apache Maven 3.9.5
# Maven home: /opt/maven
# Java version: 21.0.1, vendor: Eclipse Adoptium
```

## 🌐 Frontend Development

### Node.js & npm

OpenFrame frontend requires Node.js 18+ and npm 9+.

#### Installation Options

**Option 1: Node Version Manager (Recommended)**
```bash
# Install nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version && npm --version
```

**Option 2: Direct Installation**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS with Homebrew
brew install node@18

# Windows - Download from nodejs.org
```

### Package Manager Configuration

#### npm Configuration
```bash
# Set registry (if using private registry)
npm config set registry https://registry.npmjs.org/

# Increase memory limit for large builds
npm config set max_old_space_size 4096

# Configure cache directory
npm config set cache ~/.npm-cache
```

#### Alternative: pnpm (Optional)
```bash
# Install pnpm globally
npm install -g pnpm

# Use pnpm for faster installs
pnpm install
pnpm run dev
```

### TypeScript Development Tools

#### Global TypeScript Installation
```bash
npm install -g typescript@latest
npm install -g @typescript-eslint/eslint-plugin
```

#### Verification
```bash
tsc --version  # Should be 5.0+
```

## 🦀 Rust Client Agent Development

### Rust Toolchain

The OpenFrame client agent is written in Rust and requires Rust 1.70+.

#### Installation

**All Platforms:**
```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Source the environment
source `$HOME/.cargo/env`

# Update to latest stable
rustup update stable
rustup default stable
```

#### Cross-compilation Setup

For building agents for multiple platforms:

```bash
# Add target platforms
rustup target add x86_64-pc-windows-gnu     # Windows
rustup target add x86_64-apple-darwin       # macOS Intel
rustup target add aarch64-apple-darwin      # macOS Apple Silicon
rustup target add x86_64-unknown-linux-gnu  # Linux

# Install cross-compilation tools
cargo install cross
```

#### Development Tools

```bash
# Install useful Rust development tools
cargo install cargo-watch      # Auto-rebuild on file changes
cargo install cargo-expand     # Show macro expansions
cargo install cargo-outdated   # Check for outdated dependencies
cargo install cargo-audit      # Security auditing
```

#### IDE Configuration

**VS Code Extensions:**
- `rust-analyzer`: Rust language server
- `CodeLLDB`: Debugging support
- `crates`: Dependency management

**Configuration (.vscode/settings.json):**
```json
{
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.checkOnSave.command": "clippy",
    "rust-analyzer.inlayHints.enable": true
}
```

## 🛢️ Database Development Tools

### MongoDB

#### Installation & Setup

**Docker (Recommended for Development):**
```bash
# Run MongoDB with Docker
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:6.0
```

**Native Installation:**
```bash
# Ubuntu/Debian
sudo apt-get install gnupg curl
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# macOS
brew install mongodb-community@6.0
```

#### Database Client Tools

**MongoDB Compass (GUI):**
```bash
# Download from mongodb.com/try/download/compass
# Or install via package manager
sudo snap install mongodb-compass       # Ubuntu
brew install --cask mongodb-compass     # macOS
```

**Command Line Tools:**
```bash
# MongoDB Shell
mongosh "mongodb://admin:password@localhost:27017/admin"

# MongoDB Database Tools
sudo apt-get install mongodb-database-tools  # Ubuntu
brew install mongodb-database-tools          # macOS
```

### Apache Kafka

#### Development Setup

**Docker Compose (Recommended):**
```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
      
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"
```

#### Kafka Client Tools

**Kafka CLI Tools:**
```bash
# Download Kafka binary distribution
wget https://downloads.apache.org/kafka/2.8.1/kafka_2.13-2.8.1.tgz
tar -xzf kafka_2.13-2.8.1.tgz
cd kafka_2.13-2.8.1

# Add to PATH
export PATH=$PATH:$(pwd)/bin
```

**Kafka UI (Web Interface):**
```bash
# Run with Docker
docker run -d --name kafka-ui \
  -p 8080:8080 \
  -e KAFKA_CLUSTERS_0_NAME=local \
  -e KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=localhost:9092 \
  provectuslabs/kafka-ui:latest
```

## 🛠️ IDE & Editor Configuration

### IntelliJ IDEA (Java Development)

#### Recommended Settings

**File > Settings > Build, Execution, Deployment > Build Tools > Maven:**
```text
☑ Import Maven projects automatically
☑ Download sources
☑ Download documentation
Maven home directory: /opt/maven
```

**Plugins to Install:**
- Spring Boot
- GraphQL
- Database Navigator
- Lombok
- Docker

#### Useful Configuration

**Live Templates for Spring Boot:**
```text
@RestController
@RequestMapping("/api/v1/$ENDPOINT$")
public class $CLASS_NAME$ {
    @GetMapping
    public ResponseEntity<$RETURN_TYPE$> get$ENTITIES$() {
        return ResponseEntity.ok($SERVICE$.findAll());
    }
}
```

### VS Code (Frontend & Rust)

#### Essential Extensions

**Frontend Development:**
```bash
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode  
code --install-extension dbaeumer.vscode-eslint
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension GraphQL.vscode-graphql
```

**Rust Development:**
```bash
code --install-extension rust-lang.rust-analyzer
code --install-extension vadimcn.vscode-lldb
code --install-extension serayuzgur.crates
```

#### Workspace Settings (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.checkOnSave.command": "clippy"
}
```

## 🔧 Development Environment Variables

Create a `.env` file in your project root:

```bash
# Database connections
MONGODB_URI=mongodb://admin:password@localhost:27017/openframe?authSource=admin
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
CASSANDRA_CONTACT_POINTS=localhost:9042
PINOT_BROKER_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379

# Security configuration  
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENFRAME_ENCRYPTION_KEY=your-32-char-encryption-key-here

# Service configuration
OPENFRAME_API_PORT=8081
OPENFRAME_GATEWAY_PORT=8080
OPENFRAME_FRONTEND_PORT=3000

# Development settings
SPRING_PROFILES_ACTIVE=development
LOG_LEVEL=DEBUG
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

> **Security Warning**: Never commit `.env` files to version control. Add `.env` to your `.gitignore`.

## ✅ Environment Verification

### Verification Script

Create `scripts/verify-dev-environment.sh`:

```bash
#!/bin/bash
echo "🔍 Verifying OpenFrame development environment..."

# Java
echo "☕ Java version:"
java --version
echo ""

# Maven  
echo "🔧 Maven version:"
mvn --version
echo ""

# Node.js
echo "🌐 Node.js version:"
node --version
npm --version
echo ""

# Rust
echo "🦀 Rust version:"
rustc --version
cargo --version
echo ""

# Docker
echo "🐳 Docker version:"
docker --version
docker-compose --version
echo ""

# Database connectivity
echo "🛢️ Testing database connections..."
timeout 5 bash -c '</dev/tcp/localhost/27017' && echo "✅ MongoDB" || echo "❌ MongoDB"
timeout 5 bash -c '</dev/tcp/localhost/9092' && echo "✅ Kafka" || echo "❌ Kafka"

echo "🎉 Environment verification complete!"
```

### Manual Verification Checklist

#### Java Backend Development
- [ ] Java 21+ installed and `$JAVA_HOME` set
- [ ] Maven 3.8+ installed and in `$PATH`
- [ ] Can compile with `mvn clean compile`
- [ ] IDE configured with Spring Boot plugins

#### Frontend Development
- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] TypeScript compiler available globally
- [ ] VS Code with React/TypeScript extensions

#### Rust Development
- [ ] Rust 1.70+ installed
- [ ] Cross-compilation targets added
- [ ] VS Code with rust-analyzer extension
- [ ] Can build with `cargo build`

#### Database Development
- [ ] MongoDB accessible on port 27017
- [ ] Kafka accessible on port 9092  
- [ ] Database client tools installed
- [ ] Can connect to databases

## 🎛️ IDE-Specific Setup

### IntelliJ IDEA Ultimate

#### Project Import
1. File > Open > Select `pom.xml` from repository root
2. Import as Maven project
3. Wait for indexing to complete
4. Configure Project SDK to Java 21

#### Run Configurations
Create run configurations for each service:

**OpenFrame API Service:**
```text
Main class: com.openframe.api.ApiApplication  
VM options: -Dspring.profiles.active=development
Program arguments: --server.port=8081
Environment variables: See .env file above
```

### VS Code Workspace

#### Multi-root Workspace
Create `openframe.code-workspace`:

```json
{
  "folders": [
    {
      "name": "Backend Services",
      "path": "./openframe"
    },
    {
      "name": "Frontend",
      "path": "./openframe/services/openframe-frontend"
    },
    {
      "name": "Client Agent",
      "path": "./clients/openframe-client"
    },
    {
      "name": "Chat Client",
      "path": "./clients/openframe-chat"
    }
  ],
  "settings": {
    "java.configuration.workspaces": ["openframe"],
    "typescript.preferences.includePackageJsonAutoImports": "on"
  },
  "extensions": {
    "recommendations": [
      "ms-vscode.vscode-java-pack",
      "rust-lang.rust-analyzer", 
      "bradlc.vscode-tailwindcss",
      "GraphQL.vscode-graphql"
    ]
  }
}
```

## 🚀 Next Steps

With your development environment configured:

1. **[Local Development Setup](local-development.md)**: Clone and build OpenFrame
2. **[Architecture Overview](../architecture/README.md)**: Understand the system design  
3. **[Contributing Guidelines](../contributing/guidelines.md)**: Learn the development workflow

## 🆘 Troubleshooting

### Common Issues

**Java Version Conflicts:**
```bash
# Check which Java version is being used
which java
java --version

# Update JAVA_HOME if needed
export JAVA_HOME=/path/to/java21
```

**Node.js Permission Issues:**
```bash
# Fix npm permissions (Linux/macOS)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

**Rust Compilation Errors:**
```bash
# Update Rust toolchain
rustup update stable

# Clean and rebuild
cargo clean
cargo build
```

**Database Connection Issues:**
```bash
# Check if services are running
docker ps
docker-compose ps

# Check port availability
netstat -tulpn | grep -E ":(27017|9092|9042)"
```

Your development environment is now ready! 🎉