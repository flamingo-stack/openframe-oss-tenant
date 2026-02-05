# Quick Start Guide

Get OpenFrame up and running in under 5 minutes with this streamlined installation guide. This assumes you've already satisfied the [prerequisites](prerequisites.md).

## TL;DR - 5-Minute Setup

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Start infrastructure services
docker-compose -f docker-compose.infra.yml up -d

# Build the platform
mvn clean install -DskipTests

# Start OpenFrame services
./scripts/run-linux.sh --silent

# Access the platform
open http://localhost:3000
```

That's it! OpenFrame should now be running locally.

## Detailed Setup Process

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure Services

OpenFrame requires several infrastructure services. Start them with Docker Compose:

```bash
# Start databases and message queues
docker-compose -f docker-compose.infra.yml up -d

# Verify services are running
docker-compose -f docker-compose.infra.yml ps
```

Expected services:
- MongoDB (port 27017)
- Cassandra (port 9042) 
- Redis (port 6379)
- Kafka (port 9092)
- Apache Pinot (port 8099)

### Step 3: Build the Platform

Compile all Java services and libraries:

```bash
# Full build with tests (recommended for first run)
mvn clean install

# Or skip tests for faster build
mvn clean install -DskipTests
```

This will:
- Compile all microservices
- Build shared libraries
- Run unit tests (if not skipped)
- Package service artifacts

### Step 4: Start OpenFrame Services

Use the platform startup script for your operating system:

```bash
# Linux
./scripts/run-linux.sh

# macOS  
./scripts/run-mac.sh

# Windows (PowerShell)
.\scripts\run-windows.ps1

# Silent mode (no prompts)
./scripts/run-linux.sh --silent
```

The script will start services in the correct order:
1. Configuration Server
2. Authorization Server
3. API Service
4. Gateway Service
5. Management Service
6. Client Service
7. Stream Service
8. Frontend Application

### Step 5: Access the Platform

Once all services are running:

1. **Open your browser** to http://localhost:3000
2. **Create your first tenant** using the registration flow
3. **Configure your first organization**
4. **Add devices** or integrate with existing tools

## Verify Installation

### Check Service Health

```bash
# Check all services are healthy
curl http://localhost:8080/actuator/health  # Gateway
curl http://localhost:8081/actuator/health  # API Service
curl http://localhost:9000/actuator/health  # Authorization Server
```

### Check Frontend

Visit http://localhost:3000 and you should see the OpenFrame login/registration screen.

### Check Database Connections

```bash
# MongoDB
docker exec -it mongodb mongosh --eval "db.stats()"

# Redis
docker exec -it redis redis-cli ping

# Cassandra
docker exec -it cassandra cqlsh -e "DESCRIBE KEYSPACES;"
```

## Basic "Hello World" Example

### 1. Register Your First Tenant

1. Go to http://localhost:3000
2. Click "Sign Up"
3. Enter your email and create a password
4. Complete the tenant registration form
5. Verify your email (check console logs for the verification link)

### 2. Create Your First Organization

1. After login, navigate to "Organizations"
2. Click "Create Organization" 
3. Fill in basic information:
   - Name: "Demo MSP"
   - Type: "Managed Service Provider"
   - Contact information
4. Save the organization

### 3. Add a Test Device (Optional)

If you have the OpenFrame CLI installed:

```bash
# Install OpenFrame CLI
curl -fsSL https://raw.githubusercontent.com/flamingo-stack/openframe-cli/main/install.sh | bash

# Register a test device
openframe-cli device register \
  --name "test-device" \
  --type "server" \
  --organization "Demo MSP"
```

## Expected Results

After completing the quick start, you should have:

- ✅ All infrastructure services running in Docker
- ✅ All OpenFrame microservices started
- ✅ Frontend accessible at http://localhost:3000
- ✅ Your first tenant and organization created
- ✅ Ability to navigate the main UI sections:
  - Dashboard
  - Devices
  - Logs
  - Organizations
  - Settings

## Troubleshooting

### Services Won't Start

Check if all prerequisite ports are available:

```bash
# Check port availability
netstat -tlnp | grep -E ':(3000|8080|8081|9000|27017|9042|6379|9092)'
```

Kill conflicting processes:

```bash
# Find and kill processes on specific ports
sudo lsof -t -i:8080 | xargs sudo kill -9
```

### Database Connection Issues

Restart infrastructure services:

```bash
docker-compose -f docker-compose.infra.yml down
docker-compose -f docker-compose.infra.yml up -d
```

Wait for services to be fully ready:

```bash
# Wait for MongoDB
docker exec mongodb mongosh --eval "db.runCommand({ping: 1})"

# Wait for Cassandra
docker exec cassandra cqlsh -e "SELECT cluster_name FROM system.local;"
```

### Frontend Not Loading

Check if the frontend build completed:

```bash
cd openframe/services/openframe-frontend
npm run build
npm run dev
```

### Authentication Issues

Reset the JWT secret if needed:

```bash
export JWT_SECRET=$(openssl rand -base64 32)
# Restart authorization server and API service
```

## Performance Tips

### For Development

- Use `mvn clean install -DskipTests` for faster builds
- Run `./scripts/run-*.sh --silent` to skip interactive prompts
- Consider disabling non-essential services during development

### For Production

- Increase JVM heap sizes in service configurations
- Use production database instances instead of Docker
- Enable SSL/TLS for all external connections
- Configure proper logging levels

## Next Steps

Now that OpenFrame is running:

1. **Explore the Interface**: Follow the [First Steps Guide](first-steps.md)
2. **Add Real Devices**: Set up agent deployment
3. **Configure Integrations**: Connect FleetDM, Tactical RMM, or other tools
4. **Set Up Monitoring**: Configure alerts and dashboards
5. **Develop Custom Features**: See the [Development Guide](../development/setup/local-development.md)

## Getting Help

If you encounter issues during quick start:

- **Documentation**: Check the detailed setup guides
- **Community**: Join our Slack community for real-time support
- **GitHub Issues**: Report bugs or request features
- **Professional Support**: Available through Flamingo for enterprise needs

---

**Congratulations!** You now have a fully functional OpenFrame platform running locally. Ready to explore? Continue with the [First Steps Guide](first-steps.md).