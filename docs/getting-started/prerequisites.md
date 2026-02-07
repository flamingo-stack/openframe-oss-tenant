# Prerequisites for OpenFrame

Before setting up OpenFrame, ensure your development and deployment environment meets the following requirements. This guide covers system requirements, required software, account setup, and environment verification.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores @ 2.0 GHz | 8 cores @ 2.4 GHz |
| **RAM** | 16 GB | 32 GB |
| **Storage** | 50 GB available | 100 GB SSD |
| **Network** | 1 Gbps | 10 Gbps |

### Supported Operating Systems

OpenFrame supports development and deployment on:

- ✅ **macOS**: 11.0 (Big Sur) or later
- ✅ **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- ✅ **Windows**: Windows 10/11, Windows Server 2019+

## Required Software

### Core Development Tools

#### Java Development Kit (JDK)
```bash
# Version required: Java 21+
java -version
# Should output: openjdk version "21.0.x" or later
```

**Installation:**
- **macOS**: `brew install openjdk@21`
- **Linux**: `sudo apt install openjdk-21-jdk` (Ubuntu) or `sudo dnf install java-21-openjdk-devel` (RHEL/CentOS)
- **Windows**: Download from [Oracle JDK 21](https://www.oracle.com/java/technologies/javase/jdk21-archive-downloads.html) or [OpenJDK 21](https://adoptium.net/)

#### Apache Maven
```bash
# Version required: 3.9.0+
mvn -version
# Should output: Apache Maven 3.9.x or later
```

**Installation:**
- **macOS**: `brew install maven`
- **Linux**: `sudo apt install maven` (Ubuntu) or `sudo dnf install maven` (RHEL/CentOS)
- **Windows**: Download from [Maven Downloads](https://maven.apache.org/download.cgi) and add to PATH

#### Node.js and npm
```bash
# Version required: Node.js 18+, npm 9+
node --version  # Should be v18.x.x or later
npm --version   # Should be 9.x.x or later
```

**Installation:**
- **macOS**: `brew install node@18`
- **Linux**: Use [NodeSource repository](https://github.com/nodesource/distributions) 
- **Windows**: Download from [Node.js website](https://nodejs.org/)

#### Docker and Docker Compose
```bash
# Version required: Docker 24.0+, Docker Compose 2.0+
docker --version         # Should be 24.0.x or later
docker compose version   # Should be v2.x.x or later
```

**Installation:**
- **macOS**: `brew install docker docker-compose`
- **Linux**: Follow [Docker Engine installation](https://docs.docker.com/engine/install/)
- **Windows**: Install [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)

### Optional Development Tools

#### Rust Toolchain (for Client Agent Development)
```bash
# Version required: Rust 1.70+
rustc --version    # Should be 1.70.x or later
cargo --version    # Should be 1.70.x or later
```

**Installation:**
```bash
# Install Rust via rustup (all platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

#### Kubernetes CLI (kubectl)
```bash
# Version required: 1.28+
kubectl version --client
```

**Installation:**
- **macOS**: `brew install kubectl`
- **Linux**: Follow [kubectl installation guide](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)
- **Windows**: Follow [kubectl installation guide](https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/)

## Account Requirements

### GitHub Access
You need access to the OpenFrame repositories:

- **Repository**: `flamingo-stack/openframe-oss-tenant`
- **Permissions**: Read access for public repositories, or collaborate access for private ones
- **SSH Keys**: Configure SSH keys for seamless repository access

```bash
# Verify GitHub access
ssh -T git@github.com
# Should output: Hi username! You've successfully authenticated...
```

### Container Registry Access (Optional)
For deployment scenarios:

- **Docker Hub**: Free account for public images
- **GitHub Container Registry**: Included with GitHub account
- **Cloud Provider Registries**: AWS ECR, Azure ACR, or Google GCR

## Environment Variables

Set the following environment variables for development:

### Required Variables

```bash
# Java and build configuration
export JAVA_HOME="/path/to/java21"
export MAVEN_OPTS="-Xmx2g -XX:MaxMetaspaceSize=512m"

# Docker configuration
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

### Optional Variables

```bash
# GitHub token for private repositories
export GITHUB_TOKEN="ghp_xxxxxxxxxx"

# Development mode settings
export SPRING_PROFILES_ACTIVE="local"
export LOG_LEVEL="DEBUG"

# Docker registry settings (if using private registry)
export DOCKER_REGISTRY="your-registry.com"
```

## Database Systems

OpenFrame uses multiple database systems that can be run via Docker Compose:

### MongoDB
```bash
# Version required: 7.0+
# Installed via Docker Compose - no local installation needed
```

### Redis
```bash
# Version required: 7.0+
# Installed via Docker Compose - no local installation needed
```

### Apache Kafka
```bash
# Version required: 3.6.0+
# Installed via Docker Compose - no local installation needed
```

### Apache Cassandra (Optional)
```bash
# Version required: 4.x+
# Used for time-series data - Docker Compose setup available
```

### Apache Pinot (Optional)
```bash
# Version required: 1.2.0+
# Used for analytics - Docker Compose setup available
```

## Network Configuration

### Required Ports

Ensure these ports are available on your development machine:

| Port | Service | Description |
|------|---------|-------------|
| `8080` | Gateway | Main application entry point |
| `8081` | API Service | GraphQL and REST APIs |
| `8082` | Authorization Server | OAuth2/OIDC endpoints |
| `8083` | Management Service | Administrative endpoints |
| `8084` | Stream Service | Kafka stream processing |
| `8085` | Client Service | Agent communication |
| `8086` | External API Service | Third-party integrations |
| `8888` | Config Service | Spring Cloud Config |
| `3000` | Frontend Dev Server | Vue.js development |
| `27017` | MongoDB | Database |
| `6379` | Redis | Caching |
| `9092` | Kafka | Message broker |

### Firewall Configuration

For development, ensure your firewall allows:
- Outbound HTTP/HTTPS connections (ports 80, 443)
- Inbound connections on development ports (3000, 8080-8090)
- Docker network communication

## Verification Commands

Run these commands to verify your environment is ready:

### Basic Tools Verification
```bash
# Check Java version
java -version

# Check Maven version  
mvn -version

# Check Node.js and npm
node --version && npm --version

# Check Docker
docker --version && docker compose version

# Check Git configuration
git config --global user.name
git config --global user.email
```

### Build Tools Test
```bash
# Test Maven execution
mvn help:system | grep "java.version"

# Test npm execution
npm list -g --depth=0

# Test Docker functionality
docker run --rm hello-world
```

### Network Connectivity Test
```bash
# Test GitHub connectivity
ssh -T git@github.com

# Test Docker Hub connectivity
docker pull hello-world

# Test Maven Central connectivity
mvn dependency:resolve-sources -DincludeArtifactIds=spring-boot-starter
```

## IDE Setup (Recommended)

### IntelliJ IDEA
- **Version**: 2023.3 or later
- **Plugins**: Spring Boot, Kubernetes, Docker
- **JDK Configuration**: Set Project SDK to Java 21

### Visual Studio Code
- **Extensions**: 
  - Java Extension Pack
  - Spring Boot Extension Pack
  - Docker
  - Vue.js Extension Pack
  - Rust Analyzer (for client development)

### Eclipse
- **Version**: 2023-12 or later  
- **Plugins**: Spring Tools 4, Docker Tools, TypeScript IDE

## Troubleshooting Common Issues

### Java Version Issues
```bash
# Check available Java versions
# macOS
/usr/libexec/java_home -V

# Linux
alternatives --display java

# Set correct Java version
export JAVA_HOME="/path/to/java21"
```

### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Logout and login again
```

### Port Conflicts
```bash
# Check port usage
lsof -i :8080  # Replace with specific port

# Kill process using port
sudo kill -9 $(lsof -t -i:8080)
```

### Maven Memory Issues
```bash
# Increase Maven heap size
export MAVEN_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1g"
```

## Next Steps

Once your environment meets all prerequisites:

1. **Continue to [Quick Start Guide](quick-start.md)** for a 5-minute setup
2. **Or explore [First Steps](first-steps.md)** for a guided introduction

> 💡 **Tip**: The platform startup scripts (`./scripts/run-mac.sh`, `./scripts/run-linux.sh`) will automatically check most prerequisites and guide you through any missing dependencies.