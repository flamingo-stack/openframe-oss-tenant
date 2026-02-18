# Quick Start Guide

Get OpenFrame OSS Tenant up and running in 5 minutes! This guide provides the essential steps to clone, build, and start the platform locally.

> **Before you start:** Ensure you have completed the [Prerequisites](prerequisites.md) setup.

## TL;DR - 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Run the development setup script
./clients/openframe-client/scripts/setup_dev_init_config.sh

# 3. Build all services
mvn clean install

# 4. Start the config server first
cd openframe/services/openframe-config
mvn spring-boot:run &

# 5. Start core services (in separate terminals)
cd ../openframe-api && mvn spring-boot:run &
cd ../openframe-authorization-server && mvn spring-boot:run &
cd ../openframe-gateway && mvn spring-boot:run &

# 6. Start the frontend
cd ../openframe-frontend
npm install && npm run dev
```

Your OpenFrame instance will be available at `http://localhost:3000`!

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Initial Configuration

Run the development initialization script to set up your local configuration:

```bash
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script will:
- Create necessary configuration files
- Set up development environment variables  
- Initialize local development certificates
- Configure database connections

### 3. Build the Platform

Build all Spring Boot services and dependencies:

```bash
# Build the entire platform
mvn clean install

# Or build without running tests for faster setup
mvn clean install -DskipTests
```

Expected output:
```text
[INFO] ------------------------------------------------------------------------
[INFO] Reactor Summary for OpenFrame Platform:
[INFO] ------------------------------------------------------------------------
[INFO] OpenFrame Platform ................................. SUCCESS [  2.145 s]
[INFO] openframe-config ................................... SUCCESS [ 15.432 s]
[INFO] openframe-api ...................................... SUCCESS [ 23.567 s]
[INFO] openframe-authorization-server ..................... SUCCESS [ 18.234 s]
[INFO] openframe-gateway .................................. SUCCESS [ 16.789 s]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```

### 4. Start Core Services

Start the services in the following order:

#### 4.1. Config Server (Start First)

```bash
cd openframe/services/openframe-config
mvn spring-boot:run
```

Wait for the config server to fully start (look for "Started ConfigServerApplication").

#### 4.2. Authorization Server

```bash
# In a new terminal
cd openframe/services/openframe-authorization-server
mvn spring-boot:run
```

#### 4.3. API Service

```bash
# In a new terminal
cd openframe/services/openframe-api
mvn spring-boot:run
```

#### 4.4. Gateway Service

```bash
# In a new terminal
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

### 5. Start the Frontend Application

```bash
# In a new terminal
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Service Startup Verification

### Check Service Health

Verify each service is running properly:

```bash
# Config Server
curl http://localhost:8888/actuator/health

# Authorization Server  
curl http://localhost:8081/actuator/health

# API Service
curl http://localhost:8080/actuator/health

# Gateway Service
curl http://localhost:8082/actuator/health
```

Expected response for each:
```json
{"status":"UP"}
```

### Service Port Mapping

| Service | Port | Health Check URL |
|---------|------|------------------|
| **Config Server** | 8888 | `http://localhost:8888/actuator/health` |
| **Authorization Server** | 8081 | `http://localhost:8081/actuator/health` |
| **API Service** | 8080 | `http://localhost:8080/actuator/health` |
| **Gateway Service** | 8082 | `http://localhost:8082/actuator/health` |
| **Frontend** | 3000 | `http://localhost:3000` |

## First Login

### Default Development Account

For local development, the system creates a default tenant and user:

- **Tenant:** `dev.openframe.local`
- **Email:** *Use the account created during initialization*
- **Password:** *Set during the setup script*

### Access the Platform

1. Open your browser to `http://localhost:3000`
2. Click "Sign Up" or "Login"
3. Use your development credentials
4. Complete the initial tenant setup if prompted

## Basic Platform Exploration

### Dashboard Overview

Once logged in, you'll see the main dashboard with:

- **Device Overview** - Connected devices and agents
- **Organization Management** - Multi-tenant organization setup
- **Chat Interface** - Mingo AI assistant
- **Logs & Events** - Real-time system activity

### Key Features to Try

1. **Device Management** - Add and manage devices
2. **Organization Setup** - Configure your MSP organization
3. **User Invitations** - Invite team members
4. **API Keys** - Generate API keys for external integrations
5. **SSO Configuration** - Set up Google/Microsoft authentication

## Development Workflow

### Making Code Changes

1. **Backend Changes** - Restart the affected Spring Boot service
2. **Frontend Changes** - Hot reload is enabled by default
3. **Configuration Changes** - Restart the config server

### Useful Development Commands

```bash
# Restart a specific service
cd openframe/services/openframe-api
mvn spring-boot:run

# Frontend development with hot reload
cd openframe/services/openframe-frontend
npm run dev

# Run tests
mvn test

# Clean and rebuild
mvn clean install
```

## Troubleshooting

### Common Issues

**Issue: Config Server won't start**
```bash
# Check if port 8888 is in use
lsof -i :8888
# Kill any conflicting process
kill -9 <PID>
```

**Issue: Database connection errors**
```bash
# Ensure MongoDB is running
systemctl status mongod
# Or start it
systemctl start mongod
```

**Issue: Frontend won't start**
```bash
# Clear npm cache
npm cache clean --force
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: Services fail with JWT errors**
- Ensure the Authorization Server started successfully
- Check that all services can reach the config server
- Verify no port conflicts exist

### Getting Help

- **Logs:** Check console output from each service
- **Health Endpoints:** Use the health check URLs above
- **Community:** Join the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

## Expected Output

When everything is running correctly, you should see:

- ✅ Config server responding on port 8888
- ✅ Authorization server responding on port 8081  
- ✅ API service responding on port 8080
- ✅ Gateway service responding on port 8082
- ✅ Frontend accessible at `http://localhost:3000`
- ✅ Successful login to the platform
- ✅ Dashboard showing tenant information

## Next Steps

Now that you have OpenFrame running locally:

1. **[First Steps Guide](first-steps.md)** - Explore the platform's key features
2. **[Development Environment](../development/setup/environment.md)** - Set up your IDE for development
3. **[Architecture Overview](../development/architecture/README.md)** - Understand the platform architecture

## Performance Tips

- **Memory:** Increase JVM heap size if needed: `-Xmx2G`
- **Startup Time:** Use `-Dspring.jpa.hibernate.ddl-auto=none` in production
- **Development:** Use `mvn spring-boot:run` with `-Dspring-boot.run.jvmArguments="-Xdebug"`

---

🎉 **Congratulations!** You now have a fully functional OpenFrame OSS Tenant platform running locally. Time to explore what it can do!