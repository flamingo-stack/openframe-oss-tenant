# Quick Start Guide

Get OpenFrame OSS Tenant running locally in under 5 minutes! This guide provides the fastest path to a working development environment.

> **Prerequisites**: Ensure you've completed the [Prerequisites](prerequisites.md) setup before proceeding.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker-compose up -d mongodb kafka redis

# 3. Install Node.js dependencies
npm install

# 4. Build the Spring Boot services
mvn clean install -DskipTests

# 5. Start the core services
./start-dev-services.sh
```

That's it! OpenFrame will be available at `http://localhost:8080`.

## Detailed Setup Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure Services

OpenFrame requires several infrastructure services. Start them with Docker Compose:

```bash
# Start all infrastructure services in the background
docker-compose up -d

# Or start individual services as needed
docker-compose up -d mongodb
docker-compose up -d kafka
docker-compose up -d redis
docker-compose up -d cassandra  # For log storage
docker-compose up -d nats       # For real-time messaging
```

**Verify services are running:**

```bash
# Check all containers
docker-compose ps

# Expected output shows all services as "Up"
```

### Step 3: Install Node.js Dependencies

The tooling layer requires Node.js dependencies:

```bash
# Install root dependencies (AI SDK, VoltAgent Core, etc.)
npm install

# Install client dependencies if developing frontend
cd clients/openframe-chat && npm install && cd ../..
```

### Step 4: Build Spring Boot Services

Compile and package all Spring Boot services:

```bash
# Build all modules (this may take a few minutes on first run)
mvn clean install -DskipTests

# Or build specific services
mvn clean install -pl openframe/services/openframe-api -am
mvn clean install -pl openframe/services/openframe-gateway -am
```

**Build Output**: Look for `BUILD SUCCESS` messages for all modules.

### Step 5: Start OpenFrame Services

Start the core platform services in the correct order:

```bash
# Option 1: Use provided start script (if available)
./start-dev-services.sh

# Option 2: Start services manually
# Start Configuration Server first
java -jar openframe/services/openframe-config/target/openframe-config-1.0.0-SNAPSHOT.jar &

# Wait 30 seconds, then start other services
java -jar openframe/services/openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-client/target/openframe-client-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-management/target/openframe-management-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-stream/target/openframe-stream-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-external-api/target/openframe-external-api-1.0.0-SNAPSHOT.jar &
```

### Step 6: Verify Installation

**Check service health:**

```bash
# API Service health
curl http://localhost:8080/actuator/health

# Gateway Service health  
curl http://localhost:8761/actuator/health

# Authorization Server health
curl http://localhost:9000/actuator/health
```

**Expected Response:**
```json
{
  "status": "UP"
}
```

## Service Access Points

Once running, OpenFrame services are available at:

| Service | URL | Purpose |
|---------|-----|---------|
| **Gateway** | http://localhost:8761 | Main entry point |
| **API Service** | http://localhost:8080 | Internal APIs |
| **Authorization Server** | http://localhost:9000 | OAuth2/OIDC |
| **External API** | http://localhost:8081 | Public APIs |
| **Management** | http://localhost:8082 | Admin operations |

## Basic "Hello World" Test

Let's verify OpenFrame is working with a simple API call:

### 1. Health Check

```bash
# Test the main API health endpoint
curl -X GET "http://localhost:8080/actuator/health" \
     -H "accept: application/json"
```

**Expected Output:**
```json
{
  "status": "UP",
  "components": {
    "mongo": {
      "status": "UP"
    },
    "kafka": {
      "status": "UP" 
    },
    "diskSpace": {
      "status": "UP"
    }
  }
}
```

### 2. API Version Info

```bash
# Get platform version information
curl -X GET "http://localhost:8080/api/release-version" \
     -H "accept: application/json"
```

### 3. GraphQL Introspection

```bash
# Test GraphQL endpoint availability
curl -X POST "http://localhost:8080/graphql" \
     -H "Content-Type: application/json" \
     -d '{"query": "query { __schema { types { name } } }"}'
```

## Development Workflow

With OpenFrame running, here's the typical development workflow:

### 1. Code Changes

- **Java services**: Edit code in `openframe/services/*` or `deps/openframe-oss-lib/*`
- **Node.js tooling**: Edit code in root directory or `clients/*`

### 2. Hot Reload (Java)

```bash
# Rebuild specific service
mvn clean install -pl openframe/services/openframe-api -am

# Restart just that service
pkill -f "openframe-api"
java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar &
```

### 3. Hot Reload (Node.js)

```bash
# Node.js dependencies are automatically reloaded
npm run dev  # If using nodemon or similar
```

## Common Issues & Quick Fixes

### Port Already in Use

**Problem**: `Address already in use: bind failed`

**Quick Fix**:
```bash
# Find what's using the port
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>
```

### MongoDB Connection Failed

**Problem**: `MongoSocketOpenException: Exception opening socket`

**Quick Fix**:
```bash
# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

### Out of Memory Errors

**Problem**: `OutOfMemoryError: Java heap space`

**Quick Fix**:
```bash
# Increase JVM heap size
export JAVA_OPTS="-Xms2g -Xmx4g"

# Restart services with new memory settings
```

### Services Won't Start

**Problem**: Services fail to start or connect

**Quick Fix**:
```bash
# Check all infrastructure is running
docker-compose ps

# Restart everything
docker-compose down && docker-compose up -d

# Check logs for specific issues
docker-compose logs mongodb
docker-compose logs kafka
```

## Next Steps

Now that OpenFrame is running, explore these features:

1. **Web Interface**: If available, access the web UI through the Gateway
2. **API Documentation**: Explore the GraphQL playground and REST endpoints
3. **Agent Registration**: Set up test agents using the Client service
4. **Tool Integration**: Configure integrated tools and watch events flow

## Development Tools & Tips

### Useful Commands

```bash
# Watch service logs in real-time
tail -f openframe/services/*/logs/*.log

# Monitor JVM memory usage
jstat -gc $(pgrep -f "openframe-api") 5s

# Check Kafka topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# MongoDB queries
docker exec -it mongodb mongosh
```

### IDE Setup

**IntelliJ IDEA:**
1. Open the root project directory
2. Import as Maven project
3. Set Project SDK to Java 21
4. Enable annotation processing
5. Configure Spring Boot run configurations

**VS Code:**
1. Install Java Extension Pack
2. Install Spring Boot Extension Pack
3. Open workspace with all services
4. Configure launch.json for debugging

[![OpenFrame: 5-Minute MSP Platform Walkthrough - Cut Vendor Costs & Automate Ops](https://img.youtube.com/vi/er-z6IUnAps/maxresdefault.jpg)](https://www.youtube.com/watch?v=er-z6IUnAps)

## Stopping Services

When you're done developing:

```bash
# Stop all Java services
pkill -f "openframe"

# Stop infrastructure services
docker-compose down

# Or keep data and just stop containers
docker-compose stop
```

## Summary

You now have OpenFrame OSS Tenant running locally! The platform provides:

- ✅ Multi-tenant backend services
- ✅ OAuth2/OIDC authentication
- ✅ GraphQL and REST APIs
- ✅ Real-time event processing
- ✅ AI-powered automation framework

**What you achieved:**
- Complete local development environment
- All core services running and healthy
- Infrastructure services (MongoDB, Kafka, Redis) operational
- API endpoints accessible for testing

---

**Next Step**: Explore the [First Steps Guide](first-steps.md) to learn about key features and configuration options.