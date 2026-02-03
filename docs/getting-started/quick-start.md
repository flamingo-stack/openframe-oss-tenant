# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup guide. This covers the fastest path to a working OpenFrame installation.

> **Prerequisites**: Ensure you've completed the [Prerequisites](prerequisites.md) setup before proceeding.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# 3. Build and start OpenFrame services
mvn clean install -DskipTests
./scripts/run-mac.sh --silent    # or run-linux.sh / run-windows.ps1

# 4. Access the web interface
open http://localhost:3000
```

That's it! OpenFrame should now be running locally.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Step-by-Step Setup

### Step 1: Clone the Repository

```bash
# Clone the main OpenFrame repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify the structure
ls -la
# You should see: openframe/, clients/, integrated-tools/, scripts/, etc.
```

### Step 2: Start Infrastructure Services

OpenFrame requires several backing services. Start them with Docker Compose:

```bash
# Start MongoDB, Redis, Kafka, and other infrastructure
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# Verify services are running
docker compose -f integrated-tools/docker-compose.infrastructure.yml ps
```

Expected services:
- **MongoDB** (port 27017) - Primary database
- **Redis** (port 6379) - Caching layer  
- **Kafka** (port 9092) - Event streaming
- **Zookeeper** (port 2181) - Kafka coordination
- **NATS** (port 4222) - Real-time messaging

### Step 3: Build OpenFrame Services

Build all Java services using Maven:

```bash
# Build all services and libraries (includes tests)
mvn clean install

# Or build without tests for faster startup
mvn clean install -DskipTests
```

This compiles:
- All microservices (API, Gateway, Auth, etc.)
- Shared libraries (data layer, security, etc.)
- Integration test suite

### Step 4: Start OpenFrame Services

Use the appropriate startup script for your platform:

#### macOS
```bash
./scripts/run-mac.sh

# For automated startup (no prompts)
./scripts/run-mac.sh --silent
```

#### Linux
```bash
./scripts/run-linux.sh

# For automated startup (no prompts)  
./scripts/run-linux.sh --silent
```

#### Windows
```powershell
.\scripts\run-windows.ps1

# For automated startup (no prompts)
.\scripts\run-windows.ps1 -Silent
```

### Step 5: Start the Frontend

In a new terminal window:

```bash
# Navigate to the frontend service
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Service Ports

Once started, OpenFrame services run on these default ports:

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 3000 | http://localhost:3000 | Web interface |
| **API Gateway** | 8081 | http://localhost:8081 | API routing |
| **API Service** | 8080 | http://localhost:8080/graphql | GraphQL API |
| **Auth Server** | 8082 | http://localhost:8082 | OAuth2/OIDC |
| **Client Service** | 8083 | http://localhost:8083 | Agent management |
| **Management** | 8084 | http://localhost:8084 | Admin operations |
| **Stream Service** | 8085 | http://localhost:8085 | Event processing |
| **External API** | 8086 | http://localhost:8086 | Third-party integrations |
| **Config Server** | 8087 | http://localhost:8087 | Configuration |

## First Login

1. **Open your browser** to `http://localhost:3000`

2. **Create your first account**:
   - Click "Sign Up" 
   - Enter your email and password
   - Complete the registration flow

3. **Set up your organization**:
   - Provide organization details
   - Configure initial settings
   - Create your first MSP tenant

## Hello World Example

Test the GraphQL API with a simple query:

```bash
# Test the API Gateway health check
curl http://localhost:8081/health

# Test GraphQL query (requires authentication)
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "query { me { id email } }"
  }'
```

Expected response:
```json
{
  "data": {
    "me": {
      "id": "user-id",
      "email": "your-email@example.com"
    }
  }
}
```

## Verify Installation

Check that all services are healthy:

```bash
# Check service status
./scripts/health-check.sh

# Or manually check each service
curl http://localhost:8080/actuator/health    # API Service
curl http://localhost:8081/actuator/health    # Gateway
curl http://localhost:8082/actuator/health    # Auth Server
# ... etc
```

All services should return:
```json
{"status":"UP"}
```

## Common Issues

### Port Conflicts
```bash
# Check what's using a port
lsof -i :8080

# Kill conflicting processes or change ports in application.yml
```

### Database Connection Issues
```bash
# Verify MongoDB is running
docker logs openframe-mongo

# Test connection
mongosh mongodb://localhost:27017/openframe --eval "db.runCommand('ping')"
```

### Build Failures
```bash
# Clean and rebuild
mvn clean
rm -rf ~/.m2/repository/com/openframe
mvn install -DskipTests

# Check Java version
java --version
# Should be Java 21+
```

### Memory Issues
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx2048m"

# Or modify individual service JVM settings in application.yml
```

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)**: Explore key features and setup
2. **[Development Environment](../development/setup/environment.md)**: Configure your dev environment  
3. **[Architecture Overview](../development/architecture/overview.md)**: Understand the system design

## Development Mode

For active development, run services in development mode:

```bash
# Start only infrastructure
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# Start individual services in dev mode
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# In separate terminals, start other services
cd openframe/services/openframe-gateway  
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Start frontend with hot reload
cd openframe/services/openframe-frontend
npm run dev
```

## Docker Alternative

For a fully containerized setup:

```bash
# Build all service containers
docker compose -f docker-compose.yml build

# Start everything
docker compose up -d

# View logs
docker compose logs -f openframe-api
```

---

**🎉 Congratulations!** You now have OpenFrame running locally. Check out the [First Steps](first-steps.md) guide to start exploring the platform.

Need help? Join our [OpenMSP Slack community](https://www.openmsp.ai/) for support!