# Quick Start Guide

Get OpenFrame up and running in under 5 minutes! This guide provides the fastest path to a working OpenFrame installation using shell scripts and Docker containers.

[![OpenFrame v0.5.2: Live Demo of AI-Powered IT Management for MSPs](https://img.youtube.com/vi/a45pzxtg27k/maxresdefault.jpg)](https://www.youtube.com/watch?v=a45pzxtg27k)

## Before You Start

Ensure you have completed the [Prerequisites](prerequisites.md) setup:
- ✅ Java 21 installed and configured
- ✅ Maven 3.6+ available  
- ✅ Docker and Docker Compose running
- ✅ Node.js 18+ for frontend components
- ✅ Rust toolchain for client components

## Option 1: Docker Compose Setup (Recommended)

The fastest way to get OpenFrame running locally for development and testing.

### Step 1: Clone the Repository

```bash
# Clone the OpenFrame repository
git clone https://github.com/your-org/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure Services

```bash
# Create and start all required infrastructure
docker-compose -f docker/docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker/docker-compose.dev.yml ps
```

This starts:
- MongoDB (port 27017)
- Redis (port 6379) 
- Kafka + Zookeeper (port 9092)
- NATS JetStream (port 4222)

### Step 3: Build the Platform

```bash
# Build all services using Maven
mvn clean install -DskipTests

# This compiles all Spring Boot services:
# - Gateway Service (port 8443)
# - API Service (port 8080)
# - Authorization Server (port 9000)
# - Management Service (port 8082)
# - Stream Service (port 8083)
# - External API Service (port 8084)
```

### Step 4: Initialize Configuration

Run the development setup script to configure your local environment:

```bash
# Make the script executable
chmod +x clients/openframe-client/scripts/setup_dev_init_config.sh

# Run the setup script
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

The script will:
1. Prompt for an access token (use `dev-token-123` for local development)
2. Fetch registration secrets from the API
3. Generate initial configuration files

### Step 5: Start OpenFrame Services  

```bash
# Start all services in development mode
java -jar openframe/services/openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-management/target/openframe-management-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-stream/target/openframe-stream-1.0.0-SNAPSHOT.jar &
java -jar openframe/services/openframe-external-api/target/openframe-external-api-1.0.0-SNAPSHOT.jar &
```

### Step 6: Verify Installation

```bash
# Test the API endpoint
curl -k https://localhost:8443/health
# Expected: {"status":"UP"}

# Test the authorization server
curl -k https://localhost:9000/.well-known/openid-configuration
# Expected: JSON configuration response

# Test MongoDB connection
docker exec openframe-mongodb mongosh --eval "db.runCommand('ping')"
# Expected: { "ok" : 1 }
```

## Option 2: Manual Build and Run

For developers who prefer step-by-step control over the build process.

### Step 1: Set Environment Variables

```bash
# Create environment configuration
export OPENFRAME_ENV=development
export MONGODB_URI=mongodb://admin:admin123@localhost:27017/openframe
export REDIS_URL=redis://localhost:6379
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export NATS_URL=nats://localhost:4222
export ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Step 2: Build Individual Services

```bash
# Build core libraries first
cd openframe-oss-lib
mvn clean install -DskipTests

# Build service applications
cd ../openframe/services

# Build each service
mvn clean install -DskipTests -pl openframe-gateway
mvn clean install -DskipTests -pl openframe-authorization-server  
mvn clean install -DskipTests -pl openframe-api
mvn clean install -DskipTests -pl openframe-management
mvn clean install -DskipTests -pl openframe-stream
mvn clean install -DskipTests -pl openframe-external-api
```

### Step 3: Initialize Database

```bash
# Run database initialization scripts
mongosh "mongodb://admin:admin123@localhost:27017/openframe" < scripts/db/init-mongo.js

# Create Kafka topics
kafka-topics.sh --create --topic openframe.events --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
kafka-topics.sh --create --topic openframe.unified --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

### Step 4: Start Services with Spring Profiles

```bash
# Start services with development profile
java -jar openframe-gateway/target/openframe-gateway-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev &
java -jar openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev &
java -jar openframe-api/target/openframe-api-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev &
```

## Expected Results

After successful startup, you should have:

### ✅ **Running Services**

| Service | URL | Status Check |
|---------|-----|--------------|
| Gateway | https://localhost:8443 | `curl -k https://localhost:8443/health` |
| API Service | https://localhost:8080 | `curl https://localhost:8080/actuator/health` |
| Authorization Server | https://localhost:9000 | `curl https://localhost:9000/actuator/health` |
| External API | https://localhost:8084 | `curl https://localhost:8084/actuator/health` |

### ✅ **Database Connections**

```bash
# MongoDB - should show databases
mongosh "mongodb://admin:admin123@localhost:27017" --eval "show dbs"

# Redis - should return PONG
redis-cli ping

# Kafka - should list topics
kafka-topics.sh --list --bootstrap-server localhost:9092
```

### ✅ **GraphQL API Access**

```bash
# Test GraphQL endpoint
curl -X POST https://localhost:8443/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-123" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

### ✅ **Log Output**

You should see log output similar to:

```text
2024-01-15 10:30:00.000  INFO --- [main] com.openframe.gateway.GatewayApplication: Starting GatewayApplication
2024-01-15 10:30:05.000  INFO --- [main] com.openframe.gateway.GatewayApplication: Started GatewayApplication in 8.234 seconds
2024-01-15 10:30:10.000  INFO --- [main] com.openframe.api.ApiApplication: Starting ApiApplication  
2024-01-15 10:30:15.000  INFO --- [main] com.openframe.api.ApiApplication: Started ApiApplication in 12.567 seconds
```

## Build the OpenFrame Client

The OpenFrame client provides agent functionality for managed devices.

### Client Build (Rust)

```bash
# Navigate to client directory
cd clients/openframe-client

# Build the client
cargo build --release

# The binary will be available at:
# target/release/openframe-client
```

### Chat Application (Tauri)

```bash
# Navigate to chat client
cd clients/openframe-chat

# Install Node.js dependencies
npm install

# Build the Tauri application
npm run tauri build

# The app will be available in src-tauri/target/release/
```

## Troubleshooting Common Issues

### Port Conflicts

**Problem**: "Port already in use" errors

**Solution**:
```bash
# Find and kill processes using required ports
lsof -ti:8443 | xargs kill -9
lsof -ti:8080 | xargs kill -9
lsof -ti:9000 | xargs kill -9
```

### Database Connection Issues

**Problem**: Cannot connect to MongoDB or Redis

**Solution**:
```bash
# Restart Docker containers
docker restart openframe-mongodb openframe-redis openframe-kafka

# Wait 30 seconds for startup
sleep 30

# Test connections
mongosh "mongodb://admin:admin123@localhost:27017" --eval "db.runCommand('ping')"
redis-cli ping
```

### Java Version Issues

**Problem**: "Unsupported Java version" errors

**Solution**:
```bash
# Verify Java 21 is active
java -version

# If wrong version, switch using SDKMAN
sdk use java 21.0.1-tem

# Verify JAVA_HOME
echo $JAVA_HOME
```

### Maven Build Failures

**Problem**: Compilation or dependency resolution errors

**Solution**:
```bash
# Clean Maven cache and rebuild
mvn clean
rm -rf ~/.m2/repository/com/openframe
mvn install -DskipTests -U
```

## Performance Tuning

For better development experience:

### JVM Options

```bash
# Set JVM options for faster startup
export MAVEN_OPTS="-Xmx2g -XX:+UseG1GC -XX:+UseStringDeduplication"

# For service JVMs
export JVM_ARGS="-Xmx1g -XX:+UseG1GC -Dspring.jmx.enabled=false"
```

### Docker Resources

```bash
# Allocate more resources to Docker
docker system prune -a  # Clean up unused resources
```

Update Docker Desktop settings:
- CPU: 4+ cores
- Memory: 8+ GB
- Disk: 50+ GB

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)** - Configure your first tenant and explore features
2. **Web Interface** - Open https://localhost:8443 to access the OpenFrame dashboard
3. **API Documentation** - Visit https://localhost:8443/swagger-ui for API docs
4. **Join Community** - Connect with other developers at https://www.openmsp.ai/

## Quick Reference

### Essential Commands

```bash
# Start all infrastructure
docker-compose -f docker/docker-compose.dev.yml up -d

# Build platform
mvn clean install -DskipTests

# Health checks
curl -k https://localhost:8443/health
curl https://localhost:8080/actuator/health

# View logs
docker logs openframe-mongodb
tail -f openframe-api.log

# Stop everything
docker-compose -f docker/docker-compose.dev.yml down
pkill -f "openframe"
```

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| MongoDB | admin | admin123 |
| Development Token | dev-token-123 | (no password) |

> ⚠️ **Security Note**: These are development-only credentials. Never use these in production environments.

## Success! 🎉

You now have a fully functional OpenFrame development environment. The platform is running with all microservices, databases, and the AI-powered features ready for use.

Next: Follow the [First Steps Guide](first-steps.md) to create your first tenant and start exploring OpenFrame's capabilities!