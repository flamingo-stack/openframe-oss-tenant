# Quick Start Guide

Get OpenFrame up and running in under 5 minutes! This guide provides the fastest path to a working OpenFrame installation using Docker Compose.

> **Prerequisites**: Ensure you have [Docker and Docker Compose](prerequisites.md) installed before proceeding.

## 🚀 5-Minute Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start the Platform

Choose your platform and run the appropriate startup script:

#### macOS/Linux
```bash
./scripts/run-mac.sh --silent
```

#### Windows (PowerShell)
```bash
./scripts/run-windows.ps1 -Silent
```

The `--silent` flag skips interactive prompts and uses default configuration.

### Step 3: Wait for Services to Start

The startup process will:
1. Pull required Docker images
2. Start database services (MongoDB, Kafka, etc.)
3. Initialize OpenFrame services
4. Launch the frontend application

**Expected output:**
```bash
✅ Starting MongoDB...
✅ Starting Kafka...
✅ Starting OpenFrame services...
✅ Services are healthy!
🌐 Frontend available at: http://localhost:3000
📚 API Gateway at: http://localhost:8080
```

### Step 4: Access OpenFrame

Open your browser and navigate to:

**Frontend Application**: [http://localhost:3000](http://localhost:3000)

You should see the OpenFrame login screen.

## First Login

### Create Your Account

1. Click **"Sign Up"** on the login screen
2. Fill in your details:
   - **Email**: Your email address
   - **Password**: Choose a strong password
   - **Organization**: Your company/organization name
3. Click **"Create Account"**

### Default Admin Access

Alternatively, you can use the default admin account:

```text
Email: admin@openframe.local
Password: admin123
```

> **Security**: Change the default admin password immediately after first login!

## Quick Tour

Once logged in, you'll see the OpenFrame dashboard:

### 🏠 Dashboard
- **Overview**: System status and key metrics
- **Recent Activity**: Latest events and alerts
- **Quick Actions**: Common tasks and shortcuts

### 📱 Devices
- **Device List**: All managed endpoints
- **Device Groups**: Organize devices by location, type, or function
- **Agent Status**: See which agents are online/offline

### 🏢 Organizations  
- **Client Management**: Manage multiple client organizations
- **User Access**: Control who has access to what
- **Billing & Usage**: Track resource usage per organization

### ⚙️ Settings
- **User Profile**: Update your personal settings
- **API Keys**: Generate keys for external integrations
- **System Configuration**: Core platform settings

## Adding Your First Device

### Install the OpenFrame Agent

#### Windows
```bash
# Download and run the installer
powershell -Command "Invoke-WebRequest -Uri 'http://localhost:8080/agent/download/windows' -OutFile 'openframe-agent.msi'; Start-Process msiexec.exe -ArgumentList '/i openframe-agent.msi /quiet' -Wait"
```

#### macOS
```bash
# Download and install
curl -O http://localhost:8080/agent/download/macos
sudo installer -pkg openframe-agent.pkg -target /
```

#### Linux
```bash
# Download and install
wget http://localhost:8080/agent/download/linux
sudo dpkg -i openframe-agent.deb
```

### Registration

The agent will automatically register with your OpenFrame instance. Within a few minutes, you should see the new device appear in the **Devices** section.

## Testing Key Features

### Device Management
1. Go to **Devices** → select your device
2. View real-time system information
3. Try running a simple command (e.g., `whoami` or `hostname`)

### Real-time Monitoring
1. Navigate to **Dashboard**
2. Watch for real-time updates as the agent reports system metrics
3. Check the **Recent Activity** feed for events

### API Access
1. Go to **Settings** → **API Keys**
2. Click **"Generate New Key"**
3. Test the API with:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" http://localhost:8080/api/v1/devices
```

## Common Service URLs

Once OpenFrame is running, these services are available:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Main UI |
| **API Gateway** | [http://localhost:8080](http://localhost:8080) | API access |
| **GraphQL Playground** | [http://localhost:8080/graphql](http://localhost:8080/graphql) | API explorer |
| **Authorization** | [http://localhost:9000](http://localhost:9000) | OAuth2 server |

## Stopping OpenFrame

To stop all services:

```bash
# Stop gracefully
docker-compose down

# Stop and remove data (clean slate)
docker-compose down -v
```

## Expected Results

After completing the quick start, you should have:

✅ **OpenFrame platform running locally**  
✅ **Admin account created and logged in**  
✅ **At least one device registered (optional)**  
✅ **Access to all core features**  

## Troubleshooting Quick Start

### Services Not Starting
**Problem**: Docker containers fail to start  
**Solution**: Check port availability
```bash
# Check if ports are in use
netstat -tulpn | grep -E ":(3000|8080|9000|27017|9092)"

# Stop conflicting services
sudo systemctl stop apache2  # Example
```

### Frontend Not Loading
**Problem**: Browser shows "Connection refused"  
**Solution**: Verify frontend service status
```bash
docker-compose logs openframe-frontend
```

### Agent Registration Failing
**Problem**: Agent can't connect to OpenFrame  
**Solution**: Check gateway service
```bash
# Test gateway health
curl http://localhost:8080/health

# Check gateway logs
docker-compose logs openframe-gateway
```

### Database Connection Issues
**Problem**: Services can't connect to databases  
**Solution**: Verify database services
```bash
# Check service status
docker-compose ps

# Restart specific services
docker-compose restart mongodb kafka
```

## Next Steps

Congratulations! You now have a working OpenFrame installation. Here's what to do next:

### Immediate Next Steps
1. **[First Steps Guide](first-steps.md)**: Learn the core features and workflows
2. **Security**: Change default passwords and configure security settings
3. **Integration**: Connect your existing MSP tools

### Explore Advanced Features
- **Multi-tenant Setup**: Add additional organizations
- **Tool Integrations**: Connect TacticalRMM, Fleet MDM, or other tools
- **API Integration**: Build custom integrations using the REST/GraphQL APIs
- **Monitoring**: Set up alerts and monitoring workflows

### Production Deployment
- Review production deployment guides
- Configure SSL/TLS certificates
- Set up backup and recovery procedures
- Implement monitoring and observability

## Getting Help

If you encounter issues during the quick start:

- **Community Support**: [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Logs**: Check container logs with `docker-compose logs <service-name>`
- **Health Checks**: Visit `http://localhost:8080/health` to verify service status

Welcome to OpenFrame! You're now ready to explore the full power of the platform. 🎉