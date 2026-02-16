# First Steps with OpenFrame

Now that OpenFrame is running, let's configure the essential settings and explore the key features. This guide walks you through the **first 5 critical steps** after installation.

> **Prerequisites**: Complete the [Quick Start Guide](quick-start.md) and have OpenFrame running at https://localhost:3000

## Step 1: Complete Your Profile Setup

### Access User Profile

1. **Log into OpenFrame** at https://localhost:3000
2. **Click your profile icon** (top-right corner)
3. **Select "Settings"** from the dropdown
4. **Navigate to the "Profile" tab**

### Configure Profile Information

**Essential Profile Settings:**
- **Full Name**: Your display name in the system
- **Email**: Primary contact email (used for notifications)
- **Role**: Should be "Owner" for the first account
- **Timezone**: Configure for accurate log timestamps
- **Preferred Language**: Default is English

### Enable Two-Factor Authentication (Recommended)

1. **Navigate to Security section**
2. **Click "Enable 2FA"**
3. **Scan QR code** with your authenticator app
4. **Enter verification code** to confirm setup

## Step 2: Configure Authentication & SSO

### Set Up OAuth2 Providers

Navigate to **Settings > SSO Configuration** to enable external authentication:

#### Configure Google SSO

1. **Click "Add Provider" > Google**
2. **Enter OAuth2 credentials**:
   ```text
   Client ID: your-google-client-id
   Client Secret: your-google-client-secret
   Redirect URI: https://localhost:3000/auth/callback/google
   ```
3. **Set allowed domains** (optional):
   ```text
   yourdomain.com
   partnerdomain.com
   ```
4. **Enable provider** and **Save configuration**

#### Configure Microsoft Azure AD

1. **Click "Add Provider" > Microsoft**
2. **Enter Azure AD credentials**:
   ```text
   Application ID: your-azure-app-id
   Client Secret: your-azure-client-secret  
   Tenant ID: your-azure-tenant-id
   ```
3. **Configure scopes**: `openid profile email`
4. **Enable provider** and **Save configuration**

### Test SSO Configuration

1. **Open new incognito window**
2. **Navigate to** https://localhost:3000
3. **Click "Sign in with Google"** or **"Sign in with Microsoft"**
4. **Complete OAuth flow** and verify login works

## Step 3: Create Your First Client Organization

### Add Client Organization

Organizations represent your MSP clients. Let's create your first one:

1. **Navigate to "Organizations"** in the main menu
2. **Click "New Organization"**
3. **Fill out organization details**:

```text
Organization Information:
- Name: Acme Corporation
- Website: https://acme.com
- Industry: Technology

Contact Information:
- Primary Contact: John Smith
- Email: jsmith@acme.com
- Phone: +1 (555) 123-4567

Address:
- Street: 123 Business Ave
- City: San Francisco
- State: CA
- Zip Code: 94105
- Country: United States
```

4. **Click "Create Organization"**

### Organize Client Structure

**Best Practices for Organization Setup:**

- **Use consistent naming**: "ClientName - Environment" (e.g., "Acme Corp - Production")
- **Set up parent/child relationships** for multi-location clients
- **Configure contact hierarchies** (Primary, IT, Billing contacts)
- **Add relevant tags** for easier filtering

## Step 4: Set Up AI Configuration

### Configure Mingo AI Assistant

Navigate to **Settings > AI Settings** and configure your AI preferences:

#### Anthropic Claude Setup (Recommended)

1. **Select "Anthropic" as AI Provider**
2. **Enter API credentials**:
   ```text
   API Key: sk-ant-your-anthropic-api-key
   Model: claude-3-sonnet-20240229
   Max Tokens: 4000
   Temperature: 0.3
   ```
3. **Configure AI Policies**:
   - **Auto-approve routine tasks**: Password resets, disk cleanup
   - **Require approval for**: User account changes, system modifications
   - **Block sensitive operations**: Financial data access, security changes

#### Configure AI Assistant Preferences

**Mingo AI Behavior:**
- **Response Style**: Professional and concise
- **Proactive Suggestions**: Enable for routine maintenance
- **Learning Mode**: Allow AI to learn from your patterns
- **Escalation Thresholds**: When to involve human technicians

**Client-Facing Fae AI:**
- **Tone**: Friendly and helpful
- **Scope**: Limit to password resets and basic troubleshooting
- **Handoff Rules**: When to transfer to human support

### Test AI Functionality

1. **Open Mingo Chat** (chat icon in top navigation)
2. **Test basic query**:
   ```text
   "Show me the status of all devices"
   ```
3. **Verify AI responds** with device information or helpful suggestions

## Step 5: Connect Your First Integration

### Choose Your Primary Tool Integration

OpenFrame supports multiple MSP tools. Pick one to start with:

#### Option A: Fleet MDM Integration

If you use Fleet for device management:

1. **Navigate to Settings > Architecture**
2. **Click "Configure Fleet MDM"**
3. **Enter Fleet server details**:
   ```text
   Fleet Server URL: https://your-fleet-server.com
   API Token: your-fleet-api-token
   ```
4. **Test Connection** and **Save**

#### Option B: Tactical RMM Integration  

If you use Tactical RMM:

1. **Navigate to Settings > Architecture**
2. **Click "Configure Tactical RMM"**
3. **Enter server details**:
   ```text
   Server URL: https://your-tacticalrmm.com
   API Key: your-tactical-api-key
   ```
4. **Test Connection** and **Save**

#### Option C: MeshCentral Integration

For remote access capabilities:

1. **Navigate to Settings > Architecture**
2. **Click "Configure MeshCentral"**
3. **Enter connection details**:
   ```text
   MeshCentral URL: https://your-meshcentral.com
   Username: admin-username  
   Password: admin-password
   ```
4. **Test Connection** and **Save**

### Verify Integration

After connecting your first tool:

1. **Navigate to "Devices"** in the main menu
2. **Wait 2-3 minutes** for initial sync
3. **Verify devices appear** from your integrated tool
4. **Check device details** by clicking on a device
5. **Test remote actions** (restart, run script, etc.)

## Essential Next Steps

### Immediate Configuration

**Set Up Monitoring:**
- Configure alert thresholds
- Set up notification channels (email, Slack)
- Create custom monitoring policies

**User Management:**
- Invite team members via **Settings > Company and Users**
- Assign appropriate roles (Technician, Manager, Admin)
- Configure user permissions and access levels

**Security Configuration:**
- Review and update **API key settings**
- Configure **session timeout policies**
- Set up **audit logging preferences**

### Explore Key Features

#### Device Management
```mermaid
graph LR
    A[Device Discovery] --> B[Device Grouping]
    B --> C[Policy Assignment]
    C --> D[Monitoring Setup]
    D --> E[Automation Rules]
```

1. **Browse to "Devices"** and explore device views
2. **Try filtering by organization** or device type
3. **Click on a device** to see detailed information
4. **Test remote desktop** (if MeshCentral is configured)

#### Ticket Management
1. **Navigate to "Tickets"** to see AI-generated insights
2. **Review Mingo's incident triage** recommendations  
3. **Create a test ticket** to understand workflow
4. **Configure auto-assignment rules**

#### Analytics Dashboard
1. **Visit the main Dashboard**
2. **Review key metrics**: Device health, Alert summary, Ticket trends
3. **Customize dashboard widgets** based on your priorities
4. **Set up custom reports** for client meetings

### Configure Automation

**Set up basic automation rules:**

```text
Rule 1: Low Disk Space Alert
- Trigger: Disk usage > 85%
- Action: Run disk cleanup script
- Notify: Assign to technician if cleanup fails

Rule 2: Password Reset Request  
- Trigger: Client submits password reset
- Action: Fae AI handles automatically
- Notify: Log completion in ticket system

Rule 3: Device Offline Alert
- Trigger: Device offline > 30 minutes
- Action: Mingo AI investigates cause
- Notify: Create ticket if hardware issue detected
```

## Verification Checklist

Before considering your OpenFrame setup complete:

- [ ] **Profile configured** with proper contact information
- [ ] **SSO working** for at least one provider (Google/Microsoft)
- [ ] **First organization created** with complete contact details
- [ ] **AI assistant responding** to basic queries in chat
- [ ] **Tool integration connected** (Fleet, Tactical RMM, or MeshCentral)
- [ ] **Devices visible** in the Devices section
- [ ] **Test remote action completed** (ping, restart, etc.)
- [ ] **Basic automation rule configured**
- [ ] **Team member invited** (if working with others)

## Common Configuration Issues

### AI Not Responding
```bash
# Check AI configuration in Settings > AI Settings
# Verify API key is valid
# Check browser console for error messages
```

### Tool Integration Failing
```bash
# Verify network connectivity to tool server
curl -k https://your-fleet-server.com/api/v1/ping

# Check API credentials are correct
# Verify firewall rules allow outbound connections
```

### Devices Not Syncing
- Wait 5-10 minutes for initial sync
- Check tool integration status in Settings > Architecture
- Verify the integrated tool has devices to sync

## Getting Help

### Common Questions
- **"How do I add more devices?"** - Devices sync automatically from integrated tools
- **"Can I customize the dashboard?"** - Yes, click the gear icon on any widget
- **"How do I reset AI configuration?"** - Go to Settings > AI Settings > Reset to Defaults

### Support Channels
- **OpenMSP Slack Community**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Documentation**: Browse other guides in this documentation
- **Video Tutorials**: Check our YouTube channel for walkthroughs

## What's Next?

Now that you have OpenFrame configured, explore these advanced topics:

- **[Development Environment](../development/setup/environment.md)** - Customize and extend OpenFrame
- **[Architecture Overview](../development/architecture/README.md)** - Understand the technical architecture  
- **[Security Best Practices](../development/security/README.md)** - Secure your installation
- **[Contributing Guidelines](../development/contributing/guidelines.md)** - Contribute back to the project

---

**🚀 Congratulations!** OpenFrame is now configured and ready for daily MSP operations. Start exploring the platform and leverage AI automation to streamline your workflow.