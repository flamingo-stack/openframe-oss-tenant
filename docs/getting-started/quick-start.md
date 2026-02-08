# Quick Start Guide

Get OpenFrame up and running in under 5 minutes! This guide provides a streamlined installation path for testing and evaluation.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose -f integrated-tools/docker-compose.yml up -d

# 3. Build and run OpenFrame
./scripts/run-mac.sh --silent    # macOS
# ./scripts/run-linux.sh --silent  # Linux  
# ./scripts/run-windows.ps1        # Windows

# 4. Open OpenFrame
open http://localhost:8080
```

That's it! OpenFrame is now running with default configuration.

## Step-by-Step Instructions

### Step 1: Clone the Repository

First, clone the OpenFrame tenant repository:

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure Services

OpenFrame requires several backing services. Start them using Docker Compose:

```bash
# Start MongoDB, Kafka, Redis, and integrated tools
docker compose -f integrated-tools/docker-compose.yml up -d

# Verify services are running
docker compose -f integrated-tools/docker-compose.yml ps
```

**Expected output:**
```text
NAME                    IMAGE                    STATUS
mongodb                 mongo:7.0               Up 30 seconds
kafka                   confluentinc/cp-kafka   Up 30 seconds  
redis                   redis:7.0               Up 30 seconds
tactical-rmm            tactical-rmm:latest     Up 45 seconds
meshcentral             meshcentral:latest      Up 45 seconds
```

### Step 3: Build and Start OpenFrame

Choose your platform-specific startup script:

#### macOS
```bash
./scripts/run-mac.sh
```

#### Linux
```bash
./scripts/run-linux.sh
```

#### Windows (PowerShell)
```powershell
./scripts/run-windows.ps1
```

The script will:
1. **Build all Java services** using Maven
2. **Install frontend dependencies** using npm
3. **Start all services** in the correct order
4. **Wait for readiness** checks

**Expected output:**
```text
[INFO] Building OpenFrame services...
[INFO] Starting Configuration Server...
[INFO] Starting Gateway Service...
[INFO] Starting API Service...
[INFO] Starting Frontend...
[INFO] OpenFrame ready at http://localhost:8080
```

### Step 4: Access OpenFrame

Open your web browser and navigate to:

```text
http://localhost:8080
```

You should see the OpenFrame login screen.

## Default Access

### Initial Admin Account

The quick start creates a default admin account:

| Field | Value |
|-------|-------|
| **Email** | `admin@openframe.local` |
| **Password** | `admin123` |
| **Organization** | `Default Organization` |

> **Security Note**: Change these credentials immediately after first login in production environments.

### Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Application** | http://localhost:8080 | Primary OpenFrame interface |
| **API Service** | http://localhost:8081 | GraphQL API endpoint |
| **Authorization** | http://localhost:8082 | OAuth/OIDC flows |
| **Tactical RMM** | http://localhost:8000 | RMM tool (if enabled) |
| **MeshCentral** | http://localhost:4430 | Remote access tool |

## Exploring OpenFrame

### 1. Dashboard Overview

After logging in, you'll see the main dashboard with:

- **Device summary** across all organizations
- **Recent activity** and alerts  
- **Tool integration** status
- **Quick actions** for common tasks

### 2. Device Management

Navigate to **Devices** to:

- View all managed devices
- Filter by organization, status, or device type
- Access device details and remote management

### 3. Organization Management

Navigate to **Organizations** to:

- Create and manage client organizations
- Configure organization-specific settings
- View per-organization device counts

### 4. Mingo AI Assistant

Click the **chat icon** to access Mingo:

- Ask natural language questions about devices
- Get automated troubleshooting suggestions
- Execute commands through conversation

Example queries:
- "Show me all Windows devices that need updates"
- "What devices are offline?"
- "Run a disk check on server-01"

## Adding Your First Device

### Option 1: Manual Agent Installation

1. Go to **Devices** → **Add Device**
2. Generate an agent registration token
3. Download the OpenFrame agent for your platform
4. Install the agent with the token:

```bash
# Linux/macOS
sudo openframe-agent register --token=YOUR_TOKEN

# Windows (PowerShell as Admin)
openframe-agent.exe register --token=YOUR_TOKEN
```

### Option 2: Import from Existing Tools

If you have existing RMM tools:

1. Go to **Settings** → **Integrations**
2. Configure your tool credentials (Tactical RMM, Fleet, etc.)
3. Sync devices from your existing tools

## Configuring Integrations

### Tactical RMM Integration

1. Navigate to **Settings** → **Tools** → **Tactical RMM**
2. Enter your Tactical RMM credentials:
   - **URL**: Your Tactical RMM instance URL
   - **API Key**: Generated from Tactical RMM admin panel
3. Test the connection and sync devices

### MeshCentral Integration

1. Go to **Settings** → **Tools** → **MeshCentral**
2. Configure connection settings:
   - **URL**: Your MeshCentral server URL  
   - **Credentials**: MeshCentral login credentials
3. Enable remote desktop and file management features

## Expected Results

After completing the quick start, you should have:

- ✅ OpenFrame running locally at http://localhost:8080
- ✅ Admin access with default credentials
- ✅ Infrastructure services (MongoDB, Kafka, Redis) operational
- ✅ Basic understanding of the OpenFrame interface
- ✅ Optional: First device registered and managed

## Stopping Services

When you're done testing:

```bash
# Stop OpenFrame services
# Use Ctrl+C in the terminal where services are running

# Stop infrastructure services
docker compose -f integrated-tools/docker-compose.yml down

# Optional: Remove volumes to start fresh next time
docker compose -f integrated-tools/docker-compose.yml down -v
```

## Troubleshooting Common Issues

### Services Won't Start

**Problem**: Port conflicts or missing dependencies

**Solution**:
```bash
# Check what's using required ports
lsof -i :8080
lsof -i :8081

# Ensure prerequisites are met
java -version  # Should be Java 21+
mvn -version   # Should be Maven 3.9+
```

### Database Connection Issues

**Problem**: Can't connect to MongoDB or other services

**Solution**:
```bash
# Restart infrastructure services
docker compose -f integrated-tools/docker-compose.yml restart

# Check service logs
docker compose -f integrated-tools/docker-compose.yml logs mongodb
```

### Frontend Build Errors

**Problem**: npm install or build failures

**Solution**:
```bash
# Update Node.js to latest LTS
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install
```

### Memory Issues

**Problem**: Java heap space errors

**Solution**:
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4g -XX:MaxPermSize=1g"

# Or use the silent mode which has optimized settings
./scripts/run-mac.sh --silent
```

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)**: Explore key features and configuration
2. **[Development Setup](../development/setup/local-development.md)**: Set up for development
3. **[Architecture Overview](../development/architecture/overview.md)**: Understand how OpenFrame works
4. **Join the Community**: Connect with other OpenFrame users on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Security Considerations

The quick start uses default configurations for ease of setup. For production use:

- Change all default passwords
- Configure proper SSL certificates
- Set up firewall rules
- Use environment-specific configuration
- Enable audit logging

---

> **Questions?** Join our OpenMSP Slack community for real-time help: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA