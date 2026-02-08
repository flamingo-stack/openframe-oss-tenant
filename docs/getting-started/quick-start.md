# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup guide.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant
cd openframe-oss-tenant

# 2. Run platform-specific script
./scripts/run-mac.sh          # macOS
./scripts/run-linux.sh        # Linux  
./scripts/run-windows.ps1     # Windows

# 3. Access the application
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8080
```

## Detailed Setup Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant
cd openframe-oss-tenant
```

### Step 2: Choose Your Platform Script

OpenFrame provides platform-specific startup scripts that handle all dependencies and configuration:

#### For macOS Users
```bash
./scripts/run-mac.sh
```

#### For Linux Users  
```bash
./scripts/run-linux.sh
```

#### For Windows Users (PowerShell)
```powershell
.\scripts\run-windows.ps1
```

#### Silent Mode (No Prompts)
```bash
./scripts/run-mac.sh --silent
./scripts/run-linux.sh --silent
```

### Step 3: Wait for Services to Start

The startup script will:

1. **Check Prerequisites** - Verify Java 21, Node.js, Docker, etc.
2. **Start Infrastructure** - Launch MongoDB, Redis, Kafka via Docker
3. **Build Backend Services** - Compile and start Java microservices
4. **Build Frontend** - Install npm dependencies and start React app
5. **Health Check** - Verify all services are responsive

Expected startup time: 3-5 minutes on first run, 1-2 minutes on subsequent runs.

### Step 4: Access OpenFrame

Once all services are running, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend UI** | http://localhost:3000 | Main web interface |
| **API Gateway** | http://localhost:8080 | REST/GraphQL APIs |
| **Authorization Server** | http://localhost:9000 | OAuth/OIDC endpoints |

## Basic "Hello World" Example

Let's verify your OpenFrame installation with a simple test:

### 1. Create Your First User

1. Open http://localhost:3000
2. Click **"Sign Up"**
3. Fill in the registration form:
   - Email: `admin@yourcompany.com`
   - Password: `SecurePassword123!`
   - Company Name: `Your Company`
4. Complete the registration process

### 2. Create an Organization

1. Navigate to **Organizations** in the sidebar
2. Click **"New Organization"**
3. Fill in the details:
   ```bash
   Name: Demo Organization
   Description: My first OpenFrame organization
   Contact Email: contact@demo.com
   ```
4. Click **"Create Organization"**

### 3. Test the GraphQL API

```bash
# Test API health
curl http://localhost:8080/health

# Example GraphQL query (requires authentication)
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "query { organizations { id name description } }"
  }'
```

### 4. View Real-Time Logs

1. Navigate to **Logs** in the sidebar
2. You should see system events and audit logs
3. Create or modify an organization to see new log entries appear in real-time

## Expected Output

### Successful Startup Logs

```text
✅ Prerequisites check passed
✅ Starting Docker infrastructure...
✅ MongoDB ready on port 27017
✅ Redis ready on port 6379
✅ Kafka ready on port 9092
✅ Building Java services...
✅ OpenFrame API started on port 8081
✅ OpenFrame Gateway started on port 8080  
✅ OpenFrame Frontend started on port 3000
✅ All services healthy and ready!

🚀 OpenFrame is now running:
   Frontend: http://localhost:3000
   API Gateway: http://localhost:8080
   Authorization: http://localhost:9000
```

### Service Health Check

You can verify all services are running correctly:

```bash
# Check Docker containers
docker ps

# Expected output should include:
# - openframe-mongodb
# - openframe-redis  
# - openframe-kafka
# - openframe-cassandra (optional)

# Check Java processes
ps aux | grep java

# Check Node.js frontend
curl http://localhost:3000
```

## Common Startup Issues

### Port Already in Use

```bash
# Find and kill processes using required ports
sudo lsof -ti:3000,8080,9000 | xargs kill -9

# Or use the platform script with reset flag
./scripts/run-mac.sh --reset
```

### Docker Not Running

```bash
# Start Docker (varies by platform)
sudo systemctl start docker    # Linux
open -a Docker                 # macOS
# Windows: Start Docker Desktop
```

### Java Version Issues

```bash
# Check Java version
java -version

# Should show Java 21. If not:
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH=$JAVA_HOME/bin:$PATH
```

### Memory Issues

```bash
# Check available memory
free -h

# Increase Docker memory limits if needed
# Docker Desktop > Settings > Resources > Memory > 6GB+
```

## Performance Optimization

### For Development

```bash
# Enable hot reloading for frontend
cd openframe/services/openframe-frontend
npm run dev

# Use Maven test skip for faster builds
mvn clean install -DskipTests
```

### For Production

```bash
# Use production Docker compose
docker-compose -f docker-compose.prod.yml up -d

# Build optimized frontend
cd openframe/services/openframe-frontend  
npm run build
npm run start
```

## What's Running?

After successful startup, your OpenFrame instance includes:

### Backend Services
- **API Service** (Port 8081) - GraphQL API and business logic
- **Gateway Service** (Port 8080) - API gateway, routing, security  
- **Authorization Server** (Port 9000) - OAuth2/OIDC authentication
- **Management Service** (Port 8082) - Administrative tasks and scheduling
- **Stream Service** (Port 8083) - Event processing and data enrichment

### Frontend Applications
- **React Frontend** (Port 3000) - Main web interface
- **Config Server** (Port 8888) - Configuration management

### Infrastructure
- **MongoDB** (Port 27017) - Primary database
- **Redis** (Port 6379) - Caching and sessions
- **Apache Kafka** (Port 9092) - Event streaming
- **Cassandra** (Port 9042) - Time-series data (optional)

## Next Steps

Congratulations! You now have OpenFrame running locally. Here's what to do next:

1. **[First Steps Guide](first-steps.md)** - Configure your OpenFrame deployment
2. **[Architecture Overview](../development/architecture/overview.md)** - Understand the system design
3. **[Local Development Guide](../development/setup/local-development.md)** - Set up your development environment

## Getting Help

If you encounter any issues during quick start:

- 💬 **Join OpenMSP Slack**: [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📖 **Check Prerequisites**: Ensure all requirements from the prerequisites guide are met
- 🔧 **Debug Logs**: Check Docker logs with `docker logs [container-name]`

Remember: OpenFrame uses the OpenMSP Slack community for all support and discussions, not GitHub Issues.