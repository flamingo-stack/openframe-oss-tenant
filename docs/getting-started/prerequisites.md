# Prerequisites

Before getting started with OpenFrame, ensure your development environment meets the following requirements.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 50 GB SSD | 100+ GB SSD |
| Network | Stable internet | High-speed broadband |

### Operating System Support

OpenFrame supports development on:

- **Linux** (Ubuntu 20.04+, CentOS 8+, Debian 11+)
- **macOS** (10.15+)
- **Windows** (Windows 10/11 with WSL2 recommended)

## Required Software

### Java Development

| Software | Version | Purpose |
|----------|---------|---------|
| **Java JDK** | 21+ | Backend service development |
| **Apache Maven** | 3.8+ | Build tool for Java services |
| **Spring Boot** | 3.3.0 | Already included in dependencies |

**Install Java 21:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS with Homebrew
brew install openjdk@21

# Windows (download from Oracle or use Chocolatey)
choco install openjdk21
```

**Verify Java installation:**

```bash
java -version
# Should show: openjdk version "21.x.x"

mvn -version
# Should show: Apache Maven 3.8.x or higher
```

### Node.js Development

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18+ | VoltAgent core and tooling |
| **npm** | 9+ | Package management |

**Install Node.js:**

```bash
# Ubuntu/Debian - via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS with Homebrew
brew install node

# Windows - download from nodejs.org or use Chocolatey
choco install nodejs
```

**Verify Node.js installation:**

```bash
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

### Database Systems

OpenFrame requires several database systems for different purposes:

| Database | Version | Purpose |
|----------|---------|---------|
| **MongoDB** | 6.0+ | Primary transactional storage |
| **Apache Cassandra** | 4.0+ | Time-series and log persistence |
| **Apache Pinot** | 1.2.0+ | Real-time analytics |
| **Redis** | 7.0+ | Caching and session storage |

### Message Brokers

| Software | Version | Purpose |
|----------|---------|---------|
| **Apache Kafka** | 3.6+ | Event streaming backbone |
| **NATS Server** | 2.10+ | Agent messaging |

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **Docker** | 20.10+ | Containerization (recommended for databases) |
| **Docker Compose** | 2.0+ | Multi-container orchestration |
| **Git** | 2.30+ | Version control |
| **IDE** | Latest | IntelliJ IDEA, VS Code, or Eclipse |

## Environment Variables

Set the following environment variables for development:

### Database Configuration

```bash
# MongoDB
export MONGODB_URI="mongodb://localhost:27017/openframe"
export MONGODB_DATABASE="openframe"

# Cassandra
export CASSANDRA_CONTACT_POINTS="localhost:9042"
export CASSANDRA_KEYSPACE="openframe_logs"

# Redis
export REDIS_HOST="localhost"
export REDIS_PORT="6379"

# Apache Pinot
export PINOT_CONTROLLER_URL="http://localhost:9000"
export PINOT_BROKER_URL="http://localhost:8000"
```

### Message Brokers

```bash
# Kafka
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
export KAFKA_GROUP_ID="openframe-dev"

# NATS
export NATS_SERVERS="nats://localhost:4222"
export NATS_CLUSTER_ID="openframe-cluster"
```

### Application Configuration

```bash
# OpenFrame Configuration
export OPENFRAME_PROFILE="development"
export OPENFRAME_CONFIG_SERVER="http://localhost:8888"

# Security
export JWT_SECRET="your-jwt-secret-key-here"
export OAUTH2_CLIENT_SECRET="your-oauth2-client-secret"

# AI Integration
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export OPENAI_API_KEY="your-openai-api-key"
```

## Account Requirements

### Required Accounts

While OpenFrame is open-source, you may need accounts for:

- **Anthropic** (for Claude AI integration) - [Get API key](https://console.anthropic.com/)
- **OpenAI** (for GPT integration) - [Get API key](https://platform.openai.com/)
- **GitHub** (for source code access) - [Free account](https://github.com/)

### Optional Third-party Integrations

Depending on your MSP needs:

- **Google Workspace** (for SSO)
- **Microsoft Azure AD** (for SSO)
- **Slack** (for notifications)
- **Various RMM/PSA tools** (TacticalRMM, ConnectWise, etc.)

## Network Requirements

### Firewall Considerations

Ensure the following ports are accessible:

| Port | Service | Purpose |
|------|---------|---------|
| 8080 | API Service | Internal REST/GraphQL API |
| 8081 | Gateway Service | Edge routing and security |
| 8082 | Authorization Server | OAuth2/OIDC endpoints |
| 8083 | External API | Public API endpoints |
| 8888 | Config Server | Centralized configuration |
| 3000 | Frontend UI | Web dashboard (development) |

### Database Ports

| Port | Database | Purpose |
|------|----------|---------|
| 27017 | MongoDB | Document storage |
| 9042 | Cassandra | Time-series data |
| 6379 | Redis | Caching |
| 9000 | Pinot Controller | Analytics coordination |
| 8000 | Pinot Broker | Analytics queries |

### Message Broker Ports

| Port | Service | Purpose |
|------|---------|---------|
| 9092 | Kafka | Event streaming |
| 4222 | NATS | Agent messaging |
| 2181 | Zookeeper | Kafka coordination |

## Verification Commands

Run these commands to verify your environment is ready:

### Check Java and Maven

```bash
java -version
mvn -version
```

### Check Node.js

```bash
node --version
npm --version
```

### Check Docker

```bash
docker --version
docker compose version
```

### Check Git

```bash
git --version
```

### Test Database Connections

```bash
# MongoDB (if running locally)
mongosh --eval "db.runCommand('ping')"

# Redis (if running locally)
redis-cli ping
```

## Quick Setup with Docker

For development, you can start the required databases using Docker Compose:

```bash
# Create a docker-compose.yml for development dependencies
curl -o docker-compose.dev.yml https://raw.githubusercontent.com/flamingo-stack/openframe-oss-tenant/main/docker-compose.dev.yml

# Start development databases
docker compose -f docker-compose.dev.yml up -d
```

This will start MongoDB, Redis, Kafka, and other required services in development mode.

## Next Steps

Once your environment meets these prerequisites:

1. **[Quick Start Guide](quick-start.md)** - Get OpenFrame running quickly
2. **[First Steps Guide](first-steps.md)** - Explore the platform features

## Troubleshooting

### Common Issues

**Java Version Conflicts:**
```bash
# Check all Java versions
java -version
javac -version
echo `$JAVA_HOME`
```

**Port Conflicts:**
```bash
# Check what's running on OpenFrame ports
netstat -tulpn | grep :8080
lsof -i :8080  # macOS
```

**Docker Issues:**
```bash
# Restart Docker service
sudo systemctl restart docker  # Linux
# Or restart Docker Desktop on macOS/Windows
```

### Getting Help

If you encounter issues:
- Join the [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- Check the platform documentation for environment-specific guides

---

*Ready to proceed? Continue with the [Quick Start Guide](quick-start.md) to get OpenFrame running.*