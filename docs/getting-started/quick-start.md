# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup guide. This assumes you've completed the [prerequisites](prerequisites.md) setup.

> **⚠️ Important**: This quick start is for evaluation and development purposes. For production deployments, see the [Development Setup Guide](../development/setup/environment.md).

## TL;DR - One Command Setup

If you have all prerequisites installed, run the platform-specific startup script:

### macOS
```bash
./scripts/run-mac.sh --silent
```

### Linux
```bash
./scripts/run-linux.sh --silent
```

### Windows
```powershell
.\scripts\run-windows.ps1 -Silent
```

This will:
1. Start all required services via Docker Compose
2. Build and start the OpenFrame services
3. Open the web interface at http://localhost:3000

## Step-by-Step Setup

### 1. Clone the Repository

```bash
# Clone OpenFrame repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify you're in the correct directory
ls -la
```

Expected files:
```text
docker-compose.yml
pom.xml
package.json
scripts/
openframe/
clients/
integrated-tools/
```

### 2. Environment Configuration

Create your environment configuration:

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (optional for quick start)
# Default values work for local development
```

Basic `.env` configuration for quick start:
```bash
# Database URLs (Docker Compose defaults)
MONGODB_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Security (generate your own for production)
JWT_SECRET=dev-secret-change-in-production-256-bits-long
ENCRYPTION_KEY=dev-encryption-key-32-characters

# Service URLs
GATEWAY_URL=http://localhost:8080
API_URL=http://localhost:8081
FRONTEND_URL=http://localhost:3000
```

### 3. Start Infrastructure Services

Start the required databases and message brokers:

```bash
# Start infrastructure via Docker Compose
docker-compose up -d mongodb redis kafka

# Verify services are running
docker-compose ps
```

Expected output:
```text
NAME                 SERVICE             STATUS              PORTS
mongodb              mongodb             running             0.0.0.0:27017->27017/tcp
redis                redis               running             0.0.0.0:6379->6379/tcp
kafka                kafka               running             0.0.0.0:9092->9092/tcp
zookeeper            zookeeper           running             0.0.0.0:2181->2181/tcp
```

### 4. Build OpenFrame Services

Build the Java backend services:

```bash
# Build all Java services (this may take 3-5 minutes on first run)
mvn clean install -DskipTests

# Verify build completed successfully
echo $?  # Should output 0
```

### 5. Start Backend Services

Start the OpenFrame microservices:

```bash
# Start Gateway Service (API routing and authentication)
cd openframe/services/openframe-gateway
mvn spring-boot:run &

# Start API Service (main business logic)
cd ../openframe-api
mvn spring-boot:run &

# Start Authorization Server (OAuth2/OIDC)
cd ../openframe-authorization-server
mvn spring-boot:run &

# Return to project root
cd ../../..
```

> **Note**: Services start in the background (`&`). Use `jobs` to see running processes.

### 6. Start Frontend

In a new terminal window:

```bash
# Navigate to frontend directory
cd openframe/services/openframe-frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Expected output:
```text
  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### 7. Access OpenFrame

Open your browser and navigate to:

**http://localhost:3000**

You should see the OpenFrame login page.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Initial Setup

### Create Administrator Account

1. **Register**: Click "Sign Up" to create your first admin account
2. **Organization**: Enter your organization details
3. **Verification**: Complete email verification (check console logs for dev mode)
4. **Login**: Sign in with your new credentials

### Verify Services

Check that all services are running properly:

```bash
# Check service health
curl http://localhost:8080/health    # Gateway
curl http://localhost:8081/health    # API
curl http://localhost:8082/health    # Authorization Server

# Check frontend
curl http://localhost:3000           # Should return HTML
```

### Test Basic Functionality

1. **Dashboard**: Navigate to the main dashboard
2. **Devices**: Try adding a test device (you'll need the OpenFrame client agent)
3. **Organizations**: Create a test client organization
4. **Settings**: Configure your preferences

## Expected Results

After successful setup, you should have:

✅ **OpenFrame Web Interface** running at http://localhost:3000  
✅ **API Gateway** running at http://localhost:8080  
✅ **GraphQL API** accessible at http://localhost:8081/graphql  
✅ **OAuth2 Server** running at http://localhost:8082  
✅ **MongoDB** for data storage  
✅ **Redis** for caching  
✅ **Kafka** for event streaming

## Troubleshooting

### Port Conflicts
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :8080
lsof -i :8081

# Kill conflicting processes
sudo kill -9 <PID>
```

### Service Won't Start
```bash
# Check logs for specific service
cd openframe/services/openframe-gateway
mvn spring-boot:run

# Look for error messages in the output
```

### Database Connection Issues
```bash
# Check MongoDB is running
docker logs mongodb

# Check Redis is running
docker logs redis

# Test connections
mongo mongodb://localhost:27017
redis-cli ping
```

### Build Failures
```bash
# Clean and rebuild
mvn clean

# Build with verbose output
mvn clean install -X

# Check Java version
java -version
```

### Memory Issues
```bash
# Increase JVM memory for Maven builds
export MAVEN_OPTS="-Xmx2g"

# Or set per service
export JAVA_OPTS="-Xmx1g"
```

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Port 3000 in use** | Another app using port | `lsof -i :3000` and kill process |
| **Maven build fails** | Insufficient memory | Set `MAVEN_OPTS="-Xmx2g"` |
| **Services won't connect** | Database not ready | Wait 30 seconds, restart services |
| **Frontend won't load** | NPM dependencies missing | Run `npm install` in frontend dir |
| **404 errors** | Gateway not routing | Check gateway logs for errors |

## Next Steps

Now that OpenFrame is running:

1. **[First Steps Guide](first-steps.md)** - Configure your installation
2. **Install Client Agent** - Follow the [OpenFrame CLI installation guide](https://github.com/flamingo-stack/openframe-cli#installation)
3. **Connect Tools** - Integrate existing MSP tools
4. **Explore Features** - Test device management, automation, and AI features

## Production Deployment

This quick start is for development only. For production:

1. Use a proper database cluster (MongoDB Atlas, AWS DocumentDB)
2. Configure Redis clustering
3. Set up Kafka clusters
4. Use HTTPS with proper SSL certificates
5. Configure proper authentication providers
6. Set up monitoring and logging

See the [Development Setup Guide](../development/setup/environment.md) for production configuration.

## Getting Help

- **Documentation**: Browse the reference docs for detailed guides
- **Community**: Join the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Issues**: Report bugs on GitHub
- **Questions**: Ask in the community channels

---

**Congratulations!** 🎉 OpenFrame is now running. Start exploring the platform and see how it can transform your MSP operations.