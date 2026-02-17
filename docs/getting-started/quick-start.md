# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined installation guide.

## TL;DR - 5-Minute Setup

For experienced developers who want to get started immediately:

```bash
# Clone repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Start infrastructure services
docker-compose -f docker-compose.infrastructure.yml up -d

# Build all services
mvn clean install -DskipTests

# Start core services
./scripts/start-services.sh

# Verify installation
curl http://localhost:8080/actuator/health
```

## Detailed Setup Process

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Infrastructure Setup

OpenFrame requires several infrastructure services. The easiest way to get started is with Docker:

```bash
# Start MongoDB, Redis, Kafka, and NATS
docker-compose -f docker-compose.infrastructure.yml up -d

# Verify services are running
docker-compose -f docker-compose.infrastructure.yml ps
```

Expected output:
```text
NAME                        COMMAND                  SERVICE             STATUS              PORTS
openframe-mongodb           "docker-entrypoint.s…"   mongodb             running             0.0.0.0:27017->27017/tcp
openframe-redis             "docker-entrypoint.s…"   redis               running             0.0.0.0:6379->6379/tcp
openframe-kafka             "/etc/confluent/dock…"   kafka               running             0.0.0.0:9092->9092/tcp
openframe-nats              "/nats-server --conf…"   nats                running             0.0.0.0:4222->4222/tcp
```

### Step 3: Build the Project

OpenFrame uses Maven for dependency management and building:

```bash
# Install all dependencies and build services
mvn clean install -DskipTests
```

This will:
- Download all Java dependencies
- Compile all services
- Package executable JARs
- Skip tests for faster initial setup

### Step 4: Start Core Services

Start the essential OpenFrame services:

```bash
# Start services in the correct order
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-*.jar &
java -jar openframe/services/openframe-gateway/target/openframe-gateway-*.jar &
java -jar openframe/services/openframe-api/target/openframe-api-*.jar &
java -jar openframe/services/openframe-client/target/openframe-client-*.jar &
```

> **Tip**: Use `nohup` and redirect output to log files for background execution:
> ```bash
> nohup java -jar openframe/services/openframe-gateway/target/openframe-gateway-*.jar > gateway.log 2>&1 &
> ```

### Step 5: Verify Installation

Check that all services are healthy:

```bash
# Gateway service (main entry point)
curl http://localhost:8080/actuator/health

# Authorization service
curl http://localhost:8082/actuator/health

# API service  
curl http://localhost:8081/actuator/health

# Client service
curl http://localhost:8083/actuator/health
```

Expected response from each:
```json
{
  "status": "UP",
  "components": {
    "diskSpace": {"status": "UP"},
    "mongo": {"status": "UP"},
    "redis": {"status": "UP"}
  }
}
```

## Access the Platform

### Web Dashboard

Once services are running, access the OpenFrame dashboard:

1. **Open browser**: Navigate to `http://localhost:8080`
2. **Create account**: Click "Sign Up" to create your first tenant
3. **Log in**: Use your credentials to access the dashboard

### Initial Configuration

After logging in, you'll be guided through initial setup:

1. **Organization Setup**: Create your first organization
2. **User Management**: Invite additional users if needed
3. **Integration Configuration**: Connect external tools (optional)

## Install Desktop Client

Install the OpenFrame client agent for device management:

### Windows
```powershell
# Download and install using PowerShell
Invoke-WebRequest -Uri "https://releases.openframe.ai/latest/openframe-client-windows.msi" -OutFile "openframe-client.msi"
Start-Process msiexec.exe -ArgumentList "/i", "openframe-client.msi", "/quiet" -Wait
```

### macOS
```bash
# Download and install using Homebrew (if available)
brew install --cask openframe-client

# Or download directly
curl -L "https://releases.openframe.ai/latest/openframe-client-macos.dmg" -o openframe-client.dmg
```

### Linux
```bash
# Ubuntu/Debian
wget https://releases.openframe.ai/latest/openframe-client-linux.deb
sudo dpkg -i openframe-client-linux.deb

# RHEL/CentOS/Fedora
wget https://releases.openframe.ai/latest/openframe-client-linux.rpm
sudo rpm -i openframe-client-linux.rpm
```

## Test Basic Functionality

### Create an Organization

```bash
# Create test organization via API
curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Organization",
    "domain": "test.example.com",
    "contactPerson": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Register a Device

```bash
# Get registration secret
curl -X GET http://localhost:8080/api/agent/registration-secret/active \
  -H "Authorization: Bearer YOUR_TOKEN"

# Use the secret to register a client agent
# (This is typically done by the desktop client automatically)
```

## Expected Results

After completing the quick start, you should have:

- ✅ All core services running and healthy
- ✅ Web dashboard accessible at `http://localhost:8080`
- ✅ User account and first organization created
- ✅ Desktop client installed (optional)
- ✅ Basic API connectivity confirmed

## Enhanced Developer Experience

See our latest improvements to the developer experience:

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Troubleshooting Quick Issues

### Services Won't Start

```bash
# Check port conflicts
netstat -tuln | grep -E ':(8080|8081|8082|8083)'

# Check logs for specific errors
tail -f gateway.log
```

### Database Connection Issues

```bash
# Verify MongoDB is accessible
mongosh --eval "db.runCommand('ping')"

# Check Redis connectivity
redis-cli ping
```

### Web Dashboard Not Loading

```bash
# Verify gateway service is running
curl -I http://localhost:8080

# Check browser console for JavaScript errors
# Check network tab for failed API calls
```

## Next Steps

Your OpenFrame installation is now ready! Continue with:

1. **[First Steps Guide](./first-steps.md)** - Learn essential operations and configuration
2. **Development Documentation** - Explore advanced features and customization
3. **[OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Join our community for support and updates

## Production Considerations

This quick start is designed for development and evaluation. For production deployments, consider:

- Using external managed databases (MongoDB Atlas, Redis Cloud)
- Implementing proper SSL/TLS termination
- Setting up load balancing and high availability
- Configuring proper logging and monitoring
- Implementing backup and disaster recovery procedures

Refer to our deployment documentation for production-ready configurations.