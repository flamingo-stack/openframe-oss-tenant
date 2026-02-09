# Prerequisites

Before installing OpenFrame, ensure your environment meets the following requirements.

## System Requirements

### Minimum Hardware

| Component | Requirement | Recommended |
|-----------|-------------|-------------|
| **CPU** | 4 cores (x86_64/ARM64) | 8+ cores |
| **RAM** | 8GB available | 16GB+ |
| **Storage** | 50GB free space | 100GB+ SSD |
| **Network** | 100 Mbps internet | 1 Gbps+ |

### Supported Operating Systems

**Server Deployment:**
- Ubuntu 20.04+ LTS
- CentOS 8+ / RHEL 8+
- Debian 11+
- macOS 12+ (development only)
- Windows Server 2019+ (development only)

**Client Management:**
- Windows 10/11
- macOS 11+
- Ubuntu 18.04+
- Most Linux distributions

## Required Software

### Container Runtime

OpenFrame requires Docker and Docker Compose:

| Software | Version | Purpose |
|----------|---------|---------|
| **Docker** | 24.0+ | Container runtime |
| **Docker Compose** | 2.20+ | Service orchestration |

**Installation commands:**

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify installation
docker --version
docker compose version
```

### Java Development Kit

For development and source builds:

| Software | Version | Purpose |
|----------|---------|---------|
| **OpenJDK** | 21+ | Java runtime |
| **Maven** | 3.9+ | Build tool |

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install openjdk-21-jdk maven

# Verify installation
java --version
mvn --version
```

### Node.js and npm

For frontend development:

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18+ LTS | JavaScript runtime |
| **npm** | 9+ | Package manager |

```bash
# Using Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install --lts
nvm use --lts

# Verify installation
node --version
npm --version
```

## Database Services

OpenFrame integrates with multiple data stores:

### Core Databases

| Service | Version | Purpose | Required |
|---------|---------|---------|----------|
| **MongoDB** | 7.0+ | Operational data | ✅ Yes |
| **Redis** | 7.0+ | Caching layer | ✅ Yes |
| **Apache Kafka** | 3.6+ | Event streaming | ✅ Yes |

### Analytics (Optional)

| Service | Version | Purpose | Required |
|---------|---------|---------|----------|
| **Apache Pinot** | 1.2+ | Real-time analytics | ⚠️ Optional |
| **Apache Cassandra** | 4.0+ | Time-series data | ⚠️ Optional |

> **Note**: Docker Compose configurations are provided for all services.

## Network Requirements

### Inbound Ports

Ensure these ports are available on your server:

| Port | Service | Protocol | Purpose |
|------|---------|----------|---------|
| **443** | Gateway | HTTPS | Web interface |
| **80** | Gateway | HTTP | Redirect to HTTPS |
| **8443** | API Gateway | HTTPS | API endpoints |
| **8080** | Management | HTTP | Admin interface |

### Outbound Connectivity

OpenFrame requires internet access for:

- Container image downloads
- NPM package installation
- Maven dependency resolution
- External tool integrations
- License validation

### Domain Requirements

**Development**: 
- `localhost` access sufficient

**Production**: 
- Valid domain name required
- SSL certificate (Let's Encrypt supported)
- DNS control for subdomain configuration

## Environment Variables

Set these environment variables before installation:

### Core Configuration

```bash
# Tenant configuration
export TENANT_DOMAIN="your-company.openframe.local"
export TENANT_NAME="Your Company"

# Database URLs
export MONGODB_URL="mongodb://localhost:27017/openframe"
export REDIS_URL="redis://localhost:6379"

# Security settings
export JWT_SECRET="your-super-secure-secret-key-here"
export ENCRYPTION_KEY="your-encryption-key-for-sensitive-data"
```

### OAuth2 Configuration

```bash
# OAuth2 providers (optional)
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"

export MICROSOFT_CLIENT_ID="your-azure-client-id"
export MICROSOFT_CLIENT_SECRET="your-azure-client-secret"
```

### External Services

```bash
# Email configuration
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"

# Optional: HubSpot integration
export HUBSPOT_API_KEY="your-hubspot-api-key"
```

## Account Requirements

### Required Accounts

For basic functionality:
- **None required** — OpenFrame works fully offline

### Optional Integrations

For enhanced features:

| Service | Purpose | Setup Required |
|---------|---------|----------------|
| **Google Workspace** | SSO authentication | OAuth2 app registration |
| **Microsoft Azure AD** | SSO authentication | App registration |
| **HubSpot** | Email notifications | API key generation |

### External Tool Accounts

To manage external MSP tools:

| Tool | Purpose | Configuration |
|------|---------|--------------|
| **Tactical RMM** | Endpoint management | API token |
| **MeshCentral** | Remote access | Server setup |
| **Fleet MDM** | Device management | Cloud account |

> **Note**: External tools are optional and can be added after initial setup.

## Verification Commands

Before proceeding, verify your environment:

```bash
# Check system requirements
echo "CPU Cores: $(nproc)"
echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Disk Space: $(df -h / | awk 'NR==2 {print $4}')"

# Verify software versions
docker --version
docker compose version
java --version
mvn --version

# Test database connectivity
docker run --rm mongo:7 mongosh --version
docker run --rm redis:7 redis-cli --version

# Check network connectivity
curl -I https://github.com
curl -I https://registry.npmjs.org
```

## Common Issues

### Permission Problems

```bash
# Add user to docker group (logout/login required)
sudo usermod -aG docker `$USER`

# Fix Maven permissions
sudo chown -R `$USER`:`$USER` ~/.m2
```

### Network Issues

```bash
# Check firewall status
sudo ufw status

# Open required ports (Ubuntu)
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080
sudo ufw allow 8443
```

### Java Version Conflicts

```bash
# List installed Java versions
sudo update-alternatives --list java

# Set Java 21 as default
sudo update-alternatives --config java
```

## Next Steps

Once your environment meets all prerequisites:

1. **[Quick Start Guide](quick-start.md)** — Get OpenFrame running in 5 minutes
2. **[First Steps Guide](first-steps.md)** — Initial configuration and exploration

---

Need help? Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support.