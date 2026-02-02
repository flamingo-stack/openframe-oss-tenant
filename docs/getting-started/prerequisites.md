# Prerequisites

Before installing OpenFrame, ensure your system meets the following requirements. This guide covers both development and production environments.

## System Requirements

### Minimum Requirements

| Component | Requirement | Recommended |
|-----------|-------------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 16 GB | 32 GB |
| **Storage** | 100 GB | 500 GB SSD |
| **Network** | 100 Mbps | 1 Gbps |

### Operating System Support

OpenFrame supports the following operating systems:

| Platform | Supported Versions | Notes |
|----------|-------------------|-------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, Debian 11+ | Recommended for production |
| **macOS** | 12.0+ (Monterey) | Development environment |
| **Windows** | Windows 10/11, Server 2019+ | Development and testing |

## Required Software

### Core Dependencies

Install these before proceeding with OpenFrame setup:

#### 1. Java Development Kit (JDK)
```bash
# Install Java 21 (required for OpenFrame services)
# Ubuntu/Debian
sudo apt update && sudo apt install openjdk-21-jdk

# macOS (using Homebrew)
brew install openjdk@21

# Windows (using Chocolatey)
choco install openjdk21
```

**Verification:**
```bash
java -version
# Should show: openjdk version "21.x.x"
```

#### 2. Node.js and npm
```bash
# Install Node.js 18+ (required for frontend)
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node

# Windows
choco install nodejs
```

**Verification:**
```bash
node --version  # Should be v18.x.x or higher
npm --version   # Should be 9.x.x or higher
```

#### 3. Docker and Docker Compose
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# macOS
brew install --cask docker

# Windows
# Download Docker Desktop from https://www.docker.com/products/docker-desktop
```

**Verification:**
```bash
docker --version
docker compose version
```

#### 4. Maven (for building Java services)
```bash
# Ubuntu/Debian
sudo apt install maven

# macOS
brew install maven

# Windows
choco install maven
```

**Verification:**
```bash
mvn --version
```

#### 5. Git
```bash
# Ubuntu/Debian
sudo apt install git

# macOS
brew install git

# Windows
choco install git
```

### Optional Dependencies

#### Rust (for system agent development)
Only required if you plan to develop or build the system agent:

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Kubernetes Tools (for production deployment)
```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Helm
curl https://baltocdn.com/helm/signing.asc | sudo apt-key add -
sudo apt-get install apt-transport-https --yes
echo "deb https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm
```

## Database and Infrastructure Requirements

### For Development
OpenFrame uses Docker Compose to run infrastructure components locally. No additional setup required.

### For Production

#### MongoDB
- **Version**: 7.0+
- **Replica Set**: Required for change streams
- **Storage**: Minimum 50GB, recommended 200GB+
- **Connection String**: Ready for application configuration

#### Redis
- **Version**: 7.0+
- **Memory**: Minimum 4GB, recommended 16GB+
- **Persistence**: RDB snapshots recommended

#### Apache Kafka
- **Version**: 3.6+
- **Brokers**: Minimum 3 for production
- **Storage**: 100GB+ per broker
- **Replication Factor**: 3

#### Apache Cassandra
- **Version**: 4.x
- **Nodes**: Minimum 3 for production
- **Storage**: 200GB+ per node

#### Apache Pinot
- **Version**: 1.2.0+
- **Components**: Controller, Broker, Server
- **Storage**: 100GB+ for analytics data

## Network and Security Requirements

### Port Configuration

Ensure the following ports are available:

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| API Gateway | 8080 | HTTP/HTTPS | Main entry point |
| Authorization | 8081 | HTTP | OAuth2/OIDC endpoints |
| API Service | 8082 | HTTP | GraphQL/REST APIs |
| Frontend | 3000 | HTTP | Web interface |
| Management | 8083 | HTTP | Admin endpoints |
| MongoDB | 27017 | TCP | Database connection |
| Redis | 6379 | TCP | Cache connection |
| Kafka | 9092 | TCP | Message broker |

### Security Requirements

#### SSL Certificates
For production deployments:
- Valid SSL certificate for your domain
- Certificate chain properly configured
- TLS 1.2 or higher

#### Firewall Configuration
```bash
# Ubuntu/Debian UFW example
sudo ufw allow 8080/tcp  # API Gateway
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
```

#### User Permissions
Create a dedicated user for running OpenFrame services:
```bash
sudo useradd -m -s /bin/bash openframe
sudo usermod -aG docker openframe
```

## Environment Variables

Prepare the following environment variables for configuration:

### Required Variables
```bash
# Database connections
MONGO_URI=mongodb://localhost:27017/openframe
REDIS_URI=redis://localhost:6379

# Security
JWT_SECRET=your-secure-jwt-secret-here
ENCRYPTION_KEY=your-32-character-encryption-key

# External integrations
TACTICAL_RMM_URL=https://your-tactical-instance.com
FLEET_MDM_URL=https://your-fleet-instance.com
```

### Optional Variables
```bash
# Email configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password

# Monitoring
GRAFANA_URL=https://your-grafana.com
PROMETHEUS_URL=https://your-prometheus.com
```

## Verification Checklist

Before proceeding to installation, verify all prerequisites:

- [ ] **Java 21** installed and in PATH
- [ ] **Node.js 18+** and npm available
- [ ] **Docker** and Docker Compose working
- [ ] **Maven** available for building
- [ ] **Git** installed for cloning repositories
- [ ] Required **ports available** and not blocked
- [ ] Sufficient **disk space** available (100GB+)
- [ ] **16GB+ RAM** available for services
- [ ] Network connectivity to external services
- [ ] SSL certificates ready (for production)

## Common Issues and Solutions

### Java Version Conflicts
If you have multiple Java versions installed:
```bash
# Set JAVA_HOME explicitly
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64' >> ~/.bashrc
```

### Docker Permissions
If you get permission denied errors with Docker:
```bash
sudo usermod -aG docker $USER
# Log out and back in, or restart your shell
```

### Port Conflicts
If ports are already in use:
```bash
# Check what's using a port
sudo netstat -tulpn | grep :8080
# Stop conflicting services or change OpenFrame ports in configuration
```

## Next Steps

Once all prerequisites are met:

1. **Quick Start**: Try the 5-minute setup for immediate evaluation
2. **Development Setup**: Full local development environment
3. **Production Deployment**: Kubernetes-based production setup

All prerequisites ready? Let's move on to the [Quick Start Guide](quick-start.md)!

---

> **Need Help?** Join our [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance with prerequisites and setup.