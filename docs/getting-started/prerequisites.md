# Prerequisites Guide

This guide outlines all the requirements needed to run OpenFrame successfully in your environment. Please ensure all prerequisites are met before proceeding with installation.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum Specification | Recommended Specification |
|-----------|----------------------|---------------------------|
| **CPU** | 4 cores, 2.4GHz | 8 cores, 3.0GHz |
| **Memory** | 16GB RAM | 32GB RAM |
| **Storage** | 100GB SSD | 500GB SSD |
| **Network** | 1Gbps connection | 10Gbps connection |

### Supported Operating Systems

| Platform | Version | Architecture | Notes |
|----------|---------|--------------|-------|
| **Ubuntu** | 20.04 LTS, 22.04 LTS | x86_64, ARM64 | Recommended for production |
| **CentOS/RHEL** | 8, 9 | x86_64, ARM64 | Enterprise environments |
| **Debian** | 11, 12 | x86_64, ARM64 | Stable deployment |
| **macOS** | 12+ (Monterey) | Intel, Apple Silicon | Development only |
| **Windows** | 10, 11, Server 2019/2022 | x86_64 | Development/testing |

> 💡 **Note**: Production deployments are recommended on Linux-based systems for optimal performance and stability.

## Required Software Components

### Development Tools

| Software | Required Version | Installation Command | Verification Command |
|----------|------------------|---------------------|---------------------|
| **Java** | 21+ (OpenJDK/Oracle) | `sudo apt install openjdk-21-jdk` | `java --version` |
| **Maven** | 3.9.0+ | `sudo apt install maven` | `mvn --version` |
| **Node.js** | 18.0+ | `curl -fsSL https://deb.nodesource.com/setup_18.x \| sudo -E bash -` | `node --version` |
| **npm** | 9.0+ | Included with Node.js | `npm --version` |
| **Rust** | 1.70+ | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | `rustc --version` |

### Container Runtime

| Software | Required Version | Installation Command | Verification Command |
|----------|------------------|---------------------|---------------------|
| **Docker** | 24.0+ | `curl -fsSL https://get.docker.com \| sh` | `docker --version` |
| **Docker Compose** | 2.20+ | Included with Docker Desktop | `docker compose version` |

### Kubernetes (Optional - Production)

| Software | Required Version | Notes |
|----------|------------------|--------|
| **Kubernetes** | 1.28+ | For production deployments |
| **Helm** | 3.12+ | Package manager for Kubernetes |
| **kubectl** | 1.28+ | Kubernetes command-line tool |

## Database Requirements

### MongoDB

| Component | Version | Configuration |
|-----------|---------|---------------|
| **MongoDB** | 7.0+ | Replica set recommended for production |
| **Memory** | 4GB minimum | 8GB+ recommended |
| **Storage** | 50GB minimum | SSD strongly recommended |

### Apache Cassandra

| Component | Version | Configuration |
|-----------|---------|---------------|
| **Cassandra** | 4.1+ | Cluster of 3+ nodes for production |
| **Memory** | 8GB minimum | 16GB+ recommended |
| **Storage** | 100GB minimum | SSD required for performance |

### Redis

| Component | Version | Configuration |
|-----------|---------|---------------|
| **Redis** | 7.0+ | Standalone or cluster mode |
| **Memory** | 2GB minimum | 8GB+ recommended |

### Apache Kafka

| Component | Version | Configuration |
|-----------|---------|---------------|
| **Kafka** | 3.6+ | Cluster of 3+ brokers for production |
| **ZooKeeper** | 3.8+ | Required for Kafka coordination |
| **Memory** | 4GB minimum | 8GB+ recommended |

### Apache Pinot

| Component | Version | Configuration |
|-----------|---------|---------------|
| **Pinot** | 1.2+ | Controller + Broker + Server setup |
| **Memory** | 4GB minimum | 16GB+ recommended |

## Network Requirements

### Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| **OpenFrame Gateway** | 8080 | HTTP/WebSocket | Main application entry point |
| **OpenFrame API** | 8081 | HTTP | GraphQL API service |
| **Config Server** | 8888 | HTTP | Configuration management |
| **MongoDB** | 27017 | TCP | Database connections |
| **Cassandra** | 9042 | TCP | Time-series data |
| **Redis** | 6379 | TCP | Cache and sessions |
| **Kafka** | 9092 | TCP | Event streaming |
| **Pinot** | 8099 | HTTP | Analytics queries |

### External Access Requirements

| Component | Access Type | Purpose |
|-----------|-------------|---------|
| **GitHub** | HTTPS (443) | Source code and dependency downloads |
| **Docker Hub** | HTTPS (443) | Container image downloads |
| **Maven Central** | HTTPS (443) | Java dependency downloads |
| **NPM Registry** | HTTPS (443) | Node.js package downloads |

## Environment Variables

### Required Environment Variables

```bash
# GitHub Access (Required for private repositories)
export GITHUB_TOKEN="your_github_token_here"

# Database Configuration
export MONGODB_URI="mongodb://localhost:27017/openframe"
export REDIS_URL="redis://localhost:6379"
export CASSANDRA_HOSTS="localhost:9042"

# Kafka Configuration
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Security Configuration
export JWT_SECRET="your-secure-jwt-secret-key-here"
export ENCRYPTION_KEY="your-32-character-encryption-key"

# Application Configuration
export OPENFRAME_ENV="development"
export LOG_LEVEL="INFO"
```

### Optional Environment Variables

```bash
# Performance Tuning
export JAVA_OPTS="-Xmx4g -Xms2g"
export NODE_OPTIONS="--max-old-space-size=4096"

# External Tool Integration
export TACTICAL_RMM_URL="https://your-tactical-rmm.example.com"
export MESHCENTRAL_URL="https://your-meshcentral.example.com"

# Monitoring (Optional)
export PROMETHEUS_ENABLED="true"
export GRAFANA_ENABLED="true"
```

## GitHub Token Configuration

OpenFrame requires access to private repositories during setup. Create a GitHub Personal Access Token:

1. **Navigate to GitHub Settings**: Go to https://github.com/settings/tokens
2. **Create New Token**: Click "Generate new token (classic)"
3. **Set Permissions**: Select the following scopes:
   - `repo` (Full control of private repositories)
   - `read:packages` (Read access to GitHub Packages)
4. **Save Token**: Copy the generated token securely
5. **Set Environment Variable**: `export GITHUB_TOKEN="your_token_here"`

> ⚠️ **Security Warning**: Keep your GitHub token secure and never commit it to version control.

## Installation Verification

### Quick Verification Script

```bash
#!/bin/bash
# OpenFrame Prerequisites Verification Script

echo "🔍 Checking OpenFrame Prerequisites..."
echo "=================================="

# Check Java
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java --version 2>&1 | head -1 | cut -d' ' -f2)
    echo "✅ Java: $JAVA_VERSION"
else
    echo "❌ Java: Not installed"
fi

# Check Maven
if command -v mvn &> /dev/null; then
    MVN_VERSION=$(mvn --version 2>&1 | head -1 | cut -d' ' -f3)
    echo "✅ Maven: $MVN_VERSION"
else
    echo "❌ Maven: Not installed"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js: Not installed"
fi

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version | cut -d' ' -f2)
    echo "✅ Rust: $RUST_VERSION"
else
    echo "❌ Rust: Not installed"
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo "✅ Docker: $DOCKER_VERSION"
else
    echo "❌ Docker: Not installed"
fi

# Check Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version | cut -d' ' -f4)
    echo "✅ Docker Compose: $COMPOSE_VERSION"
else
    echo "❌ Docker Compose: Not available"
fi

# Check GitHub Token
if [ -n "$GITHUB_TOKEN" ]; then
    echo "✅ GitHub Token: Configured"
else
    echo "⚠️  GitHub Token: Not set (required for installation)"
fi

echo "=================================="
echo "Prerequisites check complete!"
```

Save this script as `check-prerequisites.sh`, make it executable with `chmod +x check-prerequisites.sh`, and run it to verify your setup.

## Troubleshooting Common Issues

### Java Version Issues
```bash
# If multiple Java versions are installed
sudo update-alternatives --config java

# Verify JAVA_HOME is set correctly
echo $JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

### Docker Permission Issues
```bash
# Add user to docker group (requires logout/login)
sudo usermod -aG docker $USER

# Or run with sudo temporarily
sudo docker --version
```

### Memory Requirements
```bash
# Check available memory
free -h

# Check disk space
df -h
```

### Port Conflicts
```bash
# Check if ports are in use
netstat -tuln | grep -E ':(8080|8081|8888|27017|6379|9042|9092)'

# Kill processes using required ports if needed
sudo lsof -ti:8080 | xargs sudo kill -9
```

## Next Steps

Once all prerequisites are satisfied:

1. **Verify Installation**: Run the verification script above
2. **Quick Start**: Proceed to the [Quick Start Guide](quick-start.md)
3. **Environment Setup**: Configure environment variables
4. **Test Connection**: Ensure all services can communicate

> 📋 **Checklist**: Before proceeding, ensure you have:
> - [ ] All required software installed and verified
> - [ ] GitHub token configured
> - [ ] Environment variables set
> - [ ] Network ports available
> - [ ] Sufficient system resources

Ready to install? Continue with the [Quick Start Guide](quick-start.md) for a rapid OpenFrame deployment.