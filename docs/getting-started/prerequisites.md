# Prerequisites

Before setting up OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, software dependencies, and access requirements.

## System Requirements

### Minimum Hardware Requirements

| Component | Requirement | Recommended |
|-----------|-------------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB available | 100+ GB SSD |
| **Network** | Stable internet connection | Dedicated bandwidth for MSP operations |

### Operating System Support

OpenFrame supports the following operating systems:

- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+
- **macOS**: 10.15+ (Catalina and later)
- **Windows**: Windows 10/11, Windows Server 2019/2022

## Software Dependencies

### Required Software

| Software | Version | Purpose | Installation Check |
|----------|---------|---------|-------------------|
| **Java** | 21+ | Backend services runtime | `java --version` |
| **Maven** | 3.8+ | Build tool for Java services | `mvn --version` |
| **Node.js** | 18+ | Frontend build and development | `node --version` |
| **Docker** | 20.10+ | Container runtime | `docker --version` |
| **Docker Compose** | 2.0+ | Multi-container orchestration | `docker compose version` |

### Database Requirements

OpenFrame requires the following databases:

| Database | Version | Purpose | Required |
|----------|---------|---------|----------|
| **MongoDB** | 7.x | Primary data store | ✅ Required |
| **Apache Kafka** | 3.6+ | Event streaming | ✅ Required |
| **Redis** | 6.0+ | Caching layer | ✅ Required |
| **Apache Pinot** | 1.2+ | Analytics engine | 🔄 Optional (for analytics) |
| **Cassandra** | 4.x | Event storage | 🔄 Optional (for event history) |

### Development Tools (Optional)

For development and debugging:

- **Git**: Version control and source code management
- **IDE**: IntelliJ IDEA, VS Code, or Eclipse for Java development
- **Kubernetes CLI** (`kubectl`): For production deployments
- **Helm**: Kubernetes package manager (for K8s deployments)

## Environment Variables

Configure these essential environment variables:

### Core Configuration

```bash
# Database connections
export SPRING_DATA_MONGODB_URI="mongodb://localhost:27017/openframe"
export SPRING_REDIS_URL="redis://localhost:6379"
export SPRING_KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Security settings
export JWT_SECRET="your-secure-jwt-secret-key-here"
export ENCRYPTION_KEY="your-aes-256-encryption-key"

# Service ports (default values)
export API_SERVICE_PORT="8080"
export GATEWAY_SERVICE_PORT="8081"
export AUTH_SERVICE_PORT="8082"
export CLIENT_SERVICE_PORT="8083"
export MANAGEMENT_SERVICE_PORT="8084"
export STREAM_SERVICE_PORT="8085"
export EXTERNAL_API_SERVICE_PORT="8086"
export CONFIG_SERVICE_PORT="8087"
```

### Optional Configuration

```bash
# Analytics (if using Pinot/Cassandra)
export PINOT_BROKER_URL="http://localhost:8000"
export CASSANDRA_CONTACT_POINTS="localhost"
export CASSANDRA_PORT="9042"

# NATS messaging (for real-time features)
export NATS_SERVER_URL="nats://localhost:4222"

# External integrations
export HUBSPOT_API_KEY="your-hubspot-api-key"
export SMTP_HOST="your-smtp-server"
export SMTP_PORT="587"
```

## Access Requirements

### Network Access

Ensure the following ports are accessible:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| MongoDB | 27017 | TCP | Database access |
| Redis | 6379 | TCP | Cache access |
| Kafka | 9092 | TCP | Message streaming |
| NATS | 4222 | TCP | Real-time messaging |
| Pinot Broker | 8000 | HTTP | Analytics queries |
| Cassandra | 9042 | TCP | Event storage |

### External Services

For full functionality, configure access to:

- **Email Service**: SMTP server for notifications and user invitations
- **OAuth Providers**: Google, Microsoft, or other OIDC providers for SSO
- **Monitoring**: Prometheus/Grafana endpoints (optional)

## Account Requirements

### Development Accounts

- **GitHub Account**: For accessing source code and CLI tools
- **Docker Hub**: For pulling official container images

### Production Accounts (Optional)

- **Cloud Provider**: AWS, GCP, or Azure for cloud deployments
- **Domain Name**: For SSL certificates and proper OAuth redirects
- **SSL Certificate**: Let's Encrypt or commercial certificate
- **Email Service**: SendGrid, Mailgun, or similar for production emails

## Verification Commands

Run these commands to verify your environment is ready:

### Check Java Installation

```bash
java --version
# Should output: openjdk 21.x.x or similar
```

### Check Maven Setup

```bash
mvn --version
# Should show Maven 3.8+ and Java 21+
```

### Check Node.js and npm

```bash
node --version && npm --version
# Should show Node 18+ and compatible npm version
```

### Check Docker Environment

```bash
docker --version
docker compose version
# Verify Docker daemon is running
docker run hello-world
```

### Test Database Connectivity

```bash
# MongoDB (if running locally)
mongosh --eval "db.adminCommand('hello')"

# Redis (if running locally)
redis-cli ping
# Should return: PONG
```

## Quick Setup Script

For convenience, use this script to verify prerequisites:

```bash
#!/bin/bash
echo "🔍 Checking OpenFrame Prerequisites..."

# Check Java
if command -v java &> /dev/null; then
    echo "✅ Java found: $(java --version | head -n1)"
else
    echo "❌ Java not found. Please install Java 21+"
fi

# Check Maven
if command -v mvn &> /dev/null; then
    echo "✅ Maven found: $(mvn --version | head -n1)"
else
    echo "❌ Maven not found. Please install Maven 3.8+"
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
fi

# Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker found: $(docker --version)"
    if docker info &> /dev/null; then
        echo "✅ Docker daemon is running"
    else
        echo "⚠️ Docker daemon is not running"
    fi
else
    echo "❌ Docker not found. Please install Docker 20.10+"
fi

echo "🎯 Prerequisites check complete!"
```

## Common Issues

### Java Version Problems

```bash
# If multiple Java versions are installed
export JAVA_HOME="/path/to/java-21"
export PATH="$JAVA_HOME/bin:$PATH"
```

### Docker Permission Issues (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Port Conflicts

```bash
# Check if ports are in use
netstat -tulpn | grep :8080
# or use lsof on macOS/Linux
lsof -i :8080
```

## Next Steps

Once your environment meets all prerequisites:

1. **[Quick Start Guide](quick-start.md)**: Get OpenFrame running in 5 minutes
2. **[Development Setup](../development/setup/environment.md)**: Configure your development environment
3. **[First Steps](first-steps.md)**: Explore OpenFrame features

> **Note**: Missing optional dependencies (Pinot, Cassandra) will limit analytics features but won't prevent core functionality from working.

---

Need help with prerequisites? Join our [OpenMSP Slack community](https://www.openmsp.ai/) for assistance!