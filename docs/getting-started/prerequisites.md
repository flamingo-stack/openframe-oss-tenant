# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, software dependencies, and verification steps to confirm your setup is ready.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 16 GB | 32+ GB |
| **Storage** | 100 GB SSD | 500+ GB SSD |
| **Network** | 1 Gbps | 10 Gbps |

### Supported Operating Systems

| OS | Versions | Notes |
|----|----------|-------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, CentOS 8+ | Recommended for production |
| **macOS** | 12.0+ (Monterey) | Development only |
| **Windows** | Windows 11, Windows Server 2022 | Development only |

## Required Software Dependencies

### Core Runtime Dependencies

| Software | Version | Purpose |
|----------|---------|---------|
| **Java** | 21 (LTS) | Backend services runtime |
| **Node.js** | 18.x or 20.x LTS | Frontend build and runtime |
| **Docker** | 24.0+ | Container runtime |
| **Docker Compose** | 2.20+ | Multi-container orchestration |
| **Git** | 2.30+ | Source code management |

### Development Dependencies (Optional)

| Software | Version | Purpose |
|----------|---------|---------|
| **Maven** | 3.9.0+ | Java build tool |
| **Rust** | 1.70+ | Client agent development |
| **kubectl** | 1.28+ | Kubernetes cluster management |
| **Helm** | 3.12+ | Kubernetes package management |

## External Service Requirements

### Database Systems

OpenFrame requires the following databases to be available:

| Database | Version | Purpose | Memory Requirement |
|----------|---------|---------|-------------------|
| **MongoDB** | 7.0+ | Configuration and state | 2-4 GB |
| **Apache Cassandra** | 4.1+ | Time-series data | 4-8 GB |
| **Apache Pinot** | 1.2.0+ | Analytics | 2-4 GB |
| **Redis** | 7.0+ | Caching and sessions | 1-2 GB |

### Message Streaming

| Service | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **Apache Kafka** | 3.6.0+ | Event streaming | Requires Zookeeper or KRaft mode |
| **NATS** | 2.9+ | Tool communication | JetStream enabled |

### External Tool Integration (Optional)

| Tool | Version | Integration | Purpose |
|------|---------|-------------|---------|
| **Fleet MDM** | Latest | SDK | Device management |
| **Tactical RMM** | 0.17+ | SDK | Agent management |
| **MeshCentral** | 1.1+ | WebSocket | Remote access |

## Environment Variables

Set the following environment variables before starting OpenFrame:

### Required Variables

```bash
# Database connections
MONGODB_URI=mongodb://localhost:27017/openframe
CASSANDRA_CONTACT_POINTS=127.0.0.1
PINOT_BROKER_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_SECURITY_PROTOCOL=PLAINTEXT

# Security settings
JWT_SECRET=your-strong-jwt-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key
```

### Optional Variables

```bash
# External tool integrations
FLEET_MDM_URL=https://your-fleet-instance.com
FLEET_MDM_TOKEN=your-fleet-token

TACTICAL_RMM_URL=https://your-tactical-instance.com
TACTICAL_RMM_USERNAME=your-username
TACTICAL_RMM_PASSWORD=your-password

MESHCENTRAL_URL=https://your-mesh-instance.com

# Development settings
SPRING_PROFILES_ACTIVE=dev
LOG_LEVEL=INFO
DEBUG_MODE=false
```

## Network Requirements

### Port Configuration

Ensure the following ports are available:

| Port | Service | Protocol | Access |
|------|---------|----------|---------|
| `8080` | API Gateway | HTTP/HTTPS | External |
| `8081` | API Service | HTTP | Internal |
| `8082` | Authorization Server | HTTP | Internal |
| `8083` | Management Service | HTTP | Internal |
| `8084` | Stream Service | HTTP | Internal |
| `8085` | Config Service | HTTP | Internal |
| `8086` | Client Service | HTTP | Internal |
| `3000` | Frontend UI | HTTP | External |
| `3001` | Chat UI | HTTP | External |

### Firewall Rules

For production deployments, configure firewall rules:

```bash
# Allow external access to web interfaces
sudo ufw allow 8080/tcp  # API Gateway
sudo ufw allow 3000/tcp  # Frontend UI
sudo ufw allow 3001/tcp  # Chat UI

# Block direct access to internal services
sudo ufw deny 8081:8086/tcp
```

## Account and Access Requirements

### Cloud Accounts (If Using Cloud Services)

- **AWS Account**: For S3 storage, RDS, EKS (optional)
- **Google Cloud**: For GKE, Cloud SQL, Cloud Storage (optional)
- **Azure Account**: For AKS, Azure Database (optional)

### DNS Requirements

- **Domain Name**: For production SSL certificates
- **Subdomain Access**: Ability to create DNS records
- **SSL Certificate**: Valid TLS certificate (Let's Encrypt supported)

## Verification Commands

Run these commands to verify your environment is ready:

### Check Java Installation

```bash
java --version
# Expected output: openjdk 21.0.x or similar
```

### Check Node.js Installation

```bash
node --version
npm --version
# Expected: v18.x.x or v20.x.x and 9.x.x+
```

### Check Docker Installation

```bash
docker --version
docker compose version
# Expected: Docker version 24.0.x and v2.20.x+
```

### Check Database Connectivity

```bash
# MongoDB (requires mongosh)
mongosh "mongodb://localhost:27017/test" --eval "db.runCommand({ping: 1})"

# Redis (requires redis-cli)
redis-cli ping
# Expected: PONG

# Test Cassandra (requires cqlsh)
echo "SELECT cluster_name FROM system.local;" | cqlsh localhost

# Test Kafka (requires kafka-console-producer)
echo "test" | kafka-console-producer --bootstrap-server localhost:9092 --topic test-topic
```

### Memory and Disk Space Check

```bash
# Check available memory (should show 16GB+)
free -h

# Check disk space (should show 100GB+ free)
df -h

# Check CPU cores (should show 4+)
nproc
```

## Common Issues and Solutions

### Java Version Conflicts

If you have multiple Java versions:

```bash
# Check all Java versions
update-alternatives --list java

# Set Java 21 as default
sudo update-alternatives --config java
```

### Docker Permission Issues

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Verify docker runs without sudo
docker run hello-world
```

### Memory Constraints

For development environments with limited memory:

```bash
# Set JVM heap sizes
export JAVA_OPTS="-Xmx2g -Xms1g"

# Limit Docker container memory
docker run --memory="4g" your-container
```

## Next Steps

Once your environment meets all prerequisites:

1. Continue to the **Quick Start Guide** to install OpenFrame
2. Follow the **First Steps Guide** to configure your first organization
3. Join the **OpenMSP Slack Community** for support and discussion

> **Tip**: Keep this prerequisites list handy during installation. You can return to it if you encounter any dependency-related issues.

---

With these prerequisites in place, you're ready to install and run OpenFrame successfully!