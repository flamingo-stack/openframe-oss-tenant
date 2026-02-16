# Prerequisites

Before you begin setting up OpenFrame, ensure your environment meets the following requirements. This guide covers all the necessary software, hardware, and system requirements for a successful OpenFrame deployment.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Storage** | 50 GB available | 100+ GB available |
| **Network** | 100 Mbps | 1 Gbps |

### Supported Operating Systems

#### For OpenFrame Services
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+
- **macOS**: 11.0+ (for development)
- **Windows**: Windows Server 2019+ or Windows 10+ (via Docker)

#### For Client Agents
- **Windows**: Windows 10+, Windows Server 2016+
- **macOS**: 10.15+
- **Linux**: Most modern distributions (Ubuntu 18.04+, CentOS 7+, etc.)

## Required Software

### Container Runtime

OpenFrame uses Docker for containerization and easy deployment.

#### Docker & Docker Compose

| Software | Version | Installation |
|----------|---------|-------------|
| **Docker** | 20.10+ | [Docker Installation Guide](https://docs.docker.com/get-docker/) |
| **Docker Compose** | 2.0+ | [Docker Compose Installation](https://docs.docker.com/compose/install/) |

**Verification Commands:**
```bash
docker --version
docker-compose --version
```

Expected output:
```text
Docker version 20.10.x, build xxxx
Docker Compose version v2.x.x
```

### Java Development (for Backend Services)

#### Java Runtime & Development Kit

| Component | Version | Required For |
|-----------|---------|-------------|
| **Java JDK** | 21+ | Backend services compilation |
| **Maven** | 3.8+ | Build management |

**Installation verification:**
```bash
java --version
mvn --version
```

### Node.js & npm (for Frontend)

| Component | Version | Required For |
|-----------|---------|-------------|
| **Node.js** | 18+ | Frontend development and build |
| **npm** | 9+ | Package management |

**Installation verification:**
```bash
node --version
npm --version
```

### Rust (for Client Agents)

| Component | Version | Required For |
|-----------|---------|-------------|
| **Rust** | 1.70+ | OpenFrame client agent compilation |
| **Cargo** | Latest | Rust package management |

**Installation:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source `$HOME/.cargo/env`
```

**Verification:**
```bash
rustc --version
cargo --version
```

## Database Requirements

### MongoDB

OpenFrame uses MongoDB as its primary operational database.

| Component | Version | Purpose |
|-----------|---------|---------|
| **MongoDB** | 6.0+ | User data, organizations, devices |

**Docker deployment (recommended):**
```bash
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:6.0
```

### Apache Kafka

Required for real-time data streaming and event processing.

| Component | Version | Purpose |
|-----------|---------|---------|
| **Apache Kafka** | 3.6+ | Event streaming, real-time processing |
| **Zookeeper** | 3.8+ | Kafka coordination |

### Apache Pinot (Analytics)

For real-time analytics and reporting functionality.

| Component | Version | Purpose |
|-----------|---------|---------|
| **Apache Pinot** | 1.0+ | Real-time analytics queries |

### Cassandra (Time-series Data)

For high-volume time-series data storage.

| Component | Version | Purpose |
|-----------|---------|---------|
| **Apache Cassandra** | 4.0+ | Time-series event data |

## Network Requirements

### Port Configuration

Ensure the following ports are available and not blocked by firewalls:

#### Core Services
| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Gateway | 8080 | HTTP/HTTPS | Main API gateway |
| Frontend | 3000 | HTTP | Development server |
| Authorization | 9000 | HTTP | OAuth2 server |
| API Service | 8081 | HTTP | Internal API |

#### Databases
| Database | Port | Protocol |
|----------|------|----------|
| MongoDB | 27017 | TCP |
| Kafka | 9092 | TCP |
| Cassandra | 9042 | TCP |
| Pinot | 9000, 8000 | TCP |

#### Agent Communication
| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| NATS | 4222 | TCP | Agent messaging |
| WebSocket | 8080/ws | WebSocket | Real-time updates |

### Firewall Configuration

For production deployments, ensure your firewall allows:
- Inbound traffic on configured service ports
- Outbound HTTPS traffic (port 443) for external integrations
- Inter-service communication between OpenFrame components

## Account Requirements

### External Service Accounts

Some OpenFrame features require external service accounts:

#### Optional Integrations
| Service | Required For | Setup |
|---------|-------------|-------|
| **Google Workspace** | Google SSO integration | [Google Cloud Console](https://console.cloud.google.com) |
| **Microsoft Azure AD** | Microsoft SSO integration | [Azure Portal](https://portal.azure.com) |
| **GitHub** | Client agent updates | GitHub personal access token |

## Environment Variables

Prepare these environment variables for configuration:

### Essential Configuration
```bash
# Database connections
export MONGODB_URI="mongodb://admin:password@localhost:27017/openframe"
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
export CASSANDRA_CONTACT_POINTS="localhost:9042"
export PINOT_BROKER_URL="localhost:8000"

# Security
export JWT_SECRET="your-jwt-secret-key-here"
export OPENFRAME_ENCRYPTION_KEY="your-encryption-key-here"

# Optional: External integrations
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

> **Security Note**: Use strong, randomly generated secrets for production deployments. Never commit secrets to version control.

## Development Environment Setup

### IDE Recommendations

| IDE | Language | Recommended Extensions |
|-----|----------|----------------------|
| **IntelliJ IDEA** | Java | Spring Boot, GraphQL |
| **VS Code** | TypeScript/React | Vue.js, Prettier, ESLint |
| **VS Code** | Rust | rust-analyzer, CodeLLDB |

### Git Configuration

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Verification Checklist

Before proceeding to installation, verify all prerequisites:

### System Check
- [ ] Operating system meets requirements
- [ ] Sufficient hardware resources available
- [ ] Required ports are open and available

### Software Check
- [ ] Docker and Docker Compose installed
- [ ] Java 21+ installed (for backend development)
- [ ] Node.js 18+ installed (for frontend development)  
- [ ] Rust 1.70+ installed (for client agent development)

### Database Check
- [ ] MongoDB accessible
- [ ] Kafka cluster available
- [ ] Required network connectivity established

### Environment Check
- [ ] Environment variables configured
- [ ] External service accounts ready (if needed)
- [ ] Development tools and IDE configured

## Troubleshooting Common Issues

### Docker Issues
**Problem**: Docker daemon not running
**Solution**: 
```bash
# Linux/macOS
sudo systemctl start docker

# Windows
# Start Docker Desktop application
```

### Port Conflicts
**Problem**: Port already in use
**Solution**: 
```bash
# Find process using port
netstat -tulpn | grep :8080
# Kill process or use different port
```

### Java Version Issues
**Problem**: Wrong Java version
**Solution**: 
```bash
# Use JAVA_HOME environment variable
export JAVA_HOME=/path/to/java21
```

## Next Steps

Once you've completed the prerequisites:

1. **Quick Start**: Follow the [Quick Start Guide](quick-start.md) for immediate setup
2. **Development Setup**: See the development environment guides for detailed configuration
3. **Production Deployment**: Review the production deployment documentation

All prerequisites met? You're ready to start your OpenFrame journey! 🚀