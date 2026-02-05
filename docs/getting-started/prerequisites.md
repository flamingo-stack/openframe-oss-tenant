# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, software dependencies, and account setup needed for a successful deployment.

## System Requirements

### Minimum Hardware Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB free space | 100+ GB SSD |
| **Network** | Broadband internet | High-speed fiber |

### Supported Operating Systems

#### Development Environment
- **macOS** 12.0+ (Monterey or later)
- **Ubuntu** 20.04 LTS or later
- **Windows** 10/11 with WSL2
- **Other Linux distributions** with Docker support

#### Production Environment  
- **Linux** distributions with Kubernetes 1.28+
- **Cloud platforms**: AWS, GCP, Azure, DigitalOcean
- **Container orchestration**: Docker Swarm or Kubernetes

## Required Software Dependencies

### Core Development Tools

| Software | Version | Purpose |
|----------|---------|---------|
| **Java** | 21+ (OpenJDK or Oracle) | Backend services |
| **Maven** | 3.9+ | Java build tool |
| **Node.js** | 18+ LTS | Frontend development |
| **npm** | 9+ | Node package manager |
| **Rust** | 1.70+ | Client agent development |
| **Docker** | 24.0+ | Containerization |
| **Docker Compose** | 2.0+ | Multi-container orchestration |
| **Git** | 2.30+ | Version control |

### Database and Infrastructure

| Component | Version | Purpose |
|-----------|---------|---------|
| **MongoDB** | 7.0+ | Primary database |
| **Apache Kafka** | 3.6+ | Event streaming |
| **Redis** | 7.0+ | Caching layer |
| **Apache Cassandra** | 4.1+ | Time-series data |
| **Apache Pinot** | 1.2+ | Analytics database |
| **NATS JetStream** | 2.10+ | Agent messaging |

## Installation Commands

### Java 21 (OpenJDK)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS (using Homebrew)
brew install openjdk@21

# Verify installation
java --version
javac --version
```

### Maven

```bash
# Ubuntu/Debian
sudo apt install maven

# macOS
brew install maven

# Verify installation
mvn --version
```

### Node.js and npm

```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Ubuntu/Debian (alternative)
sudo apt install nodejs npm

# macOS (alternative)
brew install node

# Verify installation
node --version
npm --version
```

### Rust

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`

# Verify installation
rustc --version
cargo --version
```

### Docker and Docker Compose

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo usermod -aG docker `$USER`

# macOS
brew install --cask docker

# Verify installation
docker --version
docker compose version
```

## Environment Variables

Set up the following environment variables in your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Java
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=`$JAVA_HOME/bin:$PATH`

# Maven
export MAVEN_HOME=/usr/share/maven
export PATH=`$MAVEN_HOME/bin:$PATH`

# Node.js (if not using nvm)
export NODE_HOME=/usr/local/lib/nodejs
export PATH=`$NODE_HOME/bin:$PATH`

# Rust
export PATH=`$HOME/.cargo/bin:$PATH`

# OpenFrame specific
export OPENFRAME_HOME=`$HOME/openframe`
export OPENFRAME_ENV=development
```

## Account Requirements

### Required Accounts

1. **GitHub Account** (free)
   - Access to OpenFrame repositories
   - Clone source code and dependencies

2. **Docker Hub Account** (free)
   - Pull official container images
   - Optional: Push custom images

### Optional Accounts

1. **Cloud Provider Account** (for production)
   - AWS, GCP, Azure for managed services
   - Required for production deployments

2. **MongoDB Atlas** (free tier available)
   - Managed MongoDB hosting
   - Alternative to self-hosted MongoDB

3. **Confluent Cloud** (free tier available)
   - Managed Kafka service
   - Alternative to self-hosted Kafka

## Network Requirements

### Ports

Ensure these ports are available on your development machine:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Gateway** | 8080 | HTTP | API Gateway |
| **API Service** | 8081 | HTTP | GraphQL/REST API |
| **Auth Server** | 8082 | HTTP | OAuth2/OIDC |
| **Frontend** | 3000 | HTTP | Vue.js dev server |
| **MongoDB** | 27017 | TCP | Database |
| **Kafka** | 9092 | TCP | Event streaming |
| **Redis** | 6379 | TCP | Cache |
| **NATS** | 4222 | TCP | Agent messaging |

### Internet Access

Required domains for external dependencies:
- `maven.apache.org` - Maven dependencies
- `registry.npmjs.org` - npm packages
- `crates.io` - Rust dependencies
- `github.com` - Source code repositories
- `docker.io` - Container images

## Verification Checklist

Run these commands to verify your environment is ready:

```bash
# Check Java
java --version | grep "21\."

# Check Maven
mvn --version | grep "Apache Maven"

# Check Node.js
node --version | grep "v18\|v19\|v20"

# Check Rust
rustc --version | grep "rustc 1\."

# Check Docker
docker --version && docker compose version

# Check Git
git --version

# Test Docker (should return "Hello from Docker!")
docker run hello-world
```

## Common Issues and Solutions

### Java Version Conflicts
```bash
# List installed Java versions
sudo update-alternatives --list java

# Set default Java version
sudo update-alternatives --config java
```

### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker `$USER`

# Log out and back in, or run:
newgrp docker
```

### Port Conflicts
```bash
# Check what's using a port
sudo lsof -i :8080
sudo netstat -tulpn | grep :8080

# Kill process using port
sudo kill -9 <PID>
```

### Node.js Version Issues
```bash
# Use nvm to manage versions
nvm install node
nvm use node
nvm alias default node
```

## Performance Optimization

### Development Environment

```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx2g -XX:ReservedCodeCacheSize=1g"

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Configure Docker resources (macOS/Windows)
# In Docker Desktop: Settings > Resources
# - CPUs: 4+
# - Memory: 8GB+
# - Swap: 2GB+
```

### System Tuning (Linux)

```bash
# Increase file descriptor limits
echo '* soft nofile 65536' | sudo tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | sudo tee -a /etc/security/limits.conf

# Increase virtual memory map count (for Kafka/Elasticsearch)
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Next Steps

Once you've verified all prerequisites are installed and configured:

1. Continue to [Quick Start Guide](quick-start.md) for a 5-minute setup
2. Review [First Steps Guide](first-steps.md) for essential configuration
3. Join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support

If you encounter issues with any prerequisites, reach out to the community on Slack for assistance.