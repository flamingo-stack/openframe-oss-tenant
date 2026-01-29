# Quick Start Guide

Get OpenFrame running in 5 minutes with this streamlined setup guide. This will get you a local development environment perfect for testing and evaluation.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## TL;DR - 5-Minute Setup

If you have all [prerequisites](./prerequisites.md) installed, run these commands:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/openframe.git
cd openframe

# 2. Start platform services
./scripts/run-mac.sh --silent          # macOS
# OR
./scripts/run-linux.sh --silent        # Linux  
# OR
./scripts/run-windows.ps1 -Silent      # Windows

# 3. Build and start OpenFrame
mvn clean install -DskipTests
cd openframe/services/openframe-frontend
npm install && npm run dev
```

**Access OpenFrame**: http://localhost:3000

> **Expected Result**: You should see the OpenFrame login page. Default credentials will be displayed in the console output.

## Step-by-Step Setup

### 1. Clone and Prepare

```bash
# Clone the repository
git clone https://github.com/your-org/openframe.git
cd openframe

# Verify prerequisites
./scripts/verify-prerequisites.sh
```

### 2. Environment Configuration

Create your environment file:

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings (optional for quick start)
nano .env
```

Basic `.env` configuration:
```bash
# Quick Start Configuration
OPENFRAME_ENVIRONMENT=development
OPENFRAME_LOG_LEVEL=INFO
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-development-secret-key
```

### 3. Start Infrastructure Services

Choose your platform and run the startup script:

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

The script will start these Docker containers:
- MongoDB (port 27017)
- Redis (port 6379)  
- Apache Kafka (port 9092)
- Cassandra (port 9042)

### 4. Build Java Services

```bash
# Build all OpenFrame services
mvn clean install -DskipTests

# Verify build success
echo "Build completed. Services ready to start."
```

Expected output:
```
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  02:45 min
[INFO] Finished at: 2024-XX-XX XX:XX:XX
```

### 5. Start Backend Services

Start the core services in separate terminals:

```bash
# Terminal 1 - Config Service (start first)
cd openframe/services/openframe-config
mvn spring-boot:run

# Terminal 2 - API Service
cd openframe/services/openframe-api  
mvn spring-boot:run

# Terminal 3 - Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

Wait for each service to fully start (look for "Started Application" log messages) before starting the next.

### 6. Start Frontend

```bash
# Install frontend dependencies
cd openframe/services/openframe-frontend
npm install

# Start development server
npm run dev
```

Expected output:
```
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.xxx:3000/
  ➜  ready - started server on 0.0.0.0:3000
```

## Verification

### 1. Access the Platform

Open your browser to http://localhost:3000

You should see:
- OpenFrame login page
- Flamingo branding
- Social authentication options

### 2. Create Your First Account

```bash
# Register a new organization owner account
# Click "Sign Up" on the login page
# Fill in:
- Email: your-email@company.com
- Organization: "Demo MSP"
- Full Name: "Your Name"
- Password: "SecurePassword123!"
```

### 3. Verify Core Functions

After logging in, check these features work:

#### Dashboard
- [ ] Dashboard loads without errors
- [ ] Navigation menu is accessible
- [ ] User profile shows correctly

#### Organization Management
```bash
# Navigate to Organizations
# You should see your "Demo MSP" organization
# Try creating a test organization
```

#### Device Management  
```bash
# Navigate to Devices
# Should show empty device list (expected for new setup)
# Device registration instructions should be available
```

### 4. API Health Check

Test the API endpoints:

```bash
# Check API health
curl http://localhost:8080/health

# Expected response:
{"status":"UP","components":{"mongodb":{"status":"UP"},"redis":{"status":"UP"}}}

# Test GraphQL endpoint  
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

## Quick Demo Setup

### Add Sample Data

To quickly explore OpenFrame features:

```bash
# Add sample organization
curl -X POST http://localhost:8080/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Acme Corp",  
    "contactPerson": {
      "name": "John Doe",
      "email": "john@acme.com",
      "phone": "+1-555-0123"
    }
  }'
```

### Simulate Device Registration

```bash
# Register a test device
curl -X POST http://localhost:8081/api/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "TEST-WORKSTATION-01",
    "os": "Windows 11 Pro", 
    "organizationId": "your-org-id"
  }'
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :8080

# Kill process if needed
sudo kill -9 <PID>
```

#### Services Won't Start
```bash
# Check Docker containers
docker ps -a

# Restart Docker services
docker compose -f integrated-tools/docker-compose.yml down
docker compose -f integrated-tools/docker-compose.yml up -d

# Check logs
docker logs <container-name>
```

#### Frontend Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Connection Issues
```bash
# Verify MongoDB is running
docker logs <mongodb-container>

# Test connection
mongosh mongodb://localhost:27017/openframe
```

### Getting Help

If you encounter issues:

1. **Check Logs**: Look at console output from each service
2. **Verify Prerequisites**: Run `./scripts/verify-prerequisites.sh`
3. **Join Community**: Get help in our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## What's Running?

After successful setup, you should have:

| Service | URL | Status Check |
|---------|-----|--------------|
| **Frontend** | http://localhost:3000 | Browser accessible |
| **API Gateway** | http://localhost:8080 | `curl http://localhost:8080/health` |
| **API Service** | http://localhost:8081 | `curl http://localhost:8081/actuator/health` |
| **MongoDB** | localhost:27017 | `mongosh --eval "db.runCommand('ping')"` |
| **Redis** | localhost:6379 | `redis-cli ping` |

## Next Steps

Now that OpenFrame is running:

1. **[First Steps](./first-steps.md)** - Configure your first organization and users
2. **[Development Setup](../development/setup/environment.md)** - Set up development tools
3. **[Architecture Overview](../development/architecture/overview.md)** - Understand the platform

## Production Deployment

This quick start is for development only. For production:

- Use external databases (not Docker containers)
- Configure HTTPS and SSL certificates  
- Set up monitoring and logging
- Follow security best practices
- Use Kubernetes for orchestration

See our production deployment guides for detailed instructions.