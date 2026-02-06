# Quick Start Guide

Get OpenFrame running in 5 minutes with this streamlined installation guide.

> **Prerequisites**: Ensure you have completed the [Prerequisites Guide](prerequisites.md) before proceeding.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start dependencies
docker-compose -f integrated-tools/docker-compose.yml up -d

# 3. Build and run services
mvn clean install -DskipTests
./scripts/run-mac.sh --silent  # or run-linux.sh on Linux

# 4. Start frontend
cd openframe/services/openframe-frontend
npm install && npm run dev

# 5. Access OpenFrame at http://localhost:3000
```

## Detailed Setup Steps

### Step 1: Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify the structure
ls -la
# You should see: openframe/, clients/, integrated-tools/, scripts/, etc.
```

### Step 2: Start Infrastructure Dependencies

OpenFrame requires several databases and services. Start them using Docker Compose:

```bash
# Start MongoDB, Kafka, Redis, and other dependencies
cd integrated-tools
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Expected Output:**
```bash
NAME                SERVICE             STATUS              PORTS
mongodb             mongodb             running             0.0.0.0:27017->27017/tcp
redis               redis               running             0.0.0.0:6379->6379/tcp
kafka               kafka               running             0.0.0.0:9092->9092/tcp
zookeeper           zookeeper           running             2181/tcp, 2888/tcp, 3888/tcp
```

### Step 3: Build Java Services

```bash
# Return to project root
cd ..

# Build all Java services and libraries
mvn clean install -DskipTests

# This will build:
# - Core libraries (openframe-core, openframe-data, etc.)
# - Services (gateway, api, auth, management, etc.)
```

### Step 4: Start OpenFrame Services

Choose your platform-specific startup script:

```bash
# macOS
./scripts/run-mac.sh

# Linux
./scripts/run-linux.sh

# Windows (PowerShell)
./scripts/run-windows.ps1

# Silent mode (no prompts)
./scripts/run-mac.sh --silent
```

The script will start these services in order:
1. **Config Server** (port 8888)
2. **Authorization Service** (port 8082)
3. **Gateway Service** (port 8080)
4. **API Service** (port 8081)
5. **Client Service** (port 8083)
6. **Management Service** (port 8084)

### Step 5: Start the Frontend

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at http://localhost:3000
```

### Step 6: Verify Installation

Open your browser and navigate to `http://localhost:3000`. You should see the OpenFrame login screen.

#### Test API Endpoints

```bash
# Test gateway health
curl http://localhost:8080/health

# Test API service
curl http://localhost:8081/health

# Test auth service
curl http://localhost:8082/.well-known/openid_configuration
```

**Expected Responses:**
- Health endpoints should return `200 OK`
- OpenID configuration should return JSON metadata

## First Login

### Create Your First Tenant

1. Navigate to `http://localhost:3000`
2. Click "Sign Up" to create a new account
3. Fill in the registration form:
   - **Organization Name**: Your MSP company name
   - **Domain**: Your organization domain (e.g., `yourmsp.local`)
   - **Admin Email**: Your email address
   - **Password**: Choose a strong password

4. Click "Create Account"

### Initial Configuration

After registration, you'll be guided through initial setup:

1. **Organization Setup**: Configure your MSP details
2. **Tool Integration**: Connect your existing tools (optional)
3. **User Invitations**: Add team members (optional)

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Basic Operations Test

### Test Device Management

```bash
# Register a test device (simulated)
curl -X POST http://localhost:8080/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "hostname": "test-device-01",
    "platform": "linux",
    "organization": "your-org-id"
  }'
```

### Test GraphQL API

```bash
# Query organizations
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "query": "{ organizations { edges { node { id name domain } } } }"
  }'
```

## Expected Results

After completing the quick start, you should have:

✅ **OpenFrame Platform Running**
- All services healthy and responsive
- Database connections established
- Frontend accessible at `http://localhost:3000`

✅ **First Tenant Created**
- Admin account registered
- Organization configured
- Access to the dashboard

✅ **API Access Working**
- REST endpoints responding
- GraphQL queries functional
- Authentication flow operational

## Troubleshooting Quick Fixes

### Services Won't Start

```bash
# Check if ports are in use
netstat -tuln | grep -E ':(8080|8081|8082|3000|27017|9092|6379)'

# Kill conflicting processes
sudo kill -9 $(lsof -t -i:8080)

# Restart services
./scripts/run-mac.sh
```

### Database Connection Issues

```bash
# Restart Docker services
cd integrated-tools
docker-compose down
docker-compose up -d

# Wait 30 seconds for services to initialize
sleep 30
```

### Frontend Build Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try starting again
npm run dev
```

### Memory Issues

If you encounter out-of-memory errors:

```bash
# Increase JVM heap size
export JAVA_OPTS="-Xmx4g -Xms2g"

# Restart services
./scripts/run-mac.sh
```

## Performance Tuning

For better performance in development:

```bash
# Set development profile
export SPRING_PROFILES_ACTIVE=local,dev

# Disable unnecessary features
export DISABLE_METRICS=true
export DISABLE_TRACING=true

# Use local cache
export CACHE_ENABLED=true
```

## What's Next?

Now that OpenFrame is running, proceed to the [First Steps Guide](first-steps.md) to:
- Explore the dashboard
- Add your first devices
- Configure integrations
- Invite team members

## Need Help?

If you encounter issues during setup:

1. **Check the logs**: Service logs are available in the console output
2. **Visit our community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
3. **Review documentation**: Additional guides in the development section
4. **Report issues**: [GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)

---

**🎉 Congratulations!** You now have OpenFrame running locally. The platform is ready for exploration and development.