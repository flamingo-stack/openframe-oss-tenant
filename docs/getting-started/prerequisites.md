# Prerequisites

Before setting up OpenFrame, ensure your system meets the following requirements and has the necessary software installed.

## System Requirements

### Minimum Hardware Requirements

| Component | Requirement |
|-----------|-------------|
| **CPU** | 4 cores (8 recommended) |
| **RAM** | 8GB (16GB recommended) |
| **Storage** | 20GB free space (SSD recommended) |
| **Network** | Stable internet connection |

### Supported Operating Systems

| Platform | Version | Status |
|----------|---------|---------|
| **macOS** | 11.0+ (Big Sur and later) | ✅ Fully Supported |
| **Linux** | Ubuntu 20.04+, CentOS 7+, Debian 10+ | ✅ Fully Supported |
| **Windows** | Windows 10/11, Windows Server 2019+ | ✅ Fully Supported |

## Required Software

### Java Development Kit (JDK)

OpenFrame services require **Java 21** or later.

**Installation:**

```bash
# macOS (using Homebrew)
brew install openjdk@21

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-21-jdk

# Windows (using Chocolatey)
choco install openjdk21
```

**Verification:**
```bash
java -version
# Should output: openjdk version "21.0.x"
```

### Maven Build Tool

Required for building Java services and libraries.

**Installation:**

```bash
# macOS
brew install maven

# Linux (Ubuntu/Debian)  
sudo apt install maven

# Windows
choco install maven
```

**Verification:**
```bash
mvn -version
# Should output Maven version 3.6.0 or later
```

### Node.js and npm

Required for frontend development and the OpenFrame chat client.

**Installation:**

```bash
# Using Node Version Manager (recommended)
# macOS/Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Windows (using Chocolatey)
choco install nodejs

# Or download from nodejs.org
```

**Verification:**
```bash
node -v    # Should be v18.0.0 or later
npm -v     # Should be 8.0.0 or later
```

### Docker and Docker Compose

Required for running integrated tools and infrastructure services.

**Installation:**

```bash
# macOS
brew install --cask docker

# Linux (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Windows
# Download Docker Desktop from docker.com
```

**Verification:**
```bash
docker --version
docker-compose --version
# Both should return version information
```

### Git

Required for cloning the repository and version control.

**Installation:**

```bash
# macOS
brew install git

# Linux
sudo apt install git

# Windows  
choco install git
```

**Verification:**
```bash
git --version
# Should output Git version 2.30.0 or later
```

## Optional but Recommended

### Rust (for Client Development)

Only required if you plan to work with the OpenFrame Rust client.

**Installation:**

```bash
# All platforms
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

**Verification:**
```bash
rustc --version
cargo --version
```

### IDE Recommendations

| IDE | Best For | Extensions |
|-----|----------|------------|
| **IntelliJ IDEA** | Java development | Spring Boot, GraphQL |
| **VS Code** | Frontend, multi-language | Vue.js, TypeScript, Docker |
| **WebStorm** | Frontend development | Vue.js, TypeScript, GraphQL |

## Account Requirements

### GitHub Access

- **Public Repository**: Read access to `flamingo-stack/openframe-oss-tenant`
- **Optional**: GitHub account for contributing or private forks

### OpenMSP Community

- **Slack Access**: Join the [OpenMSP workspace](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support

## Environment Variables

### Required Environment Variables

Create a `.env` file in your project root with these variables:

```bash
# Core Configuration
OPENFRAME_ENV=development
SPRING_PROFILES_ACTIVE=dev

# Database Configuration  
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your-jwt-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# External Tool Integration (Optional)
TACTICAL_RMM_URL=http://localhost:8000
TACTICAL_RMM_TOKEN=your-tactical-rmm-token

FLEETDM_URL=http://localhost:8080
FLEETDM_TOKEN=your-fleetdm-token
```

### Optional Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=JSON

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Monitoring
PROMETHEUS_ENABLED=true
METRICS_ENDPOINT_ENABLED=true
```

## Network Configuration

### Port Requirements

Ensure these ports are available:

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| **Frontend** | 3000 | HTTP | Vue.js development server |
| **API Gateway** | 8080 | HTTP | Main API gateway |
| **API Service** | 8081 | HTTP | GraphQL API service |
| **Auth Server** | 8082 | HTTP | OAuth2/OIDC server |
| **Management** | 8083 | HTTP | Management service |
| **MongoDB** | 27017 | TCP | Database |
| **Redis** | 6379 | TCP | Cache |
| **Kafka** | 9092 | TCP | Message streaming |

### Firewall Configuration

If using a firewall, ensure these ports are open for local development:

```bash
# Linux (UFW)
sudo ufw allow 3000  # Frontend
sudo ufw allow 8080  # Gateway
sudo ufw allow 8081  # API
sudo ufw allow 8082  # Auth

# macOS (built-in firewall usually allows local traffic)
# Windows Defender Firewall may prompt for access
```

## Verification Checklist

Before proceeding to the Quick Start guide, verify your setup:

- [ ] **Java 21** installed and accessible via `java -version`
- [ ] **Maven** installed and accessible via `mvn -version`  
- [ ] **Node.js 18+** installed and accessible via `node -v`
- [ ] **Docker** installed and running via `docker ps`
- [ ] **Git** installed and accessible via `git --version`
- [ ] **Ports 3000-8083** are available
- [ ] **Internet connection** is stable
- [ ] **.env file** created with basic configuration

## Troubleshooting Common Issues

### Java Version Issues

```bash
# Check which Java version is active
java -version

# On macOS, switch Java versions
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# On Linux, use update-alternatives
sudo update-alternatives --config java
```

### Docker Permission Issues (Linux)

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in, or run:
newgrp docker
```

### Port Conflicts

```bash
# Check what's using a port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process using a port (if safe)
sudo kill -9 <PID>
```

## Next Steps

Once you've verified all prerequisites are met:

1. **Continue to [Quick Start](quick-start.md)** - Get OpenFrame running in 5 minutes
2. **Join the Community** - Connect with other users on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
3. **Review Architecture** - Understand the system design in our development documentation

---

*Having issues with prerequisites? Ask for help in the [OpenMSP Community](https://www.openmsp.ai/) Slack workspace.*