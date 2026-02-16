# Prerequisites Guide

Before setting up OpenFrame, ensure your system meets the following requirements and has the necessary software installed.

## System Requirements

### Minimum Hardware Requirements

| Component | Requirement | Recommended |
|-----------|-------------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB free space | 100+ GB SSD |
| **Network** | Broadband internet | High-speed connection |

### Supported Operating Systems

| OS | Versions | Notes |
|----|---------| ------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, CentOS 8+ | Recommended for production |
| **macOS** | 11.0+ (Big Sur and later) | Great for development |
| **Windows** | 10/11 with WSL2 | Requires Windows Subsystem for Linux |

> **💡 Production Note**: Linux distributions are strongly recommended for production deployments due to better container performance and security.

## Required Software

### Core Development Tools

| Tool | Version | Purpose | Installation |
|------|---------|---------|--------------|
| **Java** | 21+ | Backend services | [OpenJDK 21](https://openjdk.org/projects/jdk/21/) |
| **Maven** | 3.8+ | Build tool | [Apache Maven](https://maven.apache.org/download.cgi) |
| **Node.js** | 18+ | Frontend development | [Node.js](https://nodejs.org/) |
| **Git** | 2.30+ | Version control | [Git SCM](https://git-scm.com/) |

### Backend Infrastructure

| Service | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **MongoDB** | 6.0+ | Primary database | Community edition sufficient |
| **Apache Kafka** | 3.6+ | Stream processing | Requires ZooKeeper |
| **Redis** | 6.0+ | Caching layer | Optional for development |
| **Apache Pinot** | 1.2+ | Analytics | Optional for development |

### Development Environment Tools

| Tool | Version | Purpose | Required For |
|------|---------|---------|-------------|
| **Docker** | 20.10+ | Containerization | Infrastructure setup |
| **Docker Compose** | 2.0+ | Multi-container orchestration | Local development |
| **mkcert** | 1.4+ | Local HTTPS certificates | Client authentication |
| **curl** | 7.68+ | API testing | Development scripts |
| **jq** | 1.6+ | JSON processing | Development scripts |

## Environment Variables

Set up the following environment variables for development:

### Required Variables

```bash
# Java Development
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=$PATH:$JAVA_HOME/bin

# Maven
export M2_HOME=/usr/share/maven
export PATH=$PATH:$M2_HOME/bin

# Node.js
export NODE_ENV=development

# OpenFrame Configuration
export OPENFRAME_ENV=development
export OPENFRAME_LOG_LEVEL=debug
```

### Database Connection Variables

```bash
# MongoDB
export MONGODB_URI=mongodb://localhost:27017/openframe
export MONGODB_DATABASE=openframe

# Redis (Optional for development)
export REDIS_URL=redis://localhost:6379

# Kafka
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

### Platform-Specific Paths

#### macOS
```bash
# Application data directory
export OPENFRAME_DATA_DIR="$HOME/Library/Application Support/OpenFrame"

# Logs directory
export OPENFRAME_LOGS_DIR="$HOME/Library/Logs/OpenFrame"
```

#### Linux
```bash
# Application data directory
export OPENFRAME_DATA_DIR="$HOME/.config/openframe"

# Logs directory
export OPENFRAME_LOGS_DIR="$HOME/.local/share/openframe/logs"
```

#### Windows (WSL2)
```bash
# Application data directory
export OPENFRAME_DATA_DIR="/mnt/c/Users/$USER/AppData/Roaming/OpenFrame"

# Logs directory
export OPENFRAME_LOGS_DIR="/mnt/c/Users/$USER/AppData/Local/OpenFrame/logs"
```

## Account & Access Requirements

### GitHub Access
- **Personal Access Token**: Required for cloning dependencies
- **Permissions**: `repo` scope for private repositories
- **SSH Key**: Recommended for secure repository access

### Optional External Services
- **Google Cloud**: For Google SSO integration
- **Microsoft Azure**: For Microsoft SSO integration
- **HubSpot**: For email notification service (optional)
- **Anthropic**: For AI features (Claude API key)

## Installation Verification

### Java & Maven Verification
```bash
# Check Java version
java -version

# Expected output: openjdk version "21..." or later

# Check Maven version
mvn -version

# Expected output: Apache Maven 3.8.0 or later
```

### Node.js Verification
```bash
# Check Node.js version
node --version

# Expected output: v18.0.0 or later

# Check npm version
npm --version

# Expected output: 8.0.0 or later
```

### Docker Verification
```bash
# Check Docker version
docker --version

# Expected output: Docker version 20.10.0 or later

# Check Docker Compose version
docker-compose --version

# Expected output: Docker Compose version 2.0.0 or later
```

### Development Tools Verification
```bash
# Check mkcert installation
mkcert -version

# Check curl
curl --version

# Check jq
jq --version

# Check git
git --version
```

## Infrastructure Setup Options

Choose one of the following infrastructure setup methods:

### Option 1: Local Development (Recommended)
- Install MongoDB, Kafka, and Redis locally
- Use Docker containers for isolated services
- Suitable for feature development and testing

### Option 2: Docker Compose
- All infrastructure services in containers
- Easy to start/stop complete environment
- Good for integration testing

### Option 3: Cloud Infrastructure
- Use cloud-managed services (MongoDB Atlas, Confluent Cloud)
- Recommended for production-like testing
- Requires cloud provider credentials

## Network Requirements

### Ports Used by OpenFrame Services

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Gateway | 8080 | HTTP/HTTPS | Main entry point |
| API Service | 8081 | HTTP | Internal API |
| Auth Server | 8082 | HTTP | OAuth2/OIDC |
| External API | 8083 | HTTP | Public API |
| Management | 8084 | HTTP | Admin operations |
| Stream Service | 8085 | HTTP | Stream processing |
| Config Server | 8888 | HTTP | Configuration |
| Client Service | 8086 | HTTP | Client operations |

### External Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| MongoDB | 27017 | Primary database |
| Kafka | 9092 | Message streaming |
| ZooKeeper | 2181 | Kafka coordination |
| Redis | 6379 | Caching |
| Pinot | 8000 | Analytics queries |

## Security Considerations

### TLS/SSL Setup
- **mkcert**: Required for local HTTPS development
- **Certificates**: Auto-generated for `localhost`
- **Root CA**: Installed in system trust store

### Firewall Configuration
Ensure the following ports are accessible:
```bash
# Allow OpenFrame services
sudo ufw allow 8080:8088/tcp

# Allow infrastructure services (if running locally)
sudo ufw allow 27017/tcp  # MongoDB
sudo ufw allow 9092/tcp   # Kafka
sudo ufw allow 6379/tcp   # Redis
```

## Common Issues & Solutions

### Java Version Conflicts
If multiple Java versions are installed:
```bash
# List available versions (Ubuntu/Debian)
update-alternatives --list java

# Set Java 21 as default
sudo update-alternatives --config java

# Verify JAVA_HOME
echo $JAVA_HOME
```

### MongoDB Connection Issues
```bash
# Check MongoDB service status
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# Test connection
mongosh --eval "db.runCommand('ping')"
```

### Port Conflicts
```bash
# Check what's using a port
lsof -i :8080

# Kill process if needed
kill -9 <PID>
```

## Next Steps

Once your environment meets all prerequisites:

1. ✅ **Verified all software versions** 
2. ✅ **Set up environment variables**
3. ✅ **Configured development tools**

You're ready for the [Quick Start Guide](quick-start.md)!

## Need Help?

- **Community Support**: Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Visit [openframe.ai](https://openframe.ai)
- **Issues**: Use GitHub Issues for bug reports

> **⚠️ Important**: OpenFrame manages all project coordination through our OpenMSP Slack community rather than GitHub Issues or Discussions. Join the Slack workspace for support, feature requests, and community discussions.