# Quick Start Guide

Get OpenFrame up and running in under 5 minutes with this streamlined setup guide. This covers the essentials to get a development environment running locally.

> **Prerequisites**: Ensure you've completed the [Prerequisites Guide](prerequisites.md) before continuing.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose up -d

# 3. Build and start backend services
mvn clean install -DskipTests
./scripts/run-linux.sh --silent

# 4. Start frontend (in new terminal)
cd openframe/services/openframe-frontend
npm install && npm run dev

# 5. Access OpenFrame at http://localhost:3000
```

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure Services

OpenFrame requires several database and messaging services. Start them using Docker Compose:

```bash
# Start MongoDB, Kafka, Redis, and other infrastructure
docker compose up -d

# Verify services are running
docker compose ps
```

Expected services:
- **MongoDB** (port 27017)
- **Apache Kafka** (port 9092)  
- **Redis** (port 6379)
- **NATS** (port 4222)
- **Apache Cassandra** (port 9042)
- **Apache Pinot** (port 9000)

### Step 3: Build Java Services

Build all OpenFrame microservices:

```bash
# Build all services (skip tests for faster setup)
mvn clean install -DskipTests

# Or with tests (takes longer)
mvn clean install
```

### Step 4: Start Backend Services

Use the platform-specific startup script:

```bash
# Linux/WSL
./scripts/run-linux.sh

# macOS
./scripts/run-mac.sh

# Windows PowerShell
./scripts/run-windows.ps1

# Silent mode (no prompts)
./scripts/run-linux.sh --silent
```

This starts:
- **Gateway Service** (port 8080)
- **API Service** (port 8081) 
- **Authorization Server** (port 8082)
- **Management Service** (port 8083)
- **Stream Service** (port 8084)
- **External API Service** (port 8085)

### Step 5: Start Frontend Development Server

In a new terminal:

```bash
cd openframe/services/openframe-frontend
npm install
npm run dev
```

The frontend will be available at: http://localhost:3000

### Step 6: Build Rust Client (Optional)

If you plan to work with the OpenFrame client agent:

```bash
cd clients/openframe-client
cargo build --release
```

## Access OpenFrame

### Web Interface
Open your browser to: **http://localhost:3000**

You'll see the OpenFrame login/registration page.

### Create Your First Account

1. Click **"Create Account"**
2. Fill in organization details:
   - **Organization Name**: Your MSP name
   - **Email**: Your email address
   - **Password**: Secure password
3. Click **"Create Account"**
4. You'll be logged in automatically

### Default API Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main web interface |
| **API Gateway** | http://localhost:8080 | Unified API entry |
| **GraphQL Playground** | http://localhost:8080/graphql | Query interface |
| **Authorization Server** | http://localhost:8082 | OAuth2/OIDC |
| **External API** | http://localhost:8080/api/v1 | REST API for integrations |

## Basic "Hello World" Example

### Test GraphQL API

1. Open GraphQL Playground: http://localhost:8080/graphql
2. Run this query:

```graphql
query {
  me {
    id
    email
    firstName
    lastName
    organization {
      id
      name
    }
  }
}
```

### Test REST API

```bash
# Get API token first (after logging in via web)
export OPENFRAME_TOKEN="your-jwt-token"

# List devices
curl -H "Authorization: Bearer $OPENFRAME_TOKEN" \
     http://localhost:8080/api/v1/devices

# Health check
curl http://localhost:8080/health
```

### Test WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => console.log('Connected to OpenFrame WebSocket');
ws.onmessage = (event) => console.log('Received:', event.data);
```

## Expected Output

### Successful Backend Startup

```text
🚀 Starting OpenFrame Services...

✅ Gateway Service started on port 8080
✅ API Service started on port 8081  
✅ Authorization Server started on port 8082
✅ Management Service started on port 8083
✅ Stream Service started on port 8084
✅ External API Service started on port 8085

🌐 Frontend: http://localhost:3000
📊 GraphQL: http://localhost:8080/graphql
🔌 Health: http://localhost:8080/health

OpenFrame is ready! 🎉
```

### Frontend Development Server

```text
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.100:3000/
  ➜  press h + enter to show help

  VITE v5.0.10  ready in 1.2s
```

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using port 8080
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>

# Or use different ports by setting environment variables
export GATEWAY_PORT=8090
export API_PORT=8091
```

### Database Connection Issues

```bash
# Check Docker services
docker compose ps

# View logs
docker compose logs mongodb
docker compose logs kafka

# Restart services
docker compose restart
```

### Build Failures

```bash
# Clean and rebuild
mvn clean
rm -rf ~/.m2/repository/com/openframe
mvn install -DskipTests

# Check Java version
java --version  # Should be 21+
```

### Memory Issues

```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx2g"

# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
```

## What You've Accomplished

After completing this guide, you have:

- ✅ A fully functional OpenFrame development environment
- ✅ All microservices running locally
- ✅ Web interface accessible at localhost:3000
- ✅ GraphQL API ready for queries
- ✅ REST APIs available for integrations
- ✅ Database and messaging infrastructure operational

## Next Steps

Now that OpenFrame is running, explore these areas:

1. **[First Steps Guide](first-steps.md)** - Essential configuration and features
2. **Add your first device** - Register an agent or integrate a tool
3. **Explore the UI** - Navigate devices, logs, and settings
4. **Try the APIs** - Use GraphQL Playground to query data
5. **Join the community** - Get help on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Production Considerations

This quick start is for development only. For production deployments:

- Use external databases (MongoDB Atlas, managed Kafka)
- Configure SSL/TLS certificates
- Set up load balancing and high availability
- Configure monitoring and logging
- Review security hardening guidelines
- Use container orchestration (Kubernetes)

Ready to dive deeper? Continue with the [First Steps Guide](first-steps.md) to explore OpenFrame's key features.