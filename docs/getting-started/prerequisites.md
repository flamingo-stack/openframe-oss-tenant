# Prerequisites

Before setting up OpenFrame, ensure your development environment meets these requirements.

## System Requirements

### Hardware Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 4 cores | 8+ cores | More cores improve compilation speed |
| **RAM** | 8 GB | 16+ GB | Multiple services require significant memory |
| **Storage** | 20 GB | 50+ GB | Includes dependencies, containers, and data |
| **Network** | Stable internet | High bandwidth | For downloading dependencies |

### Operating System Support

OpenFrame supports development on:

- **macOS** 12.0+ (Intel and Apple Silicon)
- **Linux** (Ubuntu 20.04+, RHEL 8+, or equivalent)
- **Windows** 10/11 with WSL2

## Required Software

### Core Development Tools

#### Java Development Kit (JDK)

```bash
# Install Java 21 (required)
# macOS with Homebrew
brew install openjdk@21

# Ubuntu/Debian
sudo apt update && sudo apt install openjdk-21-jdk

# Verify installation
java --version
# Expected: openjdk 21.0.x
```

#### Maven

```bash
# macOS with Homebrew
brew install maven

# Ubuntu/Debian
sudo apt install maven

# Windows (download from Apache Maven)
# https://maven.apache.org/download.cgi

# Verify installation
mvn --version
# Expected: Apache Maven 3.8+
```

#### Node.js & npm

```bash
# Install Node.js 18+ (required for frontend)
# macOS with Homebrew
brew install node@20

# Ubuntu/Debian using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Expected: v20.x.x
npm --version   # Expected: 10.x.x
```

#### Rust Toolchain

```bash
# Install Rust (for client development)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`

# Verify installation
rustc --version  # Expected: rustc 1.70+
cargo --version  # Expected: cargo 1.70+
```

### Container & Infrastructure Tools

#### Docker & Docker Compose

```bash
# macOS - Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop/

# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker `$USER`

# Verify installation
docker --version         # Expected: Docker version 24.0+
docker-compose --version # Expected: Docker Compose version 2.0+
```

#### Kubernetes Tools (Optional)

```bash
# kubectl for Kubernetes deployment
# macOS
brew install kubectl

# Ubuntu/Debian
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

## Database Dependencies

### MongoDB

OpenFrame requires MongoDB 7.x for primary data storage:

```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community

# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl start mongod

# Verify connection
mongosh --version  # Expected: 2.0.x
```

### Redis (Optional for Caching)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian  
sudo apt install redis-server
sudo systemctl start redis

# Verify
redis-cli ping  # Expected: PONG
```

## Environment Variables

Create a `.env` file in your project root with these essential variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
OAUTH2_CLIENT_ID=your-oauth-client-id
OAUTH2_CLIENT_SECRET=your-oauth-client-secret

# Kafka Configuration (for local development)
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Application Ports
API_SERVICE_PORT=8080
GATEWAY_SERVICE_PORT=8081
FRONTEND_PORT=3000

# Development Mode
SPRING_PROFILES_ACTIVE=dev
NODE_ENV=development
```

> **Security Note**: Never commit real secrets to version control. Use placeholder values for development.

## Verification Checklist

Run these commands to verify your environment setup:

### ✅ Java Ecosystem

```bash
java --version    # Should show Java 21
mvn --version     # Should show Maven 3.8+
echo `$JAVA_HOME`  # Should point to Java 21 installation
```

### ✅ Frontend Ecosystem

```bash
node --version    # Should show Node 20.x
npm --version     # Should show npm 10.x
npx --version     # Should show npx 10.x
```

### ✅ Rust Ecosystem

```bash
rustc --version   # Should show rustc 1.70+
cargo --version   # Should show cargo 1.70+
```

### ✅ Container Platform

```bash
docker --version         # Should show Docker 24.0+
docker-compose --version # Should show Docker Compose 2.0+
docker run hello-world   # Should complete successfully
```

### ✅ Database Connectivity

```bash
# Test MongoDB connection
mongosh --eval "db.adminCommand('hello')"
# Expected output: { "isWritablePrimary": true, ... }

# Test Redis connection (if installed)
redis-cli ping
# Expected output: PONG
```

## IDE & Development Tools

### Recommended IDEs

| IDE | Best For | Installation |
|-----|----------|-------------|
| **IntelliJ IDEA** | Java/Spring development | [jetbrains.com/idea](https://www.jetbrains.com/idea/) |
| **VS Code** | Frontend, Rust, general dev | [code.visualstudio.com](https://code.visualstudio.com/) |
| **Eclipse** | Alternative Java IDE | [eclipse.org](https://www.eclipse.org/) |

### Essential VS Code Extensions

```bash
# Install useful extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss  
code --install-extension rust-lang.rust-analyzer
code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
code --install-extension ms-vscode.vscode-docker
```

## Platform-Specific Notes

### macOS Developers

- Use Homebrew for package management
- Install Xcode Command Line Tools: `xcode-select --install`
- For Apple Silicon, ensure Docker Desktop uses Apple Silicon containers

### Windows Developers

- Enable WSL2 and install Ubuntu 22.04
- Run all commands from within WSL2
- Install Windows Terminal for better command line experience
- Use Docker Desktop with WSL2 backend

### Linux Developers

- Ensure your user is in the `docker` group
- Consider using SDKMAN for Java version management
- Use your distribution's package manager for system dependencies

## Network & Access Requirements

### Required Outbound Connectivity

Your development environment needs access to:

- **Maven Central**: For Java dependencies
- **npm Registry**: For Node.js packages  
- **Docker Hub**: For container images
- **GitHub**: For source code and releases
- **MongoDB Atlas** (optional): For cloud database

### Firewall & Port Configuration

Ensure these ports are available locally:

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Frontend | Web UI development |
| 8080 | API Service | GraphQL/REST APIs |
| 8081 | Gateway | API Gateway |
| 8082 | Auth Server | OAuth2/OIDC |
| 27017 | MongoDB | Database |
| 6379 | Redis | Cache (optional) |
| 9092 | Kafka | Event streaming (optional) |

## Troubleshooting Common Issues

### Java Issues

```bash
# If JAVA_HOME not set correctly
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64  # Linux
export JAVA_HOME=`/usr/libexec/java_home -v 21`       # macOS

# If Maven can't find Java 21
mvn -version  # Check Java version used by Maven
```

### Node.js Issues

```bash
# Clear npm cache if installation fails
npm cache clean --force

# Update npm to latest
npm install -g npm@latest

# Check node installation path
which node
which npm
```

### Docker Issues

```bash
# Start Docker daemon if not running
sudo systemctl start docker    # Linux
# Or start Docker Desktop       # macOS/Windows

# Fix permission issues (Linux)
sudo usermod -aG docker `$USER`
newgrp docker
```

## Next Steps

Once all prerequisites are installed and verified, proceed to the [Quick Start Guide](quick-start.md) to get OpenFrame running locally.