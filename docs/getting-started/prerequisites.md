# Prerequisites

Before setting up OpenFrame, ensure your development environment meets these requirements. This guide covers all necessary software, system requirements, and preparatory steps.

## System Requirements

### Minimum Hardware Specifications

| Component | Requirement | Recommended |
|-----------|------------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB available | 100+ GB SSD |
| **Network** | Stable internet connection | High-speed broadband |

### Supported Operating Systems

| OS | Version | Notes |
|----|---------|-------|
| **macOS** | 12.0+ (Monterey) | Primary development platform |
| **Linux** | Ubuntu 20.04+, Debian 11+, RHEL 8+ | Server deployment ready |
| **Windows** | Windows 10/11 with WSL2 | Development with Linux subsystem |

## Required Software

### Core Development Tools

| Tool | Version | Purpose | Installation |
|------|---------|---------|-------------|
| **Java JDK** | 21+ | Backend services runtime | [OpenJDK 21](https://openjdk.org/) or [Oracle JDK 21](https://www.oracle.com/java/technologies/downloads/) |
| **Node.js** | 18+ | AI integration and tooling | [Node.js Downloads](https://nodejs.org/) |
| **Maven** | 3.8+ | Java build tool | [Maven Installation](https://maven.apache.org/install.html) |
| **Git** | 2.30+ | Version control | [Git Downloads](https://git-scm.com/downloads) |

### Container & Orchestration (Required)

| Tool | Version | Purpose | Installation |
|------|---------|---------|-------------|
| **Docker** | 24.0+ | Container runtime | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| **Docker Compose** | 2.20+ | Multi-container orchestration | Included with Docker Desktop |

### SSL/TLS Development Certificates

| Tool | Purpose | Installation |
|------|---------|-------------|
| **mkcert** | Local HTTPS development | macOS: `brew install mkcert`<br>Ubuntu: `sudo apt install mkcert libnss3-tools`<br>Manual: [mkcert releases](https://github.com/FiloSottile/mkcert/releases) |

### Database & Messaging Infrastructure

The following services will be run via Docker Compose (no local installation required):

| Service | Version | Purpose |
|---------|---------|---------|
| **MongoDB** | 7.0+ | Primary database |
| **Apache Kafka** | 3.6+ | Event streaming |
| **Redis** | 7.0+ | Caching & sessions |
| **Apache Cassandra** | 4.0+ | Time-series data |
| **Apache Pinot** | 1.2+ | Analytics engine |
| **NATS** | 2.10+ | Real-time messaging |

## Development Environment Setup

### 1. Verify Java Installation

```bash
java --version
```

**Expected output:**
```text
openjdk 21.0.1 2023-10-17
OpenJDK Runtime Environment (build 21.0.1+12-29)
OpenJDK 64-Bit Server VM (build 21.0.1+12-29, mixed mode, sharing)
```

### 2. Verify Node.js Installation

```bash
node --version
npm --version
```

**Expected output:**
```text
v18.18.0
9.8.1
```

### 3. Verify Maven Installation

```bash
mvn --version
```

**Expected output:**
```text
Apache Maven 3.9.5
Maven home: /opt/maven
Java version: 21.0.1, vendor: Eclipse Adoptium
```

### 4. Verify Docker Installation

```bash
docker --version
docker-compose --version
```

**Expected output:**
```text
Docker version 24.0.6
Docker Compose version v2.21.0
```

### 5. Set Up mkcert for HTTPS

mkcert enables local HTTPS development without certificate warnings.

**Installation:**

```bash
# macOS
brew install mkcert
mkcert -install

# Ubuntu/Debian
sudo apt update
sudo apt install mkcert libnss3-tools
mkcert -install

# Windows (via Chocolatey)
choco install mkcert
mkcert -install
```

**Verify installation:**
```bash
mkcert -CAROOT
```

This should display the certificate authority root directory path.

### 6. Configure Git (if not already done)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Environment Variables

Set up these environment variables in your shell profile (`~/.bashrc`, `~/.zshrc`, or equivalent):

### Required Variables

```bash
# Java
export JAVA_HOME="/path/to/java/21"

# Maven (if not in PATH)
export MAVEN_HOME="/path/to/maven"
export PATH="$MAVEN_HOME/bin:$PATH"

# OpenFrame Development
export OPENFRAME_ENV="development"
export OPENFRAME_PROFILE="local"
```

### Optional Variables

```bash
# Docker resource limits (adjust based on your system)
export COMPOSE_DOCKER_CLI_BUILD=1
export DOCKER_BUILDKIT=1

# JVM options for development
export MAVEN_OPTS="-Xmx2g -XX:+UseG1GC"
```

## Account Requirements

### OpenMSP Community Access
- Join our Slack community: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- No GitHub issues or discussions - all support happens in the community

### External Service Accounts (Optional)
For full functionality, you may want accounts for:

| Service | Purpose | Required Level |
|---------|---------|----------------|
| **Anthropic** | AI integration | API access |
| **Google OAuth** | SSO authentication | OAuth2 app registration |
| **Microsoft Azure** | Enterprise SSO | OAuth2 app registration |

## Port Requirements

Ensure these ports are available on your development machine:

| Port | Service | Purpose |
|------|---------|---------|
| **8080** | API Service | REST/GraphQL API |
| **8081** | Gateway Service | API Gateway |
| **8082** | Authorization Server | OAuth2/OIDC |
| **8083** | External API | Public API |
| **8084** | Management Service | Admin operations |
| **8085** | Stream Service | Event processing |
| **8086** | Client Service | Agent communication |
| **3000** | Frontend | Next.js development |
| **5432** | PostgreSQL | Database (if using) |
| **27017** | MongoDB | Primary database |
| **6379** | Redis | Cache & sessions |
| **9092** | Kafka | Event streaming |
| **9042** | Cassandra | Time-series data |
| **8123** | Pinot Controller | Analytics |
| **4222** | NATS | Real-time messaging |

## Verification Checklist

Before proceeding to the Quick Start guide, verify you have:

- [ ] Java JDK 21+ installed and configured
- [ ] Node.js 18+ with npm working
- [ ] Maven 3.8+ in your PATH
- [ ] Docker and Docker Compose running
- [ ] mkcert installed with certificates generated
- [ ] Git configured with your credentials
- [ ] Required ports available (check with `netstat` or `lsof`)
- [ ] Environment variables set in your shell profile

## Troubleshooting

### Common Issues

**Java Version Conflicts:**
```bash
# Check all Java versions
/usr/libexec/java_home -V  # macOS
update-alternatives --list java  # Linux

# Set specific version
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
```

**Docker Permission Issues (Linux):**
```bash
sudo usermod -aG docker $USER
# Log out and back in, or:
newgrp docker
```

**Port Conflicts:**
```bash
# Check what's using a port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows
```

**mkcert Certificate Issues:**
```bash
# Reinstall mkcert certificates
mkcert -uninstall
mkcert -install
```

## Next Steps

Once you've verified all prerequisites are met, you're ready to proceed to the [Quick Start Guide](quick-start.md) to get OpenFrame running locally in under 5 minutes.

Need help? Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) where our team and community members provide support.