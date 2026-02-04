# Prerequisites Guide

Before installing OpenFrame, ensure your environment meets the requirements for development, testing, or production deployment.

## System Requirements

### Minimum Hardware Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| **CPU** | 4 cores (Intel/AMD x64) | 8+ cores |
| **Memory** | 8 GB RAM | 16+ GB RAM |
| **Storage** | 20 GB free space | 100+ GB SSD |
| **Network** | Broadband internet | High-speed internet |

### Supported Operating Systems

| OS | Development | Production |
|----|-----------:|----------:|
| **macOS** | ✅ 10.15+ | ✅ Server deployment |
| **Linux** | ✅ Ubuntu 20.04+, CentOS 8+ | ✅ Preferred for production |
| **Windows** | ✅ Windows 10/11 | ⚠️ Limited support |

## Required Software & Versions

### Core Development Tools

| Tool | Version | Purpose | Installation Check |
|------|---------|---------|-------------------|
| **Java JDK** | 21+ | Backend services | `java --version` |
| **Maven** | 3.9+ | Java build system | `mvn --version` |
| **Node.js** | 18+ | Frontend development | `node --version` |
| **npm** | 9+ | Package management | `npm --version` |
| **Docker** | 24.0+ | Containerization | `docker --version` |
| **Docker Compose** | 2.20+ | Multi-container orchestration | `docker compose version` |

### Optional Development Tools

| Tool | Version | Purpose | Required For |
|------|---------|---------|--------------|
| **Rust** | 1.70+ | System agent development | Client modifications |
| **Kubernetes** | 1.28+ | Production deployment | Kubernetes deployment |
| **Helm** | 3.12+ | Kubernetes package management | Kubernetes deployment |

### Development Environment Setup

#### macOS Installation

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Java 21
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc

# Install Maven
brew install maven

# Install Node.js
brew install node

# Install Docker Desktop
brew install --cask docker

# Verify installations
java --version && mvn --version && node --version && docker --version
```

#### Linux (Ubuntu/Debian) Installation

```bash
# Update package index
sudo apt update

# Install Java 21
sudo apt install -y openjdk-21-jdk

# Install Maven
sudo apt install -y maven

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker `$USER`
sudo systemctl enable docker
sudo systemctl start docker

# Verify installations
java --version && mvn --version && node --version && docker --version
```

#### Windows Installation

```powershell
# Install using Chocolatey (recommended package manager for Windows)
# First install Chocolatey: https://chocolatey.org/install

# Install Java 21
choco install openjdk21

# Install Maven
choco install maven

# Install Node.js
choco install nodejs

# Install Docker Desktop
choco install docker-desktop

# Verify installations
java --version; mvn --version; node --version; docker --version
```

## Account & Access Requirements

### GitHub Access

OpenFrame development requires access to private repositories. Ensure you have:

| Requirement | Description | How to Verify |
|-------------|-------------|---------------|
| **GitHub Account** | Active GitHub account | Visit https://github.com |
| **Repository Access** | Access to flamingo-stack/openframe-oss-tenant | Check repository visibility |
| **Personal Access Token** | Token with repo access | Required for private dependencies |

#### Creating GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `workflow`, `read:packages`
4. Copy token securely (you won't see it again)

### Optional Cloud Accounts

| Service | Purpose | When Needed |
|---------|---------|-------------|
| **AWS Account** | Cloud deployment | Production/staging deployment |
| **Azure Account** | SSO integration | Azure AD authentication |
| **Google Cloud** | SSO integration | Google Workspace authentication |

## Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# GitHub Authentication (Required)
GITHUB_TOKEN=your_github_personal_access_token

# Database Configuration (Development)
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379

# Kafka Configuration (Development)
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security (Development)
JWT_SECRET=your-development-jwt-secret-minimum-32-chars
ENCRYPTION_KEY=your-development-encryption-key-32-chars

# Optional: External Tool Integration
TACTICAL_RMM_URL=http://localhost:8001
FLEETDM_URL=http://localhost:8080
```

> **⚠️ Security Note**: Never commit real credentials to version control. Use development values locally and proper secrets management in production.

## Verification Commands

Run these commands to verify your environment is correctly configured:

### Basic Environment Check

```bash
# Check Java version
java --version
# Expected: openjdk 21.x.x

# Check Maven version
mvn --version
# Expected: Apache Maven 3.9.x

# Check Node.js version
node --version
# Expected: v18.x.x or higher

# Check npm version
npm --version
# Expected: 9.x.x or higher

# Check Docker version
docker --version
# Expected: Docker version 24.0.x

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.20.x
```

### Docker Environment Check

```bash
# Test Docker functionality
docker run --rm hello-world
# Expected: "Hello from Docker!" message

# Check Docker daemon is running
docker info
# Expected: Server information displayed

# Verify Docker Compose functionality
docker compose --version
# Expected: Version information displayed
```

### Network Connectivity Check

```bash
# Test internet connectivity
ping -c 4 github.com

# Test Docker Hub connectivity
docker pull alpine:latest

# Test Maven Central connectivity
mvn help:evaluate -Dexpression=maven.version -q -DforceStdout
```

## Troubleshooting Common Issues

### Java Version Issues

**Problem**: Wrong Java version or `JAVA_HOME` not set

```bash
# Check current Java version
java --version

# Set JAVA_HOME (macOS/Linux)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk   # Linux

# Add to shell profile for persistence
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc  # macOS
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk' >> ~/.bashrc   # Linux
```

### Docker Permission Issues (Linux)

**Problem**: Permission denied when running Docker commands

```bash
# Add user to docker group
sudo usermod -aG docker `$USER`

# Restart or log out/in to apply changes
# Or temporarily apply group membership
newgrp docker

# Test Docker access
docker run --rm hello-world
```

### Node.js Version Issues

**Problem**: Node.js version too old

```bash
# Using Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
nvm alias default 18
```

### Maven Download Issues

**Problem**: Dependencies fail to download

```bash
# Clear Maven cache
rm -rf ~/.m2/repository

# Verify Maven settings
cat ~/.m2/settings.xml

# Test Maven connectivity
mvn dependency:resolve -f pom.xml
```

## Next Steps

Once you've verified all prerequisites are met:

✅ **Environment Ready**: All tools installed and verified  
✅ **Accounts Configured**: GitHub token and access confirmed  
✅ **Network Connectivity**: All required services accessible  

> **Continue to Quick Start**
> 
> Your environment is ready! Proceed to the [Quick Start Guide](quick-start.md) to get OpenFrame running in under 5 minutes.

---

**Having Issues?** Join our community for help:
- **OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA