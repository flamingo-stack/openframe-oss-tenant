# Quick Start Guide

Get OpenFrame running locally in **5 minutes**! This guide will have you up and running with a complete OpenFrame development environment.

> **Prerequisites Check**: Ensure you've completed the [Prerequisites](prerequisites.md) before proceeding.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose up -d mongodb kafka redis cassandra pinot

# 3. Build the platform (grab a coffee ☕)
mvn clean install -DskipTests

# 4. Start OpenFrame services
./scripts/run-mac.sh --silent        # macOS
./scripts/run-linux.sh --silent      # Linux  
./scripts/run-windows.ps1 -Silent    # Windows PowerShell

# 5. Access the platform
open http://localhost:8080           # API Gateway
open http://localhost:3000           # Frontend (dev mode)
```

## Step-by-Step Setup

### Step 1: Clone and Navigate

```bash
# Clone the OpenFrame OSS Tenant repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify you're in the correct directory
ls -la
# You should see: openframe/, clients/, scripts/, manifests/, etc.
```

### Step 2: Start Infrastructure Services

OpenFrame requires several databases and messaging systems. Start them with Docker Compose:

```bash
# Start all required infrastructure
docker compose up -d

# Verify services are running
docker compose ps
```

**Expected Output:**
```text
NAME                    SERVICE       STATUS        PORTS
openframe-cassandra     cassandra     running       0.0.0.0:9042->9042/tcp
openframe-kafka         kafka         running       0.0.0.0:9092->9092/tcp
openframe-mongodb       mongodb       running       0.0.0.0:27017->27017/tcp
openframe-pinot         pinot         running       0.0.0.0:8000->8000/tcp
openframe-redis         redis         running       0.0.0.0:6379->6379/tcp
openframe-zookeeper     zookeeper     running       0.0.0.0:2181->2181/tcp
```

> **Wait Time**: Allow 2-3 minutes for all services to fully initialize, especially Kafka and Pinot.

### Step 3: Build OpenFrame Services

Build all Java services and shared libraries:

```bash
# Build all services (this may take 3-5 minutes on first run)
mvn clean install -DskipTests

# If you want to run tests (takes longer)
mvn clean install
```

**Build Progress Indicators:**
- ✅ `openframe-core` - Core utilities and models
- ✅ `openframe-data` - Data access layer
- ✅ `openframe-security` - JWT and OAuth components
- ✅ `api-library` - Shared API services
- ✅ Gateway, API, Authorization, Client, Management services

### Step 4: Start OpenFrame Platform

Use the provided platform startup scripts:

**macOS:**
```bash
# Interactive mode (with prompts)
./scripts/run-mac.sh

# Silent mode (no prompts, uses defaults)  
./scripts/run-mac.sh --silent
```

**Linux:**
```bash
# Interactive mode
./scripts/run-linux.sh  

# Silent mode
./scripts/run-linux.sh --silent
```

**Windows PowerShell:**
```powershell
# Interactive mode
.\scripts\run-windows.ps1

# Silent mode
.\scripts\run-windows.ps1 -Silent
```

### Step 5: Start Frontend Development Server

In a new terminal, start the Vue.js frontend:

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected Output:**
```text
  VITE v5.0.10  ready in 1205 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose

  ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

## Verify Installation

### Check Service Health

All services should be running and healthy:

```bash
# Check Java services
curl -f http://localhost:8080/health      # API Gateway
curl -f http://localhost:8081/health      # Authorization Server
curl -f http://localhost:8082/health      # API Service
curl -f http://localhost:8083/health      # Management Service

# Check frontend
curl -f http://localhost:3000             # Frontend dev server
```

### Access the Platform

Open these URLs in your browser:

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Platform** | http://localhost:8080 | API Gateway (main entry point) |
| **Frontend Dev** | http://localhost:3000 | Vue.js development server |
| **Authorization** | http://localhost:8081 | OAuth2/OIDC server |
| **GraphQL Playground** | http://localhost:8082/graphiql | API exploration |

### First Login

1. **Navigate** to http://localhost:3000
2. **Click "Sign Up"** to create your first tenant and user account
3. **Fill the registration form** with your details
4. **Verify email** (check console logs for verification links in dev mode)
5. **Access dashboard** - you should see the OpenFrame main dashboard

## Hello World - First API Call

Test the GraphQL API with a simple query:

```bash
# Get basic platform information
curl -X POST http://localhost:8082/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { __schema { queryType { name } } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "__schema": {
      "queryType": {
        "name": "Query"
      }
    }
  }
}
```

## Common Setup Issues

### Services Won't Start

**Database Connection Issues:**
```bash
# Check if databases are ready
docker compose logs mongodb
docker compose logs kafka
docker compose logs redis

# Restart if needed
docker compose restart mongodb kafka redis
```

**Port Conflicts:**
```bash
# Find what's using port 8080
lsof -i :8080                    # macOS/Linux
netstat -ano | findstr :8080     # Windows

# Either stop the conflicting service or change OpenFrame ports
```

### Build Failures

**Java/Maven Issues:**
```bash
# Verify Java 21 is being used
java -version
mvn -version

# Clean and rebuild
mvn clean
mvn install -DskipTests -U       # Force update dependencies
```

**Frontend Issues:**
```bash
# Clear npm cache and reinstall
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install
```

### Memory Issues

**Docker Resource Exhaustion:**
- Increase Docker Desktop memory to 8GB+
- Close unnecessary applications
- Restart Docker Desktop

**JVM Memory Issues:**
```bash
# Add to your environment
export MAVEN_OPTS="-Xmx4g -XX:MaxMetaspaceSize=512m"
```

## Development Workflow

### Making Changes

1. **Backend Changes**: Modify Java code, then `mvn clean install` and restart affected services
2. **Frontend Changes**: Save files, Vite will hot-reload automatically
3. **Database Schema**: Changes in data layer require service restarts
4. **Configuration**: Modify `application.yml` files and restart services

### Useful Development Commands

```bash
# Quick rebuild and restart
mvn clean install -DskipTests && ./scripts/run-mac.sh --silent

# Watch logs for all services
tail -f logs/*.log

# Reset development database
docker compose down
docker compose up -d
```

## Next Steps

🎉 **Congratulations!** You now have OpenFrame running locally. Here's what to explore next:

### Immediate Next Steps
1. **[First Steps Guide](first-steps.md)** - Learn the 5 key things to do after installation
2. **Explore the Dashboard** - Navigate through devices, organizations, and settings
3. **Try the API** - Use GraphQL Playground at http://localhost:8082/graphiql

### Development Deep Dives
4. **[Development Environment Setup](../development/setup/environment.md)** - Configure IDE and tools
5. **[Architecture Overview](../development/architecture/overview.md)** - Understand the system design
6. **[Local Development Guide](../development/setup/local-development.md)** - Advanced development workflows

### Getting Help

**Join our OpenMSP Slack Community:**
🔗 https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> **Remember**: We don't use GitHub Issues. All support and community interaction happens in our Slack community.

---

**Next**: Platform running smoothly? Let's explore the key features → [First Steps](first-steps.md)