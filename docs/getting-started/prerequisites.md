# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. This guide covers both deployment scenarios: cloud/production and local development.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended | Notes |
|-----------|---------|-------------|-------|
| **CPU** | 4 cores | 8+ cores | x86_64 or ARM64 |
| **RAM** | 8 GB | 16+ GB | Java services are memory intensive |
| **Storage** | 50 GB | 100+ GB | SSD preferred for database performance |
| **Network** | 1 Gbps | 10 Gbps | For multi-tenant deployments |

### Supported Operating Systems

| Platform | Versions | Notes |
|----------|----------|-------|
| **Linux** | Ubuntu 20.04+, CentOS 7+, RHEL 8+ | Recommended for production |
| **macOS** | 10.15+ (Catalina) | Development only |
| **Windows** | Windows 10, Windows Server 2019+ | Limited production support |

## Required Software Stack

### Core Runtime Requirements

| Software | Version | Installation Method | Verification Command |
|----------|---------|-------------------|---------------------|
| **Java** | 21+ | `apt install openjdk-21-jdk` | `java --version` |
| **Node.js** | 18+ | `curl -fsSL https://deb.nodesource.com/setup_18.x \| sudo -E bash -` | `node --version` |
| **Docker** | 20.10+ | `curl -fsSL https://get.docker.com \| sh` | `docker --version` |
| **Docker Compose** | 2.0+ | Included with Docker Desktop | `docker compose version` |

### Database Requirements

| Database | Version | Purpose | Configuration Notes |
|----------|---------|---------|-------------------|
| **MongoDB** | 7.0+ | Primary data store | Replica set recommended |
| **Apache Cassandra** | 4.0+ | Time-series data | 3+ node cluster for production |
| **Redis** | 6.0+ | Caching & sessions | Persistence enabled |
| **Apache Kafka** | 3.6+ | Event streaming | 3+ brokers for production |
| **Apache Pinot** | 1.2.0+ | Real-time analytics | Optional for advanced analytics |

### Development Tools (Optional)

| Tool | Version | Purpose | Installation |
|------|---------|---------|-------------|
| **Maven** | 3.8+ | Java build tool | `apt install maven` |
| **Rust** | 1.70+ | Client agent development | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| **Kubernetes** | 1.28+ | Container orchestration | See [Kubernetes docs](https://kubernetes.io/docs/setup/) |
| **Helm** | 3.12+ | Kubernetes package manager | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \| bash` |

## Network & Security Requirements

### Port Configuration

| Service | Port | Protocol | Purpose | Access Level |
|---------|------|----------|---------|-------------|
| **API Gateway** | 8080 | HTTP/HTTPS | Main application entry | Public |
| **Frontend** | 3000 | HTTP/HTTPS | Web interface | Public |
| **Authorization Server** | 9000 | HTTP/HTTPS | OAuth2/OIDC | Internal |
| **GraphQL API** | 8081 | HTTP | API service | Internal |
| **Management API** | 8082 | HTTP | Admin operations | Internal |
| **Stream Service** | 8083 | HTTP | Data processing | Internal |
| **MongoDB** | 27017 | TCP | Database | Internal |
| **Redis** | 6379 | TCP | Cache | Internal |
| **Kafka** | 9092 | TCP | Message broker | Internal |
| **Cassandra** | 9042 | TCP | Time-series DB | Internal |

### Firewall Rules

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 3000/tcp

# Allow SSH (adjust as needed)
sudo ufw allow 22/tcp

# Internal service communication (adjust IP ranges)
sudo ufw allow from 10.0.0.0/8 to any port 27017
sudo ufw allow from 10.0.0.0/8 to any port 6379
sudo ufw allow from 10.0.0.0/8 to any port 9092
```

## Environment Variables

Create a `.env` file with the required environment variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=localhost:9042
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Service URLs
OPENFRAME_API_URL=http://localhost:8081
OPENFRAME_GATEWAY_URL=http://localhost:8080
OPENFRAME_FRONTEND_URL=http://localhost:3000

# OAuth Configuration (optional for development)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
```

## Account & Access Requirements

### Required Service Accounts

| Service | Required For | Setup Instructions |
|---------|--------------|-------------------|
| **Google Cloud** | OAuth, optional integrations | [Google Cloud Console](https://console.cloud.google.com) |
| **Microsoft Azure** | Azure AD integration | [Azure Portal](https://portal.azure.com) |
| **Docker Hub** | Container registry access | [Docker Hub](https://hub.docker.com) |

### OAuth Application Setup

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:9000/oauth2/callback/google`
   - `https://yourdomain.com/oauth2/callback/google`

#### Azure AD Setup
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Create new registration
4. Configure redirect URIs:
   - `http://localhost:9000/oauth2/callback/microsoft`
   - `https://yourdomain.com/oauth2/callback/microsoft`
5. Generate client secret

## Verification Commands

Run these commands to verify your environment is ready:

### Check Java Installation
```bash
java --version
# Expected output: openjdk 21.x.x or higher
```

### Check Node.js Installation
```bash
node --version
npm --version
# Expected: Node 18+ and corresponding npm version
```

### Check Docker Installation
```bash
docker --version
docker compose version
docker run hello-world
# All should complete successfully
```

### Check Database Connectivity
```bash
# MongoDB
mongosh --eval "db.adminCommand('ping')"

# Redis
redis-cli ping

# Test network connectivity
nc -zv localhost 27017  # MongoDB
nc -zv localhost 6379   # Redis
nc -zv localhost 9092   # Kafka (if running)
```

### Check Build Tools (Development)
```bash
# Maven
mvn --version

# Rust (if developing client)
rustc --version
cargo --version
```

## Common Issues & Solutions

### Java Version Issues
```bash
# Multiple Java versions installed
update-alternatives --config java
# Select Java 21

# JAVA_HOME not set
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
```

### Docker Permission Issues
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in, or run:
newgrp docker
```

### Database Connection Issues
```bash
# Check if services are running
systemctl status mongodb
systemctl status redis-server

# Check if ports are accessible
netstat -tlnp | grep :27017
netstat -tlnp | grep :6379
```

### Memory Issues
```bash
# Check available memory
free -h

# Increase swap if needed (temporary)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Next Steps

Once you've verified all prerequisites are met:

1. **[Quick Start Guide](./quick-start.md)** - Set up OpenFrame in 5 minutes
2. **[Development Environment Setup](../development/setup/environment.md)** - For developers
3. **[First Steps](./first-steps.md)** - Initial configuration

## Resource Planning

### Development Environment
- **Single machine**: All components on one system
- **Memory**: 8GB minimum, 16GB recommended
- **Storage**: 50GB for databases and logs

### Production Environment
- **Multi-node cluster**: Separate database and application nodes
- **Load balancing**: Multiple frontend and API instances
- **High availability**: Database clustering and failover
- **Monitoring**: Prometheus, Grafana, and log aggregation

---

> 💡 **Tip**: Start with the development setup first, then scale to production once you're familiar with the platform.

For additional help with prerequisites, visit our [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).