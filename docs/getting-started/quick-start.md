# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup guide. This will start a local development environment with all core services.

## TL;DR - One-Command Setup

If you have all prerequisites installed, you can start OpenFrame with a single command:

```bash
# Clone and start OpenFrame
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
./scripts/run-mac.sh --silent    # macOS
# OR
./scripts/run-linux.sh --silent  # Linux  
# OR
./scripts/run-windows.ps1 -Silent # Windows PowerShell
```

This will automatically:
- Start all required databases and services
- Build and deploy the OpenFrame platform
- Open the web interface at `http://localhost:3000`

## Step-by-Step Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Start Infrastructure Services

```bash
# Start databases and messaging services with Docker Compose
docker-compose -f integrated-tools/docker-compose.yml up -d mongodb redis kafka
```

Verify services are running:

```bash
# Check service status
docker-compose -f integrated-tools/docker-compose.yml ps

# Should show mongodb, redis, and kafka as 'Up'
```

### 3. Build Core Services

```bash
# Build all Java services and libraries
mvn clean install -DskipTests

# This builds:
# - All shared libraries (openframe-core, openframe-data, etc.)
# - All services (gateway, api, authorization-server, etc.)
```

### 4. Start Core Services

Open multiple terminals and start each service:

**Terminal 1 - Config Service:**
```bash
cd openframe/services/openframe-config
mvn spring-boot:run
```

**Terminal 2 - Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run
```

**Terminal 3 - API Service:**
```bash
cd openframe/services/openframe-api
mvn spring-boot:run
```

**Terminal 4 - Gateway Service:**
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

### 5. Start Frontend

```bash
cd openframe/services/openframe-frontend
npm install
npm run dev
```

### 6. Access OpenFrame

Open your browser and navigate to:
- **Web Interface**: [http://localhost:3000](http://localhost:3000)
- **API Gateway**: [http://localhost:8080](http://localhost:8080)
- **GraphQL Playground**: [http://localhost:8081/graphql](http://localhost:8081/graphql)

## Initial Setup

### First-Time Registration

1. **Open the web interface** at [http://localhost:3000](http://localhost:3000)

2. **Register your first tenant**:
   - Click "Sign Up" 
   - Enter your organization details
   - Choose a unique tenant subdomain
   - Set up your admin account

3. **Complete initial configuration**:
   - Verify your email (development mode auto-verifies)
   - Set up your first organization
   - Configure basic settings

### Example Registration Flow

```bash
# Navigate to registration
curl -X POST http://localhost:8082/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenantDomain": "mycompany",
    "organizationName": "My MSP Company",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@mycompany.com",
    "password": "SecurePassword123!"
  }'
```

## Verify Installation

### Check Service Health

```bash
# Test API Gateway
curl http://localhost:8080/health

# Test Authorization Server
curl http://localhost:8082/health

# Test API Service
curl http://localhost:8081/health

# All should return HTTP 200 with status "UP"
```

### Test GraphQL API

```graphql
# Navigate to http://localhost:8081/graphql
# Run this query to test connectivity:

query {
  organizations {
    edges {
      node {
        id
        name
      }
    }
  }
}
```

### Test Frontend Connectivity

1. **Login** with the account you created
2. **Navigate to Dashboard** - should show basic stats
3. **Check Devices tab** - should show empty state (normal for new install)
4. **Check Logs tab** - should show log interface

## Expected Output

When everything is running correctly, you should see:

```text
✅ MongoDB: Running on port 27017
✅ Redis: Running on port 6379
✅ Kafka: Running on port 9092
✅ Config Service: Running on port 8888
✅ Authorization Server: Running on port 8082
✅ API Service: Running on port 8081
✅ Gateway Service: Running on port 8080
✅ Frontend: Running on port 3000
```

## Common Quick Start Issues

### Port Conflicts

```bash
# If you get port already in use errors:
sudo lsof -i :8080  # Check what's using the port
sudo kill -9 <PID>  # Kill the conflicting process
```

### MongoDB Connection Issues

```bash
# If MongoDB fails to start:
docker-compose -f integrated-tools/docker-compose.yml logs mongodb

# Restart MongoDB if needed:
docker-compose -f integrated-tools/docker-compose.yml restart mongodb
```

### Build Failures

```bash
# If Maven build fails, try:
mvn clean install -U -DskipTests

# Clean everything and rebuild:
mvn clean
mvn clean install -DskipTests
```

### Frontend Not Loading

```bash
# If frontend fails to start:
cd openframe/services/openframe-frontend

# Clear node modules and reinstall:
rm -rf node_modules package-lock.json
npm install

# Start in verbose mode:
npm run dev -- --verbose
```

## Development vs Production

This quick start creates a **development environment**. Key differences from production:

| Aspect | Development | Production |
|--------|-------------|------------|
| **Security** | Relaxed CORS, HTTP allowed | Strict CORS, HTTPS only |
| **Database** | Single MongoDB instance | Replica sets with backup |
| **Scaling** | Single instance services | Load balanced services |
| **SSL/TLS** | Self-signed or HTTP | Valid SSL certificates |
| **Monitoring** | Console logs | Prometheus + Grafana |

## What's Running

After quick start, you have:

| Service | Purpose | URL |
|---------|---------|-----|
| **Frontend** | Web interface | [http://localhost:3000](http://localhost:3000) |
| **Gateway** | API proxy and auth | [http://localhost:8080](http://localhost:8080) |
| **API Service** | Core APIs and GraphQL | [http://localhost:8081](http://localhost:8081) |
| **Auth Server** | OAuth and SSO | [http://localhost:8082](http://localhost:8082) |
| **Config Server** | Configuration management | [http://localhost:8888](http://localhost:8888) |
| **MongoDB** | Primary database | `mongodb://localhost:27017` |
| **Redis** | Cache and sessions | `redis://localhost:6379` |
| **Kafka** | Event streaming | `localhost:9092` |

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)** - Explore core features
2. **[Development Environment](../development/setup/environment.md)** - Set up for development
3. **[Architecture Overview](../development/architecture/overview.md)** - Understand the system design

## Getting Help

If you run into issues:

1. **Check the logs** in each terminal window for error messages
2. **Verify prerequisites** are properly installed
3. **Join our community** for support: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Watch the Walkthrough

For a visual guide to getting started, watch our product walkthrough:

[![OpenFrame Product Walkthrough (Beta Access)](https://img.youtube.com/vi/awc-yAnkhIo/maxresdefault.jpg)](https://www.youtube.com/watch?v=awc-yAnkhIo)