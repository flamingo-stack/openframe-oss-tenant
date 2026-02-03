# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined installation guide. This quick start uses Docker Compose to launch all required services locally.

> **Before starting**: Ensure you've met all [Prerequisites](prerequisites.md) including Docker, Java 21, and Node.js.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Run platform-specific startup script
# On macOS:
./scripts/run-mac.sh --silent

# On Linux:
./scripts/run-linux.sh --silent

# On Windows (PowerShell):
.\scripts\run-windows.ps1 -Silent

# 3. Access OpenFrame UI
open http://localhost:3000
```

That's it! OpenFrame should now be running locally. Continue reading for detailed setup steps and configuration options.

## Step 1: Clone and Setup

### Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Verify Repository Structure

```bash
ls -la
# Expected directories:
# - openframe/         (Java services)
# - clients/           (Rust client agent) 
# - integrated-tools/  (Docker configs)
# - scripts/           (Startup scripts)
# - manifests/         (Kubernetes configs)
```

## Step 2: Environment Configuration

### Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings (optional for quick start)
nano .env
```

### Basic Environment Variables

For quick start, the default values work locally:

```bash
# Database URLs (using Docker services)
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=127.0.0.1:9042
PINOT_BROKER_URL=http://localhost:8000

# Kafka Configuration  
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security (generate secure values for production)
JWT_SECRET=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=dev-32-char-encryption-key-change
```

## Step 3: Start Infrastructure Services

### Launch Database and Messaging Services

```bash
# Start MongoDB, Cassandra, Redis, Kafka, and Pinot
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# Verify services are running
docker compose -f integrated-tools/docker-compose.infrastructure.yml ps
```

Expected output:
```text
NAME               SERVICE     STATUS      PORTS
mongodb            mongodb     running     0.0.0.0:27017->27017/tcp
cassandra          cassandra   running     0.0.0.0:7000->7000/tcp, 0.0.0.0:9042->9042/tcp
redis              redis       running     0.0.0.0:6379->6379/tcp
kafka              kafka       running     0.0.0.0:9092->9092/tcp
pinot-controller   pinot       running     0.0.0.0:9000->9000/tcp
pinot-broker       pinot       running     0.0.0.0:8000->8000/tcp
```

### Wait for Services to Initialize

```bash
# Wait for MongoDB to be ready
until mongosh --eval "print(\"MongoDB is ready\")" > /dev/null 2>&1; do
  echo "Waiting for MongoDB..."
  sleep 2
done

# Wait for Cassandra to be ready  
until cqlsh -e "DESCRIBE KEYSPACES" > /dev/null 2>&1; do
  echo "Waiting for Cassandra..."
  sleep 5
done

echo "Infrastructure services ready!"
```

## Step 4: Build and Start OpenFrame Services

### Build Java Services

```bash
# Build all Java services and libraries
mvn clean install -DskipTests

# Or with tests (takes longer)
mvn clean install
```

### Start OpenFrame Services

Use the platform-specific script for your operating system:

#### macOS:
```bash
./scripts/run-mac.sh
```

#### Linux:
```bash
./scripts/run-linux.sh
```

#### Windows (PowerShell):
```powershell
.\scripts\run-windows.ps1
```

These scripts will:
- Start all OpenFrame microservices
- Build and start the frontend UI
- Set up proper service dependencies
- Display startup logs

### Service Startup Order

The services start in this order:
1. **Config Service** (port 8085) - Configuration server
2. **Authorization Server** (port 8082) - OAuth2/OIDC
3. **API Service** (port 8081) - GraphQL API
4. **Gateway Service** (port 8080) - API Gateway  
5. **Management Service** (port 8083) - Platform management
6. **Stream Service** (port 8084) - Event processing
7. **Client Service** (port 8086) - Agent management
8. **Frontend UI** (port 3000) - Web interface

## Step 5: Verify Installation

### Check Service Health

```bash
# Test API Gateway health
curl -f http://localhost:8080/health || echo "Gateway not ready"

# Test API Service health  
curl -f http://localhost:8081/actuator/health || echo "API service not ready"

# Test Authorization Server
curl -f http://localhost:8082/actuator/health || echo "Auth server not ready"
```

### Access the Web Interface

Open your browser and navigate to:

**🌐 OpenFrame UI**: http://localhost:3000

You should see the OpenFrame login/registration page.

### Create Your First Account

1. Click **"Sign Up"** on the login page
2. Fill in your organization details:
   - Organization Name: `My MSP`
   - Your Name: `Admin User`
   - Email: `admin@example.com`
   - Password: Choose a secure password
3. Click **"Create Organization"**
4. You'll be logged in to the OpenFrame dashboard

## Step 6: Optional - Install OpenFrame CLI

The OpenFrame CLI helps manage the platform:

```bash
# Install OpenFrame CLI (external repository)
npm install -g @openframe/cli

# Or using cargo if you prefer Rust:
cargo install openframe-cli

# Verify installation
openframe --version
```

> **Note**: The OpenFrame CLI is maintained in a separate repository: https://github.com/flamingo-stack/openframe-cli

## Expected Outcome

After completing the quick start, you should have:

✅ **All infrastructure services running** (MongoDB, Kafka, etc.)  
✅ **All OpenFrame services operational** (8 microservices)  
✅ **Web UI accessible** at http://localhost:3000  
✅ **First organization created** with admin user  
✅ **Dashboard showing** system overview  

### Dashboard Overview

Your dashboard should display:

- **Devices**: 0 (ready to add devices)
- **Organizations**: 1 (your organization)
- **Users**: 1 (your admin account)
- **Logs**: System startup logs
- **Health Status**: All services green

## Troubleshooting Quick Fixes

### Services Won't Start

```bash
# Check if ports are already in use
netstat -tulpn | grep -E ':(3000|8080|8081|8082|8083|8084|8085|8086)'

# Kill processes using required ports
sudo fuser -k 3000/tcp 8080/tcp 8081/tcp
```

### Memory Issues

```bash
# Check available memory
free -h

# Increase JVM heap size if needed
export JAVA_OPTS="-Xmx4g -Xms2g"
```

### Database Connection Issues

```bash
# Restart infrastructure services
docker compose -f integrated-tools/docker-compose.infrastructure.yml restart

# Check container logs
docker compose -f integrated-tools/docker-compose.infrastructure.yml logs
```

### Build Failures

```bash
# Clean and rebuild
mvn clean
rm -rf ~/.m2/repository/com/openframe
mvn install -DskipTests
```

## Next Steps

Now that OpenFrame is running:

1. **Explore the Platform**: Follow the [First Steps Guide](first-steps.md)
2. **Add Your First Device**: Set up monitoring and management
3. **Configure Integrations**: Connect external tools like Fleet MDM
4. **Join the Community**: Get help on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Stopping OpenFrame

When you're done testing:

```bash
# Stop OpenFrame services (Ctrl+C on running script)
# Or if running in background:
pkill -f "java.*openframe"

# Stop infrastructure services
docker compose -f integrated-tools/docker-compose.infrastructure.yml down

# Remove data volumes (optional - this deletes all data!)
docker compose -f integrated-tools/docker-compose.infrastructure.yml down -v
```

---

**🎉 Congratulations!** You now have OpenFrame running locally. The platform is ready for you to explore its features and capabilities.