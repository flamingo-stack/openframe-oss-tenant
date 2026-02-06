# Prerequisites Guide

Before installing and running OpenFrame, ensure your environment meets the following requirements and has the necessary tools installed.

## System Requirements

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB SSD | 100+ GB SSD |
| **Network** | 100 Mbps | 1 Gbps |

### Operating System Support

OpenFrame supports the following operating systems:

| OS | Version | Status |
|----|---------|--------|
| **Ubuntu** | 20.04 LTS+ | ✅ Fully Supported |
| **CentOS/RHEL** | 8+ | ✅ Fully Supported |
| **macOS** | 12+ (Monterey) | ✅ Development Only |
| **Windows** | 10/11 | ✅ Development Only |
| **Docker** | 20.10+ | ✅ Recommended |

> **Note**: For production deployments, Linux distributions are strongly recommended.

## Required Software

### 1. Java Development Kit (JDK)

OpenFrame requires Java 21 or later:

```bash
# Check current Java version
java --version

# Ubuntu/Debian installation
sudo apt update
sudo apt install openjdk-21-jdk

# CentOS/RHEL installation
sudo dnf install java-21-openjdk-devel

# macOS installation (using Homebrew)
brew install openjdk@21

# Verify installation
javac --version
```

**Environment Variables:**
```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=$JAVA_HOME/bin:$PATH
```

### 2. Node.js and npm

Frontend development requires Node.js 18+ and npm:

```bash
# Check current Node.js version
node --version
npm --version

# Ubuntu/Debian installation
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS installation
brew install node

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

### 3. Apache Maven

Required for building Java services:

```bash
# Check current Maven version
mvn --version

# Ubuntu/Debian installation
sudo apt update
sudo apt install maven

# CentOS/RHEL installation
sudo dnf install maven

# macOS installation
brew install maven

# Verify installation (should be 3.6.0+)
mvn --version
```

### 4. Docker and Docker Compose

Required for running integrated tools and dependencies:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Test Docker
docker run hello-world
```

### 5. Git

For cloning the repository:

```bash
# Check if Git is installed
git --version

# Ubuntu/Debian installation
sudo apt update
sudo apt install git

# CentOS/RHEL installation
sudo dnf install git

# macOS (usually pre-installed)
git --version
```

### 6. Rust (Optional)

Only required if you plan to build the OpenFrame client agent:

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

## Database Requirements

OpenFrame uses multiple databases that can be run via Docker:

### MongoDB

```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0
```

### Apache Kafka

```bash
# Run Kafka using Docker Compose
# Kafka configuration will be provided in integrated-tools/
```

### Redis

```bash
# Run Redis in Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7.0-alpine
```

## Network Requirements

### Ports

Ensure the following ports are available:

| Service | Port | Purpose |
|---------|------|---------|
| **Gateway** | 8080 | Main API gateway |
| **API Service** | 8081 | GraphQL and REST API |
| **Auth Service** | 8082 | OAuth2/OIDC server |
| **Frontend** | 3000 | Web application (dev) |
| **MongoDB** | 27017 | Database |
| **Kafka** | 9092 | Message streaming |
| **Redis** | 6379 | Caching |

### Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw allow 8080:8082/tcp
sudo ufw allow 3000/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=8080-8082/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Environment Variables

Set up the following environment variables before starting:

```bash
# Core Configuration
export OPENFRAME_ENV=development
export SPRING_PROFILES_ACTIVE=local

# Database URLs
export MONGODB_URI=mongodb://admin:password@localhost:27017/openframe?authSource=admin
export REDIS_URL=redis://localhost:6379
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# JWT Configuration
export JWT_SECRET=your-secret-key-here
export JWT_ISSUER=http://localhost:8082

# Application URLs
export GATEWAY_URL=http://localhost:8080
export FRONTEND_URL=http://localhost:3000
```

Add these to your `~/.bashrc` or `~/.zshrc` for persistence:

```bash
echo 'export OPENFRAME_ENV=development' >> ~/.bashrc
source ~/.bashrc
```

## Verification Checklist

Run these commands to verify your environment is ready:

```bash
# Check Java version (should be 21+)
java --version

# Check Maven version (should be 3.6.0+)
mvn --version

# Check Node.js version (should be 18+)
node --version

# Check npm version (should be 9+)
npm --version

# Check Docker version (should be 20.10+)
docker --version

# Check Docker Compose version (should be 2.0+)
docker-compose --version

# Test Docker connectivity
docker run hello-world

# Check Git version
git --version

# Verify network ports are free
netstat -tuln | grep -E ':(8080|8081|8082|3000|27017|9092|6379)'
```

## Optional Tools

### IDE Recommendations

- **IntelliJ IDEA**: Excellent Java and Spring Boot support
- **Visual Studio Code**: Great for frontend development
- **Eclipse**: Alternative Java IDE

### Development Tools

```bash
# HTTPie for API testing
pip install httpie

# jq for JSON processing
sudo apt install jq  # Ubuntu/Debian
brew install jq      # macOS

# curl for HTTP requests (usually pre-installed)
curl --version
```

## Troubleshooting Common Issues

### Java Issues

If you have multiple Java versions:

```bash
# Ubuntu/Debian: Use update-alternatives
sudo update-alternatives --config java
sudo update-alternatives --config javac

# macOS: Use jenv
brew install jenv
jenv add /usr/local/opt/openjdk@21
jenv global 21
```

### Docker Issues

If Docker commands require sudo:

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in, or run:
newgrp docker
```

### Port Conflicts

If ports are already in use:

```bash
# Find process using port 8080
lsof -i :8080
# Kill the process
sudo kill -9 <PID>
```

## Next Steps

Once your environment meets all prerequisites, proceed to the [Quick Start Guide](quick-start.md) to get OpenFrame running in minutes.