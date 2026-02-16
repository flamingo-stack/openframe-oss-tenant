# Prerequisites

Before installing OpenFrame, ensure your environment meets the following requirements. This guide covers both development and production prerequisites.

## System Requirements

### Minimum Hardware Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB | 200+ GB |
| **Network** | Broadband | Dedicated bandwidth |

### Operating System Support

OpenFrame runs on Linux-based systems with container support:

- **Ubuntu 20.04+ LTS** (Recommended)
- **CentOS 8+ / RHEL 8+**
- **Debian 11+**
- **macOS 12+** (Development only)
- **Windows 10/11** (Development with WSL2)

## Required Software & Versions

### Core Infrastructure

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Docker** | 24.0+ | Container runtime | [Docker Install](https://docs.docker.com/engine/install/) |
| **Docker Compose** | 2.20+ | Multi-container orchestration | Included with Docker Desktop |
| **Git** | 2.30+ | Source code management | `sudo apt install git` |

### Java Development Kit (Backend)

```bash
# Install OpenJDK 21 (Required for Spring Boot services)
sudo apt update
sudo apt install openjdk-21-jdk

# Verify installation
java -version
# Should show: openjdk version "21.x.x"
```

### Node.js & Package Manager (Frontend)

```bash
# Install Node.js 18+ (Required for Next.js frontend)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x or higher
npm --version   # Should be 9.x.x or higher

# Install pnpm (Optional but recommended)
npm install -g pnpm
```

### Apache Maven (Build Tool)

```bash
# Install Maven 3.8+ for Spring Boot builds
sudo apt install maven

# Verify installation
mvn --version
# Should show: Apache Maven 3.8.x or higher
```

## Database Prerequisites

OpenFrame uses multiple databases for different purposes:

### MongoDB (Primary Database)
```bash
# MongoDB is included in Docker Compose setup
# No manual installation required for development
```

**Production Requirements:**
- MongoDB 6.0+ with replica set
- Minimum 4GB allocated memory
- Regular backup strategy

### Apache Kafka (Event Streaming)
```bash
# Kafka is included in Docker Compose setup
# No manual installation required for development
```

**Production Requirements:**
- Kafka 3.6+ cluster
- ZooKeeper ensemble (3+ nodes recommended)
- Adequate disk space for message retention

### Redis (Caching)
```bash
# Redis is included in Docker Compose setup
# No manual installation required for development
```

**Production Requirements:**
- Redis 7.0+ with persistence enabled
- Memory sizing based on cache requirements

### Optional: Analytics Stack
- **Apache Cassandra 4.0+** (for log storage)
- **Apache Pinot 1.2+** (for real-time analytics)

> **Development Note**: These are automatically configured in Docker Compose for local development.

## Network Requirements

### Required Ports

| Port | Service | Purpose | Access |
|------|---------|---------|--------|
| 3000 | Frontend App | Web interface | Public |
| 8080 | API Gateway | Main API endpoint | Internal |
| 8081 | Authorization Server | OAuth2/OIDC | Internal |
| 8082 | API Service | GraphQL + REST | Internal |
| 5432 | PostgreSQL | Authentication data | Internal |
| 27017 | MongoDB | Application data | Internal |
| 9092 | Kafka | Event streaming | Internal |
| 6379 | Redis | Caching | Internal |

### Firewall Configuration

For production deployments:

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (adjust port as needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Authentication & Access Requirements

### OAuth2 Provider Setup

OpenFrame requires OAuth2 providers for authentication. Prepare at least one:

**Google OAuth2:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth2 credentials
5. Add authorized redirect URIs

**Microsoft Azure AD:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Configure authentication
4. Note Application ID and secret

**Required Environment Variables:**
```bash
# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft OAuth2  
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```

## SSL/TLS Certificates

### Development (Self-Signed)
```bash
# Install mkcert for local HTTPS
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Generate local CA
mkcert -install

# Generate certificates for localhost
mkcert localhost 127.0.0.1 ::1
```

### Production
- Valid SSL certificate from trusted CA
- Wildcard certificate recommended for multi-tenant setup
- Certificate renewal automation (Let's Encrypt + certbot)

## Environment Variables Setup

Create a `.env` file for development:

```bash
# Database Configuration
MONGO_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Authentication
JWT_SECRET=your_jwt_secret_min_256_bits
REGISTRATION_SECRET=your_registration_secret

# OAuth2 Providers (configure at least one)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenFrame Configuration
OPENFRAME_DOMAIN=localhost
OPENFRAME_PROTOCOL=https
```

## Tool Integration Prerequisites

### Fleet MDM Integration
- Fleet server instance
- API token with appropriate permissions
- Network connectivity to Fleet API

### Tactical RMM Integration
- Tactical RMM server instance
- API key with agent management permissions
- Webhook endpoint configuration

### MeshCentral Integration
- MeshCentral server instance
- Administrative API access
- WebSocket proxy configuration

## Development Tools (Optional)

### Recommended IDEs
- **IntelliJ IDEA** (Java backend development)
- **Visual Studio Code** (Frontend + general development)
- **DataGrip** (Database management)

### Useful Extensions
```bash
# VS Code Extensions
code --install-extension ms-vscode.vscode-java-pack
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
```

## Verification Commands

Run these commands to verify your environment is ready:

```bash
# Check Java version
java -version
# Expected: OpenJDK 21.x.x

# Check Node.js version
node --version
# Expected: v18.x.x or higher

# Check Maven version
mvn --version  
# Expected: Apache Maven 3.8.x

# Check Docker version
docker --version
# Expected: Docker version 24.x.x

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version 2.20.x

# Test Docker connectivity
docker run hello-world
# Expected: Hello from Docker! message

# Check Git version
git --version
# Expected: git version 2.30.x or higher
```

## Next Steps

Once your environment meets all prerequisites:

1. **[Quick Start Guide](quick-start.md)** - Get OpenFrame running in 5 minutes
2. **[Development Environment Setup](../development/setup/environment.md)** - Configure your development environment  
3. **[Local Development Guide](../development/setup/local-development.md)** - Start developing with OpenFrame

## Troubleshooting

### Common Issues

**Docker permission denied:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

**Port conflicts:**
```bash
# Check which process is using a port
sudo netstat -tulpn | grep :8080
# Kill process if needed
sudo kill -9 <PID>
```

**Java version conflicts:**
```bash
# Switch Java versions with update-alternatives
sudo update-alternatives --config java
```

### Getting Help

- **OpenMSP Slack Community**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> **Note**: We don't use GitHub Issues or GitHub Discussions. All support requests should be posted in our Slack community.