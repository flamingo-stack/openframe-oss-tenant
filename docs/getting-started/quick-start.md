# Quick Start Guide

Get OpenFrame running locally in 5 minutes! This guide will have you up and running with a development instance of the OpenFrame platform using shell scripts and local development setup.

## TL;DR - 5 Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Run development setup script
./clients/openframe-client/scripts/setup_dev_init_config.sh

# 3. Start infrastructure services
docker-compose up -d mongodb kafka redis nats cassandra

# 4. Build and run backend services
mvn clean install -DskipTests
mvn spring-boot:run -pl openframe/services/openframe-gateway &
mvn spring-boot:run -pl openframe/services/openframe-authorization-server &
mvn spring-boot:run -pl openframe/services/openframe-api &

# 5. Start frontend
cd openframe/services/openframe-frontend
npm install
npm run dev

# Access at http://localhost:3000
```

[![OpenFrame v0.3.0 - Remote File Manager &amp; Unified Authentication Architecture](https://img.youtube.com/vi/mibUHvcVIHs/maxresdefault.jpg)](https://www.youtube.com/watch?v=mibUHvcVIHs)

## Detailed Setup Steps

### Step 1: Clone and Setup

Clone the OpenFrame repository:

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

Run the development initialization script:

```bash
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script will:
- Configure initial client settings
- Set up development environment variables
- Initialize local certificates and keys

### Step 2: Start Infrastructure Services

OpenFrame requires several infrastructure services. Start them using Docker Compose:

```bash
# Start core infrastructure
docker-compose up -d mongodb
docker-compose up -d kafka
docker-compose up -d redis
docker-compose up -d nats
docker-compose up -d cassandra

# Verify services are running
docker-compose ps
```

Expected output:
```text
NAME                  COMMAND                  SERVICE             STATUS              PORTS
openframe-mongodb     "docker-entrypoint.s…"   mongodb             running             0.0.0.0:27017->27017/tcp
openframe-kafka       "/etc/confluent/dock…"   kafka               running             0.0.0.0:9092->9092/tcp
openframe-redis       "redis-server"           redis               running             0.0.0.0:6379->6379/tcp
openframe-nats        "/nats-server -c /et…"   nats                running             0.0.0.0:4222->4222/tcp
openframe-cassandra   "docker-entrypoint.s…"   cassandra           running             0.0.0.0:9042->9042/tcp
```

### Step 3: Build Backend Services

Build the entire project:

```bash
# Build all modules (skip tests for faster startup)
mvn clean install -DskipTests
```

This compiles:
- Spring Boot 3.3.0 backend services
- Java 21 microservices architecture
- All OpenFrame OSS libraries

### Step 4: Start Backend Services

Start the core backend services in the correct order:

```bash
# Start Authorization Server (OAuth2/OIDC provider)
mvn spring-boot:run -pl openframe/services/openframe-authorization-server &

# Start API Gateway (routing and security)
mvn spring-boot:run -pl openframe/services/openframe-gateway &

# Start API Service (main backend APIs)
mvn spring-boot:run -pl openframe/services/openframe-api &

# Start Client Service (agent management)
mvn spring-boot:run -pl openframe/services/openframe-client &

# Start Management Service (operational control)
mvn spring-boot:run -pl openframe/services/openframe-management &
```

Wait for all services to start (look for "Started Application in X seconds" messages).

### Step 5: Start Frontend Application

Navigate to the frontend directory and start the development server:

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend uses:
- VoltAgent core for AI agent functionality
- Anthropic SDK for AI integration
- Zod for validation
- Glob for file operations

### Step 6: Access OpenFrame

1. **Open your browser** to [http://localhost:3000](http://localhost:3000)
2. **Create your first tenant** by registering an admin account
3. **Explore the platform** with the initial setup wizard

## Service Endpoints

Once running, these endpoints are available:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **API Gateway** | http://localhost:8080 | API routing and security |
| **Auth Server** | http://localhost:8081 | OAuth2/OIDC authentication |
| **API Service** | http://localhost:8082 | REST and GraphQL APIs |
| **Management** | http://localhost:8083 | Operational control |

## Expected Results

After successful setup, you should see:

### 1. Welcome Screen
The OpenFrame tenant registration page where you can create your first organization and admin user.

### 2. Dashboard
A clean, modern dashboard showing:
- Device overview (initially empty)
- Organization summary
- Quick action tiles
- AI assistant (Mingo) integration

### 3. Navigation Menu
- Dashboard
- Devices
- Organizations  
- Users & Settings
- Logs & Events
- Policies & Queries
- Scripts

## Common Issues & Quick Fixes

### Port Conflicts
```bash
# Check if ports are in use
lsof -i :3000  # Frontend
lsof -i :8080  # Gateway
lsof -i :8081  # Auth Server

# Kill conflicting processes
sudo kill -9 <PID>
```

### Maven Build Failures
```bash
# Clean and rebuild
mvn clean
mvn install -DskipTests -U

# Check Java version
java --version  # Should be Java 21
```

### Docker Services Not Starting
```bash
# Check Docker daemon
sudo systemctl status docker

# Restart Docker services
docker-compose down
docker-compose up -d

# Check service logs
docker-compose logs mongodb
```

### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

## Next Steps

Now that OpenFrame is running:

1. **Follow the [First Steps Guide](./first-steps.md)** to explore key features
2. **Set up your first organization and users**
3. **Install the OpenFrame agent on test devices**
4. **Configure integrations and tools**
5. **Explore the AI assistant capabilities**

## Development Notes

This quick start sets up OpenFrame in development mode with:
- Hot reloading for frontend changes
- Debug logging enabled
- Test databases with sample data
- Local authentication (no external SSO required)

For production deployment, refer to the development section for proper configuration, security hardening, and infrastructure setup.

## Need Help?

- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Continue with [First Steps](./first-steps.md)
- **Issues**: GitHub Issues (for bug reports only)

Congratulations! You now have OpenFrame running locally. Time to explore what this powerful MSP platform can do! 🎉