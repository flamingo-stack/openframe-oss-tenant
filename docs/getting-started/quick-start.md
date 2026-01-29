# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup process. This guide focuses on getting a working development environment quickly.

> 📋 **Prerequisites**: Ensure you have completed the [Prerequisites](./prerequisites.md) setup before proceeding.

## TL;DR - 5 Minute Setup

For the impatient, here's the fastest way to get OpenFrame running:

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-run/openframe.git
cd openframe

# 2. Start dependencies with Docker
docker compose -f integrated-tools/docker-compose.base.yml up -d

# 3. Build and run (platform-specific)
# macOS:
./scripts/run-mac.sh --silent

# Linux:
./scripts/run-linux.sh --silent

# Windows PowerShell:
./scripts/run-windows.ps1 -Silent
```

That's it! Skip to [Access Your Installation](#access-your-installation) to start using OpenFrame.

## Detailed Setup Process

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-run/openframe.git
cd openframe
```

**Expected output:**
```
Cloning into 'openframe'...
remote: Enumerating objects: 15432, done.
remote: Counting objects: 100% (15432/15432), done.
```

### Step 2: Start Required Services

OpenFrame requires several backing services. We'll use Docker Compose to start them:

```bash
# Start MongoDB, Redis, Kafka, and Cassandra
docker compose -f integrated-tools/docker-compose.base.yml up -d
```

**Verify services are running:**
```bash
docker compose -f integrated-tools/docker-compose.base.yml ps
```

Expected output should show all services as "Up":
```
NAME                        COMMAND                  SERVICE             STATUS
mongodb                     "docker-entrypoint.s…"  mongodb             Up
redis                       "docker-entrypoint.s…"  redis               Up
kafka                       "/etc/confluent/dock…"   kafka               Up
cassandra                   "docker-entrypoint.s…"   cassandra           Up
```

### Step 3: Build the Platform

OpenFrame includes platform-specific scripts that handle the build process:

#### macOS
```bash
./scripts/run-mac.sh
```

#### Linux
```bash
./scripts/run-linux.sh
```

#### Windows (PowerShell)
```bash
./scripts/run-windows.ps1
```

The scripts will:
1. Install Node.js dependencies for the frontend
2. Build Java services with Maven
3. Start all OpenFrame services
4. Initialize the database

**Build progress example:**
```
[INFO] Building OpenFrame Core...
[INFO] Building OpenFrame API...
[INFO] Building OpenFrame Gateway...
[INFO] Starting services...
✓ OpenFrame API started on port 8081
✓ OpenFrame Gateway started on port 8080
✓ OpenFrame Frontend started on port 3000
```

### Step 4: Wait for Services to Initialize

The first startup takes 2-3 minutes as services initialize and create database schemas.

**Check service status:**
```bash
# Check Java services
curl -s http://localhost:8080/health
curl -s http://localhost:8081/health

# Check frontend
curl -s http://localhost:3000
```

## Access Your Installation

Once all services are running, you can access OpenFrame:

### Web Interface
Open your browser and navigate to:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:8080](http://localhost:8080)

### Initial Login

On first access, you'll see the registration page. Create your admin account:

1. Click **"Sign Up"**
2. Fill in the registration form:
   - **Email**: your-email@example.com
   - **Password**: Choose a secure password
   - **Organization**: Your Company Name
3. Click **"Create Account"**

The system will create the first tenant and admin user automatically.

## Verify Installation

### Check Core Services

```bash
# API Service Health
curl http://localhost:8081/actuator/health
# Expected: {"status":"UP"}

# Gateway Health  
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}

# Frontend (should return HTML)
curl -I http://localhost:3000
# Expected: HTTP/1.1 200 OK
```

### Check Database Connectivity

```bash
# MongoDB
docker exec -it $(docker ps -q -f name=mongodb) mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec -it $(docker ps -q -f name=redis) redis-cli ping
# Expected: PONG

# Cassandra (may take a few minutes to be ready)
docker exec -it $(docker ps -q -f name=cassandra) cqlsh -e "DESCRIBE keyspaces;"
```

## Hello World Test

Let's verify everything works by creating a simple organization:

### Via Web Interface

1. Log into [http://localhost:3000](http://localhost:3000)
2. Navigate to **Organizations** in the sidebar
3. Click **"Add Organization"**
4. Fill in the form:
   - **Name**: Test Organization
   - **Type**: Client
5. Click **"Save"**

You should see your new organization in the list.

### Via GraphQL API

```bash
# First, get an auth token (replace with your credentials)
AUTH_TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Create an organization via GraphQL
curl -X POST http://localhost:8080/graphql \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { createOrganization(request: {name: \"API Test Org\", contactInformation: {email: \"test@example.com\"}}) { id name } }"
  }'
```

**Expected response:**
```json
{
  "data": {
    "createOrganization": {
      "id": "507f1f77bcf86cd799439011",
      "name": "API Test Org"
    }
  }
}
```

## Next Steps

Congratulations! OpenFrame is now running. Here's what to do next:

### 1. Complete Initial Configuration
Follow the [First Steps](./first-steps.md) guide to:
- Configure OAuth providers
- Set up integrations
- Configure user permissions
- Customize your tenant settings

### 2. Install the Client Agent
Install the OpenFrame client on devices you want to manage:

```bash
# Download the latest client (replace with your server URL)
curl -L https://your-openframe-server/download/client -o openframe-client

# Install with admin privileges
sudo ./openframe-client install --serverUrl=http://localhost:8080
```

### 3. Explore Key Features

| Feature | URL | Description |
|---------|-----|-------------|
| **Dashboard** | [/dashboard](http://localhost:3000/dashboard) | Overview of devices, users, and activity |
| **Devices** | [/devices](http://localhost:3000/devices) | Device management and monitoring |
| **Organizations** | [/organizations](http://localhost:3000/organizations) | Client organization management |
| **Users** | [/settings](http://localhost:3000/settings) | User and tenant management |
| **Tickets** | [/tickets](http://localhost:3000/tickets) | Support ticket management |

### 4. Set Up Integrations

OpenFrame works best when integrated with other MSP tools:

```bash
# Start optional integrated tools
docker compose -f integrated-tools/tactical-rmm/docker-compose.yml up -d
docker compose -f integrated-tools/meshcentral/docker-compose.yml up -d
```

## Common Issues & Solutions

### Services Won't Start

**Problem**: Port conflicts or insufficient resources

**Solution**:
```bash
# Check for port conflicts
netstat -tlnp | grep -E ':(3000|8080|8081)'

# Stop conflicting services
sudo systemctl stop apache2  # If using Apache
sudo systemctl stop nginx    # If using Nginx

# Increase available memory
free -h  # Check current memory usage
```

### Database Connection Errors

**Problem**: Database services not ready

**Solution**:
```bash
# Wait for databases to initialize (especially Cassandra)
docker compose -f integrated-tools/docker-compose.base.yml logs cassandra

# Restart services if needed
docker compose -f integrated-tools/docker-compose.base.yml restart
```

### Frontend Build Errors

**Problem**: Node.js dependency issues

**Solution**:
```bash
cd openframe/services/openframe-frontend
npm install --force  # Force resolve any conflicts
npm run build        # Rebuild if needed
```

### Authentication Issues

**Problem**: Can't log in after registration

**Solution**:
```bash
# Check if the auth service is running
curl http://localhost:9000/actuator/health

# Verify database contains user data
docker exec -it $(docker ps -q -f name=mongodb) mongosh openframe --eval "db.users.find()"
```

## Getting Help

If you encounter issues during setup:

1. **Check the logs**: `docker compose logs [service-name]`
2. **Join our community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
3. **Review documentation**: Check the [development setup guide](../development/setup/local-development.md) for more details

## Performance Tips

For better performance during development:

```bash
# Allocate more memory to Java services
export JAVA_OPTS="-Xmx4g -Xms2g"

# Use SSD storage for databases
# Mount database volumes on SSD if available

# Enable hot reload for frontend development
cd openframe/services/openframe-frontend
npm run dev  # Instead of build
```

---

🎉 **Congratulations!** You now have OpenFrame running locally. Continue with [First Steps](./first-steps.md) to configure your installation.