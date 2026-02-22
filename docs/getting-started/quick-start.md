# Quick Start Guide

Get OpenFrame up and running in under 5 minutes. This guide will have you exploring the platform quickly using the fastest setup method.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## TL;DR - 5-Minute Setup

For the quickest start, use our development shell scripts:

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start development dependencies
./scripts/dev-start-dependencies.sh

# 3. Initialize development configuration  
./clients/openframe-client/scripts/setup_dev_init_config.sh

# 4. Build and start services
mvn clean install -DskipTests
./scripts/start-all-services.sh

# 5. Access the platform
open http://localhost:3000
```

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Development Dependencies

OpenFrame requires several databases and message brokers. Start them using Docker:

```bash
# Start MongoDB, Redis, Kafka, Cassandra, and other dependencies
./scripts/dev-start-dependencies.sh

# Verify services are running
docker ps
```

You should see containers for:
- MongoDB (port 27017)
- Redis (port 6379) 
- Kafka + Zookeeper (ports 9092, 2181)
- Apache Pinot (ports 9000, 8000)
- NATS Server (port 4222)

### Step 3: Initialize Configuration

Run the client configuration setup script:

```bash
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script configures:
- Database connection strings
- Default tenant settings
- OAuth2 client registration
- AI service endpoints

### Step 4: Build the Platform

Build all Spring Boot services:

```bash
# Clean build with tests skipped for quick start
mvn clean install -DskipTests

# If you prefer to run tests (takes longer):
# mvn clean install
```

Expected output:
```text
[INFO] ------------------------------------------------------------------------
[INFO] Reactor Summary:
[INFO] ------------------------------------------------------------------------
[INFO] OpenFrame Platform ................................ SUCCESS
[INFO] OpenFrame Config ................................... SUCCESS
[INFO] OpenFrame API ...................................... SUCCESS
[INFO] OpenFrame Authorization Server ..................... SUCCESS
[INFO] OpenFrame Gateway .................................. SUCCESS
[INFO] OpenFrame External API ............................. SUCCESS
[INFO] OpenFrame Client ................................... SUCCESS
[INFO] OpenFrame Stream ................................... SUCCESS
[INFO] OpenFrame Management ............................... SUCCESS
[INFO] ------------------------------------------------------------------------
```

### Step 5: Start Core Services

Launch the microservices in the correct order:

```bash
# Start all services
./scripts/start-all-services.sh
```

This starts services in dependency order:
1. **Config Server** (port 8888) - Centralized configuration
2. **Authorization Server** (port 8082) - OAuth2/OIDC
3. **Gateway** (port 8081) - API gateway and security
4. **API Service** (port 8080) - Internal APIs
5. **External API** (port 8083) - Public APIs
6. **Client Service** (port 8084) - Agent communication
7. **Stream Service** (port 8085) - Event processing

### Step 6: Start the Frontend

In a new terminal, start the web UI:

```bash
cd openframe/services/openframe-frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Verify Installation

### Check Service Health

Verify all services are running:

```bash
# Check API service
curl http://localhost:8080/actuator/health

# Check Gateway
curl http://localhost:8081/actuator/health

# Check Authorization Server
curl http://localhost:8082/actuator/health
```

Expected response for each:
```json
{"status":"UP"}
```

### Access the Platform

Open your browser and navigate to:

- **Main Dashboard**: `http://localhost:3000`
- **API Documentation**: `http://localhost:8080/swagger-ui.html`
- **Gateway Health**: `http://localhost:8081/actuator/health`

### Create Your First Tenant

1. Navigate to `http://localhost:3000`
2. Click "Sign Up" to create a new account
3. Complete the tenant registration form
4. Verify your email (check development logs for the verification link)
5. Log in to access the OpenFrame dashboard

## Hello World Example

Once logged in, test the platform with these steps:

### 1. Create an Organization

```bash
# Using the External API with an API key
curl -X POST http://localhost:8083/api/v1/organizations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Example MSP",
    "contactInformation": {
      "email": "admin@example-msp.com"
    }
  }'
```

### 2. Register a Test Device

In the web UI:
1. Navigate to **Devices** → **New Device**
2. Use the registration command provided
3. Install the OpenFrame client on a test machine

### 3. Test Mingo AI Assistant

1. Navigate to **Mingo** in the sidebar
2. Start a conversation: "Help me understand my infrastructure"
3. Mingo will analyze your connected devices and provide insights

## Expected Results

After successful setup, you should see:

### Dashboard Overview
- **Devices**: 0-1 devices (if you registered a test device)
- **Organizations**: 1 organization (the one you created)
- **Recent Activity**: Setup and registration events
- **AI Insights**: Welcome message from Mingo

### Available Features
- ✅ Multi-tenant authentication
- ✅ Device management interface
- ✅ Organization management
- ✅ Mingo AI assistant
- ✅ Real-time event streaming
- ✅ API access with key management

### Performance Expectations
- **Startup time**: 2-3 minutes for all services
- **Memory usage**: ~4GB with default configuration
- **Response time**: <200ms for API calls locally

## Quick Commands Reference

```bash
# Start development environment
./scripts/dev-start-dependencies.sh

# Stop all services
./scripts/stop-all-services.sh

# Restart specific service
./scripts/restart-service.sh api-service

# View logs
docker compose logs -f openframe-api

# Clean rebuild
mvn clean install && ./scripts/restart-all-services.sh
```

## Troubleshooting Quick Fixes

### Services Won't Start
```bash
# Check if ports are in use
netstat -tulpn | grep :8080

# Kill conflicting processes
pkill -f "java.*openframe"

# Restart with clean slate
./scripts/stop-all-services.sh
./scripts/dev-start-dependencies.sh
./scripts/start-all-services.sh
```

### Database Connection Issues
```bash
# Restart databases
docker compose restart mongodb redis kafka

# Check database connectivity
docker compose exec mongodb mongosh --eval "db.runCommand('ping')"
```

### Frontend Not Loading
```bash
cd openframe/services/openframe-frontend

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)** - Explore key features and workflows
2. **[Development Environment Setup](../development/setup/local-development.md)** - Configure for development work

## Need Help?

- **Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Browse the architecture guides for deeper understanding
- **Issues**: Report problems on the GitHub repository

---

*🎉 Congratulations! You now have OpenFrame running locally. Continue with [First Steps](first-steps.md) to learn how to use the platform effectively.*