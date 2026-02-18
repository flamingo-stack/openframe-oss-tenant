# Prerequisites

Before setting up OpenFrame OSS Tenant, ensure your development environment meets the following requirements. This guide covers all necessary software, system requirements, and access needs.

## System Requirements

### Minimum Hardware Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 8 GB | 16 GB |
| **CPU** | 4 cores | 8 cores |
| **Storage** | 20 GB free | 50 GB free |
| **Network** | Stable internet connection | High-speed broadband |

### Supported Operating Systems

- **Linux** (Ubuntu 20.04+, CentOS 8+, or equivalent)
- **macOS** (10.15 Catalina or later)
- **Windows** (Windows 10 or Windows Server 2019+)

## Required Software

### 1. Java Development Kit (JDK) 21

OpenFrame OSS Tenant requires **Java 21** as specified in the Spring Boot 3.3.0 configuration.

**Installation:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS (using Homebrew)
brew install openjdk@21

# Windows (using Chocolatey)
choco install openjdk21
```

**Verification:**
```bash
java -version
javac -version
```

Expected output should show Java 21.x.x.

### 2. Apache Maven 3.6+

Maven is required for building the Spring Boot services.

**Installation:**

```bash
# Ubuntu/Debian
sudo apt install maven

# macOS (using Homebrew)
brew install maven

# Windows (using Chocolatey)
choco install maven
```

**Verification:**
```bash
mvn -version
```

### 3. Node.js 18+ and npm/yarn

Required for the frontend application and development tooling.

**Installation:**

```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or direct installation
# Ubuntu/Debian
sudo apt install nodejs npm

# macOS (using Homebrew)
brew install node

# Windows (using Chocolatey)
choco install nodejs
```

**Verification:**
```bash
node --version
npm --version
```

### 4. Rust (for Client Applications)

The OpenFrame client applications are written in Rust and use Tauri for desktop apps.

**Installation:**

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME`/.cargo/env

# Add required targets
rustup target add x86_64-pc-windows-msvc
rustup target add aarch64-apple-darwin
```

**Verification:**
```bash
rustc --version
cargo --version
```

### 5. Git

Version control system for source code management.

**Installation:**

```bash
# Ubuntu/Debian
sudo apt install git

# macOS (using Homebrew)
brew install git

# Windows (using Chocolatey)
choco install git
```

**Verification:**
```bash
git --version
```

## Infrastructure Dependencies

The following services are required for a complete OpenFrame deployment:

### Database Systems

| Service | Version | Purpose |
|---------|---------|---------|
| **MongoDB** | 5.0+ | Primary document database |
| **Redis** | 6.0+ | Caching and distributed locking |
| **Apache Cassandra** | 4.0+ | Time-series log storage |

### Message Streaming & Processing

| Service | Version | Purpose |
|---------|---------|---------|
| **Apache Kafka** | 3.6+ | Event streaming |
| **NATS** | 2.9+ | Lightweight messaging |
| **Apache Pinot** | 1.2+ | Real-time analytics |

### Development Tools (Optional but Recommended)

| Tool | Purpose |
|------|---------|
| **Docker** & **Docker Compose** | Containerized development |
| **IntelliJ IDEA** or **VS Code** | IDE with Java/Rust support |
| **Postman** or **curl** | API testing |
| **MongoDB Compass** | Database visualization |
| **Redis CLI** | Cache debugging |

## Environment Variables

Set up the following environment variables for development:

```bash
# Java Configuration
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# Maven Configuration
export M2_HOME=/usr/share/maven
export PATH=$M2_HOME/bin:$PATH

# Node.js Configuration  
export NODE_ENV=development

# Rust Configuration
export PATH=$HOME/.cargo/bin:$PATH

# OpenFrame Configuration
export OPENFRAME_ENV=local
export OPENFRAME_LOG_LEVEL=DEBUG
```

Add these to your shell profile (`.bashrc`, `.zshrc`, etc.).

## Access Requirements

### Development Accounts (Optional)

For full platform integration, you may need:

- **Google Cloud Account** - For Google SSO integration
- **Microsoft Azure Account** - For Microsoft SSO integration
- **GitHub Account** - For source code access to additional repositories

### Network Requirements

Ensure your development environment can access:

- **Port 8080-8090** - Spring Boot services
- **Port 3000** - Frontend development server
- **Port 27017** - MongoDB default port
- **Port 6379** - Redis default port
- **Port 9092** - Kafka default port
- **Port 4222** - NATS default port

## Verification Commands

Run these commands to verify your setup:

```bash
# Java and Maven
java -version && mvn -version

# Node.js ecosystem
node --version && npm --version

# Rust ecosystem  
rustc --version && cargo --version

# Git
git --version

# Check required ports are available
netstat -tuln | grep -E ':(8080|3000|27017|6379|9092|4222)'
```

## Development Environment Setup

### IDE Configuration

**For IntelliJ IDEA:**
1. Install plugins: Spring Boot, GraphQL, Rust
2. Configure JDK 21 in Project Settings
3. Enable annotation processing
4. Set up code style (Google Java Style recommended)

**For VS Code:**
1. Install extensions:
   - Java Extension Pack
   - Spring Boot Extension Pack
   - Rust Analyzer
   - GraphQL
   - Docker

### Shell Environment

Consider using these development tools:

```bash
# Oh My Zsh for enhanced shell experience
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Useful aliases
echo 'alias ll="ls -la"' >> ~/.zshrc
echo 'alias openframe-build="mvn clean install -DskipTests"' >> ~/.zshrc
echo 'alias openframe-test="mvn test"' >> ~/.zshrc
```

## Troubleshooting Common Issues

### Java Issues
- **Problem:** `JAVA_HOME` not set
- **Solution:** Export `JAVA_HOME` pointing to your Java 21 installation

### Maven Issues  
- **Problem:** Maven cannot find dependencies
- **Solution:** Run `mvn clean install` from the root directory

### Node.js Issues
- **Problem:** Permission errors with npm
- **Solution:** Use Node Version Manager (nvm) or configure npm prefix

### Port Conflicts
- **Problem:** Ports already in use
- **Solution:** Stop conflicting services or change port configurations

## Next Steps

Once your prerequisites are satisfied:

1. **[Quick Start Guide](quick-start.md)** - Get the platform running locally
2. **[Development Setup](../development/setup/environment.md)** - Configure your IDE and tools

> **Having Issues?** Join the [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help from the community.