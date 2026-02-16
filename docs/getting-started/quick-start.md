# Quick Start Guide

Get OpenFrame running locally in **under 5 minutes**! This guide gets you from zero to a fully functional OpenFrame instance.

> **Before you start**: Make sure you've completed the [Prerequisites](prerequisites.md) - you'll need Docker, Java 21, and Node.js 18+.

## TL;DR - 5 Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Start infrastructure services
docker compose up -d mongodb redis kafka

# 3. Build and run backend services
mvn clean install -DskipTests
java -jar openframe/services/openframe-api/target/openframe-api-*.jar &
java -jar openframe/services/openframe-gateway/target/openframe-gateway-*.jar &

# 4. Start the frontend
cd openframe/services/openframe-frontend
npm install
npm run dev

# 5. Open browser
open https://localhost:3000
```

**Expected result**: OpenFrame login screen at https://localhost:3000

[![OpenFrame: 5-Minute MSP Platform Walkthrough - Cut Vendor Costs & Automate Ops](https://img.youtube.com/vi/er-z6IUnAps/maxresdefault.jpg)](https://www.youtube.com/watch?v=er-z6IUnAps)

## Step-by-Step Installation

### Step 1: Clone the Repository

```bash
# Clone the OpenFrame repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Verify you're in the right directory
ls -la
# You should see: openframe/, clients/, manifests/, etc.
```

### Step 2: Environment Configuration

Create your local environment configuration:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the configuration
nano .env
```

**Minimal `.env` configuration:**
```bash
# Basic Configuration
OPENFRAME_DOMAIN=localhost
OPENFRAME_PROTOCOL=https

# Database URLs
MONGO_URI=mongodb://localhost:27017/openframe
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Security
JWT_SECRET=your_super_secure_jwt_secret_at_least_256_bits_long
REGISTRATION_SECRET=openframe-dev-secret

# OAuth2 (Optional for development)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 3: Start Infrastructure Services

```bash
# Start required database and messaging services
docker compose up -d mongodb redis kafka

# Wait for services to be ready (about 30 seconds)
docker compose logs -f mongodb
# Press Ctrl+C when you see "Waiting for connections"

# Verify services are running
docker compose ps
# STATUS should show "Up" for all services
```

### Step 4: Build the Backend

```bash
# Build all Spring Boot services
mvn clean install -DskipTests

# Verify build succeeded
echo "Build completed with status: $?"
# Should output: Build completed with status: 0
```

### Step 5: Start Core Services

Open multiple terminal windows/tabs for better monitoring:

**Terminal 1 - Authorization Server:**
```bash
cd openframe/services/openframe-authorization-server
java -jar target/openframe-authorization-server-*.jar
# Wait for: "Started OpenFrameAuthorizationServerApplication"
```

**Terminal 2 - API Service:**
```bash
cd openframe/services/openframe-api  
java -jar target/openframe-api-*.jar
# Wait for: "Started ApiApplication"
```

**Terminal 3 - Gateway Service:**
```bash
cd openframe/services/openframe-gateway
java -jar target/openframe-gateway-*.jar  
# Wait for: "Started GatewayApplication"
```

### Step 6: Start the Frontend

**Terminal 4 - Frontend Application:**
```bash
cd openframe/services/openframe-frontend
npm install
npm run dev
```

Expected output:
```text
> openframe-frontend@1.0.0 dev
> next dev --port 3000

ready - started server on 0.0.0.0:3000, url: https://localhost:3000
```

### Step 7: Verify Installation

Open your browser and navigate to:
- **Frontend**: https://localhost:3000
- **API Health**: https://localhost:8080/health
- **Auth Health**: https://localhost:8081/actuator/health

You should see:
1. **Frontend**: OpenFrame login screen
2. **API Health**: `{"status": "UP"}`
3. **Auth Health**: JSON response with `"status": "UP"`

## Initial Account Setup

### Create Your First Account

1. **Open the application**: https://localhost:3000
2. **Click "Sign Up"** (first time setup)
3. **Enter your details**:
   - Email: admin@yourdomain.com
   - Password: (secure password)
   - Organization Name: Your MSP Name
4. **Complete registration**
5. **Log in with your new credentials**

### First Login Tour

After logging in, you'll see:

- **Dashboard**: Overview of your OpenFrame instance
- **Devices**: Device management interface (initially empty)
- **Organizations**: Client organization management
- **Settings**: Configuration and user management

## Test the Installation

### 1. Create a Test Organization

```bash
# Use the API to create a test organization
curl -X POST https://localhost:8080/api/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "address": {
      "street": "123 Test St",
      "city": "Test City", 
      "state": "TS",
      "zipCode": "12345",
      "country": "US"
    }
  }'
```

### 2. Verify API Connectivity

```bash
# Test the health endpoint
curl -k https://localhost:8080/health

# Test authentication endpoint  
curl -k https://localhost:8081/actuator/health

# Check GraphQL endpoint
curl -X POST https://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ organizations { id name } }"}'
```

Expected responses should return JSON with status information.

## Quick Configuration

### Enable Tool Integrations

Navigate to **Settings > Architecture** and configure:

1. **Fleet MDM** (if available):
   - Fleet Server URL: `https://your-fleet-server.com`
   - API Token: `your-fleet-api-token`

2. **Tactical RMM** (if available):
   - Server URL: `https://your-tacticalrmm-server.com`
   - API Key: `your-tactical-api-key`

3. **MeshCentral** (if available):
   - Server URL: `https://your-meshcentral-server.com`
   - Username/Password: Admin credentials

### Configure AI Settings

Navigate to **Settings > AI Settings**:

1. **Anthropic Claude** (recommended):
   - API Key: `sk-ant-your-anthropic-key`
   - Model: `claude-3-sonnet-20240229`

2. **Enable Mingo AI**:
   - Toggle "Enable AI Assistant"
   - Configure response preferences

## Common Quick Start Issues

### Port Already in Use
```bash
# Find what's using port 8080
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>
```

### Database Connection Failed
```bash
# Restart MongoDB
docker compose restart mongodb

# Check MongoDB logs
docker compose logs mongodb
```

### Frontend Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### JWT Token Issues
```bash
# Generate a new JWT secret (256+ bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Next Steps

Congratulations! 🎉 OpenFrame is now running. Here's what to do next:

### Immediate Next Steps
1. **[First Steps Guide](first-steps.md)** - Essential configuration and setup
2. **Add your first devices** - Connect Fleet MDM or Tactical RMM
3. **Invite team members** - Set up user accounts and permissions
4. **Configure integrations** - Connect your existing MSP tools

### Development & Customization
1. **[Development Environment](../development/setup/environment.md)** - Set up for development
2. **[Architecture Overview](../development/architecture/README.md)** - Understand the platform
3. **[Contributing Guidelines](../development/contributing/guidelines.md)** - Start contributing

### Production Deployment
1. **[Security Guidelines](../development/security/README.md)** - Secure your installation
2. **Production Deployment Guide** - Scale for production use
3. **Monitoring Setup** - Monitor your OpenFrame instance

## Getting Help

If you run into issues during quick start:

- **OpenMSP Slack Community**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Check logs** in each terminal window for error messages
- **Verify prerequisites** - ensure all required software is installed

> **Remember**: We don't use GitHub Issues. All support happens in our Slack community where you'll get faster, more personal help from the team and community.

---

**⚡ Quick Start Complete!** OpenFrame is now running at https://localhost:3000