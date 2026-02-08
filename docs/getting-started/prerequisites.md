# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. This guide covers both development and production deployment prerequisites.

## System Requirements

### Minimum Hardware Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| **CPU** | 4 cores (Intel/AMD x64) | 8+ cores per service node |
| **RAM** | 16 GB | 32+ GB per service node |
| **Storage** | 100 GB SSD | 500+ GB SSD with high IOPS |
| **Network** | Broadband internet | Gigabit ethernet, low latency |

### Operating System Support

OpenFrame supports deployment on multiple platforms:

- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+
- **macOS**: 12.0+ (development only)
- **Windows**: Windows 10/11, Windows Server 2019+ (development only)
- **Container**: Docker 20.10+, Kubernetes 1.28+

> **Note**: Production deployments are recommended on Linux with container orchestration.

## Required Software

### Development Environment

| Software | Version | Installation Command | Verification |
|----------|---------|---------------------|--------------|
| **Java JDK** | 21+ | `apt install openjdk-21-jdk` | `java --version` |
| **Maven** | 3.9+ | `apt install maven` | `mvn --version` |
| **Node.js** | 20+ | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash -` | `node --version` |
| **npm** | 10+ | Included with Node.js | `npm --version` |
| **Docker** | 20.10+ | [Docker Install Guide](https://docs.docker.com/engine/install/) | `docker --version` |
| **Docker Compose** | 2.0+ | `apt install docker-compose-plugin` | `docker compose version` |

### Optional Development Tools

```bash
# Git for version control
sudo apt install git

# Rust (for client development)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Kubernetes CLI (for K8s deployments)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm (for K8s package management)
curl https://get.helm.sh/helm-v3.13.0-linux-amd64.tar.gz | tar -xzO linux-amd64/helm > helm
sudo mv helm /usr/local/bin/
```

## Database Requirements

### Required Data Stores

OpenFrame requires several data persistence technologies:

| Technology | Version | Purpose | RAM Allocation |
|------------|---------|---------|----------------|
| **MongoDB** | 7.0+ | Primary data store | 4-8 GB |
| **Apache Kafka** | 3.6+ | Event streaming | 2-4 GB |
| **Redis** | 7.0+ | Caching and sessions | 1-2 GB |
| **Apache Cassandra** | 4.1+ | Time-series data | 4-8 GB |
| **Apache Pinot** | 1.2+ | Real-time analytics | 4-8 GB |

### Database Setup Options

**Option 1: Docker Compose (Recommended for Development)**
```bash
# All databases will be configured automatically
# See integrated-tools directory for configurations
```

**Option 2: Manual Installation**
Each database should be configured with appropriate user credentials and network access. Refer to individual database documentation for installation guides.

## Network Requirements

### Port Configuration

| Service | Default Port | Protocol | Access |
|---------|--------------|----------|--------|
| **Gateway** | 8080 | HTTP/WebSocket | External |
| **Authorization Server** | 8081 | HTTP | Internal |
| **API Service** | 8082 | HTTP | Internal |
| **Management Service** | 8083 | HTTP | Internal |
| **Stream Service** | 8084 | HTTP | Internal |
| **Frontend** | 3000 | HTTP | External |
| **MongoDB** | 27017 | MongoDB | Internal |
| **Redis** | 6379 | Redis | Internal |
| **Kafka** | 9092 | Kafka | Internal |
| **Cassandra** | 9042 | CQL | Internal |

### Security Considerations

- **Firewall Rules**: Ensure external ports (8080, 3000) are accessible
- **SSL/TLS**: Production deployments require valid certificates
- **Network Isolation**: Database ports should not be externally accessible
- **Service Mesh**: Consider Istio for production service-to-service communication

## Account Requirements

### Required Services

Before deployment, ensure you have accounts for:

| Service | Purpose | Required For |
|---------|---------|--------------|
| **Domain Provider** | SSL certificates, DNS | Production deployment |
| **OAuth Provider** | User authentication | SSO integration (optional) |
| **Email Service** | User notifications | User management |
| **Container Registry** | Custom images | Custom deployments (optional) |

### Environment Variables

Create these environment variables or populate them in your deployment configuration:

```bash
# Database connections
export MONGODB_URI="mongodb://localhost:27017/openframe"
export REDIS_URL="redis://localhost:6379"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
export CASSANDRA_CONTACT_POINTS="localhost:9042"
export PINOT_CONTROLLER_HOST="localhost"
export PINOT_CONTROLLER_PORT="9000"

# Security settings
export JWT_SECRET="your-secret-key-here"
export ENCRYPTION_KEY="your-encryption-key-here"

# OAuth configuration (if using SSO)
export OAUTH_CLIENT_ID="your-client-id"
export OAUTH_CLIENT_SECRET="your-client-secret"

# Email settings
export SMTP_HOST="your-smtp-server"
export SMTP_PORT="587"
export SMTP_USERNAME="your-username"
export SMTP_PASSWORD="your-password"
```

## Verification Checklist

Before proceeding with installation, verify your environment:

### Software Versions
```bash
# Check Java version
java --version
# Should show: openjdk 21.x.x or later

# Check Maven version  
mvn --version
# Should show: Apache Maven 3.9.x or later

# Check Node.js version
node --version
# Should show: v20.x.x or later

# Check npm version
npm --version
# Should show: 10.x.x or later

# Check Docker version
docker --version
# Should show: Docker version 20.10.x or later

# Check Docker Compose version
docker compose version  
# Should show: Docker Compose version v2.x.x or later
```

### System Resources
```bash
# Check available RAM (Linux)
free -h
# Should show: 16+ GB total memory

# Check available disk space
df -h
# Should show: 100+ GB available space

# Check CPU cores
nproc
# Should show: 4+ cores
```

### Network Connectivity
```bash
# Test Docker Hub connectivity
docker pull hello-world

# Test port availability (example for port 8080)
sudo netstat -tlnp | grep :8080
# Should show: no output (port is available)
```

## Common Prerequisites Issues

### Issue: Java Version Conflicts
```bash
# Problem: Multiple Java versions installed
# Solution: Set JAVA_HOME correctly
sudo update-alternatives --config java
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
```

### Issue: Docker Permission Denied
```bash
# Problem: Docker requires sudo
# Solution: Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Issue: Port Conflicts
```bash
# Problem: Required ports are in use
# Solution: Stop conflicting services or change ports
sudo lsof -i :8080
sudo systemctl stop nginx  # example
```

### Issue: Insufficient Memory
```bash
# Problem: System runs out of memory during build
# Solution: Add swap space or increase RAM
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Next Steps

Once your environment meets all prerequisites:

1. **Continue to Quick Start**: Follow the [Quick Start Guide](quick-start.md) for rapid deployment
2. **Development Setup**: Proceed to the [Local Development Guide](../development/setup/local-development.md) 
3. **Production Planning**: Review our production deployment guides

> **Tip**: Save your environment configuration in a `.env` file for easy reuse during development.

---

Having trouble with prerequisites? Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help from other developers and maintainers.