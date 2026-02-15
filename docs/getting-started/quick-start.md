# Quick Start Guide

Get OpenFrame up and running in just 5 minutes with this streamlined setup guide. This will deploy a complete local development environment with all core services.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Set GitHub token
export GITHUB_TOKEN=your_github_token_here

# 3. Run platform-specific startup script
./scripts/run-mac.sh              # macOS
./scripts/run-linux.sh            # Linux
./scripts/run-windows.ps1         # Windows PowerShell

# 4. Access the dashboard
# Visit http://localhost:8080 when startup completes
```

## Step-by-Step Quick Start

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Set Required Environment Variables

```bash
# Required: GitHub token for private repository access
export GITHUB_TOKEN=your_github_token_here

# Optional: Silent mode to skip interactive prompts
export OPENFRAME_SILENT=true
```

### Step 3: Run the Platform Script

Choose the script for your operating system:

**macOS:**
```bash
./scripts/run-mac.sh
# For silent mode (no prompts):
./scripts/run-mac.sh --silent
```

**Linux:**
```bash
./scripts/run-linux.sh
# For silent mode:
./scripts/run-linux.sh --silent
```

**Windows PowerShell:**
```powershell
.\scripts\run-windows.ps1
# For silent mode:
.\scripts\run-windows.ps1 -Silent
```

### Step 4: Monitor Startup Progress

The startup script will:

1. **Validate prerequisites** - Check Java, Maven, Docker, Node.js
2. **Build services** - Compile all Java microservices  
3. **Start infrastructure** - Launch MongoDB, Kafka, Redis containers
4. **Deploy services** - Start all OpenFrame services
5. **Initialize data** - Set up default configurations

**Expected startup time:** 3-5 minutes on modern hardware

You'll see output similar to:
```text
🚀 OpenFrame OSS Tenant - Quick Start
✅ Prerequisites validated
🔨 Building services...
📦 Starting infrastructure containers...
🌐 Deploying OpenFrame services...
🎯 Initializing system data...
✅ OpenFrame is ready!

🌐 Dashboard: http://localhost:8080
📊 GraphQL Playground: http://localhost:8080/graphql
⚙️  Config Server: http://localhost:8888
```

## Access Points

Once startup completes, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Web Dashboard** | http://localhost:8080 | Main OpenFrame UI |
| **GraphQL Playground** | http://localhost:8080/graphql | API exploration |
| **Config Server** | http://localhost:8888 | Configuration management |

## First Login

### Default Credentials

The quick start creates a default administrator account:

```text
Email: admin@openframe.local
Password: admin123
```

> **Security Note**: Change these credentials immediately in production environments.

### OAuth2 Setup (Optional)

For SSO integration with Google or Microsoft, configure OAuth2 in Settings → SSO Configuration after initial login.

## Service Status Verification

### Check Running Services

```bash
# Verify all Docker containers are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected output should include:
# openframe-mongodb     Up X minutes    0.0.0.0:27017->27017/tcp
# openframe-kafka       Up X minutes    0.0.0.0:9092->9092/tcp  
# openframe-redis       Up X minutes    0.0.0.0:6379->6379/tcp
```

### Health Check Endpoints

```bash
# API Service health
curl http://localhost:8080/actuator/health

# Gateway health  
curl http://localhost:8081/actuator/health

# Config Server health
curl http://localhost:8888/actuator/health
```

**Expected response:**
```json
{
  "status": "UP",
  "components": {
    "diskSpace": {"status": "UP"},
    "mongo": {"status": "UP"},
    "ping": {"status": "UP"}
  }
}
```

## What's Running?

The quick start deployment includes:

### Core Services
- **API Gateway** (port 8081) - Request routing and authentication
- **API Service** (port 8080) - Main GraphQL and REST APIs  
- **Authorization Server** (port 8082) - OAuth2/OIDC identity provider
- **Management Service** (port 8083) - System administration
- **Config Server** (port 8888) - Centralized configuration

### Infrastructure
- **MongoDB** (port 27017) - Primary database
- **Apache Kafka** (port 9092) - Event streaming
- **Redis** (port 6379) - Caching and sessions

### Optional Services (Available on Demand)
- **Stream Processing** - Real-time data processing
- **External API** - Third-party integration endpoints
- **Client Agent Service** - Endpoint management

## Development Overview Video

Learn about the enhanced developer experience in OpenFrame:

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Basic Usage Examples

### Create Your First Organization

1. **Log in** to http://localhost:8080
2. **Navigate** to Organizations → New Organization
3. **Fill in details:**
   ```text
   Name: My Test Organization
   Domain: test.local
   Contact Email: admin@test.local
   ```
4. **Save** to create the organization

### Explore GraphQL API

1. **Visit** http://localhost:8080/graphql
2. **Try a sample query:**
   ```graphql
   query {
     organizations {
       edges {
         node {
           id
           name
           domain
         }
       }
     }
   }
   ```

### View System Logs

1. **Navigate** to Logs in the dashboard
2. **Filter** by date range or severity
3. **Explore** real-time log streaming

## Troubleshooting Quick Start

### Startup Script Fails

**Issue**: Script exits with error

**Solutions:**
```bash
# Check prerequisites
java -version    # Should show Java 21
mvn -version     # Should show Maven 3.9+
docker --version # Should show Docker 24.0+

# Verify GitHub token
echo $GITHUB_TOKEN

# Check port availability
lsof -i :8080    # Should be empty
```

### Services Won't Start

**Issue**: OpenFrame services fail to start

**Solutions:**
```bash
# Check Docker containers
docker ps -a

# View service logs
docker logs openframe-mongodb
docker logs openframe-kafka
docker logs openframe-redis

# Restart infrastructure
docker compose -f integrated-tools/docker-compose.yml down
docker compose -f integrated-tools/docker-compose.yml up -d
```

### Cannot Access Dashboard

**Issue**: http://localhost:8080 not accessible

**Solutions:**
```bash
# Check if API service is running
ps aux | grep openframe-api

# Check port binding
lsof -i :8080

# Review application logs
tail -f logs/openframe-api.log
```

### Build Failures

**Issue**: Maven build fails

**Solutions:**
```bash
# Clean and rebuild
mvn clean install -DskipTests

# Check Java version
java -version

# Verify JAVA_HOME
echo $JAVA_HOME
```

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)** - Essential configuration and exploration
2. **[Development Setup](../development/setup/environment.md)** - For development work
3. **OpenMSP Community** - Join our [Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for support

## Stopping OpenFrame

When you're done exploring:

```bash
# Stop all services gracefully
./scripts/stop.sh

# Or stop Docker containers only
docker compose -f integrated-tools/docker-compose.yml down
```

You're now ready to explore OpenFrame! The quick start provides a fully functional environment to understand the platform's capabilities.