# Prerequisites

Before getting started with OpenFrame development, ensure you have the required software and system specifications.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 20 GB free | 50+ GB SSD |
| **Network** | Broadband | High-speed internet |

### Supported Operating Systems

- **macOS** 11+ (Big Sur or later)
- **Linux** (Ubuntu 20.04+, RHEL 8+, Debian 11+)
- **Windows** 10/11 with WSL2

## Required Software

### Core Development Tools

| Software | Version | Purpose | Installation |
|----------|---------|---------|-------------|
| **Java** | 21+ | Backend services | [OpenJDK 21](https://openjdk.org/projects/jdk/21/) |
| **Maven** | 3.8+ | Java build system | [Apache Maven](https://maven.apache.org/install.html) |
| **Node.js** | 18+ | Frontend development | [Node.js](https://nodejs.org/en/download/) |
| **npm** | 9+ | JavaScript package manager | Included with Node.js |
| **Docker** | 20+ | Containerization | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Docker Compose** | 2.0+ | Multi-container orchestration | Included with Docker Desktop |

### Optional but Recommended

| Software | Purpose | Installation |
|----------|---------|-------------|
| **Git** | Version control | [Git Downloads](https://git-scm.com/downloads) |
| **VSCode** | IDE with OpenFrame extensions | [Visual Studio Code](https://code.visualstudio.com/) |
| **IntelliJ IDEA** | Java development | [JetBrains IntelliJ](https://www.jetbrains.com/idea/) |
| **Rust** | Rust client development | [Rustup](https://rustup.rs/) |

## Development Environment Setup

### Java Environment

Verify Java installation:

```bash
java -version
# Should show Java 21 or later

mvn --version
# Should show Maven 3.8 or later
```

### Node.js Environment

Verify Node.js and npm:

```bash
node --version
# Should show v18 or later

npm --version
# Should show v9 or later
```

### Docker Environment

Verify Docker installation:

```bash
docker --version
# Should show version 20 or later

docker-compose --version
# Should show version 2.0 or later
```

Test Docker with a simple container:

```bash
docker run hello-world
```

## Required Services

OpenFrame requires several backing services. These can be run via Docker Compose or as managed services.

### Database Services

| Service | Version | Purpose |
|---------|---------|---------|
| **MongoDB** | 7.x | Primary database |
| **Redis** | 7.x | Caching and sessions |
| **Apache Cassandra** | 4.x | Time-series data |
| **Apache Pinot** | 1.2.0+ | Analytics database |

### Messaging Services

| Service | Version | Purpose |
|---------|---------|---------|
| **Apache Kafka** | 3.6.0+ | Event streaming |
| **NATS** | 2.9+ | Real-time messaging |

### External Tools (Optional)

| Tool | Purpose | Notes |
|------|---------|-------|
| **Fleet MDM** | Device management | For Fleet integration |
| **Tactical RMM** | Remote monitoring | For Tactical RMM integration |
| **MeshCentral** | Remote access | For remote desktop/file management |
| **Authentik** | Identity provider | For SSO integration |

## Environment Variables

Set up your environment with these essential variables:

```bash
# Java environment
export JAVA_HOME=/path/to/java21
export PATH=$JAVA_HOME/bin:$PATH

# Maven settings
export M2_HOME=/path/to/maven
export PATH=$M2_HOME/bin:$PATH

# Docker settings (if needed)
export DOCKER_HOST=unix:///var/run/docker.sock
```

## Network Configuration

### Required Ports

Ensure these ports are available for development:

| Service | Port | Purpose |
|---------|------|---------|
| OpenFrame Gateway | 8080 | Main API gateway |
| OpenFrame API | 8081 | GraphQL API service |
| OpenFrame Frontend | 3000 | Development frontend |
| MongoDB | 27017 | Database |
| Redis | 6379 | Cache |
| Kafka | 9092 | Message broker |
| NATS | 4222 | Real-time messaging |
| Cassandra | 9042 | Time-series database |
| Pinot Controller | 9000 | Analytics |

### Firewall Considerations

For local development, ensure your firewall allows:
- Outbound connections to package repositories
- Inbound connections on development ports
- Docker container networking

## Account Requirements

### GitHub Access
- GitHub account for repository access
- Git configured with your credentials:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Optional External Services
- **Docker Hub** account for pulling container images
- **NPM** registry access for JavaScript packages
- **Maven Central** access for Java dependencies

## Verification Commands

Run these commands to verify your setup:

### Java Stack Verification

```bash
# Verify Java
java -version

# Verify Maven
mvn help:evaluate -Dexpression=maven.version -q -DforceStdout

# Test Maven compilation
mvn clean compile -f /tmp/test-pom.xml || echo "Create a test project first"
```

### Node.js Stack Verification

```bash
# Verify Node.js
node --version

# Verify npm
npm --version

# Test npm installation
npm list -g --depth=0
```

### Docker Stack Verification

```bash
# Verify Docker
docker --version

# Verify Docker Compose
docker compose version

# Test container run
docker run --rm alpine:latest echo "Docker is working"
```

## Troubleshooting Common Issues

### Java Issues

**Problem**: `JAVA_HOME` not set  
**Solution**: 
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk     # Linux
```

**Problem**: Maven out of memory  
**Solution**:
```bash
export MAVEN_OPTS="-Xmx2g -XX:ReservedCodeCacheSize=1g"
```

### Docker Issues

**Problem**: Docker daemon not running  
**Solution**: Start Docker Desktop or run `sudo systemctl start docker`

**Problem**: Permission denied on Linux  
**Solution**: Add user to docker group:
```bash
sudo usermod -aG docker $USER
# Then logout and login again
```

### Port Conflicts

**Problem**: Port already in use  
**Solution**: Find and kill the process:
```bash
# macOS/Linux
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

## Next Steps

Once you've verified all prerequisites are installed:

1. ✅ [Quick Start Guide](quick-start.md) - Get OpenFrame running quickly
2. 📚 [Development Setup](../development/setup/environment.md) - Detailed development environment configuration
3. 🏗️ [Architecture Overview](../development/architecture/README.md) - Understand the system architecture

---

Having trouble with prerequisites? Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for help!