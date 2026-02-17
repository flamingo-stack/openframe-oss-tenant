# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame, including all necessary tools, IDEs, and configurations.

## Development System Requirements

### Minimum Development System

| Component | Requirement |
|-----------|-------------|
| **CPU** | 4 cores (Intel/AMD x86_64 or Apple Silicon) |
| **Memory** | 16 GB RAM |
| **Storage** | 50 GB free SSD space |
| **OS** | Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+) |

### Recommended Development System

| Component | Recommendation |
|-----------|----------------|
| **CPU** | 8+ cores with high single-thread performance |
| **Memory** | 32 GB RAM |
| **Storage** | 100+ GB NVMe SSD |
| **Network** | High-speed internet for dependencies |

## Core Development Tools

### 1. Java Development Kit (JDK)

OpenFrame requires **Java 21** or later:

#### Installation Options

**Option A: Using SDKMAN (Recommended)**
```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 21
sdk install java 21.0.1-tem
sdk use java 21.0.1-tem

# Verify installation
java -version
```

**Option B: Direct Installation**

- **Windows**: Download from [Eclipse Temurin](https://adoptium.net/)
- **macOS**: `brew install openjdk@21` or download from Adoptium
- **Linux**: `sudo apt install openjdk-21-jdk` (Ubuntu/Debian)

#### Verify Java Installation
```bash
java -version
# Expected: openjdk version "21.0.x"

javac -version  
# Expected: javac 21.0.x
```

### 2. Apache Maven

Maven 3.8+ is required for building OpenFrame:

#### Installation

**Using Package Managers:**
```bash
# macOS
brew install maven

# Ubuntu/Debian
sudo apt install maven

# Windows (using Chocolatey)
choco install maven
```

**Manual Installation:**
1. Download from [Apache Maven](https://maven.apache.org/download.cgi)
2. Extract to `/opt/maven` (Linux/macOS) or `C:\maven` (Windows)
3. Add to PATH environment variable

#### Verify Maven Installation
```bash
mvn -version
# Expected: Apache Maven 3.8.x or later
```

### 3. Git Version Control

#### Installation
```bash
# macOS
brew install git

# Ubuntu/Debian  
sudo apt install git

# Windows
# Download from https://git-scm.com/download/win
```

#### Git Configuration
```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Recommended settings for OpenFrame development
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global core.autocrlf input  # Linux/macOS
# git config --global core.autocrlf true  # Windows
```

## Integrated Development Environment (IDE)

### Option 1: IntelliJ IDEA (Recommended)

#### Installation
1. Download [IntelliJ IDEA Community](https://www.jetbrains.com/idea/download/) (free)
2. Or get Ultimate Edition with student/open-source license
3. Install and launch

#### Essential Plugins
Install these plugins for optimal OpenFrame development:

```text
- Spring Boot (bundled)
- GraphQL (for DGS development)  
- Maven Helper
- MongoDB Plugin
- Docker
- GitToolBox
- SonarLint
- CheckStyle-IDEA
```

#### IntelliJ Configuration

**1. Import OpenFrame Project:**
```text
1. File → Open
2. Select the openframe-oss-tenant directory
3. Choose "Open as Maven Project"
4. Wait for indexing to complete
```

**2. Configure JDK:**
```text
1. File → Project Structure
2. Project → Project SDK → Add SDK → Download JDK
3. Select version 21, vendor: Eclipse Temurin
4. Apply changes
```

**3. Configure Maven:**
```text
1. File → Settings → Build → Maven
2. Maven home path: (auto-detected or specify)
3. User settings file: default
4. Local repository: default
5. Apply settings
```

### Option 2: Visual Studio Code

#### Installation and Setup
```bash
# Install VSCode
# Download from https://code.visualstudio.com/

# Install essential extensions
code --install-extension redhat.java
code --install-extension vscjava.vscode-java-pack  
code --install-extension GraphQL.vscode-graphql
code --install-extension ms-vscode.vscode-spring-initializr
code --install-extension mongodb.mongodb-vscode
```

#### VSCode Configuration
Create `.vscode/settings.json`:
```json
{
    "java.home": "/path/to/java-21",
    "java.configuration.runtimes": [
        {
            "name": "JavaSE-21",
            "path": "/path/to/java-21"
        }
    ],
    "maven.executable.path": "/usr/local/bin/mvn",
    "spring-boot.ls.java.home": "/path/to/java-21"
}
```

## Database and Infrastructure Tools

### 1. Docker Desktop

Docker is essential for running development infrastructure:

#### Installation
- **Windows/macOS**: Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: Install Docker Engine and Docker Compose

#### Verify Installation
```bash
docker --version
docker-compose --version

# Test Docker
docker run hello-world
```

### 2. MongoDB Compass

GUI tool for MongoDB development:

#### Installation
1. Download from [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Install and launch
3. Connect to `mongodb://localhost:27017`

### 3. Redis Insight

GUI tool for Redis development:

#### Installation
1. Download from [Redis Insight](https://redis.io/redis-enterprise/redis-insight/)
2. Install and launch  
3. Connect to `localhost:6379`

### 4. Database CLI Tools

Install command-line tools for database interaction:

```bash
# MongoDB Shell
npm install -g mongosh

# Redis CLI (included with Redis installation)
redis-cli --version
```

## Node.js and Frontend Tools

While OpenFrame's backend is Java-based, some development tools require Node.js:

### Installation
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install latest LTS Node.js
nvm install --lts
nvm use --lts

# Verify installation
node --version
npm --version
```

### Useful Global Packages
```bash
# Development utilities
npm install -g http-server
npm install -g json-server
npm install -g @apollo/cli  # For GraphQL development
```

## Rust Development (Optional)

For OpenFrame client agent development:

### Installation
```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

### Rust Tools
```bash
# Install additional tools
rustup component add clippy  # Linter
rustup component add rustfmt # Formatter
cargo install cargo-watch   # Auto-rebuild on changes
```

## Development Environment Variables

Create a `.env` file in your project root for development configuration:

```bash
# Database connections
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# NATS configuration  
NATS_URL=nats://localhost:4222

# JWT configuration
JWT_ISSUER_URI=http://localhost:8082
JWT_SIGNING_KEY=your-dev-signing-key

# Development flags
SPRING_PROFILES_ACTIVE=dev
LOG_LEVEL=DEBUG

# External service URLs (for integration testing)
TACTICAL_RMM_URL=http://localhost:8000
FLEET_MDM_URL=http://localhost:8080
MESHCENTRAL_URL=http://localhost:4430
```

## IDE-Specific Configuration

### IntelliJ IDEA Run Configurations

Create run configurations for each service:

**1. API Service Configuration:**
```text
Main Class: com.openframe.api.ApiApplication
VM Options: -Dspring.profiles.active=dev
Program Arguments: --server.port=8081
Environment Variables: Load from .env file
```

**2. Gateway Service Configuration:**
```text
Main Class: com.openframe.gateway.GatewayApplication  
VM Options: -Dspring.profiles.active=dev
Program Arguments: --server.port=8080
Environment Variables: Load from .env file
```

**3. Authorization Service Configuration:**
```text
Main Class: com.openframe.authz.AuthorizationApplication
VM Options: -Dspring.profiles.active=dev  
Program Arguments: --server.port=8082
Environment Variables: Load from .env file
```

### Code Style Configuration

#### Configure Code Formatting
1. Download the OpenFrame code style configuration
2. Import into your IDE:
   - **IntelliJ**: Settings → Editor → Code Style → Import
   - **VSCode**: Install and configure Java formatting extensions

#### Configure CheckStyle
```xml
<!-- checkstyle.xml -->
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC
    "-//Puppy Crawl//DTD Check Configuration 1.3//EN"
    "http://www.puppycrawl.com/dtds/configuration_1_3.dtd">
<module name="Checker">
    <module name="TreeWalker">
        <module name="Indentation">
            <property name="basicOffset" value="4"/>
        </module>
        <module name="LineLength">
            <property name="max" value="120"/>
        </module>
    </module>
</module>
```

## Development Workflow Tools

### 1. API Testing Tools

**Postman**
- Download and install [Postman](https://www.postman.com/downloads/)
- Import OpenFrame API collections (if available)
- Set up environment variables for local development

**GraphQL Playground**
- Accessible at `http://localhost:8081/graphql` when API service is running
- Use for testing GraphQL queries and mutations

### 2. Performance Monitoring

**JProfiler (Optional)**
- Useful for performance profiling during development
- Free trial available

**JConsole (Built-in)**
```bash
# Monitor running Java applications
jconsole
```

## Verification and Testing

### Environment Verification Script

Create a verification script to test your setup:

```bash
#!/bin/bash
# verify-dev-environment.sh

echo "=== OpenFrame Development Environment Verification ==="

# Check Java
echo "Checking Java..."
java -version 2>&1 | grep -q "21\." && echo "✓ Java 21 installed" || echo "✗ Java 21 not found"

# Check Maven
echo "Checking Maven..."
mvn -version 2>&1 | grep -q "Apache Maven" && echo "✓ Maven installed" || echo "✗ Maven not found"

# Check Docker
echo "Checking Docker..."
docker --version 2>&1 | grep -q "Docker" && echo "✓ Docker installed" || echo "✗ Docker not found"

# Check Git
echo "Checking Git..."
git --version 2>&1 | grep -q "git version" && echo "✓ Git installed" || echo "✗ Git not found"

# Check Node.js (optional)
echo "Checking Node.js..."
node --version 2>&1 | grep -q "v" && echo "✓ Node.js installed" || echo "ℹ Node.js not found (optional)"

echo "=== Verification Complete ==="
```

### Test Build Process

Verify you can build OpenFrame:

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Test build
mvn clean compile -DskipTests

# If successful, run full build
mvn clean install -DskipTests
```

## Next Steps

With your development environment configured:

1. **[Proceed to Local Development Setup](./local-development.md)** - Learn to run OpenFrame locally
2. **[Explore the Architecture Documentation](../architecture/README.md)** - Understand the system design
3. **[Join the Developer Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Connect with other developers

## Troubleshooting Common Issues

### Java Issues
- **Wrong Java version**: Use SDKMAN to manage multiple Java versions
- **JAVA_HOME not set**: Add to your shell profile (`~/.bashrc`, `~/.zshrc`)
- **IDE not recognizing Java**: Restart IDE after Java installation

### Maven Issues  
- **Dependencies not downloading**: Check internet connectivity and proxy settings
- **Build failures**: Ensure Java 21 is being used by Maven

### Docker Issues
- **Docker not starting**: Ensure Docker Desktop is running
- **Permission issues on Linux**: Add user to docker group: `sudo usermod -aG docker $USER`

### IDE Issues
- **Project not importing**: Delete `.idea` folder and reimport
- **Slow performance**: Increase IDE memory allocation
- **Plugin conflicts**: Disable unnecessary plugins

For additional help, join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and ask in the `#development` channel.