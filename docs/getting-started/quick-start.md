# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined installation guide.

## TL;DR - Express Setup

If you have all [prerequisites](./prerequisites.md) installed, run this single command:

```bash
# For macOS
./scripts/run-mac.sh --silent

# For Linux  
./scripts/run-linux.sh --silent

# For Windows (PowerShell)
./scripts/run-windows.ps1 -Silent
```

Access your dashboard at: **http://localhost:8080**

## Step-by-Step Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-run/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Environment Setup

Set your GitHub token for dependency access:

```bash
export GITHUB_TOKEN="your_personal_access_token"
```

### Step 3: Choose Your Platform

#### macOS Installation
```bash
chmod +x scripts/run-mac.sh
./scripts/run-mac.sh
```

#### Linux Installation
```bash
chmod +x scripts/run-linux.sh
./scripts/run-linux.sh
```

#### Windows Installation
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
./scripts/run-windows.ps1
```

### Step 4: Initial Build

The script will automatically:
1. ✅ Validate prerequisites
2. ✅ Build Java services with Maven
3. ✅ Install Node.js dependencies
4. ✅ Start Docker containers
5. ✅ Initialize databases
6. ✅ Launch services

Expected output:
```bash
🚀 OpenFrame Quick Start
═══════════════════════════════════════

✅ Java 21 detected
✅ Maven 3.9.x detected  
✅ Node.js 18.x detected
✅ Docker 24.x detected

Building services...
[INFO] Building OpenFrame OSS Tenant
[INFO] ------------------------
[INFO] BUILD SUCCESS
[INFO] Total time: 2:14 min

Starting services...
✅ Database containers started
✅ Core services launched
✅ Frontend build completed

🌟 OpenFrame is ready!
Dashboard: http://localhost:8080
API: http://localhost:8080/graphql
```

### Step 5: Access Your Dashboard

Open your browser and navigate to:
```
http://localhost:8080
```

You should see the OpenFrame login screen.

## Default Credentials

### Initial Admin Account
- **Username**: `admin@openframe.local`
- **Password**: `admin123!`

> ⚠️ **Security Notice**: Change these credentials immediately after first login.

## Service Endpoints

Once running, these endpoints are available:

| Service | URL | Purpose |
|---------|-----|---------|
| **Web Dashboard** | http://localhost:8080 | Main UI interface |
| **GraphQL API** | http://localhost:8080/graphql | API exploration |
| **API Gateway** | http://localhost:8081 | Service routing |
| **Config Server** | http://localhost:8888 | Configuration management |

## Quick Verification

### 1. Service Health Check

```bash
# Check all services are running
docker ps

# Expected services:
# - openframe-api
# - openframe-gateway  
# - openframe-management
# - openframe-stream
# - openframe-config
# - openframe-frontend
# - mongodb
# - redis
# - cassandra
# - kafka
```

### 2. API Health Check

```bash
# Test API connectivity
curl http://localhost:8081/actuator/health

# Expected response:
# {"status":"UP"}
```

### 3. GraphQL Playground

Visit http://localhost:8080/graphql and try this query:

```graphql
query {
  organizations {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

### 4. Frontend Validation

- ✅ Login page loads
- ✅ Can authenticate with default credentials
- ✅ Dashboard displays without errors
- ✅ Navigation menu is functional

## Common Quick Start Issues

### Port Already in Use
```bash
# Find what's using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>

# Restart OpenFrame
./scripts/run-mac.sh
```

### Docker Not Running
```bash
# Start Docker daemon
sudo systemctl start docker

# On macOS, start Docker Desktop app
open -a Docker
```

### Memory Issues
```bash
# Check available memory
free -h

# Increase Docker memory limit to 8GB minimum
# Docker Desktop > Settings > Resources > Memory
```

### Build Failures
```bash
# Clean and rebuild
mvn clean install -DskipTests

# If Node.js issues:
cd openframe/services/openframe-frontend
npm clean-install
```

## Hello World Example

### Create Your First Organization

1. **Login** to the dashboard at http://localhost:8080
2. **Navigate** to Organizations → New Organization
3. **Fill in details**:
   ```
   Name: My First MSP
   Domain: myfirstmsp.com
   Contact: admin@myfirstmsp.com
   ```
4. **Save** and view your organization

### Add a Device

1. **Go to** Devices → New Device  
2. **Enter device information**:
   ```
   Name: Test Workstation
   Type: Desktop
   OS: Windows 11
   ```
3. **Save** and see it appear in your device list

### View Logs

1. **Navigate** to Logs
2. **See** system events and activities
3. **Filter** by organization or device type

## Expected Results

After successful quick start, you should have:

✅ **Working OpenFrame installation** with all services running  
✅ **Accessible web dashboard** at localhost:8080  
✅ **Functional GraphQL API** for data operations  
✅ **Default admin account** ready for use  
✅ **Database containers** initialized with sample data  
✅ **Real-time capabilities** through WebSocket connections

## Performance Benchmarks

On recommended hardware, expect:
- **Startup Time**: < 3 minutes
- **Dashboard Load**: < 2 seconds  
- **API Response**: < 200ms
- **Memory Usage**: ~4GB total
- **Storage Usage**: ~2GB initial

## Troubleshooting Quick Start

### Service Won't Start
```bash
# Check logs
docker logs openframe-api
docker logs openframe-frontend

# Common solutions:
# 1. Check port availability
# 2. Verify memory allocation  
# 3. Ensure Docker has sufficient resources
```

### Database Connection Issues
```bash
# Restart database containers
docker restart mongodb redis cassandra kafka

# Wait 30 seconds for initialization
sleep 30
```

### Frontend Build Issues
```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](./first-steps.md)** - Explore key features and initial configuration
2. **[Architecture Overview](../development/architecture/overview.md)** - Understand the system design
3. **[API Documentation](../development/testing/overview.md)** - Learn about GraphQL APIs

### For Developers

If you plan to customize or contribute to OpenFrame:

1. **[Development Environment](../development/setup/environment.md)** - Set up IDE and tools
2. **[Local Development](../development/setup/local-development.md)** - Development workflow
3. **[Contributing Guidelines](../development/contributing/guidelines.md)** - How to submit changes

## Product Demo

Watch this comprehensive walkthrough to see OpenFrame's full capabilities:

[![OpenFrame Product Walkthrough (Beta Access)](https://img.youtube.com/vi/awc-yAnkhIo/maxresdefault.jpg)](https://www.youtube.com/watch?v=awc-yAnkhIo)

## Support

Need help with the quick start?

- **Community Support**: Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Browse the [full documentation](../README.md)
- **Platform Info**: Visit https://www.flamingo.run/openframe

> 🚀 **Congratulations!** You now have a fully functional OpenFrame installation. Time to explore what it can do for your MSP operations!