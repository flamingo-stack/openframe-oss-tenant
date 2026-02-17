# Prerequisites

Before setting up OpenFrame, ensure your environment meets the following requirements. This guide covers system requirements, software dependencies, and account prerequisites for a successful deployment.

## System Requirements

### Backend Services (Java/Spring Boot)

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Storage** | 20 GB | 50+ GB SSD |
| **Java Version** | Java 21 | Java 21+ |
| **OS** | Linux, macOS, Windows | Linux (Ubuntu 20.04+) |

### Frontend Application (Node.js/TypeScript)

| Component | Requirement |
|-----------|-------------|
| **Node.js** | 18+ |
| **npm/yarn** | Latest stable |
| **Browser Support** | Chrome 90+, Firefox 88+, Safari 14+ |

### Client Agent (Rust)

| Platform | Support Level |
|----------|---------------|
| **Windows** | ✅ Full support (Windows 10+) |
| **macOS** | ✅ Full support (macOS 10.15+) |
| **Linux** | ✅ Full support (Ubuntu 18.04+, CentOS 7+) |

## Software Dependencies

### Required Infrastructure Components

#### Database Systems
- **MongoDB** 5.0+ (primary data store)
- **Apache Cassandra** 4.0+ (audit/event storage)
- **Redis** 6.0+ (caching and enrichment)

#### Messaging & Streaming
- **Apache Kafka** 3.6.0+ (event streaming)
- **NATS JetStream** 2.9+ (real-time messaging)

#### Build Tools
- **Maven** 3.8+ (Java backend build)
- **Node.js** 18+ with npm/yarn (frontend build)
- **Rust** 1.70+ (client agent build)

### Development Tools

| Tool | Purpose | Version |
|------|---------|---------|
| **Docker** | Containerization | 20.10+ |
| **Docker Compose** | Local orchestration | 2.0+ |
| **Git** | Version control | 2.30+ |
| **curl** | API testing | Latest |

## Environment Variables

### Backend Configuration

Set these environment variables for backend services:

```bash
# Database Connections
MONGODB_URI=mongodb://localhost:27017/openframe
CASSANDRA_CONTACT_POINTS=localhost:9042
REDIS_URL=redis://localhost:6379

# Messaging
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
NATS_URL=nats://localhost:4222

# Security
JWT_ISSUER_URI=http://localhost:8080/auth/realms/openframe
SPRING_SECURITY_OAUTH2_CLIENT_PROVIDER_GOOGLE_ISSUER_URI=https://accounts.google.com

# Application
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=local
```

### Frontend Configuration

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
NEXT_PUBLIC_AUTH_URL=http://localhost:8081
```

## Account Requirements

### Third-Party Service Accounts

#### OAuth Providers (Optional, for SSO)
- **Google OAuth2**: Client ID and Client Secret
- **Microsoft Azure AD**: Application ID and Client Secret

#### AI Services (for Mingo AI)
- **Anthropic API**: API key for Claude integration
- **OpenAI API**: API key for GPT integration (alternative)

### Development Access

- **GitHub Account**: For accessing repositories and CI/CD
- **Docker Hub Account**: For pulling container images (optional)

## Network Requirements

### Ports Configuration

Ensure these ports are available:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Gateway** | 8080 | HTTP/HTTPS | Main API gateway |
| **Auth Server** | 8081 | HTTP | OAuth2/OIDC provider |
| **Frontend** | 3000 | HTTP | React application (dev) |
| **MongoDB** | 27017 | TCP | Database connection |
| **Cassandra** | 9042 | TCP | Audit storage |
| **Redis** | 6379 | TCP | Caching |
| **Kafka** | 9092 | TCP | Event streaming |
| **NATS** | 4222 | TCP | Real-time messaging |

### Firewall Rules

For production deployments:

```bash
# Allow inbound HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow agent connections
ufw allow 8080/tcp

# Internal service communication (restrict to internal network)
ufw allow from 10.0.0.0/8 to any port 27017
ufw allow from 10.0.0.0/8 to any port 9042
ufw allow from 10.0.0.0/8 to any port 6379
```

## Verification Commands

Run these commands to verify your environment:

### Java Environment
```bash
java --version
# Expected: openjdk 21.x.x

mvn --version
# Expected: Apache Maven 3.8.x
```

### Node.js Environment
```bash
node --version
# Expected: v18.x.x or higher

npm --version
# Expected: 9.x.x or higher
```

### Rust Environment (for client development)
```bash
rustc --version
# Expected: rustc 1.70.x or higher

cargo --version
# Expected: cargo 1.70.x or higher
```

### Docker Environment
```bash
docker --version
# Expected: Docker version 20.10.x

docker-compose --version
# Expected: docker-compose version 2.x.x
```

## Security Considerations

### SSL/TLS Certificates
- Development: Self-signed certificates are acceptable
- Production: Use valid SSL certificates from a trusted CA
- Let's Encrypt recommended for cost-effective SSL

### API Keys and Secrets
- Store sensitive values in environment variables
- Use secrets management in production (HashiCorp Vault, AWS Secrets Manager)
- Rotate keys regularly

### Network Security
- Enable firewall on all systems
- Use VPN for remote access to infrastructure
- Implement network segmentation for production

## Ready to Proceed?

Once you've verified all prerequisites are met:

1. ✅ System requirements satisfied
2. ✅ Required software installed
3. ✅ Environment variables configured
4. ✅ Network ports available
5. ✅ Accounts and API keys obtained

You're ready to proceed with the [Quick Start Guide](./quick-start.md)!

## Troubleshooting Prerequisites

### Common Issues

**Java Version Mismatch**
```bash
# Check multiple Java installations
update-alternatives --config java

# Set JAVA_HOME explicitly
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

**Node.js Version Issues**
```bash
# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
```

**Port Conflicts**
```bash
# Check what's using a port
lsof -i :8080

# Kill process using port
sudo kill -9 <PID>
```

For additional help, join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) where our community can assist with environment setup questions.