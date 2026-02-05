# Prerequisites

Before setting up OpenFrame, ensure your development environment meets these requirements. OpenFrame is a distributed microservices platform with specific dependencies for optimal performance.

## System Requirements

### Hardware Requirements

| Component | Minimum | Recommended | 
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB | 100+ GB SSD |
| **Network** | Broadband internet | Stable high-speed connection |

> **Note**: These requirements are for development environments. Production deployments will need significantly more resources based on tenant load and data volume.

### Operating System Support

OpenFrame supports development on:

- ✅ **macOS** 12.0+ (Intel and Apple Silicon)
- ✅ **Linux** (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- ✅ **Windows** 10/11 with WSL2 or native PowerShell

## Required Software

### Core Development Tools

#### Java Development Kit (JDK) 21

OpenFrame requires **Java 21** for all backend services.

```bash
# Verify Java version
java -version

# Expected output should show version 21
# Example: openjdk version "21.0.1" 2023-10-17
```

**Installation:**
- **macOS**: `brew install openjdk@21` or download from [Adoptium](https://adoptium.net/)
- **Linux**: `sudo apt install openjdk-21-jdk` (Ubuntu/Debian) or `sudo yum install java-21-openjdk` (RHEL/CentOS)
- **Windows**: Download from [Adoptium](https://adoptium.net/) or use Windows Package Manager: `winget install EclipseAdoptium.Temurin.21.JDK`

#### Apache Maven 3.9+

Maven is used for building all Java services and managing dependencies.

```bash
# Verify Maven version
mvn -version

# Expected: Apache Maven 3.9.0 or higher
```

**Installation:**
- **macOS**: `brew install maven`
- **Linux**: `sudo apt install maven` (Ubuntu/Debian) or `sudo yum install maven` (RHEL/CentOS)
- **Windows**: Download from [Maven website](https://maven.apache.org/download.cgi) or `winget install Apache.Maven`

#### Node.js 18+ and npm

Required for the Vue.js frontend and development tooling.

```bash
# Verify Node.js version
node --version

# Expected: v18.0.0 or higher
npm --version
```

**Installation:**
- **macOS**: `brew install node@18`
- **Linux**: Use [NodeSource repository](https://github.com/nodesource/distributions) or `nvm`
- **Windows**: Download from [nodejs.org](https://nodejs.org/) or `winget install OpenJS.NodeJS`

#### Rust and Cargo

Required for building the OpenFrame client agent.

```bash
# Verify Rust installation
rustc --version
cargo --version
```

**Installation:**
```bash
# Install Rust via rustup (all platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`
```

### Container and Orchestration

#### Docker Desktop

OpenFrame uses Docker for containerized services and development environments.

```bash
# Verify Docker installation
docker --version
docker compose version

# Expected: Docker version 24.0+ and Docker Compose v2.0+
```

**Installation:**
- **macOS/Windows**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Linux**: Follow [Docker Engine installation guide](https://docs.docker.com/engine/install/)

**Required Docker Configuration:**
- **Memory**: At least 6GB allocated to Docker
- **Disk Space**: At least 50GB available
- **Enable Kubernetes** (optional, for local K8s development)

#### Kubernetes CLI (kubectl) - Optional

For production deployment and Kubernetes development:

```bash
# Verify kubectl
kubectl version --client
```

**Installation:**
- **macOS**: `brew install kubectl`
- **Linux**: Follow [Kubernetes documentation](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)
- **Windows**: `winget install Kubernetes.kubectl`

## Database Dependencies

OpenFrame requires several databases for full functionality. These can be run via Docker Compose for development.

### Required Databases

| Database | Purpose | Minimum Version |
|----------|---------|-----------------|
| **MongoDB** | Primary document store | 7.0+ |
| **Apache Kafka** | Event streaming | 3.6.0+ |
| **Redis** | Caching and sessions | 7.0+ |
| **Apache Cassandra** | Time-series data | 4.0+ |
| **Apache Pinot** | Real-time analytics | 1.2.0+ |

> **Development Note**: All databases are provided via Docker Compose configurations. No manual installation required for development environments.

## Development Tools (Recommended)

### IDE and Editors

#### IntelliJ IDEA (Recommended for Java)

- **Community Edition** (free) or **Ultimate Edition**
- **Required Plugins**: Spring Boot, Maven, Lombok
- **JDK Configuration**: Point to Java 21 installation

#### Visual Studio Code

Excellent for frontend development and lightweight Java editing:

**Required Extensions:**
- Extension Pack for Java
- Vetur or Volar (Vue.js support)
- TypeScript and JavaScript Language Features
- Docker
- Kubernetes (if doing K8s work)

### Git Configuration

Ensure Git is properly configured for development:

```bash
# Verify Git installation
git --version

# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"
```

## Network and Security Requirements

### Ports Used by OpenFrame

Ensure these ports are available on your development machine:

| Service | Port | Purpose |
|---------|------|---------|
| **API Gateway** | 8080 | Main API entry point |
| **Frontend Dev Server** | 3000 | Vue.js development server |
| **Authorization Server** | 8081 | OAuth2/OIDC provider |
| **API Service** | 8082 | GraphQL and REST APIs |
| **Management Service** | 8083 | Platform management |
| **MongoDB** | 27017 | Database connection |
| **Kafka** | 9092 | Message broker |
| **Redis** | 6379 | Cache and sessions |
| **Cassandra** | 9042 | Time-series database |

### Firewall Configuration

- Allow outbound HTTPS (443) for dependency downloads
- Allow Docker container networking
- Ensure localhost connections are permitted

## Environment Variables

Create these environment variables for development:

```bash
# Java and Maven
export JAVA_HOME=/path/to/java21
export MAVEN_HOME=/path/to/maven
export PATH=`$JAVA_HOME/bin:`$MAVEN_HOME/bin:`$PATH`

# Node.js (if using nvm)
export NODE_VERSION=18

# Docker and Kubernetes
export DOCKER_HOST=unix:///var/run/docker.sock
```

## Verification Commands

Run these commands to verify your environment is ready:

```bash
# Java Development Stack
java -version                    # Should show Java 21
mvn -version                     # Should show Maven 3.9+
node --version                   # Should show Node.js 18+
npm --version                    # Should show npm 8+

# Rust Development
rustc --version                  # Should show Rust 1.70+
cargo --version                 # Should show Cargo 1.70+

# Container Platform
docker --version                 # Should show Docker 24.0+
docker compose version          # Should show Compose v2.0+

# Git and Tools
git --version                    # Should show Git 2.30+

# Test Docker functionality
docker run hello-world          # Should complete successfully
```

## Account Requirements

### Development Accounts

For full OpenFrame development, you may need:

| Service | Purpose | Required |
|---------|---------|----------|
| **GitHub** | Source code access | Yes |
| **Docker Hub** | Container image pulls | Recommended |
| **OpenMSP Slack** | Community support | Recommended |

### OpenMSP Community Access

Join our Slack community for support and discussions:

🔗 **Slack Invite**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> **Important**: We don't use GitHub Issues or Discussions. All support happens in our OpenMSP Slack community.

## Troubleshooting Common Issues

### Java Version Conflicts

If you have multiple Java versions installed:

```bash
# macOS - use jenv for Java version management
brew install jenv
jenv add /path/to/java21
jenv global 21

# Linux - use update-alternatives
sudo update-alternatives --config java

# Windows - set JAVA_HOME in Environment Variables
```

### Docker Memory Issues

If you encounter out-of-memory errors:

1. Increase Docker Desktop memory allocation to 8GB+
2. For Linux, ensure sufficient swap space is available
3. Close unnecessary applications during development

### Port Conflicts

If ports are already in use:

```bash
# Find what's using a port (macOS/Linux)
lsof -i :8080

# Windows
netstat -ano | findstr :8080

# Kill process or change OpenFrame port configuration
```

## Next Steps

Once your environment meets all prerequisites:

✅ All required software installed and verified  
✅ Docker running with sufficient resources  
✅ Network ports available  
✅ Environment variables configured  

You're ready to proceed to the [Quick Start Guide](quick-start.md) and get OpenFrame running locally in just 5 minutes!

---

**Next**: Environment ready? Let's get OpenFrame running → [Quick Start](quick-start.md)