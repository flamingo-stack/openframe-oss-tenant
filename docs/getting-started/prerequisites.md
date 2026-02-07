# Prerequisites

Before installing OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, required software, and initial setup steps.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8 cores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 50 GB free space | 100 GB free space (SSD preferred) |
| **Network** | 100 Mbps internet | 1 Gbps internet |

### Supported Operating Systems

| Platform | Versions | Notes |
|----------|----------|-------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, CentOS 8+ | Recommended for production |
| **macOS** | macOS 11 (Big Sur) or later | Development environments |
| **Windows** | Windows Server 2019+, Windows 10+ | PowerShell 5.1+ required |

## Required Software

### Core Runtime Dependencies

| Software | Version | Purpose |
|----------|---------|---------|
| **Java** | OpenJDK 21+ | Backend services runtime |
| **Docker** | 20.10+ | Container orchestration |
| **Docker Compose** | v2.0+ | Multi-container deployment |
| **Node.js** | 18+ | Frontend development and build |
| **npm** | 8+ | Frontend package management |

### Database Requirements

| Database | Version | Purpose |
|----------|---------|---------|
| **MongoDB** | 7.0+ | Primary data storage |
| **Redis** | 6.2+ | Caching and session storage |
| **Apache Kafka** | 3.6+ | Event streaming |
| **Cassandra** | 4.0+ (optional) | Time-series data storage |

### Development Tools (Optional)

| Tool | Version | Purpose |
|------|---------|---------|
| **Maven** | 3.8+ | Java build tool |
| **Git** | 2.30+ | Version control |
| **IntelliJ IDEA** | 2023.1+ | Java IDE (recommended) |
| **VS Code** | Latest | Frontend IDE (recommended) |
| **Rust** | 1.70+ | Client agent development |

## Installation Commands

### Java 21 Installation

#### Ubuntu/Debian
```bash
# Install OpenJDK 21
sudo apt update
sudo apt install openjdk-21-jdk

# Verify installation
java -version
```

#### macOS (using Homebrew)
```bash
# Install OpenJDK 21
brew install openjdk@21

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
java -version
```

#### Windows (using Chocolatey)
```powershell
# Install OpenJDK 21
choco install openjdk21

# Verify installation
java -version
```

### Docker Installation

#### Ubuntu/Debian
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker `$USER`

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

#### macOS
```bash
# Download Docker Desktop from https://www.docker.com/products/docker-desktop
# Or install via Homebrew
brew install --cask docker

# Verify installation
docker --version
docker-compose --version
```

#### Windows
```powershell
# Download Docker Desktop from https://www.docker.com/products/docker-desktop
# Or install via Chocolatey
choco install docker-desktop

# Verify installation
docker --version
docker-compose --version
```

### Node.js Installation

#### Ubuntu/Debian
```bash
# Install Node.js 18+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### macOS
```bash
# Install Node.js via Homebrew
brew install node@18

# Verify installation
node --version
npm --version
```

#### Windows
```powershell
# Install Node.js via Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

## Network Requirements

### Required Ports

| Port | Service | Purpose | Access |
|------|---------|---------|--------|
| **8080** | Gateway Service | API Gateway | External |
| **8081** | API Service | GraphQL API | Internal |
| **8082** | Authorization Server | OAuth2/OIDC | Internal |
| **8083** | Management Service | Admin API | Internal |
| **8084** | Stream Service | Stream Processing | Internal |
| **3000** | Frontend | Web UI | External |
| **27017** | MongoDB | Database | Internal |
| **6379** | Redis | Cache | Internal |
| **9092** | Kafka | Message Broker | Internal |

### Firewall Configuration

#### Ubuntu/Debian (ufw)
```bash
# Allow required ports
sudo ufw allow 8080/tcp
sudo ufw allow 3000/tcp
sudo ufw allow ssh

# Enable firewall
sudo ufw enable
```

#### Windows (PowerShell as Administrator)
```powershell
# Allow required ports
New-NetFirewallRule -DisplayName "OpenFrame Gateway" -Direction Inbound -Protocol TCP -LocalPort 8080
New-NetFirewallRule -DisplayName "OpenFrame Frontend" -Direction Inbound -Protocol TCP -LocalPort 3000
```

## Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your-256-bit-secret-key-here
ENCRYPTION_KEY=your-32-character-encryption-key

# OAuth Configuration
OAUTH_CLIENT_ID=openframe-client
OAUTH_CLIENT_SECRET=your-oauth-client-secret

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Service URLs
GATEWAY_URL=http://localhost:8080
API_URL=http://localhost:8081
AUTH_URL=http://localhost:8082
FRONTEND_URL=http://localhost:3000

# External Tool Configuration (Optional)
TACTICAL_RMM_URL=https://your-tactical-rmm-instance.com
MESHCENTRAL_URL=https://your-meshcentral-instance.com
```

## Verification Commands

Run these commands to verify your environment is properly configured:

### Check Java Installation
```bash
java -version
javac -version
echo `$JAVA_HOME`
```

Expected output:
```text
openjdk version "21.0.x" 2023-xx-xx
OpenJDK Runtime Environment (build 21.0.x+xx)
OpenJDK 64-Bit Server VM (build 21.0.x+xx, mixed mode, sharing)
```

### Check Docker Installation
```bash
docker --version
docker-compose --version
docker run hello-world
```

### Check Node.js Installation
```bash
node --version
npm --version
npx --version
```

### Check Database Connectivity
```bash
# MongoDB (if running)
mongo --version

# Redis (if running)
redis-cli ping
```

## Account Requirements

### External Service Accounts (Optional)

If integrating with external MSP tools, you'll need:

| Service | Requirements | Purpose |
|---------|-------------|---------|
| **Tactical RMM** | API credentials, admin access | Device management |
| **MeshCentral** | Server access, user account | Remote access |
| **Fleet MDM** | API key, organization ID | Mobile device management |

### Cloud Provider Accounts (Optional)

For production deployments:

| Provider | Purpose | Notes |
|----------|---------|-------|
| **AWS** | Cloud hosting | EC2, RDS, ElastiCache |
| **Azure** | Cloud hosting | VM, Database, Redis |
| **Google Cloud** | Cloud hosting | Compute Engine, Cloud SQL |
| **DigitalOcean** | Cloud hosting | Droplets, Managed Databases |

## Troubleshooting

### Common Issues

#### Java Version Conflicts
```bash
# Check available Java versions
update-alternatives --list java

# Set default Java version
sudo update-alternatives --config java
```

#### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker `$USER`

# Restart session or run:
newgrp docker
```

#### Port Conflicts
```bash
# Check what's using a port
sudo lsof -i :8080
sudo netstat -tulpn | grep :8080
```

#### Memory Issues
```bash
# Increase Docker memory limits (Docker Desktop)
# Go to Settings > Resources > Memory and increase allocation
```

## Next Steps

Once your environment meets all prerequisites:

1. **[Quick Start Guide](quick-start.md)** - Deploy OpenFrame in 5 minutes
2. **[First Steps](first-steps.md)** - Initial configuration and setup
3. **[Development Environment](../development/setup/environment.md)** - For developers

> **Note**: If you encounter issues during setup, join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support.