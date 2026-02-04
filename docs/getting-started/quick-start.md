# Quick Start Guide

Get OpenFrame up and running in just 5 minutes! This guide provides the fastest path to a working OpenFrame installation with all core services.

> **Prerequisites**: Ensure you have completed the [Prerequisites Guide](prerequisites.md) before proceeding.

## TL;DR - 5-Minute Setup

If you're already familiar with microservice development and have all prerequisites installed:

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose -f integrated-tools/docker-compose.yml up -d

# 3. Build all Java services
mvn clean install -DskipTests

# 4. Run the platform (choose your OS)
./scripts/run-mac.sh --silent      # macOS
./scripts/run-linux.sh --silent    # Linux
./scripts/run-windows.ps1 -Silent  # Windows PowerShell

# 5. Access the web interface
open http://localhost:3000
```

That's it! Continue reading for detailed explanations and what to expect.

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

The repository includes:
- **Java microservices** (`openframe/services/`)
- **Rust system agent** (`clients/openframe-client/`)
- **Frontend applications** (`clients/openframe-chat/`, `openframe/services/openframe-frontend/`)
- **Infrastructure configurations** (`integrated-tools/`)
- **Development scripts** (`scripts/`)

### Step 2: Start Infrastructure Services

OpenFrame requires several backing services. Start them using Docker Compose:

```bash
# Start MongoDB, Redis, Kafka, and other required services
docker compose -f integrated-tools/docker-compose.yml up -d

# Verify services are running
docker ps
```

**Expected services:**
- MongoDB (port 27017)
- Redis (port 6379)  
- Apache Kafka (port 9092)
- Zookeeper (port 2181)
- Cassandra (port 9042) - optional for development

### Step 3: Build the Platform

Build all Java services and shared libraries:

```bash
# Build everything (includes running tests)
mvn clean install

# Or build without tests for faster startup
mvn clean install -DskipTests
```

This command:
- Compiles all Java services
- Builds shared libraries
- Downloads dependencies
- Runs unit tests (unless skipped)

Build time: ~3-5 minutes on first run, ~1-2 minutes on subsequent runs.

### Step 4: Start OpenFrame Services

Use the provided platform-specific startup scripts:

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

For automated environments, use silent mode:
```bash
./scripts/run-mac.sh --silent
```

### Step 5: Access the Web Interface

Once all services are running, access OpenFrame:

1. **Open your browser**: Navigate to `http://localhost:3000`
2. **First-time setup**: You'll be prompted to create an admin account
3. **Login**: Use your newly created credentials

[![OpenFrame Product Walkthrough (Beta Access)](https://img.youtube.com/vi/awc-yAnkhIo/maxresdefault.jpg)](https://www.youtube.com/watch?v=awc-yAnkhIo)

## Service Endpoints

Once running, OpenFrame exposes these key endpoints:

| Service | URL | Purpose |
|---------|-----|---------|
| **Web UI** | `http://localhost:3000` | Main user interface |
| **API Gateway** | `http://localhost:8080` | API access point |
| **GraphQL Playground** | `http://localhost:8081/graphql` | Interactive GraphQL explorer |
| **Management API** | `http://localhost:8082` | Administrative operations |
| **Authorization Server** | `http://localhost:8083` | OAuth2/OIDC identity provider |

## Expected Output

### Terminal Output During Startup

```bash
$ ./scripts/run-mac.sh --silent
🚀 Starting OpenFrame Platform...

✅ Infrastructure services: Running
✅ Gateway Service: Started on port 8080
✅ API Service: Started on port 8081  
✅ Management Service: Started on port 8082
✅ Authorization Server: Started on port 8083
✅ Stream Service: Started on port 8084
✅ Frontend Application: Started on port 3000

🎉 OpenFrame is ready!
   Web Interface: http://localhost:3000
   API Gateway: http://localhost:8080
```

### Web Interface First Load

When you first visit `http://localhost:3000`:

1. **Welcome screen** with platform overview
2. **Account creation** form for the first administrator
3. **Organization setup** for initial tenant configuration
4. **Dashboard** showing platform status and getting started guides

## Quick Verification

Verify your installation is working correctly:

### 1. Check Service Health

```bash
# API Gateway health check
curl http://localhost:8080/health

# Expected response: {"status": "UP"}

# Check GraphQL endpoint  
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'
```

### 2. Verify Database Connectivity

```bash
# Check MongoDB connection
docker exec -it openframe-mongo mongo --eval "db.stats()"

# Check Redis connection  
docker exec -it openframe-redis redis-cli ping
# Expected response: PONG
```

### 3. Test Authentication

1. Open `http://localhost:3000`
2. Register a new account
3. Verify you can access the dashboard
4. Check that JWT tokens are working by navigating between pages

## Common Issues and Solutions

### Port Conflicts

If you get port binding errors:

```bash
# Check what's using the port
lsof -i :3000  # or :8080, :8081, etc.

# Option 1: Stop the conflicting service
sudo kill -9 <PID>

# Option 2: Use different ports by setting environment variables
export FRONTEND_PORT=3001
export GATEWAY_PORT=8090
./scripts/run-mac.sh
```

### Memory Issues

If services fail to start due to memory constraints:

```bash
# Increase JVM heap size for services
export JAVA_OPTS="-Xmx2g -Xms1g"

# Or reduce parallel builds
mvn clean install -T1
```

### Docker Service Issues

If infrastructure services fail to start:

```bash
# Check service logs
docker compose -f integrated-tools/docker-compose.yml logs mongodb
docker compose -f integrated-tools/docker-compose.yml logs redis

# Restart specific services
docker compose -f integrated-tools/docker-compose.yml restart mongodb

# Clean restart all services
docker compose -f integrated-tools/docker-compose.yml down
docker compose -f integrated-tools/docker-compose.yml up -d
```

### Frontend Build Issues

If the frontend fails to start:

```bash
cd openframe/services/openframe-frontend

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Start development server manually
npm run dev
```

## What's Running?

After successful startup, you have:

### Core Platform Services
- **API Gateway**: Routes requests and handles authentication
- **API Service**: GraphQL and REST APIs for data operations  
- **Management Service**: Administrative tasks and system management
- **Authorization Server**: OAuth2/OIDC identity provider
- **Stream Service**: Event processing and real-time data handling

### Infrastructure Services  
- **MongoDB**: Primary database for operational data
- **Redis**: Caching and session storage
- **Apache Kafka**: Event streaming and message processing
- **Zookeeper**: Kafka coordination service

### Frontend Applications
- **Web Interface**: Vue.js-based management console
- **Chat Application**: Desktop chat client (if built)

## Next Steps

Now that OpenFrame is running:

1. **Explore the interface**: Navigate through devices, organizations, and logs
2. **Follow the [First Steps Guide](first-steps.md)**: Configure your first organization and integrations
3. **Join the community**: Connect with other users on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Development Workflow

For ongoing development:

```bash
# Build and restart specific service
mvn clean install -pl openframe-api
./scripts/restart-service.sh api

# Watch frontend changes
cd openframe/services/openframe-frontend
npm run dev

# View logs
./scripts/logs.sh api        # API service logs
./scripts/logs.sh gateway    # Gateway service logs
./scripts/logs.sh all        # All service logs
```

## Stopping OpenFrame

To stop all services:

```bash
# Stop OpenFrame services
./scripts/stop.sh

# Stop infrastructure services
docker compose -f integrated-tools/docker-compose.yml down

# Stop and remove all containers/volumes (nuclear option)
docker compose -f integrated-tools/docker-compose.yml down -v
```

## Get Help

If you encounter issues:

1. **Check logs**: Use `./scripts/logs.sh <service>` to view detailed logs
2. **Community support**: Ask questions on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
3. **Documentation**: Review the [First Steps Guide](first-steps.md) for detailed configuration
4. **GitHub Issues**: Report bugs or request features on the GitHub repository

Congratulations! You now have a fully functional OpenFrame installation. Continue with the [First Steps Guide](first-steps.md) to configure your first organization and start managing your IT infrastructure.