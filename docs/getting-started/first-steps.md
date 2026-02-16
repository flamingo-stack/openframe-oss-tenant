# First Steps

Congratulations on getting OpenFrame running! This guide will walk you through the first 5 essential steps to configure and explore your new OpenFrame installation.

## 🎯 Your First 5 Steps

After completing the [Quick Start](quick-start.md), here's what to do first:

### Step 1: Complete Your Profile Setup

**Navigate to Settings → Profile**

1. **Update your profile information:**
   - Full name and contact details
   - Time zone and preferences
   - Profile picture (optional)

2. **Configure organization details:**
   - Company information
   - Primary contact details
   - Business settings

3. **Set up notifications:**
   - Email preferences
   - Alert thresholds
   - Notification channels

**Why this matters:** Proper profile setup ensures you receive relevant notifications and helps with multi-tenant data isolation.

### Step 2: Create Your First Organization

Organizations in OpenFrame represent your clients or managed entities.

**Navigate to Organizations → New Organization**

1. **Fill in basic information:**
   ```text
   Organization Name: Acme Corp
   Domain: acme-corp.com
   Industry: Technology
   ```

2. **Add contact information:**
   - Primary contact person
   - Address and location
   - Phone and email

3. **Configure organization settings:**
   - Time zone
   - Business hours
   - Custom fields (optional)

**Result:** You now have a tenant structure for managing devices and users under this organization.

### Step 3: Set Up Authentication & SSO

**Navigate to Settings → SSO Configuration**

Choose your authentication strategy:

#### Option A: Google SSO (Recommended)
1. **Create Google OAuth App:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials

2. **Configure in OpenFrame:**
   ```text
   Client ID: your-google-client-id
   Client Secret: your-google-client-secret
   Redirect URI: http://localhost:8082/login/oauth2/code/google
   ```

#### Option B: Microsoft SSO
1. **Register Azure App:**
   - Go to [Azure Portal](https://portal.azure.com)
   - App Registrations → New Registration
   - Configure redirect URIs

2. **Configure in OpenFrame:**
   ```text
   Client ID: your-azure-client-id
   Client Secret: your-azure-client-secret
   Tenant ID: your-azure-tenant-id
   ```

#### Option C: Local Authentication Only
Keep the default username/password authentication for development and testing.

**Test your SSO setup** by logging out and signing back in with your configured provider.

### Step 4: Generate Your First API Key

API keys enable external integrations and programmatic access.

**Navigate to Settings → API Keys**

1. **Create a new API key:**
   ```text
   Name: "Development Key"
   Description: "For testing external integrations"
   Permissions: Read/Write
   Rate Limit: 1000 requests/hour
   ```

2. **Copy and secure your key:**
   ```text
   Format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
           ↑                   ↑
           Key ID              Secret Key
   ```

3. **Test the API key:**
   ```bash
   # Test external API access
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        http://localhost:8080/external/api/v1/organizations
   ```

**Security Note:** Store API keys securely and never commit them to version control.

### Step 5: Install and Connect Your First Client

The OpenFrame client provides system monitoring and management capabilities.

#### Build the Client Agent

```bash
# Navigate to client directory
cd clients/openframe-client

# Build the Rust client
cargo build --release

# The binary will be available at:
# target/release/openframe-client
```

#### Register the Agent

1. **Navigate to Devices → Agent Registration**

2. **Generate registration secret:**
   - Click "Generate New Secret"
   - Copy the registration token
   - Set expiration time (default: 24 hours)

3. **Install agent on target machine:**
   ```bash
   # Run agent with registration token
   ./target/release/openframe-client --register \
     --token "your-registration-token" \
     --server "http://localhost:8080"
   ```

4. **Start the agent:**
   ```bash
   # Run as service (production)
   ./target/release/openframe-client --daemon

   # Or run in foreground (development)
   ./target/release/openframe-client
   ```

**Result:** Your first device will appear in the Devices dashboard with real-time monitoring data.

## 🔍 Explore Key Features

Now that basic setup is complete, explore these core features:

### Dashboard Overview
- **Device Statistics**: Connected agents and health status
- **Organization Metrics**: Client overview and activity
- **Recent Activity**: Latest events and changes
- **Quick Actions**: Common administrative tasks

### Device Management
- **Real-time Monitoring**: CPU, memory, disk, network stats
- **Remote Access**: Connect to devices via MeshCentral integration
- **Software Inventory**: Installed applications and updates
- **Compliance Tracking**: Security posture and policy adherence

### AI Assistant (Mingo)
- **Chat Interface**: Ask questions about your infrastructure
- **Automated Responses**: AI-powered troubleshooting suggestions
- **Tool Integration**: Execute commands through AI prompts
- **Learning Mode**: Improve responses based on your environment

### Logging & Analytics
- **Centralized Logs**: All system events in one place
- **Advanced Filtering**: Search by device, organization, time range
- **Real-time Streaming**: Live log updates
- **Export Capabilities**: Download logs for external analysis

## ⚙️ Essential Configuration

### Environment Tuning

For better performance, adjust these settings:

```bash
# Java heap size (increase for production)
export JAVA_OPTS="-Xmx4g -Xms2g"

# Database connections
export MONGODB_MAX_CONNECTIONS=100
export REDIS_MAX_CONNECTIONS=50

# Kafka settings
export KAFKA_RETENTION_HOURS=168  # 7 days
export KAFKA_MAX_MESSAGE_SIZE=1MB
```

### Security Hardening

**Enable HTTPS (Production):**
```yaml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.jks
    key-store-password: changeit
    key-alias: openframe
```

**Configure CORS:**
```yaml
cors:
  allowed-origins: 
    - "https://yourdomain.com"
    - "http://localhost:3000"  # Development only
  allowed-methods: GET,POST,PUT,DELETE,OPTIONS
```

### Monitoring Setup

**Enable Actuator endpoints:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
```

**Access monitoring data:**
```bash
# Health check
curl http://localhost:8081/actuator/health

# Metrics (Prometheus format)
curl http://localhost:8081/actuator/prometheus
```

## 🔗 Connect External Tools

OpenFrame integrates with existing MSP tools:

### Fleet MDM Integration
1. **Navigate to Settings → Integrations**
2. **Add Fleet MDM connection:**
   ```text
   Server URL: https://your-fleet-instance.com
   API Token: your-fleet-api-token
   ```
3. **Verify connection** and import existing hosts

### Tactical RMM Integration
1. **Configure Tactical RMM endpoint:**
   ```text
   Server URL: https://your-rmm.domain.com
   API Key: your-tactical-api-key
   ```
2. **Import agents** and sync configurations

### MeshCentral Integration
1. **Set up MeshCentral server:**
   ```text
   Server URL: https://your-mesh.domain.com
   Username: admin
   Password: your-password
   ```
2. **Enable remote access** features in device management

## 📊 Understanding the Data Flow

OpenFrame processes data through several layers:

```mermaid
flowchart LR
    Agent[Client Agent] --> Gateway[API Gateway]
    Tools[External Tools] --> Gateway
    Gateway --> API[API Service]
    API --> Mongo[(MongoDB)]
    API --> Events[Event Stream]
    Events --> Kafka[Kafka]
    Kafka --> Stream[Stream Service]
    Stream --> Analytics[(Analytics DB)]
```

**Data Flow Explanation:**
1. **Client agents** send monitoring data to the gateway
2. **External tools** push events through integrations
3. **API service** processes and stores structured data
4. **Event streaming** handles real-time updates
5. **Analytics layer** provides insights and reporting

## 🚀 Next Steps & Advanced Features

### Immediate Actions
- [ ] Invite team members to your OpenFrame instance
- [ ] Connect your production MSP tools
- [ ] Set up automated monitoring alerts
- [ ] Configure backup and disaster recovery

### Advanced Exploration
- **Custom Integrations**: Build connectors for your specific tools
- **AI Training**: Customize Mingo responses for your environment  
- **API Development**: Create custom applications using OpenFrame APIs
- **Deployment**: Move to production with Docker/Kubernetes

### Learning Resources
- **[Development Documentation](/docs/development/)**: Deep dive into architecture
- **[Architecture Overview](/docs/architecture/)**: Understand system design
- **Video Walkthroughs**: Watch the embedded tutorials throughout docs

## 🆘 Getting Help

### Community Resources
- **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Real-time community support
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and API references

### Professional Support
- **Flamingo Stack**: Enterprise support and consulting
- **Implementation Services**: Professional setup and integration
- **Training Programs**: Team education and best practices

## 🎉 Congratulations!

You've successfully completed the first steps with OpenFrame! You now have:

✅ A configured user profile and organization  
✅ Working authentication (local or SSO)  
✅ API access for external integrations  
✅ A connected client agent providing monitoring data  
✅ Understanding of core features and data flow  

**What's Next?** 
- Explore the [Development Documentation](/docs/development/) to start customizing OpenFrame
- Join our community to share your experience and get support
- Begin integrating your existing MSP tools and workflows

---

*Ready to transform your MSP operations with AI-powered automation? Let's build something amazing together!*