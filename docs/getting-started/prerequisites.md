# Prerequisites

This guide outlines the system requirements, software dependencies, and environment setup needed to deploy and develop with OpenFrame.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8 cores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 50 GB SSD | 100 GB SSD |
| **Network** | 1 Gbps | 10 Gbps |

### Operating System Support

OpenFrame supports the following operating systems:

| OS Category | Supported Versions |
|-------------|-------------------|
| **Linux** | Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+ |
| **macOS** | macOS 12.0+ (Monterey) |
| **Windows** | Windows 10, Windows 11, Windows Server 2019+ |

[![OpenFrame v0.5.10: macOS Feature Parity & Platform Stability](https://img.youtube.com/vi/LFYLUtzag98/maxresdefault.jpg)](https://www.youtube.com/watch?v=LFYLUtzag98)

## Required Software Dependencies

### Core Runtime Requirements

#### Java Development Kit (JDK)

**Required Version**: Java 21 or higher

**Installation:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

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

#### Node.js & NPM

**Required Version**: Node.js 18+ and NPM 9+

**Installation:**
```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

#### Rust Toolchain

**Required for**: OpenFrame client agent development

**Installation:**
```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`

# Verify installation
rustc --version
cargo --version
```

### Build Tools

#### Apache Maven

**Required Version**: Maven 3.8+

**Installation:**
```bash
# Ubuntu/Debian  
sudo apt install maven

# macOS
brew install maven

# Windows
choco install maven

# Verify
mvn --version
```

#### Docker & Docker Compose

**Required Version**: Docker 24.0+, Docker Compose 2.0+

**Installation:**
```bash
# Ubuntu/Debian
sudo apt install docker.io docker-compose-plugin

# macOS/Windows: Download Docker Desktop
# https://www.docker.com/products/docker-desktop/
```

**Verification:**
```bash
docker --version
docker compose version
```

## Infrastructure Dependencies

### Data Storage

OpenFrame requires the following data stores for full functionality:

| Service | Version | Purpose |
|---------|---------|---------|
| **MongoDB** | 7.0+ | Primary data persistence |
| **Redis** | 7.0+ | Caching and sessions |
| **Apache Cassandra** | 4.1+ | Time-series event storage |
| **Apache Kafka** | 3.6+ | Event streaming |
| **Apache Pinot** | 1.2+ | Analytics and reporting |

### Message Queuing

| Service | Version | Purpose |
|---------|---------|---------|
| **NATS JetStream** | 2.10+ | Agent communication |

## Environment Variables

### Required Environment Variables

Create these environment variables before starting the services:

```bash
# Database Configuration
export MONGODB_URI="mongodb://localhost:27017/openframe"
export REDIS_URL="redis://localhost:6379"
export CASSANDRA_HOSTS="localhost"

# Kafka Configuration
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# NATS Configuration  
export NATS_URL="nats://localhost:4222"

# Security Configuration
export JWT_SECRET="your-256-bit-secret-key-here"
export ENCRYPTION_KEY="your-aes-256-encryption-key"

# Application Configuration
export OPENFRAME_ENV="development"
export LOG_LEVEL="INFO"
```

### Optional Configuration

```bash
# OAuth2 / SSO Configuration (optional)
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export MICROSOFT_CLIENT_ID="your-microsoft-client-id"
export MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# External Tool Integration (optional)
export TACTICAL_RMM_URL="https://your-tactical-rmm.com"
export TACTICAL_RMM_TOKEN="your-tactical-rmm-token"
export MESHCENTRAL_URL="https://your-meshcentral.com"
export FLEET_MDM_URL="https://your-fleet-mdm.com"
```

## Network Requirements

### Port Configuration

Ensure the following ports are available:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **OpenFrame Gateway** | 8080 | HTTP | API Gateway |
| **OpenFrame API** | 8081 | HTTP | GraphQL/REST API |
| **OpenFrame Frontend** | 3000 | HTTP | Web Interface |
| **Authorization Server** | 8082 | HTTP | OAuth2 Endpoints |
| **MongoDB** | 27017 | TCP | Database |
| **Redis** | 6379 | TCP | Cache |
| **Kafka** | 9092 | TCP | Message Broker |
| **NATS** | 4222 | TCP | Agent Communication |
| **Cassandra** | 9042 | TCP | Analytics DB |

### Firewall Configuration

If using a firewall, allow inbound connections on the required ports:

```bash
# Ubuntu UFW example
sudo ufw allow 8080  # Gateway
sudo ufw allow 3000  # Frontend
sudo ufw allow 27017 # MongoDB
sudo ufw allow 6379  # Redis
sudo ufw allow 9092  # Kafka
sudo ufw allow 4222  # NATS
```

## Development Tools (Optional)

### Recommended IDEs

| Tool | Purpose |
|------|---------|
| **IntelliJ IDEA** | Java development with Spring Boot support |
| **VS Code** | Frontend development, Rust development |
| **DataGrip** | Database management |

### Database Management Tools

| Tool | Purpose |
|------|---------|  
| **MongoDB Compass** | MongoDB administration |
| **RedisInsight** | Redis monitoring |
| **Cassandra Desktop** | Cassandra management |

## Account Requirements

### Service Accounts (Optional)

For full functionality, you may need accounts with:

| Service | Purpose |
|---------|---------|
| **Google Cloud Console** | Google SSO integration |
| **Microsoft Entra ID** | Microsoft SSO integration |
| **GitHub** | Source code access and CI/CD |

## Verification Checklist

Before proceeding to the Quick Start guide, verify your setup:

```bash
# ✅ Java Installation
java -version

# ✅ Node.js Installation  
node --version && npm --version

# ✅ Rust Installation
rustc --version && cargo --version

# ✅ Maven Installation
mvn --version

# ✅ Docker Installation
docker --version && docker compose version

# ✅ Environment Variables
echo `$MONGODB_URI`
echo `$REDIS_URL`
echo `$KAFKA_BOOTSTRAP_SERVERS`
```

All commands should return version information without errors.

## Troubleshooting Common Issues

### Java Version Issues
If you have multiple Java versions installed:
```bash
# Check available versions
update-alternatives --list java  # Linux
/usr/libexec/java_home -V        # macOS

# Set JAVA_HOME explicitly
export JAVA_HOME=/path/to/java-21
```

### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker `$USER`
# Logout and login again
```

### Port Conflicts
Check if required ports are already in use:
```bash
# Linux/macOS
netstat -tulpn | grep :8080

# Windows
netstat -an | findstr :8080
```

---

**Next Steps**: With prerequisites satisfied, you're ready for the [Quick Start Guide](quick-start.md) to get OpenFrame running in 5 minutes!