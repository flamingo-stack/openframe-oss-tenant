# Prerequisites Guide

Before installing OpenFrame, ensure your system meets the following requirements and you have the necessary access credentials.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB free | 100+ GB SSD |
| Network | 1 Gbps | 10 Gbps |

### Supported Operating Systems

#### Production Deployment
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **Container Platforms**: Kubernetes 1.28+, Docker Swarm
- **Cloud Platforms**: AWS, Azure, GCP

#### Development Environment
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+
- **macOS**: 11.0+ (Big Sur or later)
- **Windows**: 10/11 with WSL2

## Required Software Dependencies

### Core Dependencies

| Software | Version | Purpose | Installation |
|----------|---------|---------|-------------|
| **Java** | 21+ | Backend services runtime | [AdoptOpenJDK](https://adoptium.net/) |
| **Maven** | 3.9+ | Java build system | [Apache Maven](https://maven.apache.org/) |
| **Node.js** | 18+ | Frontend build system | [Node.js](https://nodejs.org/) |
| **Docker** | 24.0+ | Containerization | [Docker Desktop](https://docker.com/) |
| **Docker Compose** | 2.20+ | Multi-container orchestration | Included with Docker Desktop |

### Optional Dependencies

| Software | Version | Purpose | Required For |
|----------|---------|---------|-------------|
| **Rust** | 1.70+ | Client agent development | Client development only |
| **kubectl** | 1.28+ | Kubernetes management | Kubernetes deployment |
| **Helm** | 3.12+ | Kubernetes package manager | Kubernetes deployment |

### Verification Commands

Run these commands to verify your installation:

```bash
# Java version check
java --version
# Expected output: openjdk 21.x.x or later

# Maven version check
mvn --version
# Expected output: Apache Maven 3.9.x or later

# Node.js version check
node --version
# Expected output: v18.x.x or later

# Docker version check
docker --version
# Expected output: Docker version 24.x.x or later

# Docker Compose version check
docker compose version
# Expected output: Docker Compose version v2.20.x or later
```

## Database Requirements

OpenFrame uses multiple database systems for different purposes:

### MongoDB
- **Version**: 7.0+
- **Purpose**: Primary application data, user management
- **Deployment**: Can use Docker container or managed service
- **Resources**: 4GB RAM minimum, 20GB storage

### Apache Cassandra
- **Version**: 4.1+
- **Purpose**: Time-series data, logs, metrics
- **Deployment**: Requires cluster setup for production
- **Resources**: 8GB RAM minimum, 50GB storage

### Redis
- **Version**: 7.0+
- **Purpose**: Caching, session management
- **Deployment**: Single instance for development
- **Resources**: 2GB RAM minimum

### Apache Kafka
- **Version**: 3.6+
- **Purpose**: Event streaming, real-time data processing
- **Deployment**: Requires ZooKeeper or KRaft mode
- **Resources**: 4GB RAM minimum

## Network Requirements

### Port Configuration

| Port | Service | Purpose | Accessibility |
|------|---------|---------|---------------|
| 8080 | Frontend UI | Web dashboard | External |
| 8081 | API Gateway | API routing | Internal |
| 8082 | GraphQL API | Data queries | Internal |
| 8083 | Management | Admin tasks | Internal |
| 8084 | Stream Service | Data processing | Internal |
| 8888 | Config Server | Configuration | Internal |

### Firewall Rules

#### Production Environment
```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow OpenFrame UI
sudo ufw allow 8080/tcp

# Internal service communication (adjust based on your network)
sudo ufw allow from 10.0.0.0/8 to any port 8081:8888
```

#### Development Environment
```bash
# Allow all OpenFrame ports (development only)
sudo ufw allow 8080:8888/tcp
```

### External Service Access

Ensure your environment can access:
- **GitHub**: For source code and dependencies
- **Docker Hub**: For container images  
- **Maven Central**: For Java dependencies
- **npm Registry**: For Node.js packages

## Cloud Provider Requirements

### AWS
- **EC2 Instance**: t3.large or larger
- **EKS Cluster**: Kubernetes 1.28+
- **RDS**: MongoDB-compatible DocumentDB
- **ElastiCache**: Redis cluster
- **MSK**: Managed Kafka service

### Azure
- **Virtual Machine**: Standard_D4s_v3 or larger
- **AKS Cluster**: Kubernetes 1.28+
- **Cosmos DB**: MongoDB API
- **Azure Cache**: Redis instance
- **Event Hubs**: Kafka-compatible service

### Google Cloud Platform
- **Compute Engine**: n1-standard-4 or larger
- **GKE Cluster**: Kubernetes 1.28+
- **Cloud Firestore**: MongoDB-compatible
- **Memorystore**: Redis instance
- **Pub/Sub**: Event streaming

## Access Credentials

### GitHub Access
You'll need a GitHub Personal Access Token with repository access:

```bash
# Set your GitHub token as environment variable
export GITHUB_TOKEN="your_personal_access_token"
```

> 💡 **Tip**: Create a fine-grained personal access token with repository read access for secure authentication.

### Service Account Setup

For production deployments, create dedicated service accounts:

```bash
# Create OpenFrame service user
sudo useradd -m -s /bin/bash openframe
sudo usermod -aG docker openframe

# Set up service directories
sudo mkdir -p /opt/openframe/{config,data,logs}
sudo chown -R openframe:openframe /opt/openframe
```

## Development Tools (Optional)

### Recommended IDEs

| IDE | Best For | Extensions |
|-----|----------|------------|
| **IntelliJ IDEA** | Java development | Spring Boot, GraphQL |
| **VS Code** | Frontend, Rust | Vue, TypeScript, Rust Analyzer |
| **Eclipse** | Java development | Spring Tools, Maven |

### Useful CLI Tools

```bash
# Install useful development tools
npm install -g @vue/cli          # Vue CLI
cargo install cargo-watch       # Rust file watcher (if using Rust)
pip install httpie              # HTTP client for API testing
```

### Browser Extensions

For development and testing:
- **GraphQL Playground**: For API exploration
- **Vue.js DevTools**: For frontend debugging
- **JSON Formatter**: For API response formatting

## Environment Variables

Set up these environment variables before installation:

```bash
# Required for development
export JAVA_HOME="/usr/lib/jvm/java-21-openjdk"
export MAVEN_HOME="/usr/share/maven"
export PATH="$JAVA_HOME/bin:$MAVEN_HOME/bin:$PATH"

# Optional for convenience
export OPENFRAME_HOME="/opt/openframe"
export DOCKER_BUILDKIT=1
```

## Validation Checklist

Before proceeding to installation, verify you have:

- [ ] Java 21+ installed and accessible via `java --version`
- [ ] Maven 3.9+ installed and accessible via `mvn --version`  
- [ ] Node.js 18+ installed and accessible via `node --version`
- [ ] Docker 24.0+ installed and running
- [ ] Docker Compose 2.20+ available via `docker compose version`
- [ ] Required ports (8080-8888) available and not in use
- [ ] Network access to external dependencies
- [ ] GitHub token with repository access (if applicable)
- [ ] Minimum 8GB RAM and 50GB free disk space
- [ ] Administrative access to install and configure services

## Common Issues and Solutions

### Java Version Problems
```bash
# Check available Java versions
update-java-alternatives --list

# Set default Java version
sudo update-java-alternatives --set java-21-openjdk-amd64
```

### Docker Permission Issues
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Port Conflicts
```bash
# Check what's using a port
sudo lsof -i :8080
# Kill process if necessary
sudo kill -9 <PID>
```

### Network Connectivity
```bash
# Test external connectivity
curl -I https://github.com
curl -I https://registry.npmjs.org
```

## Next Steps

Once all prerequisites are met:

1. **[Quick Start Guide](./quick-start.md)** - Begin the 5-minute installation
2. **[Development Setup](../development/setup/environment.md)** - For developers wanting to contribute
3. **[Local Development](../development/setup/local-development.md)** - Complete development environment setup

> ⚠️ **Important**: Ensure all prerequisites are satisfied before proceeding. Missing dependencies will cause installation failures.