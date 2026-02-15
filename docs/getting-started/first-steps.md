# First Steps Guide

Welcome to OpenFrame! Now that you have the platform running, this guide will walk you through the essential first steps to configure your environment and start managing your IT infrastructure.

## Overview

This guide covers the five most important things to do after installing OpenFrame:

1. **Complete Organization Setup** - Configure your MSP details  
2. **Install the OpenFrame Agent** - Connect your first device
3. **Configure External Tool Integrations** - Connect existing MSP tools
4. **Set Up Team Access** - Invite users and configure permissions
5. **Explore AI Features** - Get familiar with Mingo AI automation

Let's get started!

## Step 1: Complete Organization Setup

### Access Organization Settings

1. Log into your OpenFrame dashboard at http://localhost:3000
2. Navigate to **Settings** → **Company and Users**
3. Click **"Edit Organization"**

### Configure Organization Details

Fill in your MSP organization information:

**General Information:**
```text
Organization Name: Your MSP Company Name
Domain: yourmsp.com
Website: https://yourmsp.com
Industry: Managed Services
```

**Contact Information:**
```text  
Primary Contact: Your Name
Email: admin@yourmsp.com
Phone: +1 (555) 123-4567
Address: 123 Business St, City, State 12345
```

**Business Details:**
```text
Business Hours: 8:00 AM - 6:00 PM EST
Support Hours: 24/7 (or your actual hours)
Time Zone: America/New_York
```

### Configure Branding (Optional)

Upload your company logo and set brand colors:
- **Logo**: Upload PNG/JPG (recommended: 200x50px)
- **Primary Color**: Your brand color (hex code)
- **Secondary Color**: Accent color for UI elements

## Step 2: Install the OpenFrame Agent

The OpenFrame client agent enables device monitoring and management.

### Download the Agent

Navigate to **Devices** → **Add Device** to get the installation command for your platform:

**Windows:**
```powershell
# Download and install via PowerShell
Invoke-WebRequest -Uri "https://releases.openframe.ai/latest/openframe-client-windows.msi" -OutFile "openframe-client.msi"
msiexec /i openframe-client.msi /quiet
```

**macOS:**
```bash
# Download and install via Terminal
curl -L "https://releases.openframe.ai/latest/openframe-client-macos.pkg" -o openframe-client.pkg
sudo installer -pkg openframe-client.pkg -target /
```

**Linux:**
```bash
# Ubuntu/Debian
wget https://releases.openframe.ai/latest/openframe-client.deb
sudo dpkg -i openframe-client.deb

# RHEL/CentOS
wget https://releases.openframe.ai/latest/openframe-client.rpm
sudo rpm -i openframe-client.rpm
```

### Register Your First Device

After agent installation, the device will automatically appear in your dashboard:

1. Go to **Devices** in the navigation
2. You should see your device listed with status "Online"
3. Click on the device to view details:
   - Hardware specifications
   - Installed software
   - Network configuration
   - Security status

### Verify Agent Communication

Confirm the agent is working properly:

```bash
# Check agent status (Linux/macOS)
sudo systemctl status openframe-client

# Check agent logs
sudo journalctl -u openframe-client -f

# Windows (PowerShell as Administrator)
Get-Service "OpenFrameClient"
Get-EventLog -LogName Application -Source "OpenFrameClient" -Newest 10
```

Expected behavior:
- Device appears as "Online" in dashboard
- Heartbeat messages every 30 seconds
- Device metrics updating in real-time

## Step 3: Configure External Tool Integrations

OpenFrame integrates with your existing MSP tools. Configure these connections to centralize your operations.

### Tactical RMM Integration

If you're using Tactical RMM:

1. Navigate to **Settings** → **Integrations** → **Tactical RMM**
2. Enter your Tactical RMM details:
   ```text
   Server URL: https://your-tactical-rmm.com
   API Key: your-tactical-api-key
   Mesh Central URL: https://your-mesh.com (if separate)
   ```
3. Click **"Test Connection"** to verify
4. Enable **"Sync Devices"** to import existing agents

### Fleet MDM Integration

For Fleet MDM users:

1. Go to **Settings** → **Integrations** → **Fleet MDM**  
2. Configure connection:
   ```text
   Fleet URL: https://your-fleet.example.com
   API Token: your-fleet-api-token
   Organization: your-org-name
   ```
3. Test the connection and enable synchronization

### MeshCentral Integration

For remote access capabilities:

1. Navigate to **Settings** → **Integrations** → **MeshCentral**
2. Enter connection details:
   ```text
   MeshCentral URL: https://your-mesh.example.com
   Username: your-mesh-username  
   Password: your-mesh-password
   ```
3. Enable **"Remote Desktop"** and **"File Manager"** features

### Verify Integrations

After configuring integrations:

1. Check **Dashboard** → **Tool Status** for connection health
2. Verify device data is syncing from external tools
3. Test remote access functionality if configured

## Step 4: Set Up Team Access

Add team members and configure role-based access control.

### Invite Team Members

1. Navigate to **Settings** → **Company and Users**
2. Click **"Invite Users"**
3. Add team member details:

**For Technicians:**
```text
Email: tech@yourmsp.com
Role: Technician
Permissions: Device Management, Script Execution
```

**For Managers:**
```text
Email: manager@yourmsp.com  
Role: Administrator
Permissions: Full Access, User Management
```

**For Clients (Optional):**
```text
Email: client@clientcompany.com
Role: Client User
Permissions: View Only (their devices)
```

### Configure Role Permissions

Set up role-based access control:

| Role | Permissions | Description |
|------|------------|-------------|
| **Administrator** | Full Access | Complete platform access |
| **Technician** | Device Management, Scripts, Remote Access | Day-to-day operations |
| **Manager** | Reporting, User Management, Settings | Oversight and configuration |
| **Client** | View Only (scoped to organization) | Client portal access |

### Set Up SSO (Recommended)

For team efficiency, configure single sign-on:

**Google SSO:**
1. Go to **Settings** → **SSO Configuration**
2. Enable **"Google SSO"**
3. Enter your Google Workspace domain
4. Configure automatic user provisioning

**Microsoft SSO:**
1. Enable **"Microsoft SSO"** 
2. Enter your Microsoft Entra ID (Azure AD) details
3. Configure group-based role mapping

## Step 5: Explore AI Features

OpenFrame's AI capabilities can significantly improve your operational efficiency.

### Meet Mingo AI

Mingo is your AI assistant for technical operations:

1. Click the **Mingo** chat icon in the dashboard
2. Try these example commands:
   ```text
   "Show me all offline devices"
   "Generate a status report for this week"  
   "What alerts need attention?"
   "Run disk cleanup on server01"
   ```

### Configure AI Policies

Set up automated responses:

1. Navigate to **Settings** → **AI Policies**
2. Create policies for common scenarios:

**Disk Space Policy:**
```text
Trigger: Disk usage > 90%
Action: Run disk cleanup script
Notification: Alert technician if cleanup fails
```

**Device Offline Policy:**
```text
Trigger: Device offline > 5 minutes
Action: Attempt remote restart
Notification: Escalate to manager if offline > 30 minutes
```

### Enable AI-Powered Automation

Configure automated responses to common issues:

1. Go to **Automation** → **AI Workflows**
2. Enable pre-built workflows:
   - **Auto-remediation**: Fix common issues automatically
   - **Predictive alerts**: Warn before issues occur
   - **Smart ticketing**: Auto-categorize and route support requests

## Verification Checklist

After completing these first steps, verify your setup:

### ✅ Organization Configuration
- [ ] Organization details completed
- [ ] Branding applied (optional)
- [ ] Business hours configured

### ✅ Device Management  
- [ ] First device connected and online
- [ ] Agent communication verified
- [ ] Device metrics appearing in dashboard

### ✅ Tool Integrations
- [ ] External tools connected successfully
- [ ] Device synchronization working
- [ ] Remote access tested (if configured)

### ✅ Team Access
- [ ] Team members invited
- [ ] Role permissions configured
- [ ] SSO enabled (recommended)

### ✅ AI Features
- [ ] Mingo AI responding to queries
- [ ] AI policies configured
- [ ] Automation workflows enabled

## Common Initial Configuration Tasks

### Set Up Monitoring Policies

Create monitoring policies for your environment:

```text
CPU Usage Alert: > 80% for 5 minutes
Memory Usage Alert: > 90% for 2 minutes  
Disk Space Alert: < 10% free space
Service Down Alert: Critical services offline
```

### Configure Backup Monitoring

Set up backup verification:
- Monitor backup completion status
- Alert on failed backups
- Track backup storage usage

### Establish Maintenance Windows

Configure maintenance schedules:
- Define maintenance windows per device
- Suppress alerts during maintenance
- Schedule automatic updates

## Getting Help

If you need assistance with initial setup:

### Community Support
Join our **OpenMSP Slack Community**:
- 💬 [Join OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🌐 Visit [openmsp.ai](https://www.openmsp.ai/) for resources

### Documentation
- Browse the full development documentation in the `docs/development/` section
- Check the architecture guides for advanced configuration

### AI Assistant
Don't forget that Mingo AI can help with platform questions! Ask Mingo:
- "How do I configure a new integration?"
- "What's the best way to set up monitoring?"
- "Show me getting started tutorials"

---

**Congratulations!** You've successfully configured OpenFrame and are ready to start managing your IT infrastructure. The platform will grow with your needs, and the AI features will continue to learn and improve your operational efficiency.

**Next Steps**: Explore the development documentation to customize OpenFrame for your specific requirements, or dive deeper into individual features like advanced automation, custom integrations, and reporting.