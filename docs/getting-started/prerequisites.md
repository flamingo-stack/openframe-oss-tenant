# Prerequisites

Before installing OpenFrame, ensure your environment meets the following requirements and has the necessary tools installed.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **Memory** | 8 GB RAM | 16+ GB RAM |
| **Storage** | 50 GB SSD | 100+ GB NVMe SSD |
| **Network** | 100 Mbps | 1 Gbps |

### Operating System Support

OpenFrame supports the following operating systems:

| OS | Version | Status |
|----|---------| -------|
| **Linux** | Ubuntu 20.04+, RHEL 8+, Debian 11+ | ✅ Fully Supported |
| **macOS** | 11.0+ (Intel/Apple Silicon) | ✅ Fully Supported |
| **Windows** | Windows 10/11, Server 2019+ | ✅ Fully Supported |

## Required Software

### Development Runtime

**Java Development Kit (JDK) 21**
```bash
# Check current version
java --version

# Ubuntu/Debian
sudo apt install openjdk-21-jdk

# macOS (Homebrew)
brew install openjdk@21

# Windows
# Download from Oracle or use Chocolatey:
# choco install openjdk21
```

**Apache Maven 3.9+**
```bash
# Check current version
mvn --version

# Ubuntu/Debian
sudo apt install maven

# macOS (Homebrew)
brew install maven

# Windows (Chocolatey)
# choco install maven
```

### Container Platform

**Docker 24.0+ and Docker Compose**
```bash
# Check current version
docker --version
docker-compose --version

# Ubuntu/Debian
sudo apt install docker.io docker-compose-plugin

# macOS
# Install Docker Desktop from docker.com

# Windows
# Install Docker Desktop from docker.com
```

**Post-Docker Installation (Linux)**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Logout and login again, then test
docker run hello-world
```

### Frontend Development (Optional)

**Node.js 18+ and npm**
```bash
# Check current version
node --version
npm --version

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (Homebrew)
brew install node@18

# Windows
# Download from nodejs.org or use Chocolatey:
# choco install nodejs
```

### Client Agent Development (Optional)

**Rust 1.70+**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

## Access Requirements

### GitHub Access

OpenFrame requires access to private repositories during setup:

**Personal Access Token (Required)**
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Generate new token (classic) with these scopes:
   - `repo` (Full control of private repositories)
   - `packages:read` (Download packages from GitHub Package Registry)
3. Save the token securely - you'll need it during setup

### Network Requirements

**Outbound Internet Access Required:**
- GitHub API and repositories
- Docker Hub and container registries
- Maven Central and npm registries
- Tool integration endpoints (Tactical RMM, etc.)

**Required Ports:**
| Port | Service | Description |
|------|---------|-------------|
| 8080 | Frontend | Web dashboard access |
| 8088 | Gateway | API gateway |
| 8082 | API Service | GraphQL endpoint |
| 8888 | Config Server | Configuration management |
| 9092 | Kafka | Message streaming |
| 6379 | Redis | Caching and sessions |
| 27017 | MongoDB | Primary database |

## Environment Variables

Create a `.env` file in your OpenFrame directory with required values:

```bash
# GitHub Access (Required)
GITHUB_TOKEN=your_github_personal_access_token

# Database Configuration (Optional - defaults provided)
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DATABASE=openframe

# Kafka Configuration (Optional - defaults provided)  
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Redis Configuration (Optional - defaults provided)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration (Generated automatically if not provided)
JWT_SECRET=your_secure_jwt_secret_here
```

## Verification Commands

Run these commands to verify your environment is ready:

### Java and Maven
```bash
# Verify Java version
java --version
# Expected: openjdk 21.0.x or higher

# Verify Maven
mvn --version
# Expected: Apache Maven 3.9.x or higher
```

### Docker and Compose
```bash
# Test Docker
docker run hello-world
# Expected: "Hello from Docker!" message

# Test Docker Compose
docker-compose --version
# Expected: docker-compose version 2.x.x or higher
```

### Network Connectivity
```bash
# Test GitHub access
curl -H "Authorization: token YOUR_GITHUB_TOKEN" https://api.github.com/user
# Expected: JSON response with your GitHub user info

# Test internet connectivity
curl -I https://google.com
# Expected: HTTP 200 response
```

### Port Availability
```bash
# Check if required ports are available
netstat -an | grep :8080
netstat -an | grep :8088
netstat -an | grep :8082

# No output means ports are available (good)
# If ports are in use, you'll need to stop conflicting services
```

## Optional Components

### Kubernetes (For Production)

If you plan to deploy in production:

**kubectl and Helm**
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://get.helm.sh/helm-v3.12.0-linux-amd64.tar.gz | tar xz
sudo mv linux-amd64/helm /usr/local/bin/helm
```

**Kubernetes Cluster Access**
- Local: Docker Desktop, Kind, or Minikube
- Cloud: AWS EKS, Azure AKS, or Google GKE
- On-premise: kubeconfig file with cluster access

### Integrated Tools (Optional)

These tools integrate with OpenFrame but are not required for initial setup:

- **Tactical RMM** - IT management suite
- **MeshCentral** - Remote management platform
- **Fleet MDM** - Mobile device management
- **Authentik** - Identity provider

## Troubleshooting

### Common Issues

**Docker Permission Denied (Linux)**
```bash
# Solution: Add user to docker group
sudo usermod -aG docker $USER
# Then logout and login again
```

**Maven Build Fails**
```bash
# Clear Maven cache
rm -rf ~/.m2/repository
# Then retry build
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :8080
# Kill the process
kill -9 PID
```

**GitHub Token Access Issues**
```bash
# Test token
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
# Verify token has required scopes
```

## Ready to Continue?

Once your environment meets all prerequisites, you're ready to proceed:

- [Quick Start](quick-start.md) - Get OpenFrame running in 5 minutes
- [First Steps](first-steps.md) - Essential configuration walkthrough

---

**💡 Pro Tip**: Save your environment verification commands in a script for easy re-checking during development!