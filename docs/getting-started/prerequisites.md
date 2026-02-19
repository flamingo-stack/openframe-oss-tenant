# Prerequisites

Before setting up OpenFrame, ensure your development environment meets these requirements. This guide covers all necessary software, system specifications, and account setup needed for a successful OpenFrame deployment.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores (x64) | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB free space | 100+ GB SSD |
| **Network** | Stable internet connection | High-bandwidth connection |

### Supported Operating Systems

OpenFrame supports development and deployment on:

- ✅ **Linux** (Ubuntu 20.04+, CentOS 8+, RHEL 8+)
- ✅ **macOS** (10.15+, including Apple Silicon M1/M2)
- ✅ **Windows** (10/11 with WSL2)

> **Note**: For Windows users, WSL2 (Windows Subsystem for Linux) is strongly recommended for the best development experience.

## Required Software

### 1. Java Development Kit (JDK)

OpenFrame requires **Java 21** as specified in the Maven configuration.

#### Installation Options:

**Option A: Using SDKMAN (Recommended)**
```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source ~/.sdkman/bin/sdkman-init.sh

# Install Java 21
sdk install java 21.0.1-tem
sdk use java 21.0.1-tem
```

**Option B: Direct Download**
- Download from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=21)
- Install and set `JAVA_HOME` environment variable

#### Verification:
```bash
java -version
# Should output: openjdk version "21.0.1"
echo $JAVA_HOME
# Should point to your Java 21 installation
```

### 2. Apache Maven

OpenFrame uses **Maven** for dependency management and build automation.

#### Installation:
```bash
# macOS (using Homebrew)
brew install maven

# Ubuntu/Debian
sudo apt update
sudo apt install maven

# CentOS/RHEL
sudo yum install maven

# Windows (using Chocolatey)
choco install maven
```

#### Verification:
```bash
mvn -version
# Should show Maven 3.6+ and Java 21
```

### 3. Node.js (for Frontend Components)

The OpenFrame chat client and other frontend components require Node.js.

#### Installation:
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or direct download from https://nodejs.org/
```

#### Verification:
```bash
node --version  # Should be v18.x.x or higher
npm --version   # Should be 8.x.x or higher
```

### 4. Rust (for OpenFrame Client)

The OpenFrame client is written in Rust and requires the Rust toolchain.

#### Installation:
```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install required targets for cross-compilation
rustup target add x86_64-unknown-linux-gnu
rustup target add x86_64-pc-windows-gnu
rustup target add x86_64-apple-darwin
```

#### Verification:
```bash
rustc --version  # Should be 1.70+ or higher
cargo --version  # Should be 1.70+ or higher
```

## Infrastructure Dependencies

### Database Systems

OpenFrame requires multiple database systems for different use cases:

#### 1. MongoDB

**Primary operational database** for user data, organizations, devices, and configurations.

```bash
# Using Docker (Recommended for development)
docker run -d \
  --name openframe-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  mongo:7.0

# Or install locally
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
sudo apt update
sudo apt install -y mongodb-org
```

#### 2. Apache Kafka

**Event streaming platform** for real-time data processing.

```bash
# Using Docker Compose (Recommended)
# Create docker-compose.yml with Kafka + Zookeeper configuration
docker run -d \
  --name openframe-kafka \
  -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  confluentinc/cp-kafka:latest
```

#### 3. Redis (Optional but Recommended)

**Caching and session storage**.

```bash
# Using Docker
docker run -d \
  --name openframe-redis \
  -p 6379:6379 \
  redis:7.2-alpine

# Or install locally
# macOS
brew install redis

# Ubuntu/Debian
sudo apt install redis-server
```

### Verification Commands

Test database connectivity:

```bash
# MongoDB
mongosh "mongodb://admin:admin123@localhost:27017"

# Redis
redis-cli ping
# Should return: PONG

# Kafka (requires kafka tools)
kafka-topics.sh --list --bootstrap-server localhost:9092
```

## Development Tools

### Recommended IDEs

| IDE | Best For | Notes |
|-----|---------|-------|
| **IntelliJ IDEA** | Java/Spring Boot development | Excellent Spring Boot support |
| **Visual Studio Code** | Full-stack development | Great for Rust, TypeScript, and Java |
| **Eclipse** | Java development | Free alternative to IntelliJ |

### Essential Extensions/Plugins

**For VS Code:**
- Java Extension Pack
- Spring Boot Extension Pack
- Rust Analyzer
- Thunder Client (API testing)

**For IntelliJ IDEA:**
- Spring Boot Plugin
- Rust Plugin
- Database Navigator

## Environment Variables

Set up these environment variables for OpenFrame development:

```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent

# Java
export JAVA_HOME=/path/to/java21
export PATH=$JAVA_HOME/bin:$PATH

# Maven
export M2_HOME=/path/to/maven
export PATH=$M2_HOME/bin:$PATH

# Node.js (if using NVM)
export NVM_DIR="$HOME/.nvm"

# OpenFrame specific
export OPENFRAME_ENV=development
export OPENFRAME_LOG_LEVEL=DEBUG

# Database connections
export MONGODB_URI=mongodb://admin:admin123@localhost:27017/openframe
export REDIS_URL=redis://localhost:6379
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

## Network Configuration

### Required Ports

Ensure these ports are available and not blocked by firewalls:

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Database connection |
| Redis | 6379 | Caching |
| Kafka | 9092 | Event streaming |
| NATS | 4222 | Messaging |
| OpenFrame API | 8080 | API service |
| OpenFrame Gateway | 8443 | Gateway service |
| OpenFrame Frontend | 3000 | Web interface |

### Firewall Configuration

```bash
# Ubuntu/Debian (using UFW)
sudo ufw allow 27017  # MongoDB
sudo ufw allow 6379   # Redis
sudo ufw allow 9092   # Kafka
sudo ufw allow 4222   # NATS
sudo ufw allow 8080   # API
sudo ufw allow 8443   # Gateway
sudo ufw allow 3000   # Frontend

# macOS (using built-in firewall)
# Usually allows local development by default

# Windows
# Configure Windows Firewall to allow the above ports
```

## Account Requirements

### Required Service Accounts

#### 1. Anthropic API Access (for AI Features)

OpenFrame uses Anthropic Claude for AI-powered features.

1. Sign up at https://console.anthropic.com/
2. Generate an API key
3. Set environment variable:

```bash
export ANTHROPIC_API_KEY=your_anthropic_key_here
```

#### 2. GitHub Access (for CLI Tools)

Some OpenFrame components download from GitHub releases.

1. Create a GitHub personal access token
2. Set environment variable:

```bash
export GITHUB_TOKEN=your_github_token_here
```

### Optional but Recommended

- **Docker Hub Account**: For pulling pre-built images
- **Cloud Provider Account**: AWS/Azure/GCP for production deployment

## Verification Checklist

Run these commands to verify your environment is ready:

```bash
# Java and Maven
java -version | grep "21"
mvn -version | grep "Apache Maven"

# Node.js ecosystem
node --version | grep "v18"
npm --version

# Rust toolchain
rustc --version
cargo --version

# Database connectivity
mongosh --eval "db.runCommand('ping')" "mongodb://admin:admin123@localhost:27017"
redis-cli ping

# Environment variables
echo "Java Home: $JAVA_HOME"
echo "MongoDB URI: $MONGODB_URI"
echo "Anthropic Key set: ${ANTHROPIC_API_KEY:+YES}"
```

All commands should execute successfully without errors.

## Common Issues and Solutions

### Java Version Conflicts

**Problem**: Multiple Java versions causing conflicts

**Solution**:
```bash
# List installed versions
sdk list java

# Switch to Java 21
sdk use java 21.0.1-tem
```

### Port Conflicts

**Problem**: Required ports already in use

**Solution**:
```bash
# Find process using port
lsof -i :27017
sudo netstat -tulpn | grep :27017

# Kill conflicting process
sudo kill -9 <PID>
```

### Database Connection Issues

**Problem**: Cannot connect to MongoDB/Redis

**Solution**:
```bash
# Restart Docker containers
docker restart openframe-mongodb openframe-redis

# Check container status
docker ps | grep openframe
```

## Next Steps

Once all prerequisites are installed and verified:

1. Proceed to the **[Quick Start Guide](quick-start.md)** for your first OpenFrame setup
2. Join the **OpenMSP Slack community** for support: https://www.openmsp.ai/
3. Review the **[First Steps](first-steps.md)** for initial configuration guidance

> 💡 **Pro Tip**: Consider using Docker Compose to set up all infrastructure dependencies with a single command. This simplifies development environment management significantly.