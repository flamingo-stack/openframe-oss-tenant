# Prerequisites

Before setting up OpenFrame, ensure your system meets the following requirements and you have the necessary accounts and tools configured.

## System Requirements

### Hardware Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 20 GB free space | 50+ GB SSD |
| **Network** | Broadband internet | High-speed internet |

### Supported Operating Systems

| OS | Versions | Notes |
|----|----------|-------|
| **Linux** | Ubuntu 20.04+, CentOS 8+, RHEL 8+ | Recommended for production |
| **macOS** | 11.0+ (Big Sur and later) | Good for development |
| **Windows** | Windows 10/11, Windows Server 2019+ | PowerShell required |

## Required Software

### Core Development Tools

| Tool | Version | Installation Command | Verification |
|------|---------|---------------------|--------------|
| **Java** | 21+ | [Download from Oracle](https://www.oracle.com/java/technologies/javase/jdk21-archive-downloads.html) | `java -version` |
| **Maven** | 3.8+ | [Download from Apache](https://maven.apache.org/download.cgi) | `mvn -version` |
| **Node.js** | 18+ | [Download from Node.js](https://nodejs.org/) | `node --version` |
| **Docker** | 20.0+ | [Download from Docker](https://docs.docker.com/get-docker/) | `docker --version` |
| **Docker Compose** | 2.0+ | Included with Docker Desktop | `docker-compose --version` |

### Database Requirements

| Database | Version | Purpose | Installation |
|----------|---------|---------|---------------|
| **MongoDB** | 7.0+ | Primary data storage | [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/) |
| **Redis** | 6.0+ | Caching and sessions | [Redis Installation Guide](https://redis.io/download) |
| **Apache Kafka** | 3.6+ | Event streaming | Via Docker Compose (recommended) |

### Optional Components

| Component | Version | Purpose | When Required |
|-----------|---------|---------|---------------|
| **Kubernetes** | 1.28+ | Container orchestration | Production deployments |
| **Helm** | 3.0+ | Kubernetes package manager | Kubernetes deployments |
| **Rust** | 1.75+ | Client agent development | Building OpenFrame agent |
| **Apache Cassandra** | 4.0+ | Time-series data | Large-scale logging |
| **Apache Pinot** | 1.2+ | Analytics queries | Advanced analytics |

## Account Requirements

### Authentication Providers (Choose One)

For SSO integration, you'll need at least one:

| Provider | Requirements | Setup Guide |
|----------|-------------|-------------|
| **Google Workspace** | Admin access to workspace | [Google OIDC Setup](https://developers.google.com/identity/protocols/oauth2/openid-connect) |
| **Microsoft 365** | Azure AD admin access | [Azure AD App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app) |
| **Custom OIDC** | OIDC-compliant identity provider | Provider-specific documentation |

### External Tool Access (Optional)

For integrated tool management:

| Tool | Access Required | Purpose |
|------|----------------|---------|
| **FleetDM** | API key and instance URL | Device management |
| **Tactical RMM** | API key and instance URL | Remote monitoring |
| **MeshCentral** | Admin credentials | Remote desktop access |

## Environment Variables

Prepare the following environment variables for your deployment:

### Core Configuration

```bash
# Database Connections
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security
JWT_SECRET=your-secure-jwt-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Application
OPENFRAME_BASE_URL=https://your-domain.com
ADMIN_EMAIL=admin@your-domain.com
```

### SSO Configuration (Example for Google)

```bash
# Google SSO
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback/google
```

## Network Requirements

### Required Ports

| Port | Service | Protocol | Access |
|------|---------|----------|--------|
| **80** | HTTP (redirect to HTTPS) | TCP | External |
| **443** | HTTPS | TCP | External |
| **8080** | Gateway Service | TCP | Internal |
| **8081** | API Service | TCP | Internal |
| **8082** | Authorization Server | TCP | Internal |
| **3000** | Frontend Development | TCP | Development only |

### Firewall Considerations

- **Outbound HTTPS (443)** for external API calls and SSO
- **Outbound DNS (53)** for service discovery
- **Internal service mesh communication** between containers

## Pre-Installation Checklist

Use this checklist to verify you're ready to proceed:

### ✅ System Verification

```bash
# Check Java version
java -version
# Should show Java 21 or higher

# Check Maven installation
mvn -version
# Should show Maven 3.8 or higher

# Check Node.js version
node --version
# Should show v18 or higher

# Check Docker installation
docker --version
docker-compose --version
# Should show Docker 20+ and Compose 2.0+
```

### ✅ Services Verification

```bash
# Verify MongoDB is accessible
mongosh --eval "db.adminCommand('ping')"
# Should return { ok: 1 }

# Verify Redis is accessible
redis-cli ping
# Should return PONG

# Test Docker functionality
docker run hello-world
# Should complete successfully
```

### ✅ Network Verification

```bash
# Check internet connectivity
curl -I https://www.google.com
# Should return HTTP 200

# Verify DNS resolution
nslookup openframe.ai
# Should resolve successfully
```

## Troubleshooting Common Issues

### Java Installation Issues

```bash
# Set JAVA_HOME if not automatically set
export JAVA_HOME=/path/to/java/21
export PATH=$JAVA_HOME/bin:$PATH

# Verify Java is in PATH
which java
```

### Docker Permission Issues (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in, then test
docker run hello-world
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if needed
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod
```

### Port Conflicts

```bash
# Check what's running on required ports
sudo lsof -i :8080
sudo lsof -i :8081
sudo lsof -i :3000

# Kill conflicting processes if needed
sudo kill -9 <PID>
```

## Performance Tuning (Optional)

For production deployments, consider these optimizations:

### JVM Settings

```bash
# Set in .bashrc or environment
export JAVA_OPTS="-Xms2g -Xmx4g -XX:+UseG1GC"
```

### MongoDB Optimization

```javascript
// Increase connection pool
db.adminCommand({setParameter: 1, maxConns: 1000})

// Enable profiling for slow queries
db.setProfilingLevel(1, {slowms: 100})
```

### Docker Resource Limits

```yaml
# In docker-compose.yml
services:
  mongodb:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2'
```

## Next Steps

Once you've verified all prerequisites:

1. **[Quick Start Guide](quick-start.md)** - Get OpenFrame running in minutes
2. **[Development Environment Setup](../development/setup/environment.md)** - For development work
3. **[Architecture Overview](../development/architecture/overview.md)** - Understand the system design

> 💡 **Tip**: If you encounter any issues during setup, join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help from the community and maintainers.