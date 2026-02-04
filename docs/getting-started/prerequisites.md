# Prerequisites

Before installing and running OpenFrame, ensure your environment meets the following requirements. This guide covers all necessary software, system requirements, and account setup.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB available | 100+ GB SSD |
| **Network** | Stable internet connection | High-speed broadband |

### Supported Operating Systems

OpenFrame supports the following platforms for development and deployment:

#### Development Environment
- **macOS**: 10.15+ (Catalina or later)
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **Windows**: Windows 10/11 with WSL2

#### Production Deployment
- **Linux**: Ubuntu 22.04 LTS, CentOS Stream 9, RHEL 9
- **Container Platforms**: Docker, Kubernetes 1.28+
- **Cloud Providers**: AWS, Azure, Google Cloud Platform

## Required Software

### Core Development Tools

#### Java Development Kit (JDK)
```bash
# Required: Java 21 (LTS)
java -version
# Expected output: openjdk version "21.0.x" or similar
```

**Installation options:**
- **SDKMan** (recommended): `sdk install java 21.0.x-open`
- **Package managers**: `apt install openjdk-21-jdk`, `brew install openjdk@21`
- **Direct download**: [OpenJDK 21](https://jdk.java.net/21/)

#### Apache Maven
```bash
# Required: Maven 3.8.0+
mvn -version
# Expected output: Apache Maven 3.8.x or higher
```

**Installation:**
- **Package managers**: `apt install maven`, `brew install maven`
- **Direct download**: [Apache Maven](https://maven.apache.org/download.cgi)

#### Node.js and npm
```bash
# Required: Node.js 18.x or 20.x LTS
node --version
# Expected output: v18.x.x or v20.x.x

npm --version
# Expected output: 9.x.x or higher
```

**Installation:**
- **Node Version Manager**: `nvm install 20 && nvm use 20`
- **Package managers**: `apt install nodejs npm`, `brew install node`
- **Direct download**: [Node.js](https://nodejs.org/)

#### Rust (for OpenFrame Agent)
```bash
# Required: Rust 1.75+
rustc --version
# Expected output: rustc 1.75.x or higher

cargo --version
# Expected output: cargo 1.75.x or higher
```

**Installation:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Container and Orchestration Tools

#### Docker
```bash
# Required: Docker 24.0+
docker --version
# Expected output: Docker version 24.0.x or higher

docker compose version
# Expected output: Docker Compose version v2.x.x or higher
```

**Installation:**
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)
- **macOS/Windows**: [Docker Desktop](https://docs.docker.com/desktop/)

#### Kubernetes (Optional - for production)
```bash
# Required: kubectl 1.28+
kubectl version --client
# Expected output: Client Version v1.28.x or higher
```

**Installation:**
- **kubectl**: [Install kubectl](https://kubernetes.io/docs/tasks/tools/)
- **Local clusters**: minikube, kind, or Docker Desktop Kubernetes

### Database and Messaging Systems

The following services can be run locally via Docker Compose or connected to external instances:

#### MongoDB
- **Version**: 7.x
- **Local development**: Included in Docker Compose
- **Production**: MongoDB Atlas, self-hosted, or cloud provider

#### Redis
- **Version**: 7.x
- **Local development**: Included in Docker Compose  
- **Production**: Redis Cloud, ElastiCache, or self-hosted

#### Apache Kafka
- **Version**: 3.6.0+
- **Local development**: Included in Docker Compose
- **Production**: Confluent Cloud, Amazon MSK, or self-hosted

#### Apache Cassandra (Optional)
- **Version**: 4.x
- **Use case**: High-volume audit logging and time-series data
- **Local development**: Docker Compose
- **Production**: DataStax Astra, AWS Keyspaces, or self-hosted

## Development Environment Setup

### IDE Recommendations

#### For Java Development
- **IntelliJ IDEA**: Ultimate or Community Edition with Spring Boot plugin
- **Visual Studio Code**: With Extension Pack for Java
- **Eclipse**: Spring Tools Suite (STS)

#### For Frontend Development  
- **Visual Studio Code**: With Vue.js and TypeScript extensions
- **WebStorm**: Full-featured JavaScript/TypeScript IDE
- **Vim/Neovim**: With appropriate language servers

#### For Rust Development
- **Visual Studio Code**: With rust-analyzer extension
- **IntelliJ IDEA**: With Rust plugin
- **RustRover**: JetBrains' dedicated Rust IDE

### Essential IDE Extensions/Plugins

#### Visual Studio Code Extensions
```bash
# Install recommended extensions
code --install-extension vscjava.vscode-java-pack
code --install-extension Vue.volar
code --install-extension rust-lang.rust-analyzer
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension GraphQL.vscode-graphql
```

#### IntelliJ IDEA Plugins
- Spring Boot
- Vue.js  
- Rust (for IntelliJ Ultimate)
- GraphQL
- Docker

## Environment Variables

Set up these environment variables for local development:

### Core Configuration
```bash
# Java configuration
export JAVA_HOME=/path/to/java-21
export MAVEN_HOME=/path/to/maven

# Node.js configuration (if using nvm)
export NVM_DIR="$HOME/.nvm"

# Rust configuration
export PATH="$HOME/.cargo/bin:$PATH"
```

### OpenFrame Configuration
```bash
# Database connections (for external services)
export MONGODB_URI="mongodb://localhost:27017/openframe"
export REDIS_URL="redis://localhost:6379"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Security (generate secure values for production)
export JWT_SECRET="your-jwt-secret-key"
export ENCRYPTION_KEY="your-encryption-key"

# External tool integrations (optional - for integrated tool testing)
export TACTICAL_RMM_URL="https://your-tactical-rmm.com"
export TACTICAL_RMM_TOKEN="your-api-token"
export FLEET_MDM_URL="https://your-fleet-mdm.com"  
export FLEET_MDM_TOKEN="your-api-token"
```

## Account and Access Requirements

### Version Control
- **GitHub Account**: Required for cloning repositories and CLI installation
- **SSH Key**: Set up SSH key for GitHub access

```bash
# Generate SSH key (if not already present)
ssh-keygen -t rsa -b 4096 -c "your-email@example.com"

# Add to SSH agent
ssh-add ~/.ssh/id_rsa

# Copy public key to GitHub settings
cat ~/.ssh/id_rsa.pub
```

### OpenMSP Community Access
- **Slack Workspace**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support and community discussions
- **No registration required**: OpenFrame is open source and free to use

### External Tool Accounts (Optional)
For full integration testing, you may want accounts for:
- **Tactical RMM**: Self-hosted or cloud instance
- **Fleet MDM**: Self-hosted instance  
- **MeshCentral**: Self-hosted instance
- **Authentik**: Self-hosted SSO instance

## Network and Firewall Requirements

### Development Environment
- **Outbound HTTPS (443)**: For package downloads and external API access
- **Outbound HTTP (80)**: For package repositories
- **Docker Registry Access**: For pulling container images

### Production Environment
- **Inbound HTTPS (443)**: For web interface and API access
- **Inbound HTTP (80)**: For HTTP redirect to HTTPS
- **Database Connections**: Ports for MongoDB (27017), Redis (6379), Kafka (9092)
- **Inter-service Communication**: Internal network access between microservices

## Verification Commands

Run these commands to verify your environment is ready:

```bash
# Check Java version
java -version && mvn -version

# Check Node.js and npm
node --version && npm --version

# Check Rust toolchain
rustc --version && cargo --version

# Check Docker
docker --version && docker compose version

# Check container connectivity
docker run --rm hello-world

# Verify environment variables
echo $JAVA_HOME
echo $MONGODB_URI
```

## Troubleshooting Common Issues

### Java Version Conflicts
```bash
# If multiple Java versions are installed
sudo update-alternatives --config java  # Linux
/usr/libexec/java_home -V               # macOS
```

### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in for changes to take effect
```

### Node.js Version Management
```bash
# Install and use correct Node.js version
nvm install 20
nvm use 20
nvm alias default 20
```

### WSL2 Setup (Windows)
```bash
# Enable WSL2 and install Ubuntu
wsl --install
# Set WSL2 as default
wsl --set-default-version 2
```

## Next Steps

Once your environment meets all prerequisites:

1. **Continue to [Quick Start Guide](quick-start.md)** for a 5-minute setup
2. **Review [First Steps Guide](first-steps.md)** for initial configuration  
3. **Join the community** on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support

> **Note**: If you encounter issues during prerequisite setup, the OpenMSP Slack community is the best place to get help. The team and community members actively provide support and troubleshooting assistance.