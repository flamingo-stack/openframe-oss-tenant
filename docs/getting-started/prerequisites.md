# Prerequisites

Before setting up OpenFrame, ensure your environment meets the following requirements.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB SSD | 100+ GB NVMe SSD |
| **Network** | 1 Gbps | 10+ Gbps |

### Operating System Support

| Platform | Versions | Notes |
|----------|----------|-------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, CentOS 8+ | Preferred for production |
| **macOS** | 12.0+ (Monterey) | Development only |
| **Windows** | Windows 10/11, Server 2019+ | With WSL2 for development |

## Required Software

### Java Development Environment

OpenFrame backend services require **Java 21** (LTS).

```bash
# Verify Java installation
java -version
# Expected output: openjdk version "21.x.x" or equivalent
```

**Installation options:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk

# macOS (Homebrew)
brew install openjdk@21

# Windows (Chocolatey)
choco install openjdk21
```

### Node.js Environment

Frontend application requires **Node.js 18+** with npm.

```bash
# Verify Node.js installation
node --version
# Expected: v18.x.x or higher

npm --version
# Expected: 8.x.x or higher
```

**Installation options:**

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (Homebrew)
brew install node@18

# Windows (Chocolatey)
choco install nodejs
```

### Build Tools

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Maven 3.8+** | Java build system | `apt install maven` / `brew install maven` |
| **Git** | Version control | `apt install git` / `brew install git` |

```bash
# Verify Maven installation
mvn --version
# Expected: Apache Maven 3.8.x or higher
```

## Database Requirements

### MongoDB

**Version**: MongoDB 5.0+ (6.0+ recommended)

```bash
# Ubuntu/Debian installation
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Verification:**

```bash
mongosh --eval "db.version()"
# Expected: 6.x.x or 5.x.x
```

### Apache Kafka (Optional for Development)

**Version**: Kafka 3.6.0+

```bash
# Download and setup Kafka
wget https://downloads.apache.org/kafka/2.13-3.6.0/kafka_2.13-3.6.0.tgz
tar -xzf kafka_2.13-3.6.0.tgz
cd kafka_2.13-3.6.0

# Start Zookeeper
bin/zookeeper-server-start.sh config/zookeeper.properties &

# Start Kafka
bin/kafka-server-start.sh config/server.properties &
```

### Apache Cassandra (Optional for Analytics)

**Version**: Cassandra 4.0+

```bash
# Ubuntu/Debian
echo "deb https://debian.cassandra.apache.org 41x main" | sudo tee -a /etc/apt/sources.list.d/cassandra.sources.list
curl https://downloads.apache.org/cassandra/KEYS | sudo apt-key add -
sudo apt update
sudo apt install cassandra

# Start Cassandra
sudo systemctl start cassandra
sudo systemctl enable cassandra
```

## Network and Security Requirements

### Port Requirements

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Frontend** | 3000 | HTTP/HTTPS | Web interface |
| **API Gateway** | 8080 | HTTP/HTTPS | API routing |
| **Authorization Server** | 8081 | HTTP/HTTPS | OAuth2/OIDC |
| **MongoDB** | 27017 | TCP | Database |
| **Kafka** | 9092 | TCP | Message streaming |
| **NATS** | 4222 | TCP | Real-time messaging |

### Firewall Configuration

```bash
# Ubuntu UFW example
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 27017/tcp
```

### SSL/TLS Requirements

For production deployments:

- Valid SSL certificates for all public endpoints
- TLS 1.2+ support
- Strong cipher suites enabled

**Development certificates:**

```bash
# Install mkcert for local development
# macOS
brew install mkcert
mkcert -install

# Ubuntu/Debian  
sudo apt install libnss3-tools
curl -s https://api.github.com/repos/FiloSottile/mkcert/releases/latest | grep browser_download_url | grep linux-amd64 | cut -d '"' -f 4 | wget -qi -
chmod +x mkcert-*-linux-amd64
sudo mv mkcert-*-linux-amd64 /usr/local/bin/mkcert
mkcert -install

# Generate localhost certificate
mkcert localhost 127.0.0.1 ::1
```

## Environment Variables

Set these environment variables before starting OpenFrame:

### Required Variables

```bash
# Database configuration
export MONGO_URI="mongodb://localhost:27017"
export MONGO_DATABASE="openframe"

# Security
export JWT_SECRET="your-secure-jwt-secret-here"

# Application URLs
export OPENFRAME_BASE_URL="https://localhost:3000"
export API_BASE_URL="https://localhost:8080"
```

### Optional Variables

```bash
# Kafka (if using streaming features)
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Cassandra (if using analytics)
export CASSANDRA_CONTACT_POINTS="127.0.0.1"
export CASSANDRA_PORT=9042

# NATS (for real-time features)
export NATS_URL="nats://localhost:4222"

# Development mode
export NODE_ENV="development"
export SPRING_PROFILES_ACTIVE="dev"
```

## Access Requirements

### External Services

If using SSO integration, you'll need:

| Provider | Requirements |
|----------|--------------|
| **Google SSO** | Google Cloud Console project, OAuth2 client credentials |
| **Microsoft SSO** | Azure AD app registration, client credentials |
| **Custom OIDC** | OIDC provider configuration |

### Network Access

Ensure your environment can access:

- **Package registries**: Maven Central, npm registry
- **Container registries**: Docker Hub (if using containers)
- **External APIs**: For tool integrations (Fleet, Tactical RMM)

## Verification Commands

Run these commands to verify your environment:

```bash
#!/bin/bash
echo "Verifying OpenFrame Prerequisites..."

# Check Java
java -version || echo "❌ Java 21 required"

# Check Node.js
node --version || echo "❌ Node.js 18+ required"

# Check Maven
mvn --version || echo "❌ Maven 3.8+ required"

# Check MongoDB
mongosh --eval "db.version()" || echo "❌ MongoDB 5.0+ required"

# Check Git
git --version || echo "❌ Git required"

# Check network connectivity
curl -s https://repo1.maven.org/maven2/ > /dev/null && echo "✅ Maven Central accessible" || echo "❌ Maven Central not accessible"

echo "Prerequisites check complete!"
```

## Next Steps

Once all prerequisites are met:

1. **[Quick Start Guide](quick-start.md)** - Get OpenFrame running quickly
2. **[First Steps](first-steps.md)** - Initial configuration and setup
3. **Development Environment Setup** - For contributors and developers

## Troubleshooting

### Common Issues

**Java Version Conflicts:**
```bash
# Set JAVA_HOME explicitly
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
```

**MongoDB Connection Issues:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# View MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

**Port Conflicts:**
```bash
# Check which process is using a port
sudo netstat -tlnp | grep :3000
sudo lsof -i :3000
```

For additional help, join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).