# Prerequisites

This guide outlines the system requirements and dependencies needed to run OpenFrame successfully.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8GB | 16GB+ |
| **Storage** | 50GB available | 100GB+ SSD |
| **Network** | 100 Mbps | 1 Gbps |

### Operating System Support

OpenFrame supports the following operating systems:

| OS | Versions | Status |
|----|----------|--------|
| **Ubuntu** | 20.04 LTS, 22.04 LTS, 24.04 LTS | ✅ Fully Supported |
| **CentOS/RHEL** | 8.x, 9.x | ✅ Fully Supported |
| **Debian** | 11, 12 | ✅ Fully Supported |
| **macOS** | 12+, Apple Silicon & Intel | ✅ Development Only |
| **Windows** | 10, 11, Server 2019/2022 | 🧪 Experimental |

## Software Dependencies

### Required Software

The following software must be installed before setting up OpenFrame:

#### Java Development Kit
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# CentOS/RHEL
sudo dnf install java-21-openjdk-devel

# macOS
brew install openjdk@21
```

#### Node.js and npm
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs npm

# macOS
brew install node@20
```

#### Docker and Docker Compose
```bash
# Ubuntu/Debian
sudo apt install docker.io docker-compose-v2

# CentOS/RHEL
sudo dnf install docker docker-compose

# macOS
brew install docker docker-compose
```

#### Git
```bash
# Ubuntu/Debian
sudo apt install git

# CentOS/RHEL
sudo dnf install git

# macOS
brew install git
```

#### Maven (for Java builds)
```bash
# Ubuntu/Debian
sudo apt install maven

# CentOS/RHEL
sudo dnf install maven

# macOS
brew install maven
```

### Version Requirements

| Software | Minimum Version | Recommended Version |
|----------|----------------|-------------------|
| **Java JDK** | 21 | 21+ |
| **Node.js** | 18.0 | 20+ |
| **npm** | 9.0 | 10+ |
| **Docker** | 24.0 | 27+ |
| **Docker Compose** | 2.0 | 2.20+ |
| **Git** | 2.25 | 2.40+ |
| **Maven** | 3.8 | 3.9+ |

## Infrastructure Dependencies

### Database Systems

OpenFrame requires the following databases. These can be run locally via Docker or as managed cloud services:

#### MongoDB
- **Version**: 7.x
- **Purpose**: Primary data storage
- **Configuration**: Replica set recommended for production

#### Redis
- **Version**: 7.x
- **Purpose**: Caching and session storage
- **Configuration**: Persistence enabled

#### Apache Cassandra
- **Version**: 4.x
- **Purpose**: Time-series and audit data
- **Configuration**: Multi-node cluster for production

#### Apache Kafka
- **Version**: 3.6+
- **Purpose**: Event streaming and messaging
- **Configuration**: At least 3 brokers for production

### Optional Infrastructure

#### Apache Pinot (Analytics)
- **Version**: 1.2.0+
- **Purpose**: Real-time analytics and OLAP queries
- **Use case**: Large-scale deployments with advanced analytics

## Network Requirements

### Firewall Ports

Ensure the following ports are accessible:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Frontend** | 3000 | HTTP/HTTPS | Web UI access |
| **API Gateway** | 8080 | HTTP/HTTPS | API access |
| **Authorization Server** | 9000 | HTTP/HTTPS | OAuth/OIDC |
| **MongoDB** | 27017 | TCP | Database |
| **Redis** | 6379 | TCP | Cache |
| **Kafka** | 9092 | TCP | Messaging |
| **Cassandra** | 9042 | TCP | Time-series DB |

### DNS and SSL

- Valid domain name for production deployments
- SSL certificates (Let's Encrypt recommended)
- DNS resolution for all service endpoints

## Account Requirements

### GitHub Access
- GitHub account for accessing the OpenFrame CLI
- Personal access token with repository access (if using private repos)

### Optional Service Accounts
- Docker Hub account (for custom images)
- Cloud provider accounts (AWS, Azure, GCP) for managed infrastructure

## Environment Variables

The following environment variables should be configured:

### Required Environment Variables

```bash
# Java Environment
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=$JAVA_HOME/bin:$PATH

# Node.js Environment
export NODE_ENV=development
export PORT=3000

# Docker Environment
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# OpenFrame Configuration
export OPENFRAME_TENANT=your-tenant-name
export OPENFRAME_ENV=development
```

### Optional Environment Variables

```bash
# Database Connections
export MONGODB_URI=mongodb://localhost:27017/openframe
export REDIS_URL=redis://localhost:6379
export KAFKA_BROKERS=localhost:9092

# Authentication
export JWT_SECRET=your-jwt-secret-here
export OAUTH_CLIENT_ID=your-oauth-client-id
export OAUTH_CLIENT_SECRET=your-oauth-client-secret

# Integration Tokens
export GITHUB_TOKEN=your-github-token
```

## Verification Commands

Run these commands to verify your environment is properly configured:

### Check Java Installation
```bash
java -version
# Expected: openjdk version "21.x.x"
```

### Check Node.js Installation
```bash
node --version
npm --version
# Expected: v20.x.x and 10.x.x respectively
```

### Check Docker Installation
```bash
docker --version
docker compose version
# Verify Docker daemon is running
docker ps
```

### Check Maven Installation
```bash
mvn --version
# Expected: Apache Maven 3.8+ with Java 21
```

### Check Network Connectivity
```bash
# Test internet connectivity
curl -I https://github.com
curl -I https://registry.npmjs.org

# Test local ports are available
ss -tulpn | grep -E ':(3000|8080|9000|27017|6379|9092)'
```

## Troubleshooting Common Issues

### Java Version Conflicts
If you have multiple Java versions installed:

```bash
# Update alternatives (Ubuntu/Debian)
sudo update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk/bin/java 1
sudo update-alternatives --config java

# Set JAVA_HOME permanently
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk' >> ~/.bashrc
source ~/.bashrc
```

### Docker Permission Issues
```bash
# Add user to docker group (requires logout/login)
sudo usermod -aG docker $USER
newgrp docker

# Verify docker works without sudo
docker run hello-world
```

### Port Conflicts
```bash
# Check what's using a port
sudo lsof -i :3000
sudo ss -tulpn | grep :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Memory Issues
```bash
# Check available memory
free -h

# Increase swap if needed (Ubuntu/Debian)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Next Steps

Once you've verified all prerequisites are met:

1. **[Quick Start Guide](quick-start.md)** - Get OpenFrame running in 5 minutes
2. **[First Steps](first-steps.md)** - Configure your first OpenFrame deployment

> **Note**: If you encounter issues with any prerequisites, visit the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support.