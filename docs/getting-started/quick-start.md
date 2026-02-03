# Quick Start Guide

Get OpenFrame running locally in just 5 minutes! This guide provides the fastest path to a working OpenFrame development environment.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## TL;DR - One Command Setup

If you have all prerequisites installed, run the platform-specific startup script:

```bash
# macOS
./scripts/run-mac.sh --silent

# Linux
./scripts/run-linux.sh --silent

# Windows (PowerShell)
./scripts/run-windows.ps1 -Silent
```

This will start all services and open OpenFrame in your browser at `http://localhost:3000`.

## Step-by-Step Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Start Infrastructure Services

First, start the required data services:

```bash
# Start MongoDB, Redis, Kafka, NATS
cd integrated-tools
docker-compose up -d mongodb redis kafka nats
```

Verify services are running:
```bash
docker ps
```

Expected output should show containers for `mongodb`, `redis`, `kafka`, and `nats`.

### 3. Build Backend Services

```bash
# Build all Java services
mvn clean install -DskipTests

# This will build:
# - openframe-gateway
# - openframe-api  
# - openframe-management
# - openframe-stream
# - openframe-client
# - Shared libraries
```

### 4. Start Core Services

Open separate terminal windows for each service:

**Terminal 1 - API Gateway:**
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

**Terminal 2 - Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server
mvn spring-boot:run
```

**Terminal 3 - API Service:**
```bash
cd openframe/services/openframe-api
mvn spring-boot:run
```

**Terminal 4 - Management Service:**
```bash
cd openframe/services/openframe-management
mvn spring-boot:run
```

### 5. Start Frontend

```bash
cd openframe/services/openframe-frontend
npm install
npm run dev
```

### 6. Access OpenFrame

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **GraphQL Playground**: http://localhost:8081/graphiql

## First Login

### Create Your First Tenant

1. Navigate to http://localhost:3000
2. Click **"Sign Up"**
3. Fill out the registration form:
   - **Email**: your.email@example.com
   - **Password**: Choose a secure password
   - **Organization**: Your Company Name
   - **Tenant Domain**: yourcompany (will be yourcompany.openframe.local)

4. Click **"Create Account"**
5. You'll be logged in automatically to your new tenant

### Verify Installation

After logging in, you should see:

1. **Dashboard**: Overview of your OpenFrame instance
2. **Empty State**: No devices, logs, or tickets (expected for new installation)
3. **Navigation Menu**: Access to Devices, Logs, Tickets, Settings
4. **AI Assistant**: Mingo AI available in the top-right corner

## Basic "Hello World" Example

Let's verify everything is working by testing the GraphQL API:

### 1. Test API Connection

Open GraphQL Playground at http://localhost:8081/graphiql and run:

```graphql
query {
  me {
    id
    email
    firstName
    lastName
    organization {
      name
      domain
    }
  }
}
```

### 2. Create a Test Organization

```graphql
mutation {
  createOrganization(
    input: {
      name: "Test Company"
      domain: "test.local"
      address: {
        street: "123 Test Street"
        city: "Test City"
        state: "TS"
        postalCode: "12345"
        country: "US"
      }
    }
  ) {
    id
    name
    domain
  }
}
```

### 3. Query Organizations

```graphql
query {
  organizations(first: 10) {
    edges {
      node {
        id
        name
        domain
        createdAt
      }
    }
  }
}
```

## Expected Output

After successful setup, you should see:

### Console Output
```bash
# From gateway service
INFO  [main] OpenFrameGatewayApplication: Started OpenFrameGatewayApplication in 45.2 seconds

# From API service  
INFO  [main] OpenFrameApiApplication: Started OpenFrameApiApplication in 38.1 seconds

# From frontend
Local:   http://localhost:3000/
Network: http://192.168.1.100:3000/
```

### Browser Interface
- Clean, modern dashboard interface
- Responsive navigation with OpenFrame branding
- Empty state messages for devices, logs, tickets
- Settings panel accessible
- Mingo AI chat interface available

### API Responses
GraphQL queries should return JSON data with proper tenant isolation and user context.

## Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main UI |
| **Gateway** | http://localhost:8080 | API Gateway |
| **API** | http://localhost:8081 | GraphQL/REST APIs |
| **Authorization** | http://localhost:8082 | OAuth/OIDC |
| **Management** | http://localhost:8083 | Admin APIs |
| **Client** | http://localhost:8084 | Agent Management |
| **External API** | http://localhost:8085 | External API |
| **Stream** | http://localhost:8086 | Stream Processing |

## Troubleshooting

### Port Conflicts
If services fail to start due to port conflicts:

```bash
# Check what's using ports
lsof -i :8080  # Gateway
lsof -i :8081  # API  
lsof -i :3000  # Frontend

# Kill conflicting processes
kill -9 <PID>
```

### Database Connection Issues
```bash
# Verify MongoDB is running
docker logs mongodb

# Test connection
mongosh --eval "db.runCommand('ping')"
```

### Build Failures
```bash
# Clean and rebuild
mvn clean
mvn install -DskipTests

# Check Java version
java -version  # Should be 21.x
```

### Frontend Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear browser cache and cookies
```

## What's Running

After successful startup:

### Infrastructure
- **MongoDB**: Primary data storage
- **Redis**: Caching and sessions  
- **Kafka**: Event streaming
- **NATS**: Real-time messaging

### Backend Services
- **Gateway**: Routing and authentication
- **Authorization**: OAuth/OIDC server
- **API**: GraphQL and REST endpoints
- **Management**: Background jobs and admin
- **Client**: Agent management
- **Stream**: Event processing

### Frontend
- **Vue.js App**: Modern responsive UI
- **Apollo Client**: GraphQL integration
- **Real-time Updates**: WebSocket connections

## Next Steps

Now that OpenFrame is running:

1. **Explore the UI**: Navigate through different sections
2. **Add Integrations**: Connect Tactical RMM, Fleet MDM
3. **Set up Agents**: Deploy client agents to devices
4. **Configure AI**: Enable Mingo AI features
5. **Read Documentation**: Follow the [First Steps Guide](first-steps.md)

## Performance Tips

- **Memory**: Allocate at least 8GB RAM for development
- **Java Options**: Add `-Xmx2g -Xms1g` to service startup
- **Database**: Use SSD storage for better MongoDB performance
- **Network**: Ensure good connectivity for external dependencies

---

**🎉 Congratulations!** You now have OpenFrame running locally. Continue with the [First Steps Guide](first-steps.md) to explore key features and functionality.