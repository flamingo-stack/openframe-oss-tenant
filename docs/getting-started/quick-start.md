# Quick Start Guide

Get OpenFrame up and running locally in under 5 minutes! This guide provides the fastest path to a working OpenFrame development environment.

> **Prerequisites**: Ensure you've completed the [Prerequisites Guide](prerequisites.md) before continuing.

## TL;DR - One Command Setup

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
./setup-dev.sh
```

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Start Infrastructure Services

Launch the required databases and messaging services:

```bash
docker-compose up -d mongodb kafka redis cassandra pinot nats
```

**Wait for services to be ready (~2-3 minutes):**
```bash
# Check service health
docker-compose ps
```

### 3. Build the Platform

Build all Spring Boot services and install dependencies:

```bash
# Build all services
mvn clean compile -DskipTests

# Install Node.js dependencies for AI integration
npm install
```

### 4. Generate Development Certificates

Create local HTTPS certificates for secure development:

```bash
# Generate certificates for localhost
mkcert localhost 127.0.0.1 ::1

# Move certificates to expected location
mkdir -p config/certs
mv localhost+2.pem config/certs/
mv localhost+2-key.pem config/certs/
```

### 5. Initialize Development Configuration

Set up initial configuration and secrets:

```bash
# Create development configuration
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

When prompted, enter a temporary access token (you can use `dev-token` for local development).

### 6. Start Core Services

Launch the microservices in the correct order:

```bash
# Start in separate terminals, or use a process manager like foreman

# Terminal 1: Authorization Server (must start first)
cd openframe/services/openframe-authorization-server
mvn spring-boot:run

# Terminal 2: API Service
cd openframe/services/openframe-api
mvn spring-boot:run

# Terminal 3: Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run

# Terminal 4: Management Service
cd openframe/services/openframe-management
mvn spring-boot:run

# Terminal 5: Stream Service
cd openframe/services/openframe-stream
mvn spring-boot:run

# Terminal 6: Client Service
cd openframe/services/openframe-client
mvn spring-boot:run
```

### 7. Start the Frontend

```bash
# In a new terminal
cd openframe/services/openframe-frontend
npm install
npm run dev
```

## Verify Installation

### Check Service Health

Visit these endpoints to verify services are running:

| Service | URL | Expected Response |
|---------|-----|-------------------|
| **Gateway** | [https://localhost:8081/actuator/health](https://localhost:8081/actuator/health) | `{"status":"UP"}` |
| **API Service** | [https://localhost:8080/actuator/health](https://localhost:8080/actuator/health) | `{"status":"UP"}` |
| **Auth Server** | [https://localhost:8082/actuator/health](https://localhost:8082/actuator/health) | `{"status":"UP"}` |
| **Frontend** | [https://localhost:3000](https://localhost:3000) | Login page |

### Test API Access

```bash
# Test GraphQL endpoint
curl -X POST https://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{"query": "{ __schema { types { name } } }"}' \
  -k
```

### Test Database Connections

```bash
# MongoDB
docker exec -it openframe-mongodb mongosh --eval "db.runCommand('ping')"

# Redis
docker exec -it openframe-redis redis-cli ping

# Kafka
docker exec -it openframe-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Access the Platform

### Main Application
- **URL**: [https://localhost:3000](https://localhost:3000)
- **Default Credentials**: Set up during first login

### AI Chat Interface
- **URL**: [https://localhost:3000/mingo](https://localhost:3000/mingo)
- **Purpose**: AI-powered technical assistance

### API Documentation  
- **GraphQL Playground**: [https://localhost:8081/graphiql](https://localhost:8081/graphiql)
- **REST API**: [https://localhost:8083/swagger-ui.html](https://localhost:8083/swagger-ui.html)

## Expected Output

When everything is running correctly, you should see:

```bash
# Service logs showing successful startup
2024-01-15 10:00:00.000  INFO [main] c.o.api.ApiApplication : Started ApiApplication in 45.123 seconds
2024-01-15 10:00:00.000  INFO [main] c.o.gateway.GatewayApplication : Started GatewayApplication in 12.456 seconds
2024-01-15 10:00:00.000  INFO [main] c.o.authz.OpenFrameAuthorizationServerApplication : Started OpenFrameAuthorizationServerApplication in 23.789 seconds

# Frontend ready
ready - started server on 0.0.0.0:3000, url: https://localhost:3000
```

## Quick Test Workflow

### 1. Create Your First Organization

1. Visit [https://localhost:3000](https://localhost:3000)
2. Click "Sign Up" to create an account
3. Complete organization setup
4. Verify email (check console logs in development)

### 2. Connect a Device

1. Navigate to "Devices" in the sidebar
2. Click "Add Device" 
3. Follow the agent installation instructions
4. Verify the device appears in your dashboard

### 3. Try AI Chat

1. Go to [https://localhost:3000/mingo](https://localhost:3000/mingo)
2. Ask: "Show me my device status"
3. Verify Mingo AI responds with device information

## Common Issues & Solutions

### Services Won't Start

**Issue**: `Port already in use` errors
```bash
# Find and kill processes using required ports
lsof -ti:8080,8081,8082 | xargs kill -9
```

**Issue**: Database connection failures
```bash
# Restart infrastructure services
docker-compose restart mongodb redis kafka
```

### Certificate Errors

**Issue**: SSL certificate warnings in browser
```bash
# Reinstall mkcert certificates
mkcert -uninstall && mkcert -install
# Regenerate localhost certificates
mkcert localhost 127.0.0.1 ::1
```

### Build Failures

**Issue**: Maven compilation errors
```bash
# Clean and rebuild
mvn clean
mvn compile -DskipTests -U
```

**Issue**: Node.js dependency issues
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Memory Issues

**Issue**: OutOfMemoryError during startup
```bash
# Increase JVM memory for Maven
export MAVEN_OPTS="-Xmx4g -XX:+UseG1GC"

# Increase Docker memory limits
# Docker Desktop -> Settings -> Resources -> Memory -> 8GB+
```

## Development Tips

### Use Process Managers

For easier development, use a process manager:

```bash
# Install foreman
gem install foreman

# Create Procfile
cat > Procfile << EOF
auth: cd openframe/services/openframe-authorization-server && mvn spring-boot:run
api: cd openframe/services/openframe-api && mvn spring-boot:run
gateway: cd openframe/services/openframe-gateway && mvn spring-boot:run
management: cd openframe/services/openframe-management && mvn spring-boot:run
stream: cd openframe/services/openframe-stream && mvn spring-boot:run
client: cd openframe/services/openframe-client && mvn spring-boot:run
frontend: cd openframe/services/openframe-frontend && npm run dev
EOF

# Start all services
foreman start
```

### IDE Configuration

For IntelliJ IDEA or VS Code:
- Import as Maven multi-module project
- Set Project SDK to Java 21
- Enable annotation processing
- Configure code style (Google Java Style)

## Next Steps

Now that OpenFrame is running, explore these areas:

1. **[First Steps Guide](first-steps.md)** - Learn essential features and configurations
2. **[Development Environment Setup](../development/setup/environment.md)** - Configure your IDE and development tools
3. **[Architecture Overview](../development/architecture/README.md)** - Understand the system design

## Need Help?

- 💬 **Community Support**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📖 **Documentation**: Continue with the [First Steps Guide](first-steps.md)
- 🐛 **Issues**: Join the Slack community for troubleshooting

**Congratulations!** 🎉 You now have a fully functional OpenFrame development environment. Time to explore the platform and build amazing MSP solutions!