# First Steps with OpenFrame

Welcome to OpenFrame! Now that you have the platform running, let's explore the essential features and configurations that will help you get the most out of your MSP automation platform.

> **Prerequisites**: Complete the [Quick Start Guide](quick-start.md) to have OpenFrame running locally.

[![OpenFrame: 5-Minute MSP Platform Walkthrough - Cut Vendor Costs & Automate Ops](https://img.youtube.com/vi/er-z6IUnAps/maxresdefault.jpg)](https://www.youtube.com/watch?v=er-z6IUnAps)

## First 5 Things to Do

### 1. Complete Organization Setup

Your organization is the foundation of your OpenFrame tenant.

**Navigate to Settings → Company & Users:**

```text
Organization Details:
- Name: Your MSP Company Name
- Industry: Managed Service Provider
- Size: Select appropriate size
- Contact Information: Primary business details
- Address: Complete business address
```

**Why This Matters:**
- Enables proper tenant isolation
- Required for client reporting and branding
- Foundation for compliance and audit trails

### 2. Configure Authentication & SSO

Set up secure authentication for your team and clients.

**Navigate to Settings → SSO Configuration:**

#### Enable Google SSO
```text
1. Click "Configure Google SSO"
2. Enter your Google OAuth2 credentials:
   - Client ID: from Google Cloud Console
   - Client Secret: from Google Cloud Console
   - Authorized domains: your-domain.com
3. Test the configuration
4. Enable for your organization
```

#### Enable Microsoft SSO
```text
1. Click "Configure Microsoft SSO" 
2. Enter your Azure AD credentials:
   - Application ID: from Azure portal
   - Client Secret: from Azure portal
   - Tenant ID: your Azure tenant
3. Test the configuration
4. Enable for your organization
```

**Security Best Practices:**
- Always use SSO for team members
- Enable multi-factor authentication
- Review and audit user access regularly

### 3. Set Up Your First Integrated Tool

Connect OpenFrame to your existing MSP tools for unified management.

**Navigate to Settings → Architecture:**

#### Connect Fleet MDM
```text
1. Click "Configure Fleet MDM"
2. Enter connection details:
   - Server URL: https://your-fleet.domain.com
   - API Token: your-fleet-api-token
   - Organization: fleet-org-name
3. Test connection
4. Enable synchronization
```

#### Connect Tactical RMM  
```text
1. Click "Configure Tactical RMM"
2. Enter connection details:
   - Server URL: https://your-tactical-rmm.com
   - API Key: your-tactical-api-key
   - Client: tactical-client-name
3. Test connection
4. Enable agent management
```

#### Connect MeshCentral
```text
1. Click "Configure MeshCentral"
2. Enter connection details:
   - Server URL: https://your-meshcentral.com
   - Username: admin-username
   - Password: admin-password
   - Device Group: target-device-group
3. Test connection
4. Enable remote access features
```

### 4. Add Your First Devices

Get devices connected and monitored through OpenFrame.

**Navigate to Devices → Add Device:**

#### Option A: Automatic Agent Installation
```text
1. Select "Automatic Installation"
2. Choose your device OS (Windows/macOS/Linux)
3. Download the OpenFrame agent
4. Run installation on target device
5. Device will auto-register and appear in dashboard
```

#### Option B: Manual Registration
```text
1. Select "Manual Registration"
2. Copy the registration secret
3. Install OpenFrame client manually:

# On the target device
wget https://releases.openframe.ai/latest/openframe-client
chmod +x openframe-client
./openframe-client register --secret=<registration-secret>
```

#### Verify Device Connection
```text
1. Check Devices dashboard for new entry
2. Verify "Connected" status
3. Review device details and installed agents
4. Test remote connectivity
```

### 5. Configure AI Assistant (Mingo)

Enable AI-powered automation and support.

**Navigate to Settings → AI Settings:**

#### Configure Anthropic Integration
```text
1. Enter Anthropic API credentials:
   - API Key: your-anthropic-api-key
   - Model: claude-3-sonnet (recommended)
   - Max Tokens: 4096
2. Test AI connectivity
3. Enable for technician workflows
```

#### Set AI Policies
```text
1. Define automation policies:
   - Auto-resolve common issues: Enabled
   - Require approval for critical actions: Enabled
   - Client self-service level: Basic
2. Configure escalation rules
3. Set working hours and availability
```

#### Test AI Chat
```text
1. Navigate to Mingo Chat interface
2. Ask: "Show me device health summary"
3. Verify AI responds with current device status
4. Try: "Generate maintenance report for last 30 days"
```

## Essential Configurations

### API Key Management

Create API keys for external integrations and automation.

**Navigate to Settings → API Keys:**

```text
1. Click "Create API Key"
2. Configure:
   - Name: External Integration Key
   - Permissions: Read/Write as needed
   - Expiration: Set appropriate expiry
   - IP Restrictions: Limit to specific IPs
3. Save the key securely (shown only once)
4. Test with sample API call
```

**Test API Key:**
```bash
curl -H "X-API-Key: your-api-key" \
  https://localhost:8081/api/v1/devices \
  -k
```

### User & Team Management

Add team members and configure permissions.

**Navigate to Settings → Company & Users:**

```text
1. Click "Invite Users"
2. Enter email addresses
3. Select roles:
   - Admin: Full platform access
   - Technician: Device management and monitoring
   - Viewer: Read-only access
4. Send invitations
5. Users receive email to complete registration
```

### Notification Settings

Configure alerts and notification channels.

**Navigate to Settings (Notification preferences):**

```text
1. Email Notifications:
   - Device alerts: Enabled
   - System maintenance: Enabled
   - Security events: Enabled
2. Slack Integration (optional):
   - Webhook URL: your-slack-webhook
   - Channels: #alerts, #maintenance
3. Test notification delivery
```

## Exploring Key Features

### Device Management Dashboard

**Navigate to Devices:**
- **Device Grid View**: Visual overview of all connected devices
- **Device Status**: Real-time health and connectivity status  
- **Remote Access**: Direct MeshCentral integration for support
- **Agent Management**: Install, update, and configure agents
- **Compliance Monitoring**: Track security and policy compliance

### Log Analysis & Monitoring

**Navigate to Logs:**
- **Unified Log View**: Aggregated logs from all integrated tools
- **Search & Filter**: Advanced query capabilities across data sources
- **Real-time Streaming**: Live log updates and monitoring
- **Alert Configuration**: Set up automated alert rules
- **Audit Trails**: Comprehensive activity logging

### AI-Powered Automation

**Navigate to Mingo (AI Chat):**
- **Conversational Interface**: Natural language queries and commands
- **Automated Workflows**: AI-driven task automation
- **Predictive Analytics**: Proactive issue identification
- **Knowledge Base**: AI-powered documentation and solutions
- **Approval Workflows**: Human-in-the-loop for critical operations

### Organization & Client Management

**Navigate to Organizations:**
- **Multi-Tenant Management**: Separate client environments
- **Contact Management**: Track client contacts and relationships
- **Service Configuration**: Per-client service settings
- **Billing Integration**: Foundation for billing and reporting
- **Custom Branding**: Per-client interface customization

## Common Configuration Patterns

### Development Environment

For development and testing:

```bash
# Set development profile
export SPRING_PROFILES_ACTIVE=development,local

# Enable debug logging
export LOGGING_LEVEL_COM_OPENFRAME=DEBUG

# Disable SSL verification for local testing
export OPENFRAME_SSL_VERIFY=false
```

### Production Preparation

When preparing for production:

```bash
# Use production profiles
export SPRING_PROFILES_ACTIVE=production

# Configure external databases
export MONGODB_URI=mongodb://prod-cluster:27017/openframe
export REDIS_URL=redis://prod-redis:6379

# Set up proper SSL certificates
export SSL_CERT_PATH=/etc/ssl/certs/openframe.crt
export SSL_KEY_PATH=/etc/ssl/private/openframe.key
```

### Security Hardening

Essential security configurations:

```text
1. API Gateway Settings:
   - Enable rate limiting
   - Configure CORS policies
   - Set up API key rotation schedule

2. Database Security:
   - Enable authentication on all databases
   - Use encrypted connections (SSL/TLS)
   - Regular security updates

3. Network Security:
   - Firewall rules for service ports
   - VPN access for administrative functions
   - Network segmentation for services
```

## Troubleshooting Quick Checks

### Service Health
```bash
# Check all service health endpoints
curl -k https://localhost:8081/actuator/health | jq .
curl -k https://localhost:8080/actuator/health | jq .
curl -k https://localhost:8082/actuator/health | jq .
```

### Database Connectivity
```bash
# Test MongoDB connection
docker exec openframe-mongodb mongosh --eval "db.runCommand('ping')"

# Test Redis connection  
docker exec openframe-redis redis-cli ping

# Check Kafka topics
docker exec openframe-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

### Log Analysis
```bash
# Check service logs for errors
docker-compose logs -f api-service | grep ERROR
docker-compose logs -f gateway-service | grep ERROR

# Monitor real-time logs
tail -f logs/openframe-api.log
tail -f logs/openframe-gateway.log
```

## What's Next?

Now that you've completed the essential setup, you're ready to dive deeper:

### Development Path
- **[Development Environment Setup](../development/setup/environment.md)** - Configure your IDE and development workflow
- **[Local Development Guide](../development/setup/local-development.md)** - Advanced development setup and debugging

### Architecture Understanding  
- **[System Architecture](../development/architecture/README.md)** - Deep dive into OpenFrame's design
- **[Security Overview](../development/security/README.md)** - Understand security patterns and best practices

### Advanced Topics
- **[Contributing Guidelines](../development/contributing/guidelines.md)** - Learn how to contribute to OpenFrame
- **[Testing Overview](../development/testing/README.md)** - Testing strategies and practices

## Get Help & Connect

- 💬 **Community**: [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📚 **Documentation**: [OpenFrame Docs](https://www.flamingo.run/openframe)
- 🌐 **Website**: [Flamingo Platform](https://flamingo.run)

**You're now ready to harness the full power of OpenFrame for your MSP operations!** 🚀

The platform is designed to grow with you - from simple device monitoring to complex automated workflows, OpenFrame provides the foundation for modern MSP success.