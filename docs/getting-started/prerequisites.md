# Prerequisites

This guide covers the system requirements and prerequisites needed to run OpenFrame successfully.

## System Requirements

### Minimum Hardware Requirements

| Component | Minimum Specification |
|-----------|----------------------|
| CPU | 4 cores (x86_64 or ARM64) |
| RAM | 8 GB available memory |
| Storage | 20 GB free disk space |
| Network | Stable internet connection |

### Recommended Hardware Requirements

| Component | Recommended Specification |
|-----------|--------------------------|
| CPU | 8+ cores (x86_64 or ARM64) |
| RAM | 16+ GB available memory |
| Storage | 50+ GB SSD storage |
| Network | High-speed internet with static IP |

## Operating System Support

OpenFrame supports the following operating systems:

### Server/Development Environment
- **Linux**: Ubuntu 20.04+, CentOS 8+, RHEL 8+, Debian 11+
- **macOS**: macOS 11+ (Big Sur or later)  
- **Windows**: Windows 10/11, Windows Server 2019+

### Client Agent Support
- **Windows**: Windows 10/11, Windows Server 2016+
- **macOS**: macOS 10.15+ (Catalina or later)
- **Linux**: Most modern distributions with systemd

## Software Dependencies

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Java** | 21+ | Backend services runtime |
| **Maven** | 3.8+ | Build and dependency management |
| **MongoDB** | 5.0+ | Primary database |
| **Redis** | 6.2+ | Caching and session storage |
| **Apache Kafka** | 3.6+ | Event streaming |
| **NATS** | 2.9+ | Real-time messaging |

### Development Tools (Optional)

| Tool | Purpose |
|------|---------|
| **Git** | Source code version control |
| **Docker** | Containerization and local development |
| **Node.js** | Frontend development and tooling |
| **Rust** | Client agent development |

## Network Requirements

### Ports and Connectivity

Ensure the following ports are available:

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| **Gateway** | 8080 | HTTP | Main application gateway |
| **API Server** | 8081 | HTTP | Internal API services |
| **Authorization** | 8082 | HTTP | OAuth2/OIDC authentication |
| **MongoDB** | 27017 | TCP | Database connections |
| **Redis** | 6379 | TCP | Cache and sessions |
| **Kafka** | 9092 | TCP | Event streaming |
| **NATS** | 4222 | TCP | Real-time messaging |

### Firewall Configuration

- Ensure outbound HTTPS (443) access for external integrations
- Allow inbound connections on configured service ports
- Configure internal network routing if running distributed services

## Database Setup

### MongoDB Configuration

MongoDB must be properly configured before starting OpenFrame:

1. **Install MongoDB 5.0+**
2. **Enable authentication** (recommended for production)
3. **Create dedicated database** and user for OpenFrame
4. **Configure replica set** (required for change streams)

### Redis Configuration

Redis should be configured with:

1. **Persistence enabled** for session storage
2. **Memory management** configured appropriately
3. **Network security** if running remotely

## User Permissions

### Service Account Requirements

The user running OpenFrame services needs:

- Read/write access to application directories
- Network binding permissions for configured ports
- Access to log directories
- Database connection permissions

### Client Agent Requirements

The OpenFrame client agent requires:

- **Windows**: Local Administrator privileges for system monitoring
- **macOS**: Full Disk Access permission for comprehensive monitoring
- **Linux**: sudo/root access for system-level operations

## Environment Variables

### Required Environment Variables

Set these environment variables before starting services:

```bash
# Database Configuration
export MONGODB_URI="mongodb://localhost:27017/openframe"
export REDIS_URL="redis://localhost:6379"

# Kafka Configuration  
export KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# NATS Configuration
export NATS_URL="nats://localhost:4222"

# Security Configuration
export JWT_ISSUER_URI="http://localhost:8082"
export OAUTH2_CLIENT_ID="your-client-id"
export OAUTH2_CLIENT_SECRET="your-client-secret"
```

### Optional Configuration

```bash
# Logging Configuration
export LOG_LEVEL="INFO"
export LOG_FILE_PATH="/var/log/openframe"

# Performance Tuning
export JVM_HEAP_SIZE="2g"
export WORKER_THREADS="4"

# Integration Settings
export EXTERNAL_TOOL_TIMEOUT="30s"
```

## Cloud Service Requirements

If using managed cloud services:

### MongoDB Atlas
- Cluster tier M10 or higher for production
- Network access configured for your application servers
- Database user with read/write permissions

### Redis Cloud
- Memory size appropriate for your tenant scale
- Network connectivity from application servers
- Persistence enabled

### Apache Kafka (Confluent Cloud, AWS MSK, etc.)
- Topic auto-creation enabled
- Sufficient partition count for your event volume
- Network connectivity configured

## Verification Commands

### System Verification

Verify your system meets the requirements:

```bash
# Check Java version
java -version

# Check Maven installation  
mvn -version

# Verify MongoDB connectivity
mongosh --eval "db.runCommand('ping')"

# Test Redis connectivity
redis-cli ping

# Check available disk space
df -h

# Verify memory
free -h

# Check network connectivity
netstat -tuln | grep -E ':(8080|8081|8082|27017|6379|9092|4222)'
```

### Service Health Checks

Once services are running, verify health:

```bash
# Gateway health
curl http://localhost:8080/actuator/health

# API service health
curl http://localhost:8081/actuator/health

# Authorization service health
curl http://localhost:8082/actuator/health
```

## Common Issues and Solutions

### Port Conflicts
If ports are already in use, either:
- Stop conflicting services
- Configure OpenFrame to use alternative ports
- Use Docker containers with port mapping

### Memory Issues
For insufficient memory:
- Reduce JVM heap sizes in configuration
- Close unnecessary applications
- Consider adding more RAM or using swap

### Database Connection Issues
- Verify MongoDB is running and accessible
- Check network connectivity and firewall rules
- Confirm authentication credentials

### Permission Issues
- Ensure proper file system permissions
- Verify network binding permissions
- Check database user permissions

## Next Steps

Once your system meets all prerequisites:

1. Continue to the [Quick Start Guide](./quick-start.md) for installation
2. Review the [First Steps Guide](./first-steps.md) for initial configuration  
3. Join the [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support

> **Note**: These prerequisites assume a development or small-scale deployment. Production deployments may require additional considerations for security, scalability, and high availability.