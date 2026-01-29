# First Steps with OpenFrame

Congratulations on getting OpenFrame running! This guide covers the essential first steps to configure your platform and start managing your MSP operations effectively.

## 1. Complete Initial Setup

### Organization Configuration

Your organization is the foundation of your OpenFrame deployment. Configure it properly:

#### Update Organization Details
1. Navigate to **Settings** → **Company & Users**
2. Click **Edit** next to your organization name
3. Complete these essential fields:

```text
Organization Name: Your MSP Company Name
Contact Person:    Primary Admin Name  
Email:            admin@yourmsp.com
Phone:            +1-555-0123
Address:          Complete business address
Website:          https://yourmsp.com
```

#### Configure Organization Settings
```bash
# Set timezone for accurate logging
Settings → General → Timezone: America/New_York

# Configure business hours  
Settings → General → Business Hours: 9:00 AM - 5:00 PM EST

# Set up notification preferences
Settings → Notifications → Email alerts: Enabled
Settings → Notifications → Slack integration: Configure webhook
```

### User Management

Add team members to your OpenFrame instance:

#### Invite Users
1. Go to **Settings** → **Company & Users**  
2. Click **Add Users**
3. Enter email addresses (one per line):

```text
technician1@yourmsp.com
technician2@yourmsp.com
manager@yourmsp.com
```

4. Select appropriate roles:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | Full platform access | MSP owner/administrator |
| **Admin** | Organization management | Senior technicians/managers |
| **Technician** | Device management, tickets | Day-to-day operations |
| **Viewer** | Read-only access | Reporting, clients |

#### Configure Authentication
Enable appropriate authentication methods:

```bash
# Email/Password (always enabled)
Settings → Authentication → Password Policy:
- Minimum 8 characters
- Require uppercase, lowercase, number
- Require special character

# Single Sign-On (recommended)  
Settings → SSO Configuration → 
- Provider: Google/Microsoft/Authentik
- Domain: yourmsp.com
- Auto-assign role: Technician
```

## 2. Install and Configure Your First Client Agent

### Generate Agent Registration Secret

1. Navigate to **Devices** → **Add Device**
2. Select your organization
3. Copy the registration command:

```bash
# Example registration command
curl -O https://releases.openframe.ai/latest/openframe-client-installer.sh
chmod +x openframe-client-installer.sh
sudo ./openframe-client-installer.sh --registration-secret="abcd1234-ef56-7890-abcd-1234567890ab"
```

### Install Client Agent

Choose installation method based on your environment:

#### Windows (PowerShell as Administrator)
```powershell
# Download and install
$url = "https://releases.openframe.ai/latest/openframe-client-windows.msi"
$output = "openframe-client.msi"
Invoke-WebRequest -Uri $url -OutFile $output
Start-Process msiexec.exe -Wait -ArgumentList "/i $output REGISTRATION_SECRET=your-secret-here /quiet"
```

#### Linux/macOS
```bash
# Download installer
curl -O https://releases.openframe.ai/latest/openframe-client-installer.sh
chmod +x openframe-client-installer.sh

# Install with registration secret
sudo ./openframe-client-installer.sh \
  --registration-secret="your-secret-here" \
  --server-url="https://your-openframe-instance.com"
```

#### Verify Installation
```bash
# Check service status
sudo systemctl status openframe-client    # Linux
sc query "OpenFrame Client"               # Windows

# Check logs
sudo journalctl -u openframe-client        # Linux  
Get-EventLog -LogName Application -Source "OpenFrame Client" # Windows
```

### Device Registration Verification

After agent installation, verify device registration:

1. Navigate to **Devices** in OpenFrame dashboard
2. You should see your newly registered device
3. Check device details:

```text
✓ Device appears in device list
✓ Status shows as "Online" 
✓ Basic system information is populated
✓ Last seen timestamp is recent (< 5 minutes)
```

## 3. Explore Key Features

### Dashboard Overview

Familiarize yourself with the main dashboard:

#### Key Metrics Cards
```text
Total Devices:     Shows count of all registered devices
Online Devices:    Currently connected and reporting
Alerts:           Active security and health alerts  
Recent Activity:   Latest device events and changes
```

#### Navigation Structure
```text
🏠 Dashboard         - Overview and metrics
🖥️  Devices         - Device management and monitoring  
🏢 Organizations    - Client organization management
📋 Tickets          - AI chat and support requests
📊 Logs             - System and audit logs
⚙️  Settings        - Platform configuration
```

### Device Management

Explore device management capabilities:

#### Device List View
1. Go to **Devices**
2. Explore the device table columns:

```text
Device Name       - Hostname/computer name
Status           - Online/Offline/Maintenance
OS              - Operating system and version  
IP Address      - Current network address
Organization    - Assigned client organization
Last Seen       - Last communication timestamp
```

#### Device Details View
Click on a device to see detailed information:

```text
📊 Overview Tab:     System specs, hardware info
🔐 Security Tab:     Security status, vulnerabilities  
📦 Software Tab:     Installed applications
👥 Users Tab:        Local user accounts
🌐 Network Tab:      Network configuration
📋 Logs Tab:         Device-specific event logs
```

### Organization Management

Set up your client organizations:

#### Create Client Organizations
1. Navigate to **Organizations**
2. Click **Create Organization** 
3. Fill in client details:

```text
Organization Name: Acme Corporation
Contact Person:    IT Manager Name
Email:            it@acme.com  
Phone:            +1-555-0199
Business Address:  Complete address
Industry:         Manufacturing
Employee Count:    50-100
```

#### Assign Devices to Organizations
```bash
# From device details page:
1. Select device → Edit
2. Change "Organization" dropdown  
3. Select target client organization
4. Save changes

# Device will now appear under client's organization
```

## 4. Configure External Tool Integrations

### TacticalRMM Integration

If you have existing TacticalRMM infrastructure:

```bash
# Navigate to Settings → Integrations → TacticalRMM
Server URL: https://rmm.yourmsp.com
API Key: your-tactical-rmm-api-key
Username: openframe-integration

# Test connection
Click "Test Connection" button
Expected: "✓ Connection successful"
```

### FleetMDM Integration

For macOS device management:

```bash
# Settings → Integrations → FleetMDM  
Server URL: https://fleet.yourmsp.com
API Token: your-fleet-api-token

# Configure sync settings
Sync Interval: 15 minutes
Auto-enroll new devices: Enabled
```

### MeshCentral Integration

For remote access capabilities:

```bash
# Settings → Integrations → MeshCentral
Server URL: https://mesh.yourmsp.com  
Username: openframe
Password: secure-password
Domain: yourmsp.com

# Enable remote access features
File Manager: Enabled
Remote Desktop: Enabled  
Terminal Access: Enabled
```

## 5. Set Up Monitoring and Alerts

### Basic Alerting Rules

Configure essential alerts for MSP operations:

```bash
# Navigate to Settings → Alerts
Create these basic alert rules:

1. Device Offline Alert
   - Condition: Device offline > 15 minutes
   - Notify: Email + Slack
   - Business hours only: Yes

2. Disk Space Alert  
   - Condition: Disk usage > 90%
   - Notify: Email immediately
   - Business hours only: No

3. Failed Login Alert
   - Condition: 5+ failed logins in 10 minutes  
   - Notify: Email + SMS
   - Business hours only: No

4. Service Down Alert
   - Condition: Critical service stopped
   - Notify: Email + Slack immediately
   - Business hours only: No
```

### Notification Channels

Set up notification delivery methods:

#### Email Notifications
```bash
# Settings → Notifications → Email
SMTP Server: smtp.gmail.com
Port: 587
Username: notifications@yourmsp.com  
Password: app-specific-password
From Address: OpenFrame Alerts <alerts@yourmsp.com>
```

#### Slack Integration
```bash
# Settings → Notifications → Slack
Webhook URL: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
Channel: #it-alerts
Username: OpenFrame Bot
Icon: 🤖
```

## 6. Test Core Workflows

### Device Monitoring Workflow

Test the complete device monitoring workflow:

```bash
# 1. Generate test alert (if agent supports it)
# On test device, fill disk to 95% capacity
dd if=/dev/zero of=/tmp/testfile bs=1M count=1000

# 2. Verify alert generation
# Check Devices → [Your Device] → Alerts tab
# Should show disk space alert within 5 minutes

# 3. Verify notifications
# Check email and Slack for alert notifications

# 4. Acknowledge alert
# Click alert → "Acknowledge" → Add note
# Verify alert status changes to "Acknowledged"

# 5. Resolve issue
# Remove test file: rm /tmp/testfile
# Verify alert auto-resolves within monitoring cycle
```

### User Access Workflow

Test user management and permissions:

```bash
# 1. Invite a test user
Settings → Company & Users → Add Users
Email: test@yourmsp.com
Role: Technician

# 2. Test user registration
# Check email for invitation link
# Complete registration process
# Verify user appears in user list

# 3. Test permissions
# Login as test user
# Verify can access Devices but not Settings
# Test device management functions

# 4. Test role changes
# As admin, change user role to Admin
# Verify user gains access to additional features
```

## Common First-Day Tasks Checklist

Use this checklist to ensure proper initial setup:

### Platform Configuration
- [ ] Organization details completed
- [ ] Business hours and timezone configured  
- [ ] Initial users invited and roles assigned
- [ ] Authentication methods configured (SSO recommended)
- [ ] Basic alert rules created
- [ ] Notification channels tested

### Device Management
- [ ] First device agent installed and registered
- [ ] Device appears in dashboard and is online
- [ ] Device details populated correctly
- [ ] Test alerts generate and resolve properly
- [ ] Device assigned to correct organization

### External Integrations (if applicable)
- [ ] TacticalRMM connection tested
- [ ] FleetMDM sync working
- [ ] MeshCentral remote access functional
- [ ] Authentik SSO integration active

### User Access
- [ ] Team members can login successfully
- [ ] Permissions working as expected
- [ ] Password policies enforced
- [ ] Multi-factor authentication enabled (recommended)

## Where to Get Help

As you start using OpenFrame, resources for assistance:

### Documentation
- [Architecture Overview](../development/architecture/overview.md) - Technical deep-dive
- [API Documentation](../development/testing/overview.md) - Integration guides  
- [Troubleshooting](../development/contributing/guidelines.md) - Common issues

### Community Support
- **OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Community Forums**: https://www.openmsp.ai/
- **Training Resources**: Available in Slack #training channel

### Best Practices
- Start with a small pilot group of devices
- Test all integrations in development first  
- Document your specific configuration choices
- Establish backup and disaster recovery procedures
- Plan for user training and adoption

## Next Steps

With your foundation in place, explore advanced features:

1. **AI Chat Integration** - Set up Mingo AI for technical support
2. **Advanced Monitoring** - Configure custom metrics and dashboards  
3. **Automation Workflows** - Create automated response procedures
4. **Client Portal** - Enable Fae AI for client self-service
5. **Reporting** - Set up executive and operational reports

Continue with our [Development Setup](../development/setup/environment.md) guide if you plan to customize or extend OpenFrame.