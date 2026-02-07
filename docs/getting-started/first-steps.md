# First Steps

Congratulations on getting OpenFrame running! This guide walks you through the essential configuration steps to get your MSP platform ready for production use.

## Overview

After completing the [Quick Start Guide](quick-start.md), you'll perform these critical first steps:

1. **Initial System Configuration** - Set up your tenant and admin account
2. **Organization Setup** - Create your first client organization  
3. **Tool Integration** - Connect external MSP tools
4. **Agent Deployment** - Install the OpenFrame client agent
5. **Security Configuration** - Set up proper authentication

## 1. Initial System Configuration

### Access the Admin Interface

Navigate to http://localhost:3000 and complete the initial setup wizard.

### Create Your Tenant

1. **Organization Details**
   - Company Name: Your MSP business name
   - Domain: Your primary domain (e.g., `yourmsp.com`)
   - Industry: Managed Service Provider
   - Size: Select appropriate company size

2. **Administrator Account**
   - Full Name: Your name
   - Email: Professional email address
   - Password: Strong password (12+ characters)
   - Role: Super Administrator

3. **Tenant Configuration**
   - Tenant ID: Unique identifier (auto-generated)
   - Region: Your primary operating region
   - Time Zone: Your business time zone

### Verify Initial Setup

Check that your configuration was successful:

```bash
# Test API access with your admin credentials
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { me { id name email role } }"}'
```

## 2. Organization Setup

### Create Your First Client Organization

Organizations represent your clients in OpenFrame. Create a test organization to verify functionality.

1. **Navigate to Organizations**
   - Go to "Organizations" in the main menu
   - Click "Add New Organization"

2. **Basic Information**
   ```text
   Organization Name: Acme Corp (Test Client)
   Display Name: Acme Corp
   Website: https://acme-corp.com
   Industry: Manufacturing
   Size: 50-100 employees
   ```

3. **Contact Information**
   ```text
   Primary Contact: John Smith
   Email: john.smith@acme-corp.com
   Phone: +1 (555) 123-4567
   
   Address:
   123 Business Street
   Business City, ST 12345
   United States
   ```

4. **Technical Details**
   ```text
   Time Zone: America/New_York
   Business Hours: 9:00 AM - 5:00 PM EST
   Support Level: Standard
   ```

### Verify Organization Creation

```bash
# Query organizations via GraphQL
curl -X POST http://localhost:8081/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { organizations { edges { node { id name website } } } }"}'
```

## 3. Tool Integration

### Install OpenFrame CLI

First, install the OpenFrame CLI for agent and tool management:

```bash
# Install OpenFrame CLI (external tool)
# See: https://github.com/flamingo-stack/openframe-cli#installation
curl -fsSL https://cli.openframe.ai/install.sh | sh

# Verify installation
openframe-cli --version
```

### Configure External MSP Tools (Optional)

OpenFrame integrates with popular MSP tools. Configure the ones you're using:

#### Tactical RMM Integration

1. **Get API Credentials**
   - Log into your Tactical RMM instance
   - Go to Settings > API Keys
   - Create a new API key with admin permissions

2. **Configure in OpenFrame**
   ```bash
   # Set environment variables
   export TACTICAL_RMM_URL="https://your-tactical-rmm.com"
   export TACTICAL_RMM_API_KEY="your-api-key"
   
   # Test connection
   openframe-cli tools test tactical-rmm
   ```

#### MeshCentral Integration

1. **Get Server Details**
   - MeshCentral server URL
   - Admin username and password
   - Device group configurations

2. **Configure Connection**
   ```bash
   export MESHCENTRAL_URL="https://your-meshcentral.com"
   export MESHCENTRAL_USERNAME="admin"
   export MESHCENTRAL_PASSWORD="your-password"
   
   # Test connection
   openframe-cli tools test meshcentral
   ```

#### Fleet MDM Integration

1. **Get API Access**
   - Fleet server URL
   - API token with appropriate permissions
   - Organization ID

2. **Configure Integration**
   ```bash
   export FLEET_URL="https://your-fleet.com"
   export FLEET_API_TOKEN="your-api-token"
   
   # Test connection
   openframe-cli tools test fleet
   ```

### Verify Tool Integrations

Check integration status in the OpenFrame UI:

1. Go to **Settings > Tools & Integrations**
2. Verify connection status for each configured tool
3. Test data synchronization

## 4. Agent Deployment

### Generate Agent Registration Secret

1. **Navigate to Devices > Agent Registration**
2. **Generate Secret**:
   ```text
   Secret Name: Test Environment
   Organization: Acme Corp
   Expiration: 7 days
   Permissions: Standard Agent
   ```
3. **Copy the generated secret** (format: `ak_xxxxx.sk_live_xxxxx`)

### Install OpenFrame Agent

#### On Windows
```powershell
# Download and install as Administrator
Invoke-WebRequest -Uri "https://releases.openframe.ai/windows/latest" -OutFile "openframe-agent.msi"
msiexec /i openframe-agent.msi /quiet

# Configure with registration secret
openframe-client install --serverUrl "http://localhost:8080" --initialKey "ak_xxxxx.sk_live_xxxxx"
```

#### On Linux
```bash
# Download and install
curl -fsSL https://releases.openframe.ai/linux/install.sh | sudo sh

# Configure with registration secret  
sudo openframe-client install \
  --serverUrl "http://localhost:8080" \
  --initialKey "ak_xxxxx.sk_live_xxxxx"
```

#### On macOS
```bash
# Download and install
brew install openframe/tap/openframe-client

# Configure with registration secret
sudo openframe-client install \
  --serverUrl "http://localhost:8080" \
  --initialKey "ak_xxxxx.sk_live_xxxxx"
```

### Verify Agent Installation

1. **Check Device Registration**
   - Go to **Devices** in OpenFrame
   - Verify your test device appears
   - Check connection status (should be "Online")

2. **Test Agent Communication**
   ```bash
   # Check agent status
   openframe-client status
   
   # View agent logs
   openframe-client logs
   ```

## 5. Security Configuration

### Configure Authentication Providers

#### Set Up OAuth2 Providers (Optional)

1. **Google OAuth Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth2 credentials
   - Add redirect URI: `http://localhost:8082/login/oauth2/code/google`

2. **Microsoft Azure Setup**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Register application in Azure AD
   - Add redirect URI: `http://localhost:8082/login/oauth2/code/microsoft`

3. **Configure in OpenFrame**:
   ```bash
   # Set OAuth credentials
   export OAUTH_GOOGLE_CLIENT_ID="your-google-client-id"
   export OAUTH_GOOGLE_CLIENT_SECRET="your-google-secret"
   
   export OAUTH_MICROSOFT_CLIENT_ID="your-azure-client-id"
   export OAUTH_MICROSOFT_CLIENT_SECRET="your-azure-secret"
   ```

### Create API Keys

For programmatic access, create API keys:

1. **Navigate to Settings > API Keys**
2. **Create New Key**:
   ```text
   Name: Development API Key
   Description: For development and testing
   Permissions: Read/Write (limited scope)
   Expiration: 90 days
   ```
3. **Store Securely**: Save the generated key in a secure location

### Configure Role-Based Access

Set up user roles for your team:

1. **Navigate to Settings > Users & Permissions**
2. **Define Roles**:
   - **Administrator**: Full system access
   - **Technician**: Device management, limited settings
   - **View Only**: Read-only access to dashboards

3. **Invite Team Members**:
   ```text
   Email: tech@yourmsp.com
   Role: Technician
   Organizations: [Acme Corp, Other Clients]
   ```

## 6. Initial Monitoring Setup

### Configure Alerting

1. **Navigate to Settings > Alerts & Notifications**
2. **Set Up Basic Alerts**:
   - Device offline > 5 minutes
   - High CPU usage > 90%
   - Low disk space < 10%
   - Failed login attempts > 5

3. **Configure Notification Channels**:
   - Email notifications
   - Slack webhooks (optional)
   - SMS notifications (optional)

### Create Dashboards

1. **Navigate to Dashboard**
2. **Customize Widgets**:
   - Device status overview
   - Recent alerts
   - Organization health metrics
   - System performance stats

## 7. Verification Checklist

Ensure everything is working correctly:

### System Health
- [ ] All services running and healthy
- [ ] Database connections stable
- [ ] No critical errors in logs

### User Access
- [ ] Admin account working
- [ ] OAuth providers configured (if used)
- [ ] API keys functional
- [ ] Team member invitations sent

### Device Management
- [ ] At least one agent registered
- [ ] Device appears in dashboard
- [ ] Agent reporting data correctly
- [ ] Remote management functions working

### Tool Integration
- [ ] External tools connected
- [ ] Data synchronization working
- [ ] No authentication errors

### Monitoring
- [ ] Basic alerts configured
- [ ] Notification channels tested
- [ ] Dashboard showing data

## 8. Performance Optimization

### Database Optimization

```bash
# Check MongoDB performance
mongo --eval "db.stats()"

# Optimize indexes (run in MongoDB shell)
mongo openframe
db.devices.ensureIndex({organizationId: 1, status: 1})
db.users.ensureIndex({email: 1})
```

### Cache Configuration

```bash
# Check Redis performance
redis-cli info memory
redis-cli info stats

# Monitor cache hit ratio
redis-cli info stats | grep keyspace_hits
```

## Next Steps

Your OpenFrame installation is now configured and ready for production use! Here's what to do next:

### Immediate Actions
1. **Add More Devices**: Install agents on client systems
2. **Configure Automation**: Set up automated responses to common issues
3. **Train Your Team**: Onboard technicians to the platform

### Advanced Configuration
1. **[Development Setup](../development/setup/environment.md)**: For customization and extensions
2. **Production Deployment**: Scale for multiple clients and high availability
3. **Advanced Security**: Implement SSO, MFA, and advanced RBAC

### Community Engagement
1. **Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Get help and share experiences
2. **Contribute**: Report bugs, suggest features, or contribute code
3. **Stay Updated**: Follow release notes and community announcements

## Troubleshooting Common Issues

### Agent Won't Register
```bash
# Check server connectivity
curl -I http://localhost:8080/health

# Verify registration secret format
echo "Secret format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456"
```

### Authentication Issues
```bash
# Check OAuth configuration
curl http://localhost:8082/.well-known/openid_configuration

# Verify JWT token format
openframe-cli auth validate-token
```

### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check Java heap usage
jps -v | grep openframe
```

---

**Congratulations!** 🎉 You've successfully configured OpenFrame for your MSP operations. The platform is now ready to help you deliver exceptional managed services while reducing costs and increasing efficiency.