# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, required software, and account setup needed for a successful OpenFrame deployment.

## System Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 cores | 8 cores |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 50 GB SSD | 100 GB SSD |
| **Network** | 1 Gbps | 10 Gbps |

### Supported Operating Systems

| OS | Versions | Notes |
|----|----------|-------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, CentOS 8+ | Primary development platform |
| **macOS** | macOS 11+ (Big Sur) | Full development support |
| **Windows** | Windows 10/11, Windows Server 2019+ | PowerShell 7+ required |

## Required Software

### Core Dependencies

| Software | Version | Purpose | Installation |
|----------|---------|---------|-------------|
| **Java JDK** | 21+ | Backend services | `sdk install java 21.0.1-oracle` |
| **Maven** | 3.9+ | Java build tool | `brew install maven` |
| **Node.js** | 18+ | Frontend build | `nvm install 18` |
| **Docker** | 24+ | Containerization | [docker.com](https://docker.com) |
| **Docker Compose** | 2.0+ | Multi-container orchestration | Included with Docker |

### Database Requirements

| Database | Version | Purpose | Deployment |
|----------|---------|---------|-----------|
| **MongoDB** | 7.x | Primary data store | Docker Compose |
| **Cassandra** | 4.x | Analytics data | Docker Compose |
| **Redis** | 7.x | Caching & sessions | Docker Compose |
| **Apache Pinot** | 1.2.0+ | Real-time analytics | Docker Compose |

### Message Brokers

| Service | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **Apache Kafka** | 3.6.0+ | Event streaming | Auto-configured |
| **NATS** | 2.x | Real-time messaging | For client agents |

### Development Tools (Optional)

| Tool | Purpose | Installation |
|------|---------|-------------|
| **IntelliJ IDEA** | Java development | [jetbrains.com](https://jetbrains.com) |
| **VS Code** | Frontend development | [code.visualstudio.com](https://code.visualstudio.com) |
| **Rust** | Client agent development | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

## Environment Variables

Set these environment variables before starting OpenFrame:

### Essential Variables

```bash
# Database Configuration
export MONGO_HOST=localhost
export MONGO_PORT=27017
export CASSANDRA_HOST=localhost
export CASSANDRA_PORT=9042
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Kafka Configuration
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Application Configuration
export OPENFRAME_ENV=development
export LOG_LEVEL=INFO

# Security
export JWT_SECRET_KEY="your-super-secure-secret-key-here"
export ENCRYPTION_KEY="your-aes-256-encryption-key-here"
```

### Platform-Specific Setup

#### macOS
```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home)' >> ~/.zshrc
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Linux
```bash
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk' >> ~/.bashrc
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Windows (PowerShell)
```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "User")
[Environment]::SetEnvironmentVariable("PATH", "$env:PATH;C:\Program Files\nodejs", "User")
```

## Account Requirements

### Required Accounts

| Service | Purpose | Required For |
|---------|---------|-------------|
| **Docker Hub** | Container images | All deployments |
| **GitHub** | Source code access | Development |

### Optional but Recommended

| Service | Purpose | When Needed |
|---------|---------|-------------|
| **Google Cloud** | OAuth provider setup | SSO integration |
| **Microsoft Azure** | OAuth provider setup | SSO integration |
| **HubSpot** | Email notifications | Production deployment |
| **OpenMSP Slack** | Community support | Getting help |

## Port Requirements

Ensure these ports are available on your system:

### Core Services

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Gateway** | 8080 | HTTP/WebSocket | Main entry point |
| **API Service** | 8081 | HTTP | Internal API |
| **Frontend** | 3000 | HTTP | Development UI |
| **Authorization** | 8082 | HTTP | OAuth/OIDC |

### Data Services

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **MongoDB** | 27017 | TCP | Document storage |
| **Cassandra** | 9042 | TCP | Analytics data |
| **Redis** | 6379 | TCP | Caching |
| **Kafka** | 9092 | TCP | Event streaming |
| **Pinot** | 9000 | HTTP | Query interface |

## Verification Commands

Run these commands to verify your environment is ready:

### Java & Build Tools
```bash
java -version                    # Should show Java 21+
mvn -version                     # Should show Maven 3.9+
node -v                          # Should show Node 18+
npm -v                           # Should show npm 9+
```

### Docker Environment
```bash
docker --version                 # Should show Docker 24+
docker-compose --version         # Should show Compose 2.0+
docker run hello-world           # Should complete successfully
```

### Network Connectivity
```bash
# Test port availability
netstat -tuln | grep :8080       # Should be empty (port available)
netstat -tuln | grep :27017      # Should be empty (port available)
netstat -tuln | grep :9092       # Should be empty (port available)
```

### Memory and Storage
```bash
# Linux/macOS
free -h                          # Check available memory
df -h                           # Check disk space

# Windows PowerShell
Get-WmiObject -Class Win32_ComputerSystem | Select-Object TotalPhysicalMemory
Get-WmiObject -Class Win32_LogicalDisk | Select-Object Size,FreeSpace
```

## Common Issues & Solutions

### Java Version Issues
```bash
# If wrong Java version is active
sdk list java
sdk use java 21.0.1-oracle
```

### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Port Conflicts
```bash
# Find process using port 8080
lsof -i :8080
# Kill process if needed
kill -9 <PID>
```

### Memory Issues
```bash
# Increase Docker memory limit (Docker Desktop)
# Go to Docker Desktop > Settings > Resources > Memory
# Increase to at least 8GB
```

## Next Steps

Once all prerequisites are met:

1. **Quick Start**: Jump to [Quick Start Guide](quick-start.md) for 5-minute setup
2. **Development**: Set up [Development Environment](../development/setup/environment.md) for contributing
3. **Architecture**: Review [Architecture Overview](../development/architecture/overview.md) for deeper understanding

> **Tip**: Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help with any setup issues!