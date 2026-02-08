# Prerequisites

Before installing OpenFrame, ensure your environment meets the following requirements. This guide covers both development and production deployment prerequisites.

## System Requirements

### Minimum Hardware Specifications

| Component | Development | Production |
|-----------|-------------|------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB available | 200+ GB available |
| **Network** | Broadband internet | High-speed internet with low latency |

### Supported Operating Systems

| Platform | Versions | Notes |
|----------|----------|--------|
| **Linux** | Ubuntu 20.04+, CentOS 8+, RHEL 8+ | Recommended for production |
| **macOS** | 11.0+ (Big Sur) | Development and testing |
| **Windows** | Windows 10/11, Server 2019+ | PowerShell 5.1+ required |

## Required Software

### Development Environment

#### 1. Java Development Kit (JDK)

OpenFrame requires Java 21 or later:

```bash
# Check current Java version
java -version

# Expected output (Java 21+):
# openjdk version "21.0.0" 2023-09-19
```

**Installation:**

- **macOS**: `brew install openjdk@21`
- **Linux**: `sudo apt install openjdk-21-jdk` (Ubuntu) or `sudo yum install java-21-openjdk-devel` (CentOS)
- **Windows**: Download from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptium.net/)

#### 2. Apache Maven

Build automation tool for Java projects:

```bash
# Check Maven installation
mvn -version

# Expected output:
# Apache Maven 3.9.0+
```

**Installation:**

- **macOS**: `brew install maven`
- **Linux**: `sudo apt install maven` or `sudo yum install maven`
- **Windows**: Download from [Maven website](https://maven.apache.org/download.cgi)

#### 3. Node.js and npm

For frontend development:

```bash
# Check Node.js version (18.0+ required)
node --version

# Check npm version
npm --version
```

**Installation:**

- **All platforms**: Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- **macOS**: `brew install node`
- **Linux**: `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs`

#### 4. Rust (for client agent development)

```bash
# Check Rust installation
rustc --version

# Expected output:
# rustc 1.70.0+
```

**Installation:**

```bash
# Install Rust via rustup (all platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Infrastructure Components

#### 1. Docker & Docker Compose

For running integrated tools and databases:

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version
```

**Installation:**

- **macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: 
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker `$USER`
  ```
- **Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

#### 2. Git

Version control system:

```bash
# Check Git version
git --version
```

**Installation:**

- **macOS**: `brew install git` or Xcode Command Line Tools
- **Linux**: `sudo apt install git` or `sudo yum install git`
- **Windows**: [Git for Windows](https://gitforwindows.org/)

## Database Requirements

### Development (Docker-based)

OpenFrame includes Docker Compose configurations for all required databases:

- **MongoDB** 7.x
- **Apache Cassandra** 4.x
- **Apache Kafka** 3.6+
- **Redis** 7.x

No separate installation required for development.

### Production

For production deployments, provision these services:

| Service | Version | Purpose |
|---------|---------|---------|
| **MongoDB** | 7.0+ | Primary data store |
| **Cassandra** | 4.1+ | Time-series and audit logs |
| **Apache Kafka** | 3.6+ | Event streaming |
| **Redis** | 7.0+ | Caching and sessions |
| **Apache Pinot** | 1.2+ | Analytics and aggregation |

## External Tool Integration

OpenFrame integrates with these MSP tools (optional but recommended):

### Tactical RMM

- **Purpose**: Remote monitoring and management
- **Requirements**: Tactical RMM v0.17+
- **Installation**: Included in `integrated-tools/tactical-rmm/`

### MeshCentral

- **Purpose**: Remote desktop and file management
- **Requirements**: MeshCentral v1.1+
- **Installation**: Included in `integrated-tools/meshcentral/`

### Fleet MDM

- **Purpose**: Device lifecycle management
- **Requirements**: Fleet v4.30+
- **Installation**: Included in `integrated-tools/fleetmdm/`

### Authentik

- **Purpose**: Identity and access management
- **Requirements**: Authentik v2023+
- **Installation**: Included in `integrated-tools/authentik/`

## Network Configuration

### Required Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Gateway** | 8080 | HTTP/HTTPS | Main application access |
| **API Service** | 8081 | HTTP | Internal API |
| **Authorization** | 8082 | HTTP | OAuth/OIDC flows |
| **Frontend** | 3000 | HTTP | Development server |
| **MongoDB** | 27017 | TCP | Database connection |
| **Kafka** | 9092 | TCP | Event streaming |
| **Redis** | 6379 | TCP | Cache access |

### Firewall Considerations

For production deployments:

- Allow inbound HTTPS (443) for web access
- Allow agent communication (varies by tool)
- Restrict database ports to application servers only

## Environment Variables

Create a `.env` file in your project root with these required variables:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
REDIS_URL=redis://localhost:6379

# Security Configuration
JWT_SECRET=your-jwt-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# External Tool Configuration (optional)
TACTICAL_RMM_URL=http://localhost:8000
MESHCENTRAL_URL=http://localhost:4430
FLEET_URL=http://localhost:8412
AUTHENTIK_URL=http://localhost:9000
```

## Verification Commands

Run these commands to verify your environment is ready:

### Java & Maven

```bash
# Check Java version (should be 21+)
java -version

# Check Maven version (should be 3.9+)
mvn -version

# Test Maven compilation
mvn clean compile -DskipTests
```

### Node.js & Frontend

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Test frontend dependencies
cd openframe/services/openframe-frontend
npm install
```

### Rust (if developing client agent)

```bash
# Check Rust version (should be 1.70+)
rustc --version

# Test Rust compilation
cd clients/openframe-client
cargo check
```

### Docker Services

```bash
# Start required services
docker compose -f integrated-tools/docker-compose.yml up -d

# Verify services are running
docker compose ps

# Check service health
docker compose logs mongodb
```

## Troubleshooting Common Issues

### Java Version Issues

**Problem**: `JAVA_HOME` not set or pointing to wrong version

**Solution**:
```bash
# Find Java installation
find /usr -name "java" -type f 2>/dev/null | grep bin

# Set JAVA_HOME (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME=/path/to/java-21
export PATH=`$JAVA_HOME/bin:$PATH`
```

### Docker Permission Issues (Linux)

**Problem**: Docker commands require sudo

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker `$USER`

# Log out and back in, or restart terminal
```

### Port Conflicts

**Problem**: Required ports already in use

**Solution**:
```bash
# Check what's using a port
lsof -i :8080

# Kill process using the port
kill -9 <PID>

# Or configure OpenFrame to use different ports
```

### Memory Issues

**Problem**: Out of memory errors during build

**Solution**:
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=512m"

# Or add to ~/.mavenrc
echo 'export MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=512m"' >> ~/.mavenrc
```

## Next Steps

Once your environment meets all prerequisites:

1. **Quick Start**: Try the 5-minute setup guide
2. **First Steps**: Explore key OpenFrame features  
3. **Development Setup**: Configure your development environment

All prerequisites met? You're ready to install OpenFrame!

---

> **Need Help?** Join our OpenMSP Slack community for assistance: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA