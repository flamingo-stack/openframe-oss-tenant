# Quick Start Guide

Get OpenFrame up and running in 5 minutes with this streamlined setup guide. This assumes you've completed the [Prerequisites](prerequisites.md).

## TL;DR - One-Command Setup

For the fastest setup, use our platform-specific startup scripts:

```bash
# macOS
./scripts/run-mac.sh --silent

# Linux  
./scripts/run-linux.sh --silent

# Windows PowerShell
./scripts/run-windows.ps1 -Silent
```

These scripts will:
- Start all required infrastructure services via Docker Compose
- Build and start OpenFrame services
- Initialize the database with sample data
- Open the frontend at `http://localhost:3000`

## Step-by-Step Manual Setup

If you prefer to understand each step, follow this manual process:

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Start Infrastructure Services

OpenFrame requires several data stores and messaging systems. Start them using Docker Compose:

```bash
# Start infrastructure (MongoDB, Redis, Kafka, NATS, etc.)
cd integrated-tools
docker compose up -d mongodb redis kafka nats cassandra

# Verify services are running
docker compose ps
```

Expected output:
```text
NAME                     IMAGE                    STATUS
mongodb                  mongo:7.0                Up
redis                    redis:7.2                Up  
kafka                    confluentinc/cp-kafka    Up
nats                     nats:2.10               Up
cassandra                cassandra:4.1           Up
```

### 3. Build OpenFrame Services

Build all Java services and libraries:

```bash
cd ..  # Back to project root
mvn clean install -DskipTests
```

This will compile:
- Core libraries (`openframe-core`, `openframe-data`, etc.)
- Service applications (`openframe-api`, `openframe-gateway`, etc.)

### 4. Start OpenFrame Services

Start the core services in order:

```bash
# Terminal 1: Configuration Service
cd openframe/services/openframe-config
mvn spring-boot:run

# Terminal 2: Authorization Server  
cd openframe/services/openframe-authorization-server
mvn spring-boot:run

# Terminal 3: API Service
cd openframe/services/openframe-api
mvn spring-boot:run

# Terminal 4: Gateway Service
cd openframe/services/openframe-gateway
mvn spring-boot:run

# Terminal 5: Frontend Service
cd openframe/services/openframe-frontend
npm install
npm run dev
```

### 5. Verify Installation

Once all services are running, verify the installation:

| Service | URL | Expected Response |
|---------|-----|------------------|
| **Frontend** | http://localhost:3000 | OpenFrame login page |
| **API Gateway** | http://localhost:8080/health | `{"status":"UP"}` |
| **GraphQL Playground** | http://localhost:8081/graphql | GraphQL interface |
| **Authorization Server** | http://localhost:8082/.well-known/openid_configuration | OpenID configuration |

## Hello World Example

Once OpenFrame is running, try these basic operations:

### 1. Create Your First Tenant

Navigate to http://localhost:3000 and complete tenant registration:

1. Click **"Sign Up"**
2. Enter your organization details:
   - **Organization Name**: "My MSP Company"  
   - **Domain**: "mymsp.example.com"
   - **Admin Email**: your email address
3. Verify your email and set a password

### 2. Access the Dashboard

After registration, you'll be redirected to the main dashboard where you can:

- View connected devices (initially empty)
- Explore the Mingo AI chat interface
- Configure integrations with external tools

### 3. Test API Access

Test the GraphQL API directly:

```bash
# Query organization information
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "query { organizations { edges { node { id name } } } }"
  }'
```

Expected response:
```json
{
  "data": {
    "organizations": {
      "edges": [
        {
          "node": {
            "id": "org123",
            "name": "My MSP Company"
          }
        }
      ]
    }
  }
}
```

## Quick Configuration

### Enable External Tool Integrations

Add integration credentials to connect external MSP tools:

1. Navigate to **Settings** → **Integrations**
2. Configure your tools:

**Tactical RMM Integration:**
```bash
export TACTICAL_RMM_URL="https://your-tactical.example.com"
export TACTICAL_RMM_TOKEN="your-api-token"
```

**Fleet MDM Integration:**  
```bash
export FLEET_MDM_URL="https://your-fleet.example.com" 
export FLEET_MDM_TOKEN="your-fleet-token"
```

3. Restart the API service to apply configuration changes

### Enable SSO (Optional)

For Google SSO integration:

1. Create OAuth2 credentials in Google Cloud Console
2. Set environment variables:
   ```bash
   export GOOGLE_CLIENT_ID="your-google-client-id"
   export GOOGLE_CLIENT_SECRET="your-google-client-secret"  
   ```
3. Restart authorization server
4. SSO options will appear on the login page

## Expected Results

After completing the quick start, you should have:

✅ **Functional OpenFrame Platform**
- Web interface accessible at http://localhost:3000
- API Gateway routing requests properly
- Database initialized with your tenant

✅ **Core Services Running**
- Authentication and authorization working
- GraphQL API responding to queries  
- Real-time updates via WebSocket

✅ **Infrastructure Ready**
- MongoDB storing tenant and user data
- Redis caching active sessions
- Kafka ready for event streaming
- NATS ready for agent communication

## Next Steps

Now that OpenFrame is running, explore these areas:

### 1. Connect Your First Device
- Download and install the OpenFrame client agent
- Register a device in the dashboard
- View device metrics and logs

### 2. Explore AI Features
- Chat with Mingo AI in the dashboard
- Set up automation policies
- Configure AI-powered alerts

### 3. Add Team Members
- Invite users to your organization
- Configure role-based permissions
- Set up SSO for your team

### 4. Integrate External Tools
- Connect Tactical RMM for endpoint management
- Set up MeshCentral for remote access
- Configure Fleet MDM for device management

## Troubleshooting Quick Issues

### Services Won't Start
```bash
# Check if ports are available
netstat -tulpn | grep -E ":(3000|8080|8081|8082)" 

# View service logs
docker compose logs mongodb
docker compose logs redis
```

### Frontend Build Errors
```bash
# Clear npm cache and reinstall
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues
```bash
# Verify MongoDB is accessible
mongosh --eval "db.adminCommand('ismaster')"

# Check environment variables
echo `$MONGODB_URI`
```

### Memory Issues
If running on minimal hardware, reduce Java heap sizes:
```bash
export JAVA_OPTS="-Xmx1g -Xms512m"
```

## Development Mode

For active development, use these commands for hot reload:

```bash
# Frontend with hot reload
cd openframe/services/openframe-frontend  
npm run dev

# Backend with Spring Boot DevTools
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

---

**Next Steps**: OpenFrame is now running! Continue with [First Steps](first-steps.md) to configure your environment and explore key features.