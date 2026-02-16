# Prerequisites

Before installing and running OpenFrame, ensure your system meets the following requirements. This guide covers everything needed for both local development and production deployment.

## System Requirements

### Minimum Hardware Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| **CPU** | 4 cores (Intel/AMD x64) | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 20 GB free space | 100+ GB SSD |
| **Network** | Broadband internet | High-speed internet |

### Supported Operating Systems

| OS | Version | Support Level |
|---|---------|---------------|
| **macOS** | 12.0+ (Monterey) | ✅ Fully Supported |
| **Linux** | Ubuntu 20.04+, RHEL 8+, Debian 11+ | ✅ Fully Supported |
| **Windows** | Windows 10/11, Windows Server 2019+ | ✅ Fully Supported |

## Required Software Dependencies

### Core Requirements

#### 1. Java Development Kit (JDK)
- **Version**: OpenJDK 21 or Oracle JDK 21
- **Required for**: Backend services compilation and runtime

**Installation:**
```bash
# macOS (using Homebrew)
brew install openjdk@21

# Linux (Ubuntu/Debian)
sudo apt install openjdk-21-jdk

# Windows (using Chocolatey)
choco install openjdk21
```

**Verification:**
```bash
java -version
javac -version
```

#### 2. Apache Maven
- **Version**: 3.9.0 or higher
- **Required for**: Building Java services and managing dependencies

**Installation:**
```bash
# macOS
brew install maven

# Linux (Ubuntu/Debian)
sudo apt install maven

# Windows
choco install maven
```

**Verification:**
```bash
mvn --version
```

#### 3. Node.js & npm
- **Version**: Node.js 18.0+ with npm 9.0+
- **Required for**: Frontend development and build processes

**Installation:**
```bash
# macOS
brew install node

# Linux (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
choco install nodejs
```

**Verification:**
```bash
node --version
npm --version
```

#### 4. Rust & Cargo
- **Version**: Rust 1.70+ with Cargo
- **Required for**: OpenFrame client agent

**Installation:**
```bash
# All platforms
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**Verification:**
```bash
rustc --version
cargo --version
```

## Infrastructure Dependencies

### Database Systems

#### 1. MongoDB
- **Version**: 7.0+
- **Usage**: Primary data store for application data
- **Setup**: Can use Docker or native installation

```bash
# Docker setup (recommended for development)
docker run --name mongodb -p 27017:27017 -d mongo:7.0
```

#### 2. Redis
- **Version**: 7.0+
- **Usage**: Caching and session storage
- **Setup**: Docker or native installation

```bash
# Docker setup
docker run --name redis -p 6379:6379 -d redis:7.0
```

#### 3. Apache Kafka
- **Version**: 3.6.0+
- **Usage**: Event streaming and messaging
- **Setup**: Docker Compose recommended

### Optional (Advanced Setup)

#### Apache Cassandra
- **Version**: 4.x
- **Usage**: Analytics and log storage
- **Note**: Optional for basic development

#### Apache Pinot
- **Version**: 1.2.0+
- **Usage**: Real-time analytics queries
- **Note**: Optional for basic development

## Development Environment

### IDE Recommendations

| IDE | Language Support | Recommended Plugins |
|-----|------------------|-------------------|
| **IntelliJ IDEA** | Java, Vue, TypeScript | Spring Boot, Vue.js |
| **VS Code** | Universal | Java Extension Pack, Vetur, Rust |
| **Eclipse** | Java | Spring Tools, Wild Web Developer |

### Git Configuration
- **Version**: Git 2.30+
- **Authentication**: SSH keys or personal access tokens

```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Docker Environment (Recommended)

### Docker & Docker Compose
- **Docker**: Version 24.0+
- **Docker Compose**: Version 2.20+
- **Usage**: Simplified infrastructure setup

**Installation:**
```bash
# macOS
brew install docker docker-compose

# Linux (Ubuntu/Debian)
sudo apt install docker.io docker-compose-plugin

# Windows
# Download Docker Desktop from docker.com
```

**Verification:**
```bash
docker --version
docker compose version
```

**Post-installation:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
```

## Network & Security Requirements

### Port Availability
Ensure these ports are available on your development machine:

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| **Frontend** | 3000 | HTTP | Vue.js development server |
| **API Gateway** | 8080 | HTTP | Gateway service |
| **API Service** | 8081 | HTTP | Main API service |
| **Authorization** | 8082 | HTTP | OAuth2 server |
| **MongoDB** | 27017 | TCP | Database |
| **Redis** | 6379 | TCP | Cache |
| **Kafka** | 9092 | TCP | Message broker |

### Firewall Configuration
- Allow inbound connections on development ports
- Ensure outbound internet access for package downloads

## Environment Variables

Set up these environment variables for development:

```bash
# Java
export JAVA_HOME=/path/to/java21

# Maven
export MAVEN_HOME=/path/to/maven
export PATH=$MAVEN_HOME/bin:$PATH

# Node.js (if using version manager)
export NODE_VERSION=18

# OpenFrame specific (optional for development)
export OPENFRAME_ENV=development
export OPENFRAME_LOG_LEVEL=DEBUG
```

## Account Requirements

### Required Accounts
- **GitHub Account**: For cloning repositories and accessing dependencies
- **Docker Hub** (optional): For pulling pre-built images

### Optional Accounts (for production)
- **Google Workspace**: For Google SSO integration
- **Microsoft Azure**: For Microsoft SSO integration
- **MongoDB Atlas**: For managed MongoDB hosting
- **Redis Cloud**: For managed Redis hosting

## Verification Checklist

Run this verification script to check all prerequisites:

```bash
#!/bin/bash

echo "OpenFrame Prerequisites Check"
echo "============================="

# Java
echo -n "Java 21: "
java -version 2>&1 | grep -q "21\." && echo "✅ OK" || echo "❌ Missing"

# Maven
echo -n "Maven: "
mvn --version > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Missing"

# Node.js
echo -n "Node.js 18+: "
node --version 2>&1 | grep -E "v(1[8-9]|[2-9][0-9])" && echo "✅ OK" || echo "❌ Missing"

# Rust
echo -n "Rust: "
rustc --version > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Missing"

# Docker
echo -n "Docker: "
docker --version > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Missing"

# Git
echo -n "Git: "
git --version > /dev/null 2>&1 && echo "✅ OK" || echo "❌ Missing"

echo ""
echo "If any items show ❌, please install them before continuing."
```

## Next Steps

Once all prerequisites are met:

1. **Continue to [Quick Start](quick-start.md)** for immediate setup
2. **Review [First Steps](first-steps.md)** for post-installation configuration
3. **Check [Development Environment Setup](/docs/development/setup/environment.md)** for advanced development configuration

## Troubleshooting

### Common Issues

#### Java Version Conflicts
```bash
# Check all Java versions
ls /usr/libexec/java_home -V  # macOS
update-alternatives --list java  # Linux

# Set JAVA_HOME explicitly
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
```

#### Port Conflicts
```bash
# Check what's using a port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows
```

#### Docker Permission Issues
```bash
# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
# Then log out and back in
```

## Getting Help

If you encounter issues with prerequisites:

- **Community Support**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Check each tool's official documentation
- **Issue Reports**: Create issues in the relevant GitHub repositories

---

Ready to proceed? Head to the [Quick Start Guide](quick-start.md) to get OpenFrame running!