# Quick Start Guide

Get OpenFrame up and running in just 5 minutes! This guide will walk you through the fastest path to a working OpenFrame installation.

## TL;DR - 5 Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start required services
docker compose -f integrated-tools/docker-compose.yml up -d

# 3. Build and run OpenFrame
./scripts/run-mac.sh --silent    # macOS
# OR
./scripts/run-linux.sh --silent  # Linux
# OR
./scripts/run-windows.ps1        # Windows
```

That's it! OpenFrame will be running at `http://localhost:8080` 🎉

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Backing Services

OpenFrame requires several databases and messaging services. Start them all with Docker Compose:

```bash
# Start MongoDB, Redis, Kafka, NATS, and other required services
docker compose -f integrated-tools/docker-compose.yml up -d
```

Wait for all services to start (about 30-60 seconds):

```bash
# Check service status
docker compose -f integrated-tools/docker-compose.yml ps
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
.\scripts\run-windows.ps1
```

The script will:
- Install dependencies
- Build all Java services
- Start the API gateway and core services
- Launch the frontend application

### Step 4: Access OpenFrame

Once startup is complete:

1. **Frontend Application**: Open `http://localhost:3000`
2. **API Gateway**: Available at `http://localhost:8080`
3. **GraphQL Playground**: Visit `http://localhost:8081/graphql`

[![OpenFrame v0.5.2: Live Demo of AI-Powered IT Management for MSPs](https://img.youtube.com/vi/a45pzxtg27k/maxresdefault.jpg)](https://www.youtube.com/watch?v=a45pzxtg27k)

## What You'll See

### First Launch

1. **Registration Screen**: Create your first tenant organization
2. **Dashboard**: Overview of devices, logs, and system status  
3. **Navigation Menu**: Access to devices, organizations, logs, and settings

### Key Features to Explore

| Feature | Location | Description |
|---------|----------|-------------|
| **Device Management** | `/devices` | View and manage connected devices |
| **Organizations** | `/organizations` | Manage client organizations |
| **Audit Logs** | `/logs` | System and security event logs |
| **Settings** | `/settings` | User, API keys, and system configuration |
| **Chat Interface** | Mingo AI | AI-powered support chat |

## Expected Output

During startup, you should see:

```bash
[INFO] Building OpenFrame Services...
[INFO] Starting MongoDB... ✓
[INFO] Starting Redis... ✓  
[INFO] Starting Kafka... ✓
[INFO] Starting OpenFrame Gateway on port 8080... ✓
[INFO] Starting OpenFrame API on port 8081... ✓
[INFO] Starting Frontend on port 3000... ✓

🚀 OpenFrame is ready!
   Frontend: http://localhost:3000
   API Gateway: http://localhost:8080
   GraphQL: http://localhost:8081/graphql
```

## Quick Verification

Test that everything is working:

### 1. Health Check
```bash
curl http://localhost:8080/health
# Should return: {"status":"UP"}
```

### 2. API Access
```bash
curl http://localhost:8080/api/health
# Should return service status information
```

### 3. Frontend Access
Visit `http://localhost:3000` in your browser - you should see the OpenFrame login/registration screen.

## Troubleshooting Common Issues

### Services Won't Start

**Problem**: Docker services fail to start  
**Solution**: Check available resources and ports:

```bash
# Check Docker status
docker system info

# Check port availability
netstat -an | grep -E "(8080|3000|27017|6379)"

# Restart services
docker compose -f integrated-tools/docker-compose.yml down
docker compose -f integrated-tools/docker-compose.yml up -d
```

### Build Failures

**Problem**: Maven build fails  
**Solution**: Ensure Java 21 is installed and set as default:

```bash
java -version
# Should show Java 21

# If not, set JAVA_HOME explicitly
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk     # Linux
```

### Port Conflicts

**Problem**: "Port already in use" errors  
**Solution**: Either kill the conflicting process or modify ports:

```bash
# Find what's using port 8080
lsof -ti:8080

# Kill the process (replace PID)
kill -9 <PID>

# Or modify ports in application.properties files
```

### Frontend Issues

**Problem**: Frontend won't start  
**Solution**: Check Node.js version and clear cache:

```bash
node --version
# Should be v18 or later

# Clear npm cache and reinstall
cd openframe/services/openframe-frontend
npm cache clean --force
npm install
npm run dev
```

## Development Mode

For development with hot reloading:

```bash
# Start backend services
./scripts/run-mac.sh

# In another terminal, start frontend in dev mode
cd openframe/services/openframe-frontend
npm run dev
```

This enables:
- ✅ Hot reload for frontend changes
- ✅ Automatic restart for backend changes  
- ✅ Debug logging
- ✅ Development tools and extensions

## What's Next?

Now that OpenFrame is running, explore these next steps:

### Immediate Next Steps
1. **[First Steps Guide](first-steps.md)** - Learn the key features
2. **Create your first organization** - Add a client organization
3. **Connect a device** - Install the OpenFrame agent
4. **Explore the chat interface** - Try Mingo AI assistance

### Development Deep Dive
1. **[Development Environment Setup](../development/setup/environment.md)** - Configure your IDE
2. **[Architecture Overview](../development/architecture/README.md)** - Understand the system design
3. **[Local Development Guide](../development/setup/local-development.md)** - Advanced development setup

### Tool Integrations
1. Set up Fleet MDM integration
2. Configure Tactical RMM connection
3. Enable MeshCentral for remote access

## Getting Help

If you encounter issues during quick start:

- 💬 **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📚 **Documentation**: Continue with [First Steps](first-steps.md)
- 🐛 **Issues**: Report problems on GitHub

---

**Congratulations!** 🎉 You now have a working OpenFrame installation. Ready to explore what it can do?