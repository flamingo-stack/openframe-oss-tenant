# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup guide. This quick start focuses on the fastest path to a working OpenFrame installation.

> **⏱️ Time to Complete**: ~5 minutes  
> **Prerequisites**: [System requirements](prerequisites.md) verified

## TL;DR Installation

For the impatient, here's the complete setup in one command block:

```bash
# Clone and start OpenFrame
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Platform-specific startup (choose one):
./scripts/run-mac.sh --silent      # macOS
./scripts/run-linux.sh --silent    # Linux  
./scripts/run-windows.ps1 --silent # Windows
```

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure

Launch the required data services using Docker Compose:

```bash
# Start databases and message brokers
cd integrated-tools/
docker-compose up -d mongodb cassandra redis kafka pinot
```

### Step 3: Build OpenFrame Services

```bash
# Return to project root
cd ..

# Build all Java services
mvn clean install -DskipTests
```

### Step 4: Start Core Services

#### Option A: Automated Script (Recommended)
```bash
# macOS
./scripts/run-mac.sh

# Linux
./scripts/run-linux.sh

# Windows PowerShell
./scripts/run-windows.ps1
```

#### Option B: Manual Service Startup
```bash
# Terminal 1 - Configuration Service
cd openframe/services/openframe-config
mvn spring-boot:run

# Terminal 2 - Authorization Server  
cd openframe/services/openframe-authorization-server
mvn spring-boot:run

# Terminal 3 - API Gateway
cd openframe/services/openframe-gateway
mvn spring-boot:run

# Terminal 4 - Main API Service
cd openframe/services/openframe-api
mvn spring-boot:run

# Terminal 5 - Frontend (new terminal)
cd openframe/services/openframe-frontend
npm install
npm run dev
```

### Step 5: Verify Installation

```bash
# Check service health
curl http://localhost:8080/health
# Expected: {"status": "UP"}

# Verify frontend
curl http://localhost:3000
# Expected: HTML response
```

## First Login

### Access the Platform

1. **Open your browser** to: `http://localhost:3000`
2. **Click "Sign Up"** to create your first account
3. **Enter your details**:
   - Email: `admin@yourdomain.com`
   - Password: `SecurePassword123!`
   - Organization: `Your MSP Name`

### Verify Core Features

After login, you should see:

- ✅ **Dashboard** with overview widgets
- ✅ **Devices** section (empty initially)  
- ✅ **Organizations** with your created org
- ✅ **Settings** for configuration

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Service Status Check

Verify all services are running properly:

```bash
# Check Java services
curl http://localhost:8080/health      # Gateway
curl http://localhost:8081/health      # API Service
curl http://localhost:8082/health      # Authorization Server

# Check frontend  
curl http://localhost:3000             # React/Vue frontend

# Check data services
docker ps | grep -E "(mongo|cassandra|redis|kafka)"
```

Expected output should show all services as healthy.

## Hello World Example

Test OpenFrame's core functionality with this simple example:

### Create Your First Organization

```bash
# Using the REST API
curl -X POST http://localhost:8080/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test MSP",
    "contactPerson": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@testmsp.com"
    }
  }'
```

### Register Your First Device Agent

```bash
# Get agent registration secret
curl http://localhost:8080/agent/registration-secret \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Use the returned secret with OpenFrame client
# (Client installation covered in next steps)
```

## Expected Results

After completing the quick start, you should have:

✅ **OpenFrame Platform Running**
- Gateway accessible at `http://localhost:8080`
- Frontend accessible at `http://localhost:3000`
- All core services healthy and responsive

✅ **User Account Created**
- Admin user with organization
- Access to all platform features
- JWT authentication working

✅ **Data Services Active**
- MongoDB for transactional data
- Cassandra for analytics
- Redis for caching
- Kafka for event streaming

✅ **API Access Verified**  
- REST endpoints responding
- GraphQL playground available
- Authentication flow complete

## Common Quick Start Issues

### Port Already in Use
```bash
# Find and kill conflicting process
lsof -ti:8080 | xargs kill -9
```

### Docker Services Not Starting
```bash
# Check Docker daemon
systemctl status docker  # Linux
docker system info       # All platforms
```

### Maven Build Failures
```bash
# Clear Maven cache and retry
mvn clean
rm -rf ~/.m2/repository/com/openframe
mvn install -DskipTests
```

### Frontend Not Loading
```bash
cd openframe/services/openframe-frontend
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## What's Running?

After successful quick start:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Web UI |
| **API Gateway** | http://localhost:8080 | Main API entry |
| **GraphQL** | http://localhost:8080/graphql | GraphQL playground |
| **Auth Server** | http://localhost:8082 | OAuth/OIDC |
| **MongoDB** | localhost:27017 | Primary database |
| **Redis** | localhost:6379 | Cache & sessions |
| **Kafka** | localhost:9092 | Event streaming |

## Next Steps

Now that OpenFrame is running:

1. **Explore Features**: Follow the [First Steps Guide](first-steps.md) to learn key platform features
2. **Add Devices**: Set up device monitoring and management  
3. **Configure Tools**: Integrate with Tactical RMM, MeshCentral, or Fleet MDM
4. **Join Community**: Get help in our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Cleanup (Optional)

To stop all services and clean up:

```bash
# Stop Java services (Ctrl+C in each terminal)

# Stop infrastructure
cd integrated-tools/
docker-compose down

# Clean up Docker volumes (optional - removes all data)
docker-compose down -v
```

---

**🎉 Congratulations!** You now have OpenFrame running locally. Ready to dive deeper? Check out our [First Steps Guide](first-steps.md) to start managing devices and exploring the platform's capabilities.