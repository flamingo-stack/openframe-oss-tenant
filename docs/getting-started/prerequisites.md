# Prerequisites

Before installing and running OpenFrame, ensure your system meets the following requirements and has the necessary tools installed.

## System Requirements

### Minimum Hardware Requirements

| Component | Requirement | Recommended |
|-----------|-------------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 20 GB free space | 50+ GB SSD |
| Network | Stable internet connection | High-speed broadband |

### Operating System Support

OpenFrame supports the following operating systems:

| OS | Version | Status |
|----|---------|--------|
| **macOS** | 12.0+ (Monterey) | ✅ Fully Supported |
| **Linux** | Ubuntu 20.04+, CentOS 8+, RHEL 8+ | ✅ Fully Supported |
| **Windows** | Windows 10/11 | ✅ Fully Supported |

## Required Software Dependencies

### Java Development Kit (JDK)

OpenFrame requires **Java 21** for all backend services.

**Installation:**

```bash
# macOS (using Homebrew)
brew install openjdk@21

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install openjdk-21-jdk

# Linux (CentOS/RHEL)
sudo yum install java-21-openjdk-devel

# Verify installation
java -version
```

**Expected output:**
```text
openjdk version "21.0.x" 2023-xx-xx
OpenJDK Runtime Environment (build 21.0.x)
OpenJDK 64-Bit Server VM (build 21.0.x)
```

### Apache Maven

**Maven 3.9+** is required for building Java services.

```bash
# macOS
brew install maven

# Linux (Ubuntu/Debian)
sudo apt install maven

# Linux (CentOS/RHEL)
sudo yum install maven

# Verify installation
mvn -version
```

### Docker & Docker Compose

**Docker 24.0+** is required for containerized infrastructure components.

```bash
# macOS
brew install --cask docker

# Linux - Follow Docker's official installation guide
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

### Node.js & npm

**Node.js 18+** is required for frontend development and build processes.

```bash
# macOS
brew install node@18

# Linux (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Rust (Optional - for Client Agent)

**Rust 1.70+** is required only if building the client agent from source.

```bash
# All platforms
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify installation
rustc --version
cargo --version
```

## Access Requirements

### GitHub Access Token

OpenFrame requires access to private repositories during setup. You'll need a **GitHub Personal Access Token** with repository access.

**To create a token:**

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo` (Full control of private repositories)
4. Copy and save the token securely

### Network Access

Ensure your system can access:

| Service | Purpose | Default Port |
|---------|---------|-------------|
| MongoDB | Database access | 27017 |
| Kafka | Message streaming | 9092 |
| Redis | Caching | 6379 |
| HTTP/HTTPS | API communications | 80/443 |
| WebSocket | Real-time updates | 80/443 |

## Environment Variables

Set the following environment variables before starting OpenFrame:

### Required Variables

```bash
# GitHub access for private repositories
export GITHUB_TOKEN=your_github_token_here

# Java configuration
export JAVA_HOME=/path/to/java-21

# Maven configuration (if custom location)
export M2_HOME=/path/to/maven
export PATH=$M2_HOME/bin:$PATH
```

### Optional Variables

```bash
# Override default database hosts
export MONGODB_HOST=localhost
export KAFKA_HOST=localhost
export REDIS_HOST=localhost

# Development mode flags
export OPENFRAME_DEV_MODE=true
export LOG_LEVEL=DEBUG
```

## Verification Commands

Run these commands to verify your system is ready:

### System Check Script

```bash
# Check Java version
java -version 2>&1 | grep -q "21" && echo "✅ Java 21 installed" || echo "❌ Java 21 required"

# Check Maven
mvn -version 2>&1 | grep -q "Maven" && echo "✅ Maven installed" || echo "❌ Maven required"

# Check Docker
docker --version 2>&1 | grep -q "Docker" && echo "✅ Docker installed" || echo "❌ Docker required"

# Check Node.js
node --version 2>&1 | grep -q "v18\|v19\|v20" && echo "✅ Node.js 18+ installed" || echo "❌ Node.js 18+ required"

# Check network connectivity
curl -s https://github.com >/dev/null && echo "✅ Network access OK" || echo "❌ Network access failed"
```

### Port Availability Check

```bash
# Check if required ports are available
for port in 8080 8888 27017 9092 6379; do
  if lsof -i :$port >/dev/null 2>&1; then
    echo "⚠️  Port $port is in use"
  else
    echo "✅ Port $port is available"
  fi
done
```

## Platform-Specific Setup

### macOS Additional Setup

```bash
# Install Xcode command line tools (if not already installed)
xcode-select --install

# Increase file descriptor limit
echo "ulimit -n 4096" >> ~/.bash_profile
# or for zsh
echo "ulimit -n 4096" >> ~/.zshrc
```

### Linux Additional Setup

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Add user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Windows Additional Setup

**Using PowerShell as Administrator:**

```powershell
# Enable Windows Subsystem for Linux (WSL2) if not already enabled
wsl --install

# Set execution policy for PowerShell scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Windows Terminal for better development experience
winget install Microsoft.WindowsTerminal
```

## Troubleshooting

### Common Issues

**Java Installation Issues:**

```bash
# If JAVA_HOME is not set correctly
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
echo $JAVA_HOME
```

**Docker Permission Issues (Linux):**

```bash
# If you get permission errors with Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
```

**Port Conflicts:**

```bash
# Kill processes using required ports
sudo lsof -ti:8080 | xargs sudo kill -9
sudo lsof -ti:8888 | xargs sudo kill -9
```

## Next Steps

Once your system meets all prerequisites:

1. Verify all installations with the commands above
2. Set up required environment variables
3. Proceed to the [Quick Start Guide](quick-start.md) to deploy OpenFrame

If you encounter any issues during prerequisite setup, please reach out on our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for assistance.