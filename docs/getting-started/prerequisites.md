# Prerequisites

Before getting started with OpenFrame, ensure your development environment meets the following requirements. This guide covers all necessary software, system requirements, and account setup needed for OpenFrame development and deployment.

## System Requirements

### Minimum Requirements

| Component | Specification |
|-----------|---------------|
| **OS** | macOS 10.15+, Ubuntu 20.04+, Windows 10+ (with WSL2) |
| **CPU** | 4 cores (8+ recommended for development) |
| **Memory** | 8 GB RAM (16+ GB recommended) |
| **Storage** | 50 GB free space (SSD recommended) |
| **Network** | Reliable internet connection for dependencies |

### Recommended for Production

| Component | Specification |
|-----------|---------------|
| **CPU** | 8+ cores per service node |
| **Memory** | 32+ GB RAM per node |
| **Storage** | 500+ GB SSD with RAID |
| **Network** | Gigabit ethernet, redundant connections |

## Required Software

### Core Development Tools

#### Java Development Kit (JDK 21)

OpenFrame requires Java 21 for backend services:

```bash
# Using SDKMAN (recommended)
curl -s "https://get.sdkman.io" | bash
sdk install java 21.0.2-tem
sdk use java 21.0.2-tem

# Verify installation
java -version
```

Expected output:
```text
openjdk version "21.0.2" 2024-01-16
```

#### Apache Maven 3.8+

For building Java services:

```bash
# Using SDKMAN
sdk install maven 3.9.6

# Verify installation
mvn -version
```

#### Node.js 18+ and npm

For frontend development:

```bash
# Using Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

#### Docker and Docker Compose

For running integrated services:

```bash
# Install Docker Desktop (macOS/Windows)
# Visit: https://docs.docker.com/get-docker/

# Linux installation
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker-compose --version
```

#### Rust (Optional)

For client agent development:

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`

# Verify installation
rustc --version
cargo --version
```

### Database Software

#### MongoDB 7.x

For primary data storage:

```bash
# Using Docker (recommended for development)
docker run --name mongodb -d -p 27017:27017 mongo:7

# Or install locally following MongoDB documentation
# https://docs.mongodb.com/manual/installation/
```

#### Redis

For caching and session storage:

```bash
# Using Docker
docker run --name redis -d -p 6379:6379 redis:7-alpine

# Verify connection
redis-cli ping
```

### Message Brokers

#### Apache Kafka

For event streaming:

```bash
# Using Docker Compose (see integrated-tools/ directory)
cd integrated-tools/kafka
docker-compose up -d
```

#### NATS

For real-time messaging:

```bash
# Using Docker
docker run --name nats -d -p 4222:4222 -p 8222:8222 nats:latest
```

## Development Environment Setup

### IDE Configuration

#### IntelliJ IDEA (Recommended)

1. Install IntelliJ IDEA Community/Ultimate
2. Install required plugins:
   - Spring Boot
   - GraphQL
   - Vue.js (for frontend work)
   - Rust (if working with client agent)

#### VS Code Alternative

1. Install Visual Studio Code
2. Install recommended extensions:
   - Extension Pack for Java
   - Spring Boot Extension Pack
   - Vue Language Features (Volar)
   - Rust Analyzer

### Git Configuration

```bash
# Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

## Environment Variables

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# NATS Configuration
NATS_URL=nats://localhost:4222

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-signing-key-here-change-in-production
JWT_EXPIRATION=86400

# OAuth Configuration (for development)
OAUTH_CLIENT_ID=openframe-dev
OAUTH_CLIENT_SECRET=dev-secret-change-in-production

# External Tool Configuration
TACTICAL_RMM_URL=http://localhost:8001
FLEET_MDM_URL=http://localhost:8002
MESHCENTRAL_URL=http://localhost:3000

# AI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### Development vs Production Variables

| Variable | Development | Production Notes |
|----------|-------------|------------------|
| `JWT_SECRET` | Simple string | Use strong 256-bit key |
| `MONGODB_URI` | Local instance | MongoDB cluster with auth |
| `KAFKA_BOOTSTRAP_SERVERS` | Single broker | Multiple brokers with SSL |
| `OAUTH_CLIENT_SECRET` | Simple secret | Cryptographically secure |

## Account Setup

### Required Accounts

#### GitHub Account
- Fork the OpenFrame repository
- Configure SSH keys for repository access

#### Docker Hub Account (Optional)
- For pushing custom images
- Access to private registry if needed

### External Service Accounts (Development)

#### OpenAI (for AI Features)
```bash
# Sign up at https://platform.openai.com/
# Get API key from dashboard
export OPENAI_API_KEY=sk-your-openai-api-key
```

#### Anthropic (Alternative AI Provider)
```bash
# Sign up at https://console.anthropic.com/
export ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

## Verification Commands

Run these commands to verify your environment is properly configured:

### Java Environment
```bash
java -version
mvn --version
echo `$JAVA_HOME`
```

### Node.js Environment
```bash
node --version
npm --version
npx --version
```

### Docker Environment
```bash
docker --version
docker-compose --version
docker ps
```

### Database Connectivity
```bash
# MongoDB
mongosh --eval "db.runCommand('ping')"

# Redis
redis-cli ping

# Or using Docker
docker exec -it mongodb mongosh --eval "db.runCommand('ping')"
docker exec -it redis redis-cli ping
```

### Repository Access
```bash
# Verify Git configuration
git config --list | grep user

# Test repository access
cd openframe-oss-tenant
git status
```

## Common Issues and Solutions

### Java Version Conflicts
If you have multiple Java versions installed:
```bash
# List all Java versions (SDKMAN)
sdk list java

# Set default version
sdk default java 21.0.2-tem

# Verify JAVA_HOME
echo `$JAVA_HOME`
```

### Docker Permission Issues (Linux)
```bash
# Add user to docker group
sudo usermod -aG docker `$USER`
# Logout and login again
```

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs mongodb
```

### Port Conflicts
If you encounter port conflicts, check what's running:
```bash
# Check which process is using a port
lsof -i :27017  # MongoDB
lsof -i :6379   # Redis
lsof -i :9092   # Kafka
```

## Next Steps

Once your environment is configured:

1. **Verify Prerequisites**: Ensure all verification commands pass
2. **Run Quick Start**: Follow the [Quick Start Guide](quick-start.md)
3. **Set Up IDE**: Configure your development environment
4. **Join Community**: Connect with the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

> **💡 Pro Tip**: Keep a development checklist to ensure your environment stays consistent across different machines and team members.

---

Ready to proceed? Move on to the **Quick Start Guide** to get OpenFrame running locally!