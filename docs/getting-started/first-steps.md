# First Steps After Installation

Congratulations on successfully installing OpenFrame! This guide will walk you through the essential first steps to configure your new OpenFrame instance and start managing your IT infrastructure.

> **Note**: This guide assumes you've completed the [Quick Start Guide](quick-start.md) and have OpenFrame running at `http://localhost:8080`.

## Step 1: Complete Organization Setup

### Configure Your MSP Profile

1. **Access Settings**
   - Log in to OpenFrame at `http://localhost:8080`
   - Navigate to **Settings** → **Organization**

2. **Add Company Information**
   ```
   Organization Details:
   • Company Name: Your MSP business name
   • Domain: yourcompany.openframe.local
   • Website: https://yourcompany.com
   • Phone: +1 (555) 123-4567
   ```

3. **Set Address Information**
   ```
   Business Address:
   • Street Address: 123 Business Way
   • City: Your City
   • State/Province: Your State
   • Postal Code: 12345
   • Country: United States
   ```

4. **Configure Contact Person**
   ```
   Primary Contact:
   • Name: John Doe
   • Title: IT Director
   • Email: admin@yourcompany.com
   • Phone: +1 (555) 123-4567
   ```

**Why this matters**: Proper organization configuration ensures accurate branding, contact information for support, and professional appearance for client-facing features.

## Step 2: Set Up User Management

### Invite Team Members

1. **Navigate to User Management**
   - Go to **Settings** → **Users & Access**
   - Click **Invite User**

2. **Send Invitations**
   ```
   Example Team Invitations:
   • technician@yourcompany.com (Technician Role)
   • manager@yourcompany.com (Manager Role)
   • admin@yourcompany.com (Admin Role)
   ```

3. **Configure Role Permissions**
   | Role | Permissions | Use Case |
   |------|-------------|----------|
   | **Admin** | Full access to all features | MSP owners, senior IT staff |
   | **Manager** | Organization and user management | Team leads, supervisors |
   | **Technician** | Device and ticket management | Day-to-day operations |
   | **Viewer** | Read-only access | Clients, junior staff |

### Set Up Single Sign-On (Recommended)

1. **Configure SSO Provider**
   - Navigate to **Settings** → **SSO Configuration**
   - Choose your provider (Google Workspace, Microsoft 365, etc.)
   
2. **Google Workspace Setup Example**
   ```bash
   # Required information:
   Client ID: your-google-client-id.googleusercontent.com
   Client Secret: your-google-client-secret
   Domain: yourcompany.com
   ```

3. **Test SSO Configuration**
   - Use the **Test Connection** button
   - Try logging in with SSO credentials
   - Verify user attributes are mapped correctly

## Step 3: Connect Your First Tool Integration

### Option A: Tactical RMM Integration

1. **Prepare Tactical RMM**
   ```bash
   # In your Tactical RMM instance:
   # 1. Create an API key
   # 2. Note your server URL
   # 3. Ensure network connectivity
   ```

2. **Configure in OpenFrame**
   - Go to **Settings** → **Tool Integrations**
   - Select **Tactical RMM**
   - Enter configuration:
   ```
   Server URL: https://your-tactical-rmm.com
   API Key: your-tactical-api-key
   Sync Interval: 300 seconds
   ```

3. **Test Connection**
   - Click **Test Connection**
   - Verify agent list synchronizes
   - Check device data appears in **Devices** section

### Option B: Fleet MDM Integration

1. **Fleet MDM Setup**
   ```bash
   # Required Fleet MDM information:
   Server URL: https://your-fleet-instance.com
   Fleet API Token: your-fleet-token
   ```

2. **OpenFrame Configuration**
   - Navigate to **Settings** → **Tool Integrations**
   - Choose **Fleet MDM**
   - Enter credentials and test connectivity

### Option C: MeshCentral Integration

1. **MeshCentral Preparation**
   - Create login token in MeshCentral admin panel
   - Note server URL and verify HTTPS access

2. **Integration Setup**
   - Add MeshCentral in **Tool Integrations**
   - Configure WebSocket proxy for remote access
   - Test device enumeration

## Step 4: Add Your First Device

### Manual Device Registration

1. **Navigate to Device Management**
   - Go to **Devices** → **Add Device**
   - Choose **Manual Registration**

2. **Install OpenFrame Agent**
   ```bash
   # Download platform-specific agent
   # Linux
   curl -O https://your-openframe.com/agent/openframe-agent-linux
   chmod +x openframe-agent-linux
   sudo ./openframe-agent-linux --register --token=<registration-token>

   # Windows
   # Download openframe-agent-windows.exe
   # Run as Administrator:
   openframe-agent-windows.exe --register --token=<registration-token>

   # macOS
   curl -O https://your-openframe.com/agent/openframe-agent-macos
   chmod +x openframe-agent-macos
   sudo ./openframe-agent-macos --register --token=<registration-token>
   ```

### Verify Device Connection

1. **Check Device Status**
   - Return to **Devices** section
   - Your new device should appear with "Online" status
   - Verify basic system information is populated

2. **Test Remote Capabilities**
   - Try **Remote Desktop** connection (if supported)
   - Execute a simple command via **Scripts**
   - Check **File Manager** functionality

## Step 5: Configure AI Assistant (Mingo)

### Enable Mingo AI

1. **Navigate to AI Settings**
   - Go to **Settings** → **AI Configuration**
   - Enable **Mingo AI Assistant**

2. **Choose AI Provider**
   ```
   Supported Providers:
   • OpenAI GPT-4 (Recommended)
   • Google Gemini
   • Claude (Anthropic)
   • Azure OpenAI
   ```

3. **Configure API Access**
   ```bash
   # Example for OpenAI:
   API Key: sk-your-openai-api-key
   Model: gpt-4-turbo
   Max Tokens: 4096
   Temperature: 0.7
   ```

### Test AI Functionality

1. **Open Chat Interface**
   - Navigate to **Chat** or **Mingo** section
   - Start a conversation with the AI assistant

2. **Try Example Queries**
   ```
   Example Conversations:
   • "Show me the status of all devices"
   • "Are there any critical alerts?"
   • "Help me troubleshoot device connectivity issues"
   • "Generate a system health report"
   ```

3. **Verify Autonomous Features**
   - Check that Mingo can access device information
   - Ensure it can execute safe commands
   - Test alert triage capabilities

## Step 6: Set Up Monitoring and Alerts

### Configure Alert Rules

1. **Navigate to Policies**
   - Go to **Policies & Queries**
   - Create your first alert policy

2. **Example Alert Configurations**
   ```
   Critical Alerts:
   • Device Offline > 5 minutes
   • High CPU Usage > 90% for 10 minutes
   • Low Disk Space < 10% remaining
   • Failed Login Attempts > 5 in 15 minutes
   ```

### Set Up Notifications

1. **Email Notifications**
   - Configure SMTP settings in **Settings** → **Notifications**
   - Test email delivery with a sample alert

2. **Slack Integration** (Optional)
   ```
   Slack Configuration:
   • Webhook URL: https://hooks.slack.com/your-webhook
   • Channel: #openframe-alerts
   • Alert Types: Critical, Warning
   ```

## Step 7: Explore Key Features

### Device Management Capabilities

1. **Remote Access**
   - Test remote desktop connections
   - Try file manager for remote file access
   - Execute scripts on remote devices

2. **System Information**
   - Review hardware and software inventories
   - Check security compliance status
   - Monitor performance metrics

### Ticketing and Chat System

1. **Create Test Ticket**
   - Navigate to **Tickets**
   - Create a sample support ticket
   - Test AI-powered ticket triage

2. **Chat with Clients**
   - Enable client chat portal
   - Test Fae AI client assistant
   - Verify chat history and escalation

### Analytics and Reporting

1. **Dashboard Overview**
   - Customize dashboard widgets
   - Review system health metrics
   - Check device compliance reports

2. **Generate Reports**
   - Device inventory reports
   - Security compliance summaries
   - Performance trend analysis

## Common Initial Configuration Issues

### Authentication Problems

**Issue**: SSO login not working
```bash
# Check configuration:
# 1. Verify redirect URLs in SSO provider
# 2. Ensure client secrets are correct
# 3. Check domain verification status
```

**Solution**: Review SSO provider logs and OpenFrame authentication service logs.

### Device Connection Issues

**Issue**: Devices not appearing or showing offline
```bash
# Troubleshooting steps:
# 1. Check network connectivity
# 2. Verify registration tokens
# 3. Review firewall settings
# 4. Check agent logs
```

### Integration Failures

**Issue**: Tool integrations failing to sync
```bash
# Common causes:
# 1. API key permissions insufficient
# 2. Network connectivity blocked
# 3. Rate limiting by external service
# 4. API version incompatibility
```

## Next Steps

After completing these first steps, you're ready to:

### Immediate Actions
1. **Add More Devices** - Expand your device inventory
2. **Create Automation** - Set up scripts and policies
3. **Train Your Team** - Introduce OpenFrame to your staff
4. **Configure Backups** - Implement data backup strategy

### Advanced Configuration
- **Production Deployment** - Move to Kubernetes production setup
- **Custom Integrations** - Develop custom tool connectors
- **Advanced AI Policies** - Configure sophisticated automation rules
- **Multi-Tenant Setup** - Configure additional client tenants

### Ongoing Management
- **Monitor Performance** - Set up system monitoring
- **Security Hardening** - Implement additional security measures
- **Regular Updates** - Keep OpenFrame current with latest releases
- **Community Engagement** - Participate in OpenFrame community

## Getting Help

Need assistance with configuration?

- **Documentation**: Detailed guides for each feature area
- **Community**: Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Support**: Professional support options available
- **Training**: Webinars and training sessions regularly scheduled

---

**Congratulations! 🎉** You've completed the essential first steps. Your OpenFrame instance is now configured with the basics needed to start managing your IT infrastructure effectively. Continue exploring advanced features and customizations to maximize your MSP efficiency!