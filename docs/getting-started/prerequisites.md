# Prerequisites

Before setting up OpenFrame, ensure your system meets the following requirements:

## System Requirements

### Minimum Hardware
- **CPU**: 4 cores (2.4 GHz or higher)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 50 GB available disk space
- **Network**: Stable internet connection for downloading dependencies

### Recommended Hardware (Production)
- **CPU**: 8+ cores (3.0 GHz or higher)
- **RAM**: 32 GB or more
- **Storage**: 200 GB+ SSD storage
- **Network**: High-bandwidth connection (1 Gbps+)

## Development Environment

### Required Software

#### Java Development
- **OpenJDK 21.0.1+** - Required for Spring Boot services
- **Maven 3.9.6+** - Build and dependency management
- **IDE**: IntelliJ IDEA, Eclipse, or VSCode with Java extensions

#### Frontend Development  
- **Node.js 18+** with npm - Required for Vue.js frontend
- **Modern Browser** - Chrome, Firefox, Safari, or Edge (latest versions)

#### Rust Development (for client agent)
- **Rust 1.70+** with Cargo - Cross-platform agent development
- **Platform-specific tools**:
  - Windows: Visual Studio Build Tools or Visual Studio
  - macOS: Xcode Command Line Tools
  - Linux: GCC and essential build tools

#### Containerization
- **Docker 24.0+** - Container runtime
- **Docker Compose 2.23+** - Multi-container orchestration

#### Version Control
- **Git 2.42+** - Source code management

### Optional Tools

#### Production Deployment
- **Kubernetes 1.28+** - Container orchestration (for production)
- **kubectl** - Kubernetes command-line tool
- **Helm 3.0+** - Kubernetes package manager

#### Development Tools
- **Postman** or **Insomnia** - API testing
- **MongoDB Compass** - Database GUI (optional)
- **Redis CLI** - Cache inspection (optional)

## Authentication Requirements

### GitHub Access
You'll need a **GitHub Personal Access Token (Classic)** with the following permissions:
- `repo` - Full control of private repositories
- `read:packages` - Read access to GitHub packages
- `write:packages` - Write access to GitHub packages

#### Creating a GitHub Token
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the required permissions listed above
4. Set an appropriate expiration date
5. Copy the generated token securely

## Network Configuration

### Required Ports
Ensure the following ports are available:

#### Development Environment
- `8080` - Main application UI
- `8888` - Configuration server
- `5432` - PostgreSQL (if using)
- `27017` - MongoDB
- `6379` - Redis
- `9092` - Kafka
- `8086` - InfluxDB (if using)

#### Production Environment
- `80/443` - HTTP/HTTPS traffic
- `6443` - Kubernetes API server
- Additional ports based on your specific configuration

### Firewall Considerations
- Allow outbound connections to GitHub for package downloads
- Allow inbound connections on the specified ports
- Consider corporate firewall/proxy settings

## Platform-Specific Notes

### Windows
- Enable WSL2 for better Docker performance
- Consider using Git Bash or PowerShell Core
- Ensure Windows Defender exclusions for development directories

### macOS
- Install Homebrew for easier package management
- Ensure Xcode Command Line Tools are installed
- Consider using Docker Desktop for Mac

### Linux
- Ensure your user is in the `docker` group
- Install development packages: `build-essential`, `curl`, `git`
- Consider using your distribution's package manager for tool installation

## Verification Steps

After installing the prerequisites, verify your setup:

```bash
# Check Java version
java -version

# Check Maven version
mvn -version

# Check Node.js and npm versions
node --version
npm --version

# Check Rust version (if applicable)
rustc --version
cargo --version

# Check Docker version
docker --version
docker-compose --version

# Check Git version
git --version
```

## Next Steps

Once all prerequisites are met, proceed to:
1. [Quick Start Guide](quick-start.md) for a rapid setup
2. [Introduction](introduction.md) for a detailed overview
3. [Development Setup](../development/setup/environment.md) for development environment configuration

## Troubleshooting

### Common Issues

#### Java Installation Issues
- Ensure JAVA_HOME is properly set
- Verify PATH includes Java binaries
- Use `alternatives` (Linux) or `java_home` (macOS) for version management

#### Docker Issues
- Ensure Docker daemon is running
- Check Docker Desktop settings on Windows/macOS
- Verify user permissions on Linux

#### Network Issues
- Check corporate proxy settings
- Verify firewall configuration
- Test connectivity to GitHub and other required services

If you encounter issues not covered here, see our [Troubleshooting Guide](../operations/troubleshooting/common-issues.md).