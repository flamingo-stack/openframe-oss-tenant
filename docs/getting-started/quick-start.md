# Quick Start Guide

Get OpenFrame running in just 5 minutes with this streamlined setup guide. This will get you a working development environment with core services.

## TL;DR - 5 Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Run platform-specific startup script
# macOS
./scripts/run-mac.sh

# Linux  
./scripts/run-linux.sh

# Windows (PowerShell)
./scripts/run-windows.ps1

# 3. Access OpenFrame
# Frontend: http://localhost:3000
# API Gateway: http://localhost:8080
```

That's it! Your OpenFrame instance should be running with all core services.

## Step-by-Step Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Environment Configuration

Create a basic `.env` file:

```bash
# Create .env file
cat > .env << 'EOF'
OPENFRAME_ENV=development
SPRING_PROFILES_ACTIVE=dev
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-key-change-in-production
ENCRYPTION_KEY=dev-encryption-key-change-in-production
EOF
```

### Step 3: Build Java Services

```bash
# Build all Java services and libraries
mvn clean install -DskipTests

# This will take 2-3 minutes on first run
# Subsequent builds are much faster
```

### Step 4: Start Infrastructure Services

```bash
# Start MongoDB, Redis, and Kafka using Docker
cd integrated-tools
docker-compose up -d mongodb redis kafka

# Verify services are running
docker-compose ps
```

### Step 5: Start OpenFrame Services

**Option A: Using Startup Scripts (Recommended)**

```bash
# macOS
./scripts/run-mac.sh --silent

# Linux
./scripts/run-linux.sh --silent  

# Windows PowerShell
./scripts/run-windows.ps1 -Silent
```

**Option B: Manual Service Startup**

Open multiple terminal windows/tabs:

```bash
# Terminal 1: API Gateway
cd openframe/services/openframe-gateway
mvn spring-boot:run

# Terminal 2: API Service  
cd openframe/services/openframe-api
mvn spring-boot:run

# Terminal 3: Authorization Server
cd openframe/services/openframe-authorization-server
mvn spring-boot:run

# Terminal 4: Frontend
cd openframe/services/openframe-frontend
npm install
npm run dev
```

### Step 6: Verify Installation

Check that all services are running:

| Service | URL | Expected Response |
|---------|-----|-------------------|
| **Frontend** | http://localhost:3000 | OpenFrame login page |
| **API Gateway** | http://localhost:8080/health | `{"status":"UP"}` |
| **API Service** | http://localhost:8081/health | `{"status":"UP"}` |
| **Auth Server** | http://localhost:8082/health | `{"status":"UP"}` |

```bash
# Quick health check script
curl -s http://localhost:8080/health | jq .status
curl -s http://localhost:8081/health | jq .status  
curl -s http://localhost:8082/health | jq .status
```

## Create Your First User

### Using the Frontend (Recommended)

1. **Navigate to Frontend**: Open http://localhost:3000
2. **Register Account**: Click "Sign Up" and create your first user account
3. **Verify Email**: Check console logs for verification link (in development mode)
4. **Login**: Use your credentials to access the dashboard

### Using API (Advanced)

```bash
# Create user via API
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "organizationName": "Demo Organization"
  }'
```

## Expected Results

After successful setup, you should see:

### 1. Dashboard Overview
- Device count (initially 0)
- Organization list
- Recent logs and events
- Quick action buttons

### 2. Navigation Menu
- **Dashboard**: Main overview
- **Devices**: Device management (empty initially)
- **Organizations**: Client management
- **Logs**: System and tool logs
- **Settings**: Configuration options

### 3. Service Status
All services should show "healthy" status in the settings page.

## Sample Data (Optional)

Load sample data to explore features:

```bash
# Run data initialization script
cd scripts
./load-sample-data.sh

# This adds:
# - Sample organizations
# - Mock devices
# - Example log entries
```

## Common Quick Start Issues

### Port Conflicts

```bash
# Check what's using ports
lsof -i :8080
lsof -i :3000

# Kill conflicting processes
sudo kill -9 <PID>
```

### Service Won't Start

```bash
# Check Java version
java -version  # Should be 21+

# Check Maven
mvn -version

# Clear Maven cache
mvn clean
rm -rf ~/.m2/repository/com/openframe
```

### Database Connection Issues

```bash
# Verify MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs <mongo-container-id>

# Restart if needed
docker-compose restart mongodb
```

### Frontend Build Issues

```bash
# Clear node modules and reinstall
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node -v  # Should be 18+
```

## Performance Tips

### Development Optimizations

```bash
# Use Maven parallel builds
mvn clean install -T 4 -DskipTests

# Enable Maven daemon
export MAVEN_OPTS="-Dmaven.artifact.threads=4"
```

### Memory Configuration

```bash
# Increase JVM heap for large builds
export MAVEN_OPTS="-Xmx4g -XX:MaxMetaspaceSize=1g"

# For individual services
export JAVA_OPTS="-Xmx2g -Xms1g"
```

## Next Steps After Quick Start

Now that OpenFrame is running, explore these key features:

1. **[First Steps Guide](first-steps.md)** - Explore core functionality
2. **Add Your First Tool Integration** - Connect TacticalRMM or FleetDM
3. **Try Mingo AI** - Chat with the AI assistant
4. **Device Management** - Add and monitor devices
5. **Log Analysis** - View system and tool logs

## Shutdown and Cleanup

When you're done:

```bash
# Stop all services (Ctrl+C in each terminal)
# Or kill startup script processes

# Stop Docker services
cd integrated-tools
docker-compose down

# Optional: Clean up containers and volumes
docker-compose down -v --remove-orphans
```

## Development Mode Features

In development mode, you get:

- **Hot Reload**: Frontend changes appear immediately
- **Debug Logging**: Detailed logs for troubleshooting
- **Test Data**: Sample organizations and mock devices
- **Dev Tools**: Browser dev tools and debugging support
- **Relaxed Security**: Simplified authentication for testing

## Troubleshooting

### Services Won't Start

1. **Check Prerequisites**: Verify Java 21+, Maven, Node.js are installed
2. **Port Conflicts**: Ensure ports 3000, 8080-8083 are free
3. **Database Issues**: Verify MongoDB and Redis are running
4. **Build Issues**: Run `mvn clean install` again

### Access Issues

1. **Frontend Not Loading**: Check if port 3000 is accessible
2. **API Errors**: Verify gateway is running on port 8080
3. **Authentication Issues**: Check auth server on port 8082

### Getting Help

- **OpenMSP Community**: [Slack workspace](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Browse development guides for detailed troubleshooting
- **GitHub Issues**: Report bugs or request features

---

*🎉 **Congratulations!** OpenFrame is now running. Continue to the [First Steps Guide](first-steps.md) to explore what you can do.*