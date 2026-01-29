# Prerequisites

Before installing OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, required software, and account setup needed for a successful deployment.

## System Requirements

### Minimum Hardware Specifications

| Component | Minimum | Recommended | Enterprise |
|-----------|---------|-------------|------------|
| **CPU** | 4 cores | 8 cores | 16+ cores |
| **RAM** | 8 GB | 16 GB | 32+ GB |
| **Storage** | 50 GB SSD | 100 GB SSD | 500+ GB NVMe |
| **Network** | 100 Mbps | 1 Gbps | 10 Gbps |

### Operating System Support

OpenFrame supports the following operating systems:

| OS | Versions | Notes |
|---|---|---|
| **Ubuntu** | 20.04 LTS, 22.04 LTS, 24.04 LTS | Recommended for production |
| **RHEL/CentOS** | 8.x, 9.x | Enterprise environments |
| **macOS** | 12.0+ (Monterey) | Development only |
| **Windows** | 10, 11, Server 2019/2022 | Development and testing |

## Required Software

### Core Dependencies

Install these components before deploying OpenFrame:

| Software | Version | Installation Command | Verification |
|----------|---------|---------------------|-------------|
| **Docker** | 24.0+ | `curl -fsSL https://get.docker.com | sh` | `docker --version` |
| **Docker Compose** | 2.20+ | Included with Docker Desktop | `docker compose version` |
| **Java (JDK)** | 21+ | `sudo apt install openjdk-21-jdk` | `java --version` |
| **Node.js** | 18.17+ | `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -` | `node --version` |
| **Maven** | 3.9+ | `sudo apt install maven` | `mvn --version` |

### Development Tools (Optional)

For development and customization:

| Tool | Purpose | Installation |
|------|---------|-------------|
| **Git** | Version control | `sudo apt install git` |
| **Kubectl** | Kubernetes CLI | `curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"` |
| **Helm** | Package manager | `curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash` |
| **Rust** | Client development | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh` |

### Database Requirements

OpenFrame uses multiple databases that can be run via Docker:

| Database | Version | Purpose | Default Port |
|----------|---------|---------|--------------|
| **MongoDB** | 7.0+ | Primary data storage | 27017 |
| **Cassandra** | 4.1+ | Time-series data | 9042 |
| **Redis** | 7.0+ | Caching and sessions | 6379 |
| **Apache Kafka** | 3.6+ | Event streaming | 9092 |

## Network Requirements

### Port Configuration

Ensure these ports are available and not blocked by firewalls:

#### Core Services
```bash
# API Gateway
8080      # HTTP API endpoint
8443      # HTTPS API endpoint (optional)

# Frontend
3000      # Development server
80/443    # Production web server

# Database Ports
27017     # MongoDB
9042      # Cassandra
6379      # Redis
9092      # Kafka
```

#### Development Ports
```bash
# Service-specific ports for development
8081      # API Service
8082      # Management Service
8083      # Stream Service
8084      # Client Service
8085      # Config Service
```

### Firewall Rules

Configure your firewall to allow required traffic:

```bash
# Ubuntu/Debian (using ufw)
sudo ufw allow 8080/tcp
sudo ufw allow 3000/tcp
sudo ufw allow from 10.0.0.0/8 to any port 27017
sudo ufw allow from 10.0.0.0/8 to any port 9042

# RHEL/CentOS (using firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Account and Access Requirements

### OpenMSP Community Access

Join the OpenMSP Slack community for support and updates:
- **Community Slack**: https://www.openmsp.ai/
- **Join Link**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> **Important**: All support, feature requests, and development discussions happen in our Slack community, not through GitHub Issues.

### External Tool Credentials (Optional)

If integrating with existing tools, prepare these credentials:

| Tool | Required Information |
|------|---------------------|
| **TacticalRMM** | API URL, API key, username |
| **FleetMDM** | Server URL, API token |
| **MeshCentral** | Server URL, username, password |
| **Authentik** | Server URL, API token |

## Environment Variables

Create a `.env` file with these essential variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
CASSANDRA_HOSTS=localhost:9042
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Security
JWT_SECRET=your-secret-key-change-in-production
ENCRYPTION_KEY=32-character-encryption-key-here

# Application
OPENFRAME_ENVIRONMENT=development
OPENFRAME_LOG_LEVEL=INFO

# Optional: External integrations
TACTICAL_RMM_URL=https://your-tactical-rmm.com
TACTICAL_RMM_API_KEY=your-api-key
```

## Verification Commands

Run these commands to verify your environment is ready:

### System Check
```bash
# Check system resources
free -h                  # Memory usage
df -h                   # Disk space
nproc                   # CPU cores
```

### Software Versions
```bash
# Verify required software
docker --version
docker compose version
java --version
node --version
npm --version
mvn --version
```

### Network Connectivity
```bash
# Test port availability
netstat -tuln | grep :8080
netstat -tuln | grep :27017

# Test network connectivity
curl -I https://github.com    # External connectivity
ping localhost                # Local loopback
```

### Docker Verification
```bash
# Test Docker installation
docker run hello-world

# Verify Docker Compose
docker compose version

# Check Docker daemon
sudo systemctl status docker
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
sudo lsof -i :8080
sudo kill -9 <PID>
```

#### Docker Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Java Version Issues
```bash
# Switch Java version (Ubuntu)
sudo update-alternatives --config java

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

#### Memory Issues
```bash
# Increase Docker memory limit
# Edit Docker Desktop settings or daemon.json:
{
  "default-runtime": "runc",
  "runtimes": {
    "runc": {
      "path": "docker-runc"
    }
  }
}
```

## Security Considerations

### Production Environment

For production deployments:

- Use strong passwords and API keys
- Enable HTTPS with valid certificates
- Configure proper firewall rules
- Set up monitoring and logging
- Use dedicated databases (not Docker containers)
- Implement backup strategies

### Development Environment

For development:

- Use localhost-only binding for databases
- Rotate development keys regularly  
- Keep development data separate from production
- Use Docker containers for isolation

## Next Steps

Once your environment meets all prerequisites:

1. **[Quick Start](./quick-start.md)** - Deploy OpenFrame in 5 minutes
2. **[First Steps](./first-steps.md)** - Initial configuration guide
3. **[Development Setup](../development/setup/environment.md)** - For developers

If you encounter issues during prerequisite setup, join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance.