# Prerequisites

Before setting up OpenFrame OSS Tenant, ensure your development environment meets these requirements. This guide covers all necessary software, system requirements, and verification steps.

## System Requirements

### Operating System Support

| OS | Minimum Version | Recommended |
|---|---|---|
| **Linux** | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 LTS |
| **macOS** | macOS 12 (Monterey)+ | macOS 13+ (Ventura) |
| **Windows** | Windows 10 / Server 2019+ | Windows 11 / Server 2022 |

### Hardware Requirements

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| **CPU** | 4 cores | 8 cores | 16+ cores |
| **RAM** | 8 GB | 16 GB | 32+ GB |
| **Storage** | 50 GB | 100 GB | 500+ GB SSD |
| **Network** | 1 Gbps | 1 Gbps | 10 Gbps |

## Required Software

### 1. Java Development Kit (JDK) 21

OpenFrame OSS Tenant requires JDK 21 for the Spring Boot backend services.

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
java --version
javac --version
```

Expected output should show Java 21.x.x.

### 2. Apache Maven 3.8+

Maven is required for building the Spring Boot services.

**Installation:**

```bash
# Ubuntu/Debian
sudo apt install maven

# macOS
brew install maven

# Windows
choco install maven
```

**Verification:**
```bash
mvn --version
```

### 3. Node.js 18+

The tooling layer requires Node.js for the AI SDK and VoltAgent components.

**Installation:**

```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@18

# Windows
choco install nodejs --version=18.0.0
```

**Verification:**
```bash
node --version
npm --version
```

### 4. Docker & Docker Compose

Required for running infrastructure services (MongoDB, Kafka, Redis, etc.).

**Installation:**

```bash
# Ubuntu/Debian
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER

# macOS
brew install docker docker-compose
# Or install Docker Desktop

# Windows
choco install docker-desktop
```

**Verification:**
```bash
docker --version
docker-compose --version
```

### 5. Git

Required for cloning the repository and managing source code.

**Installation:**

```bash
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# Windows
choco install git
```

**Verification:**
```bash
git --version
```

## Optional but Recommended

### 1. IDEs and Editors

**For Java Development:**
- **IntelliJ IDEA** (Community or Ultimate)
- **Eclipse** with Spring Tools
- **Visual Studio Code** with Java Extension Pack

**For Node.js Development:**
- **Visual Studio Code** with Node.js extensions
- **WebStorm**

### 2. Database Clients

**MongoDB:**
- MongoDB Compass (GUI)
- MongoDB Shell (mongosh)

**Redis:**
- Redis CLI
- RedisInsight

### 3. Message Queue Tools

**Kafka:**
- Kafka Tool / Offset Explorer
- Confluent Control Center

**NATS:**
- NATS CLI tools

## Environment Variables

Set up these environment variables for development:

### Java/Maven Configuration

```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64  # Adjust path
export MAVEN_HOME=/usr/share/maven
export PATH=$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH
```

### Node.js Configuration

```bash
# Set Node.js memory limits for large projects
export NODE_OPTIONS="--max-old-space-size=4096"
```

## Network & Security Requirements

### Firewall Ports

Ensure these ports are accessible for local development:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| API Service | 8080 | HTTP/HTTPS | Internal APIs |
| Gateway Service | 8761 | HTTP/HTTPS | Edge gateway |
| Authorization Server | 9000 | HTTP/HTTPS | OAuth2/OIDC |
| External API | 8081 | HTTP/HTTPS | Public APIs |
| MongoDB | 27017 | TCP | Database |
| Redis | 6379 | TCP | Cache |
| Kafka | 9092 | TCP | Message broker |
| NATS | 4222 | TCP | Streaming |

### TLS/SSL Certificates

For development with HTTPS:

```bash
# Install mkcert for local certificates
# macOS
brew install mkcert

# Linux
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Create local CA
mkcert -install

# Generate certificates for localhost
mkcert localhost 127.0.0.1 ::1
```

## Verification Checklist

Run these commands to verify your environment:

```bash
# Java and Maven
java --version && echo "✅ Java OK" || echo "❌ Java missing"
javac --version && echo "✅ Java Compiler OK" || echo "❌ Compiler missing"
mvn --version && echo "✅ Maven OK" || echo "❌ Maven missing"

# Node.js
node --version && echo "✅ Node.js OK" || echo "❌ Node.js missing"
npm --version && echo "✅ NPM OK" || echo "❌ NPM missing"

# Docker
docker --version && echo "✅ Docker OK" || echo "❌ Docker missing"
docker-compose --version && echo "✅ Docker Compose OK" || echo "❌ Docker Compose missing"

# Git
git --version && echo "✅ Git OK" || echo "❌ Git missing"

# Test Docker daemon
docker ps && echo "✅ Docker running" || echo "❌ Docker daemon not running"
```

### Expected Output Example

```text
openjdk 21.0.1 2023-10-17
✅ Java OK
javac 21.0.1
✅ Java Compiler OK
Apache Maven 3.9.5
✅ Maven OK
v18.17.0
✅ Node.js OK
9.6.7
✅ NPM OK
Docker version 24.0.6
✅ Docker OK
Docker Compose version v2.21.0
✅ Docker Compose OK
git version 2.34.1
✅ Git OK
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
✅ Docker running
```

## Common Issues and Solutions

### Java Version Conflicts

**Problem**: Multiple Java versions installed.

**Solution**:
```bash
# Ubuntu/Debian
sudo update-alternatives --config java

# macOS with Homebrew
brew list | grep openjdk
export JAVA_HOME=$(brew --prefix openjdk@21)
```

### Docker Permission Issues

**Problem**: "Permission denied" when running Docker commands.

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
# Or logout and login again
```

### Node.js Version Management

**Problem**: Wrong Node.js version active.

**Solution**:
```bash
# Using nvm
nvm list
nvm use 18
nvm alias default 18
```

### Port Conflicts

**Problem**: Required ports already in use.

**Solution**:
```bash
# Check what's using a port
sudo lsof -i :8080
sudo netstat -tulnp | grep 8080

# Kill process if needed
sudo kill -9 <PID>
```

## Environment Configuration Files

Create these configuration files in your home directory:

### `~/.openframe/config.yaml`

```yaml
development:
  java:
    home: /usr/lib/jvm/java-21-openjdk-amd64
    options: -Xmx4g -Xms2g
  maven:
    options: -Dmaven.repo.local=~/.m2/repository
  docker:
    compose_file: docker-compose.dev.yml
```

### `~/.gitconfig` (Global Git Configuration)

```ini
[user]
    name = Your Name
    email = your.email@example.com

[core]
    editor = code --wait
    autocrlf = input

[init]
    defaultBranch = main
```

## Next Steps

Once you've completed the prerequisites setup:

1. **Verify everything works**: Run the verification checklist above
2. **Get familiar with the tools**: Try basic commands with Java, Maven, Node.js, and Docker
3. **Proceed to Quick Start**: Follow the [Quick Start Guide](quick-start.md) to get OpenFrame running

> **Tip**: Save the verification commands in a script (`check-prereqs.sh`) for quick environment validation during development.

---

**Next Step**: Head to the [Quick Start Guide](quick-start.md) to get OpenFrame OSS Tenant running locally.