# Prerequisites

This guide covers the system requirements and dependencies needed to run OpenFrame successfully in your environment.

## System Requirements

### Minimum Hardware Requirements

| Component | Development | Production | Notes |
|-----------|-------------|------------|-------|
| **CPU** | 4 cores | 8+ cores | Intel/AMD x86_64 or ARM64 |
| **RAM** | 8 GB | 16+ GB | More RAM improves caching and performance |
| **Storage** | 50 GB SSD | 200+ GB SSD | Fast storage crucial for database performance |
| **Network** | 100 Mbps | 1+ Gbps | High bandwidth for real-time data processing |

### Recommended Hardware Specifications

| Component | Development | Production | High-Scale Production |
|-----------|-------------|------------|----------------------|
| **CPU** | 8 cores | 16 cores | 32+ cores |
| **RAM** | 16 GB | 32 GB | 64+ GB |
| **Storage** | 100 GB NVMe | 500 GB NVMe | 1+ TB NVMe RAID |
| **Network** | 1 Gbps | 10 Gbps | 10+ Gbps bonded |

## Supported Operating Systems

### Server/Development Environment

| OS Family | Versions | Support Level | Notes |
|-----------|----------|---------------|-------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, CentOS 8+, Amazon Linux 2 | ✅ Full Support | Recommended for production |
| **macOS** | 12.0+ (Monterey) | ✅ Full Support | Excellent for development |
| **Windows** | Windows 10/11, Server 2019+ | ✅ Full Support | WSL2 recommended for development |

### Client Agent Support

| OS Family | Versions | Agent Support | Notes |
|-----------|----------|---------------|-------|
| **Windows** | 10/11, Server 2016+ | ✅ Native | Full feature support |
| **Linux** | Ubuntu 18.04+, RHEL 7+, CentOS 7+ | ✅ Native | Systemd-based distributions |
| **macOS** | 10.15+ (Catalina) | ✅ Native | Intel and Apple Silicon |

## Required Software Dependencies

### Core Runtime Dependencies

#### Java Development Kit (JDK)
```bash
# Required version
Java 21 (OpenJDK or Oracle JDK)

# Verification command
java --version
# Expected output: openjdk 21.0.x or java 21.0.x
```

**Installation Options:**
- **Ubuntu/Debian**: `sudo apt install openjdk-21-jdk`
- **RHEL/CentOS**: `sudo dnf install java-21-openjdk-devel`
- **macOS**: `brew install openjdk@21`
- **Windows**: Download from [OpenJDK](https://jdk.java.net/21/) or [Oracle](https://www.oracle.com/java/technologies/downloads/)

#### Apache Maven
```bash
# Required version
Maven 3.9.0+

# Verification command
mvn --version
# Expected output: Apache Maven 3.9.x
```

**Installation Options:**
- **Ubuntu/Debian**: `sudo apt install maven`
- **RHEL/CentOS**: `sudo dnf install maven`
- **macOS**: `brew install maven`
- **Windows**: Download from [Apache Maven](https://maven.apache.org/download.cgi)

#### Node.js and npm
```bash
# Required versions
Node.js 18.0+ (LTS recommended)
npm 9.0+

# Verification commands
node --version  # Expected: v18.x.x or v20.x.x
npm --version   # Expected: 9.x.x or 10.x.x
```

**Installation Options:**
- **All platforms**: [Node.js official installer](https://nodejs.org/)
- **macOS**: `brew install node`
- **Linux**: Use [NodeSource repository](https://github.com/nodesource/distributions)

#### Rust (for client development)
```bash
# Required version
Rust 1.70.0+

# Verification command
rustc --version
# Expected output: rustc 1.70.x or newer
```

**Installation:**
```bash
# Install via rustup (recommended)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
cargo --version
```

### Containerization Platform

#### Docker
```bash
# Required version
Docker 24.0+

# Verification commands
docker --version     # Expected: Docker version 24.x.x
docker compose version  # Expected: Docker Compose version v2.x.x
```

**Installation Options:**
- **Ubuntu**: [Docker Engine](https://docs.docker.com/engine/install/ubuntu/)
- **macOS**: [Docker Desktop](https://docs.docker.com/desktop/install/mac-install/)
- **Windows**: [Docker Desktop](https://docs.docker.com/desktop/install/windows-install/)

> **Note**: Docker Compose v2 is required. Legacy `docker-compose` (v1) is not supported.

## Database Prerequisites

OpenFrame requires access to the following databases. You can run them locally via Docker or use managed cloud services.

### MongoDB
```bash
# Required version
MongoDB 7.0+

# Docker setup (recommended for development)
docker run --name openframe-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -d mongo:7.0
```

### Apache Kafka
```bash
# Required version
Apache Kafka 3.6.0+

# Docker setup via Confluent Platform
docker run --name openframe-kafka \
  -p 9092:9092 \
  -e KAFKA_BROKER_ID=1 \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  -d confluentinc/cp-kafka:7.4.0
```

### Redis
```bash
# Required version
Redis 7.0+

# Docker setup
docker run --name openframe-redis \
  -p 6379:6379 \
  -d redis:7.2-alpine
```

### Apache Cassandra (for analytics)
```bash
# Required version
Cassandra 4.0+

# Docker setup
docker run --name openframe-cassandra \
  -p 9042:9042 \
  -d cassandra:4.1
```

### Apache Pinot (for real-time analytics)
```bash
# Required version
Apache Pinot 1.2.0+

# Docker setup via official image
docker run --name openframe-pinot \
  -p 9000:9000 \
  -d apachepinot/pinot:1.2.0
```

## Development Environment Setup

### Git Configuration
```bash
# Verify Git installation
git --version
# Expected: git version 2.30+

# Configure Git (required for commits)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### GitHub Access Token

OpenFrame requires a GitHub personal access token for private repository access during development:

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Create a new token with these permissions:
   - `repo` (full control of private repositories)
   - `read:packages` (read access to packages)
3. Save the token securely - you'll need it during setup

### IDE Recommendations

| IDE | Language Support | Recommended Plugins |
|-----|------------------|-------------------|
| **IntelliJ IDEA** | Java, TypeScript | Spring Boot, GraphQL, Docker |
| **VS Code** | All languages | Java Extension Pack, Rust Analyzer, Vue Language Features |
| **Eclipse** | Java | Spring Tools, Maven Integration |

### Environment Variables

Set these environment variables for development:

```bash
# Java
export JAVA_HOME=/path/to/java-21
export PATH=$JAVA_HOME/bin:$PATH

# Maven (if custom installation)
export MAVEN_HOME=/path/to/maven
export PATH=$MAVEN_HOME/bin:$PATH

# Node.js (if using nvm)
export NODE_PATH=/path/to/node
export PATH=$NODE_PATH/bin:$PATH

# GitHub token for private repositories
export GITHUB_TOKEN=your_personal_access_token

# Optional: Custom Docker settings
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

## Network Requirements

### Required Ports

| Port | Service | Protocol | Access Level |
|------|---------|----------|--------------|
| **8080** | API Gateway | HTTP/WS | External |
| **8081** | GraphQL API | HTTP | Internal |
| **8082** | Authorization Server | HTTP | Internal |
| **8083** | Client Service | HTTP | Internal |
| **8084** | Management Service | HTTP | Internal |
| **8085** | External API | HTTP | External |
| **8086** | Stream Processing | HTTP | Internal |
| **8888** | Config Server | HTTP | Internal |
| **3000** | Frontend Dev Server | HTTP | External |
| **1420** | Chat Client | HTTP | External |

### Database Ports

| Port | Service | Protocol | Notes |
|------|---------|----------|-------|
| **27017** | MongoDB | TCP | Primary database |
| **9042** | Cassandra | TCP | Analytics storage |
| **9092** | Kafka | TCP | Event streaming |
| **6379** | Redis | TCP | Caching layer |
| **9000** | Apache Pinot | HTTP | Real-time analytics |

### External Dependencies

OpenFrame may need to connect to external services:

| Service | Purpose | Requirements |
|---------|---------|--------------|
| **GitHub** | Package downloads | HTTPS (port 443) |
| **Docker Hub** | Container images | HTTPS (port 443) |
| **Maven Central** | Java dependencies | HTTPS (port 443) |
| **npm Registry** | Node.js packages | HTTPS (port 443) |

## Security Requirements

### SSL/TLS Certificates

For production deployment:
- Valid SSL certificates for all external-facing services
- Certificate authority (CA) certificates for internal service communication
- Regular certificate rotation and monitoring

### Authentication Prerequisites

#### OAuth 2.0 Provider Setup
Configure at least one OAuth provider:

| Provider | Setup Guide | Required Information |
|----------|-------------|---------------------|
| **Microsoft Entra ID** | [Azure AD Setup](https://docs.microsoft.com/en-us/azure/active-directory/) | Tenant ID, Client ID, Client Secret |
| **Google Workspace** | [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2) | Client ID, Client Secret |
| **Custom OIDC** | OpenID Connect compatible provider | Issuer URL, Client credentials |

#### API Key Management
- Secure storage for API keys and secrets
- Key rotation policies and procedures
- Access control and audit logging

## Verification Checklist

Use this checklist to verify your environment is ready for OpenFrame:

### ✅ System Requirements
- [ ] Adequate hardware resources (CPU, RAM, storage)
- [ ] Supported operating system version
- [ ] Network connectivity and port availability

### ✅ Software Dependencies
- [ ] Java 21 JDK installed and `$JAVA_HOME` configured
- [ ] Maven 3.9+ installed and accessible in `$PATH`
- [ ] Node.js 18+ and npm 9+ installed
- [ ] Rust 1.70+ installed (for client development)
- [ ] Docker 24.0+ with Compose v2 support
- [ ] Git 2.30+ configured with user credentials

### ✅ Database Services
- [ ] MongoDB 7.0+ accessible (local or remote)
- [ ] Apache Kafka 3.6+ accessible with topics
- [ ] Redis 7.0+ accessible for caching
- [ ] Cassandra 4.0+ accessible (for analytics)
- [ ] Apache Pinot 1.2+ accessible (for real-time analytics)

### ✅ Development Environment
- [ ] GitHub personal access token created and configured
- [ ] IDE installed with recommended plugins
- [ ] Environment variables configured
- [ ] Network access to external dependencies

### ✅ Security Configuration
- [ ] SSL certificates available for production
- [ ] OAuth 2.0 provider configured
- [ ] API key management strategy defined

## Common Issues and Solutions

### Java Version Issues
```bash
# Problem: Wrong Java version
java --version
# Shows: openjdk 11.x.x or java 1.8.x

# Solution: Install Java 21
# Ubuntu: sudo apt install openjdk-21-jdk
# macOS: brew install openjdk@21
# Update JAVA_HOME and PATH
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
```

### Docker Permission Issues
```bash
# Problem: Permission denied while trying to connect to Docker
docker ps
# Error: permission denied while trying to connect to the Docker daemon

# Solution: Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in, or run:
newgrp docker
```

### Port Conflicts
```bash
# Problem: Port already in use
docker run -p 8080:8080 ...
# Error: bind: address already in use

# Solution: Find and stop conflicting process
sudo lsof -i :8080
# Kill the process or use a different port
```

### Memory Issues
```bash
# Problem: Java heap space errors
# Error: java.lang.OutOfMemoryError: Java heap space

# Solution: Increase JVM heap size
export MAVEN_OPTS="-Xmx4g -Xms2g"
# Or add to ~/.mavenrc
```

## Next Steps

Once you've verified all prerequisites are met:

1. **Quick Start**: Follow the [5-minute setup guide](./quick-start.md)
2. **Local Development**: Set up your [development environment](../development/setup/local-development.md)
3. **First Steps**: Complete your [initial configuration](./first-steps.md)

> **Need Help?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance with prerequisite setup or troubleshooting.