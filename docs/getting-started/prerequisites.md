# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. These prerequisites apply to both development and production deployments.

## System Requirements

### Hardware Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 4 cores | 8+ cores | Java services are CPU-intensive |
| **Memory** | 16 GB RAM | 32+ GB RAM | Multiple services + databases |
| **Storage** | 100 GB | 500+ GB SSD | For databases and logs |
| **Network** | 1 Gbps | 10 Gbps | High data throughput |

### Operating System Support

| OS | Version | Support Level |
|-------|---------|---------------|
| **Ubuntu** | 20.04 LTS, 22.04 LTS | ✅ Full |
| **CentOS/RHEL** | 8.x, 9.x | ✅ Full |
| **macOS** | 11+ (Big Sur) | ✅ Development |
| **Windows** | 10, 11, Server 2019/2022 | ✅ Development |
| **Debian** | 11, 12 | ⚠️ Community |

## Required Software

### Core Runtime Dependencies

| Software | Version | Installation Method |
|----------|---------|-------------------|
| **Java JDK** | 21 LTS | OpenJDK or Oracle |
| **Maven** | 3.8.0+ | Package manager or manual |
| **Node.js** | 18 LTS or 20 LTS | nvm recommended |
| **Docker** | 24.0+ | Docker Desktop or Engine |
| **Docker Compose** | 2.20+ | Included with Docker Desktop |

### Database Requirements

| Database | Version | Purpose | Required |
|----------|---------|---------|----------|
| **MongoDB** | 7.0+ | Primary data store | ✅ Yes |
| **Apache Cassandra** | 4.1+ | Time-series data | ✅ Yes |
| **Apache Pinot** | 1.2.0+ | Analytics queries | ✅ Yes |
| **Redis** | 7.0+ | Caching and sessions | ✅ Yes |
| **Apache Kafka** | 3.6.0+ | Event streaming | ✅ Yes |

### Development Tools (Optional)

| Tool | Version | Purpose |
|------|---------|---------|
| **IntelliJ IDEA** | 2023.3+ | Java development |
| **VS Code** | Latest | Frontend development |
| **Rust** | 1.75+ | Client agent development |
| **kubectl** | 1.28+ | Kubernetes management |
| **Helm** | 3.12+ | Chart deployment |

## Installation Verification

### Java Installation

```bash
# Check Java version
java -version

# Expected output (example):
# openjdk version "21.0.1" 2023-10-17 LTS
# OpenJDK Runtime Environment (build 21.0.1+12-LTS)
```

### Maven Installation

```bash
# Check Maven version
mvn -version

# Expected output (example):
# Apache Maven 3.9.5 (57804ffe001d7215b5e7bcb531cf83df38f93546)
# Maven home: /usr/local/maven
```

### Node.js Installation

```bash
# Check Node.js version
node --version
npm --version

# Expected output (example):
# v20.10.0
# 10.2.3
```

### Docker Installation

```bash
# Check Docker version
docker --version
docker-compose --version

# Expected output (example):
# Docker version 24.0.7, build afdd53b
# Docker Compose version v2.23.3-desktop.2
```

## Network and Security Requirements

### Port Requirements

| Service | Port | Protocol | Access Level |
|---------|------|----------|-------------|
| **Frontend** | 3000 | HTTP/HTTPS | External |
| **API Gateway** | 8080 | HTTP/HTTPS | External |
| **Authorization Server** | 9000 | HTTP/HTTPS | External |
| **API Service** | 8081 | HTTP | Internal |
| **Management Service** | 8082 | HTTP | Internal |
| **Client Service** | 8083 | HTTP | Internal |
| **Stream Service** | 8084 | HTTP | Internal |

### Firewall Configuration

Ensure the following ports are accessible:

```bash
# Web traffic
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Frontend (development)

# API services
ufw allow 8080/tcp  # Gateway
ufw allow 9000/tcp  # Authorization

# Database access (if external)
ufw allow 27017/tcp  # MongoDB
ufw allow 9042/tcp   # Cassandra
ufw allow 6379/tcp   # Redis
ufw allow 9092/tcp   # Kafka
```

## Environment Variables

### Required Environment Variables

Create a `.env` file or set these environment variables:

```bash
# Database Connections
MONGODB_URI=mongodb://localhost:27017/openframe
CASSANDRA_CONTACT_POINTS=localhost:9042
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Service URLs
API_BASE_URL=http://localhost:8080
AUTH_SERVER_URL=http://localhost:9000
FRONTEND_URL=http://localhost:3000

# External Tool Configuration (Optional)
FLEETDM_URL=https://your-fleet-instance.com
TACTICAL_RMM_URL=https://your-tactical-rmm.com
MESHCENTRAL_URL=https://your-meshcentral.com
```

### Optional Environment Variables

```bash
# Development
NODE_ENV=development
LOG_LEVEL=DEBUG
ENABLE_DEBUG_LOGGING=true

# Production
NODE_ENV=production
LOG_LEVEL=INFO
ENABLE_METRICS=true
```

## Account Requirements

### External Service Accounts

If using SaaS deployments of integrated tools, prepare:

| Service | Requirements |
|---------|-------------|
| **FleetDM** | API token with admin privileges |
| **Tactical RMM** | API key with full access |
| **MeshCentral** | Admin account credentials |
| **Google SSO** | OAuth2 client ID and secret |
| **Microsoft SSO** | Azure app registration |

### Cloud Provider (If Applicable)

For cloud deployments:

- **AWS**: IAM roles with appropriate permissions
- **Azure**: Service principal with contributor access
- **GCP**: Service account with necessary roles
- **Kubernetes**: Cluster admin access

## Verification Checklist

Before proceeding to installation, verify:

- [ ] Java 21 is installed and `$JAVA_HOME` is set
- [ ] Maven 3.8+ is available in `$PATH`
- [ ] Node.js 18+ and npm are installed
- [ ] Docker and Docker Compose are running
- [ ] All required ports are available
- [ ] Environment variables are configured
- [ ] External service accounts are prepared (if using)
- [ ] Hardware meets minimum requirements
- [ ] Network connectivity is established

## Common Issues and Solutions

### Java Version Conflicts

If you have multiple Java versions:

```bash
# Set Java 21 as default (Linux/macOS)
export JAVA_HOME=/path/to/java21
export PATH=$JAVA_HOME/bin:$PATH

# Verify
java -version
```

### Docker Permission Issues (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Test Docker access
docker run hello-world
```

### Port Conflicts

Check for port usage:

```bash
# Check if ports are in use
netstat -tlnp | grep :8080
lsof -i :8080

# Kill processes if needed
sudo kill -9 $(lsof -t -i:8080)
```

## Next Steps

Once all prerequisites are satisfied:

1. Continue to [Quick Start Guide](quick-start.md) for installation
2. Review [First Steps](first-steps.md) for initial configuration
3. Check [Development Setup](../development/setup/environment.md) for development tools

---

> **Need Help?** Join the OpenMSP Slack community at [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance with prerequisites and setup issues.