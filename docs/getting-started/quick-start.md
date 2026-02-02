# Quick Start Guide

Get OpenFrame up and running in just 5 minutes! This guide will have you exploring OpenFrame's capabilities with minimal setup.

> **Prerequisites**: Ensure you have [Docker](https://docker.com), [Java 21](https://openjdk.org/), [Node.js 18+](https://nodejs.org/), and [Maven](https://maven.apache.org/) installed. See our [Prerequisites Guide](prerequisites.md) for detailed instructions.

## TL;DR - 5-Minute Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Quick platform setup (choose your platform)
# macOS
./scripts/run-mac.sh --silent

# Linux  
./scripts/run-linux.sh --silent

# Windows PowerShell
./scripts/run-windows.ps1 -Silent
```

That's it! OpenFrame will be available at `http://localhost:8080` in about 5 minutes.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Start Infrastructure Services

Start the required infrastructure components using Docker Compose:

```bash
# Start MongoDB, Redis, Kafka, and other dependencies
cd integrated-tools
docker compose up -d mongodb redis kafka cassandra
```

**Expected output:**
```text
✓ Container mongodb       Started
✓ Container redis         Started  
✓ Container kafka         Started
✓ Container cassandra     Started
```

### 3. Build OpenFrame Services

Build all Java services and the shared libraries:

```bash
# Return to project root
cd ..

# Build all services (this may take a few minutes on first run)
mvn clean install -DskipTests
```

**Expected output:**
```text
[INFO] BUILD SUCCESS
[INFO] Total time: 2:30 min
```

### 4. Install Frontend Dependencies

```bash
cd openframe/services/openframe-frontend
npm install
cd ../../..
```

### 5. Start OpenFrame Services

Use the platform-specific script to start all services:

#### macOS
```bash
./scripts/run-mac.sh
```

#### Linux
```bash
./scripts/run-linux.sh  
```

#### Windows PowerShell
```bash
./scripts/run-windows.ps1
```

The script will:
- Start all backend services in the correct order
- Launch the frontend development server
- Display service status and URLs

### 6. Verify Installation

After all services start, you should see:

```text
✅ OpenFrame Services Status:
   • Gateway Service:      http://localhost:8080
   • Authorization:        http://localhost:8081  
   • API Service:          http://localhost:8082
   • Frontend:             http://localhost:3000
   • Management:           http://localhost:8083

🚀 OpenFrame is ready! Visit http://localhost:8080
```

## First Login

### Create Your Account

1. Open your browser and navigate to `http://localhost:8080`
2. Click **"Get Started"** or **"Sign Up"** 
3. Fill in your organization details:
   - **Organization Name**: Your MSP or company name
   - **Email**: Your admin email address
   - **Password**: Secure password (8+ characters)
   - **Domain**: Unique tenant domain (e.g., `yourcompany`)

4. Click **"Create Account"**

### Access the Dashboard

After account creation, you'll be redirected to the main dashboard where you can:

- **View Overview**: System status and quick stats
- **Manage Devices**: Add and monitor your endpoints  
- **Configure Tools**: Connect your existing MSP tools
- **Explore Chat**: Try Mingo AI assistant
- **Review Settings**: Configure users and integrations

## Key Features to Explore

### 1. AI Chat (Mingo)
Navigate to the **Chat** section to interact with Mingo AI:
- Ask questions about your IT infrastructure
- Request system status reports
- Get help with troubleshooting

### 2. Device Management
Add your first device:
- Go to **Devices** → **Add Device**
- Choose your preferred agent (Tactical RMM, Fleet MDM, or MeshCentral)
- Follow the setup instructions

### 3. Organization Setup
Configure your MSP:
- Visit **Settings** → **Organization**
- Add contact information and branding
- Invite team members

### 4. Tool Integrations
Connect existing tools:
- **Settings** → **Integrations**
- Configure APIs for Tactical RMM, Fleet MDM, etc.
- Test connections and sync data

## Expected Results

After completing the quick start, you should have:

✅ **Working OpenFrame Installation**
- All core services running
- Web interface accessible
- Database connections established

✅ **Admin Account Created**
- Organization configured  
- Dashboard access confirmed
- Basic navigation familiar

✅ **Ready for Integration**
- API endpoints accessible
- Tool connection options available
- AI chat functional

## Next Steps

Congratulations! You now have OpenFrame running locally. Here's what to do next:

### Immediate Next Steps
1. **Add Your First Device** - Connect a real endpoint to see data flowing
2. **Configure SSO** - Set up single sign-on for your team
3. **Explore APIs** - Test GraphQL playground at `http://localhost:8082/graphql`

### Deeper Configuration
- **SSL Setup** - Configure HTTPS for production use
- **External Tools** - Connect your existing RMM and monitoring tools
- **User Management** - Invite team members and configure roles
- **Backup Strategy** - Set up data backup and recovery procedures

Continue with our [First Steps Guide](first-steps.md) for essential post-installation configuration.

## Troubleshooting

### Services Won't Start

**Check Java version:**
```bash
java -version
# Should show: openjdk version "21.x.x"
```

**Check available memory:**
```bash
free -h  # Linux
vm_stat  # macOS
```

**View service logs:**
```bash
# Check individual service logs
tail -f logs/openframe-gateway.log
tail -f logs/openframe-api.log
```

### Port Conflicts

If you see port binding errors:

```bash
# Check what's using the ports
netstat -tulpn | grep :8080
netstat -tulpn | grep :8081

# Stop conflicting services or modify port configuration
```

### Database Connection Issues

**Verify Docker containers are running:**
```bash
docker ps
# Should show mongodb, redis, kafka, cassandra as "Up"
```

**Test MongoDB connection:**
```bash
docker exec -it mongodb mongosh
# Should connect successfully
```

### Memory Issues

If services crash due to memory:

```bash
# Increase JVM heap size
export JAVA_OPTS="-Xmx4g -Xms2g"

# Or reduce concurrent services for development
```

## Getting Help

- **Documentation**: Browse our comprehensive docs for detailed guidance
- **Community Support**: Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Issues**: Report bugs or request features
- **API Documentation**: Explore interactive API docs at `/graphql` and `/swagger-ui`

## Clean Up

To stop all services and clean up:

```bash
# Stop OpenFrame services
# Use Ctrl+C in terminal windows running services

# Stop Docker infrastructure
cd integrated-tools
docker compose down

# Optional: Remove Docker volumes to start fresh
docker compose down -v
```

---

**Quick start complete! 🎉** Your OpenFrame installation is ready for exploration. Continue to [First Steps](first-steps.md) for essential configuration, or jump straight into connecting your first tools and devices.