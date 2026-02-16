# Quick Start Guide

Get OpenFrame up and running in 5 minutes! This guide provides the fastest path to a working OpenFrame instance for development and testing.

## ⚡ 5-Minute Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Step 2: Start Infrastructure Services

Using Docker Compose (recommended):

```bash
# Start MongoDB, Redis, and Kafka
docker compose -f integrated-tools/docker-compose.yml up -d mongodb redis kafka
```

**Wait for services to be ready:**
```bash
# Check service status
docker compose -f integrated-tools/docker-compose.yml ps

# Wait for healthy status (takes ~30 seconds)
```

### Step 3: Build the Java Services

```bash
# Clean build all services
mvn clean install -DskipTests

# This builds all OpenFrame services:
# - API Service
# - Gateway Service  
# - Authorization Server
# - Management Service
# - Client Service
# - Stream Service
```

### Step 4: Start Core Services

```bash
# Start services in order (each in a separate terminal or use screen/tmux)

# Terminal 1 - Configuration Server
cd openframe/services/openframe-config
mvn spring-boot:run

# Terminal 2 - Authorization Server (wait for config to be ready)
cd openframe/services/openframe-authorization-server
mvn spring-boot:run

# Terminal 3 - API Service (wait for auth server)
cd openframe/services/openframe-api
mvn spring-boot:run

# Terminal 4 - Gateway Service (wait for API)
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

### Step 5: Start the Frontend

```bash
# In a new terminal
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Step 6: Access OpenFrame

🎉 **Success!** OpenFrame is now running:

- **Web UI**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **API Service**: http://localhost:8081
- **Authorization Server**: http://localhost:8082

[![OpenFrame v0.5.2: Live Demo of AI-Powered IT Management for MSPs](https://img.youtube.com/vi/a45pzxtg27k/maxresdefault.jpg)](https://www.youtube.com/watch?v=a45pzxtg27k)

## 🚀 First Login & Setup

### Create Your First Account

1. **Navigate to** http://localhost:3000
2. **Click "Sign Up"** to create a new account
3. **Fill in your details:**
   - Organization Name: "My MSP"
   - Email: your@email.com
   - Password: (secure password)
4. **Complete registration** - you'll be logged in automatically

### Initial Configuration

After login, you'll see the onboarding dashboard:

1. **Add Your First Organization**
   - Navigate to Organizations → New Organization
   - Enter company details
   - Save to create your first client

2. **Generate API Keys** (optional)
   - Go to Settings → API Keys
   - Create a new key for external integrations
   - Copy and securely store the key

3. **Explore the Interface**
   - **Dashboard**: Overview of your MSP operations
   - **Devices**: Device management and monitoring
   - **Organizations**: Client management
   - **Logs**: Centralized log viewing
   - **Settings**: System configuration

## 📋 Verify Installation

### Health Check

Test that all services are responding:

```bash
# Check Gateway health
curl http://localhost:8080/actuator/health

# Check API service
curl http://localhost:8081/actuator/health

# Check Authorization server
curl http://localhost:8082/actuator/health
```

**Expected Response:**
```json
{"status":"UP"}
```

### Database Connection

Verify database connectivity:

```bash
# Check MongoDB
docker exec -it mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis
docker exec -it redis redis-cli ping
```

### Frontend Build

Verify the frontend is working:

1. Open browser to http://localhost:3000
2. Check browser console for errors
3. Verify login page loads correctly

## 🔧 Basic Configuration

### Environment Variables

For development, you can customize behavior with these environment variables:

```bash
# Database connections
export MONGODB_URI=mongodb://localhost:27017/openframe
export REDIS_URL=redis://localhost:6379

# Service URLs
export API_BASE_URL=http://localhost:8081
export AUTH_BASE_URL=http://localhost:8082

# Security
export JWT_SECRET=your-secret-key-here
export ENCRYPTION_KEY=your-32-char-encryption-key
```

### Application Configuration

Key configuration files:

| Service | Configuration File | Key Settings |
|---------|-------------------|--------------|
| API Service | `application.yml` | Database, security |
| Gateway | `application.yml` | Routing, rate limiting |
| Frontend | `.env.local` | API URLs, features |

## 🎯 What's Working Now

After the quick start, you have:

✅ **Full Authentication System**
- User registration and login
- Organization-based tenancy
- JWT-based security

✅ **Core Data Models**
- Organizations
- Users and invitations
- API keys

✅ **GraphQL API**
- Full schema introspection
- Real-time subscriptions
- Cursor-based pagination

✅ **Modern Frontend**
- Vue 3 with TypeScript
- Responsive design
- Real-time updates

## 🚧 What's Next?

Your OpenFrame instance is running, but there's more to explore:

### Immediate Next Steps
1. **[First Steps Guide](first-steps.md)** - Configure key features
2. **Add integrations** - Connect Fleet MDM, Tactical RMM
3. **Set up monitoring** - Enable device tracking
4. **Explore AI features** - Try Mingo AI assistant

### Advanced Setup
1. **Production deployment** - Docker, Kubernetes
2. **Tool integrations** - Connect your existing MSP tools
3. **Custom development** - Extend with your own features

## 🐛 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check Java version
java -version

# Ensure Java 21 is active
export JAVA_HOME=$(/usr/libexec/java_home -v 21)  # macOS

# Clear Maven caches
mvn clean
rm -rf ~/.m2/repository/com/openframe
```

#### Database Connection Errors
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Restart MongoDB
docker restart mongodb

# Check logs
docker logs mongodb
```

#### Port Conflicts
```bash
# Check what's using port 8080
lsof -i :8080

# Kill the process if needed
kill -9 <PID>
```

#### Frontend Build Errors
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

### Memory Issues

If you see out-of-memory errors:

```bash
# Increase JVM heap size
export MAVEN_OPTS="-Xmx4g"

# For individual services
java -Xmx2g -jar target/service.jar
```

## 📚 Next Steps

Now that OpenFrame is running:

1. **Continue with [First Steps](first-steps.md)** to explore key features
2. **Check [Development Setup](/docs/development/setup/local-development.md)** for advanced development
3. **Join the community** on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## 🆘 Getting Help

If you run into issues:

- **Quick Questions**: Check our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Bug Reports**: GitHub Issues in the main repository
- **Documentation**: Browse additional guides in `/docs`

---

**🎉 Congratulations!** You now have a fully functional OpenFrame development environment. Time to start exploring what this powerful platform can do!