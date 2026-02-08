# First Steps with OpenFrame

Welcome to OpenFrame! This guide walks you through the first 5 essential things to do after installation to get the most out of your MSP automation platform.

## Overview

After completing the quick start installation, you're ready to explore OpenFrame's key features. This guide covers:

1. **Setting up your first organization**
2. **Configuring user management and permissions**
3. **Integrating your existing MSP tools**
4. **Adding and managing devices**
5. **Using Mingo AI for automation**

Let's dive in!

---

## Step 1: Set Up Your First Organization

Organizations in OpenFrame represent your clients or business units. Each organization has its own devices, users, and configurations.

### Create a New Organization

1. **Navigate to Organizations**
   - Click **Organizations** in the left sidebar
   - Click the **+ Add Organization** button

2. **Fill in Organization Details**

   | Field | Example | Purpose |
   |-------|---------|---------|
   | **Name** | "Acme Corporation" | Display name |
   | **Domain** | "acme.com" | Email domain for user validation |
   | **Contact Person** | "John Smith" | Primary contact |
   | **Email** | "john@acme.com" | Contact email |
   | **Phone** | "+1-555-0123" | Contact phone |

3. **Set Organization Address**
   ```text
   Street: 123 Business Ave
   City: San Francisco
   State: CA
   ZIP: 94105
   Country: United States
   ```

4. **Save and Activate**
   - Click **Create Organization**
   - The organization is now active and ready for device enrollment

### Organization Best Practices

- **Use descriptive names** that match your client's business name
- **Configure domains** to enable automatic user assignment
- **Set accurate contact information** for billing and support
- **Create separate organizations** for different clients or business units

---

## Step 2: Configure User Management

OpenFrame supports role-based access control to secure your platform and provide appropriate access levels.

### User Roles Overview

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Super Admin** | Full platform access | MSP owners, platform administrators |
| **Organization Admin** | Full organization access | Client IT managers |
| **Technician** | Device management, scripts | Day-to-day operations |
| **Read Only** | View-only access | Managers, reporting users |

### Add Your First Technician

1. **Navigate to Settings → Users**
   - Click **Settings** in the left sidebar
   - Select the **Users & Permissions** tab

2. **Send Invitation**
   - Click **+ Invite User**
   - Enter email address: `tech@yourmsp.com`
   - Select role: **Technician**
   - Choose organization(s) to grant access to
   - Click **Send Invitation**

3. **User Activation**
   - The user receives an email invitation
   - They click the link and set their password
   - They can now access assigned organizations

### Setting Up SSO (Optional but Recommended)

For enterprise environments, configure Single Sign-On:

1. **Navigate to Settings → SSO Configuration**
2. **Choose Provider Type**
   - Google Workspace
   - Microsoft 365
   - Generic OIDC
   - SAML 2.0

3. **Configure Provider Settings**
   ```text
   Provider: Google Workspace
   Client ID: your-google-client-id
   Client Secret: your-google-client-secret
   Domain: yourmsp.com
   ```

4. **Test and Enable**
   - Click **Test Connection**
   - If successful, click **Enable SSO**
   - Users can now login with their corporate accounts

---

## Step 3: Integrate Your MSP Tools

OpenFrame's power comes from unifying your existing tools. Let's configure your first integration.

### Tactical RMM Integration

If you have Tactical RMM deployed:

1. **Navigate to Settings → Integrations**
2. **Configure Tactical RMM**
   - **Server URL**: `https://your-tactical-rmm.com`
   - **API Key**: Generate from Tactical RMM Settings → API Keys
   - **Organization Mapping**: Map Tactical clients to OpenFrame organizations

3. **Test Connection**
   ```bash
   # Example API test (shown for reference)
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://your-tactical-rmm.com/agents/
   ```

4. **Sync Devices**
   - Click **Sync Now** to import existing agents
   - Devices appear in the OpenFrame dashboard within minutes

### MeshCentral Integration

For remote desktop and file management:

1. **Configure MeshCentral Connection**
   - **Server URL**: `https://your-meshcentral.com`
   - **Username**: Your MeshCentral admin username
   - **Password**: Your MeshCentral admin password

2. **Enable Remote Features**
   - ✅ Remote Desktop
   - ✅ File Manager  
   - ✅ Terminal Access
   - ⚠️ Require approval for remote sessions

3. **Test Remote Access**
   - Navigate to a device in OpenFrame
   - Click **Remote Desktop** 
   - You should see the device's desktop in your browser

### Fleet MDM Integration

For device lifecycle management:

1. **Configure Fleet Connection**
   - **Server URL**: `https://your-fleet.com`
   - **API Token**: Generate from Fleet Settings → API
   - **Sync Interval**: Every 15 minutes

2. **Map Device Attributes**
   - Hostname → Device Name
   - UUID → Device ID
   - Platform → OS Type
   - Last Seen → Last Contact

---

## Step 4: Add and Manage Devices

Now let's get devices into OpenFrame for management.

### Install OpenFrame Agent

The OpenFrame agent provides system monitoring and remote access capabilities.

#### Generate Registration Token

1. **Navigate to Devices → Add Device**
2. **Select Organization** (e.g., "Acme Corporation")
3. **Generate Token**
   - Token expires in 24 hours
   - Copy the token for installation

#### Install on Windows

```powershell
# Download and install agent (PowerShell as Administrator)
Invoke-WebRequest -Uri "https://your-openframe.com/agent/windows/openframe-agent.msi" -OutFile "openframe-agent.msi"
msiexec /i openframe-agent.msi /quiet TOKEN="YOUR_REGISTRATION_TOKEN"
```

#### Install on Linux

```bash
# Download and install agent
curl -fsSL https://your-openframe.com/agent/linux/install.sh | sudo bash -s -- --token="YOUR_REGISTRATION_TOKEN"
```

#### Install on macOS

```bash
# Download agent package
curl -fsSL https://your-openframe.com/agent/macos/openframe-agent.pkg -o openframe-agent.pkg

# Install with token
sudo installer -pkg openframe-agent.pkg -target / -applyChoiceChangesXML <(echo '<?xml version="1.0"?><installer-gui-script><options><option name="REGISTRATION_TOKEN" value="YOUR_REGISTRATION_TOKEN"/></options></installer-gui-script>')
```

### Verify Device Registration

1. **Check Device List**
   - Navigate to **Devices**
   - New device should appear within 2 minutes
   - Status should show "Online" with green indicator

2. **View Device Details**
   - Click on the device name
   - Verify system information is populated:
     - OS version and patch level
     - Installed software
     - Hardware specifications
     - Network configuration

---

## Step 5: Using Mingo AI Assistant

Mingo is OpenFrame's AI assistant for automating routine tasks and providing intelligent recommendations.

### Access Mingo

1. **Open Chat Interface**
   - Click the **chat bubble icon** in the top-right
   - Or navigate to **Mingo** in the sidebar

2. **Start with Basic Queries**
   
   Try these example queries to get started:

   ```text
   "Show me all Windows devices that need security updates"
   "Which devices haven't checked in today?"
   "List all devices in Acme Corporation"
   "What's the disk space usage on server-01?"
   ```

### Common Mingo Commands

#### Device Management
```text
"Restart all devices in the Finance organization"
"Check disk space on all Windows servers"  
"Install Windows updates on computer-lab-*"
"Show me devices with less than 10% disk space"
```

#### Monitoring and Alerts
```text
"Create an alert for devices that go offline"
"Show me all failed backup jobs this week"
"Which devices have critical security vulnerabilities?"
"Generate a report of patch compliance"
```

#### Script Automation
```text
"Run disk cleanup script on all Windows devices"
"Deploy Chrome browser to all workstations"  
"Check antivirus status across all devices"
"Execute PowerShell inventory script on servers"
```

### Configure AI Policies

For security and compliance, configure what Mingo can and cannot do:

1. **Navigate to Settings → AI Policies**

2. **Set Approval Requirements**
   ```yaml
   Automatic Approval:
   - View device information
   - Generate reports
   - Check system status
   
   Requires Approval:
   - Restart devices
   - Install software
   - Modify system settings
   - Access sensitive data
   ```

3. **Configure Restrictions**
   - Prevent access to production servers during business hours
   - Require two-person approval for critical operations
   - Log all AI-initiated actions for audit

### Mingo Best Practices

- **Start with read-only queries** to build confidence
- **Use specific device or organization names** for targeted actions
- **Review approval requests** before confirming destructive operations
- **Create custom scripts** for frequently-used automation tasks

---

## Next Steps

Congratulations! You've completed the essential first steps with OpenFrame. You now have:

- ✅ Organizations configured for your clients
- ✅ User management and permissions set up  
- ✅ MSP tools integrated and syncing
- ✅ Devices enrolled and monitored
- ✅ Mingo AI assistant configured and tested

### Recommended Learning Path

1. **Explore Advanced Features**
   - Script management and automation
   - Patch management workflows  
   - Compliance reporting
   - Custom dashboard creation

2. **Optimize Your Workflows**
   - Create organization-specific automation rules
   - Set up monitoring alerts and notifications
   - Configure backup and disaster recovery policies

3. **Scale Your Deployment**
   - Add more organizations and users
   - Integrate additional MSP tools
   - Configure high availability and redundancy

### Additional Resources

- **[Development Documentation](../development/)**: Learn about OpenFrame's architecture
- **[API Documentation](../reference/)**: Integrate with external systems  
- **[OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Connect with other OpenFrame users

## Getting Help

Need assistance with any of these steps?

- **Community Support**: Join the OpenMSP Slack for real-time help
- **Documentation**: Search this documentation for detailed guides
- **GitHub Issues**: Report bugs or request features

Welcome to the future of MSP automation with OpenFrame!

---

> **Pro Tip**: Bookmark frequently-used Mingo commands in your browser for quick access to common automation tasks.