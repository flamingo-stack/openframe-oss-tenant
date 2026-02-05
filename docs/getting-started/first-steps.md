# First Steps with OpenFrame

Now that OpenFrame is installed and running, this guide will walk you through the essential first steps to configure and start using the platform effectively.

[![OpenFrame v0.3.7 - Enhanced Developer Experience](https://img.youtube.com/vi/O8hbBO5Mym8/maxresdefault.jpg)](https://www.youtube.com/watch?v=O8hbBO5Mym8)

## Overview of First 5 Steps

After completing the quick start, here are the most important initial tasks:

1. **Complete Tenant Configuration** - Finalize your organizational setup
2. **Configure Authentication** - Set up SSO or user management  
3. **Add Your First Devices** - Connect systems for monitoring
4. **Explore Core Features** - Navigate the main platform areas
5. **Set Up Integration Tools** - Connect FleetDM, Tactical RMM, or others

## Step 1: Complete Tenant Configuration

### Access Your Dashboard

1. Navigate to http://localhost:3000
2. Log in with your registered credentials
3. You should see the main dashboard

### Configure Organization Details

1. Go to **Settings** → **Company and Users**
2. Update your organization information:
   ```
   Organization Name: Your MSP Name
   Contact Email: admin@yourmsp.com
   Phone: +1-555-123-4567
   Address: Complete business address
   ```
3. Set business hours and timezone
4. Save the configuration

### Set Up Your Profile

1. Click your user avatar → **Profile Settings**
2. Complete your profile:
   - Full Name
   - Job Title
   - Contact Information
   - Preferences (timezone, notifications)

## Step 2: Configure Authentication

### Basic Authentication

For getting started, the built-in authentication works fine. For production, consider SSO.

### Enable SSO (Optional but Recommended)

1. Navigate to **Settings** → **SSO Configuration**
2. Choose your provider:

#### Google SSO Setup
```bash
# Set environment variables
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Configure in UI:
- Provider: Google
- Client ID: (from Google Cloud Console)
- Client Secret: (from Google Cloud Console)
- Allowed Domains: yourdomain.com

#### Microsoft SSO Setup
```bash
# Set environment variables  
MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=your-azure-app-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
```

### Invite Team Members

1. Go to **Settings** → **Company and Users**
2. Click **Invite User**
3. Enter email addresses and select roles:
   - **Admin**: Full platform access
   - **Technician**: Device management and tickets
   - **Read-Only**: View-only access

## Step 3: Add Your First Devices

### Option A: Use OpenFrame CLI (Recommended)

Install the OpenFrame CLI from [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli):

```bash
# Install CLI
curl -fsSL https://raw.githubusercontent.com/flamingo-stack/openframe-cli/main/install.sh | bash

# Verify installation
openframe-cli --version
```

Register a device:

```bash
# Generate agent registration secret
openframe-cli agent create-secret --name "production-servers"

# Install agent on target machine
openframe-cli agent install \
  --secret "your-registration-secret" \
  --server-url "http://your-openframe-server.com:8080"
```

### Option B: Manual Agent Deployment

1. Download the OpenFrame agent for your platform
2. Install on target systems:

```bash
# Linux/macOS
sudo ./openframe-agent install --secret YOUR_SECRET

# Windows (Admin PowerShell)
.\openframe-agent.exe install --secret YOUR_SECRET
```

### Option C: Integrate Existing Tools

If you already have FleetDM or Tactical RMM:

1. Go to **Settings** → **Integrations**
2. Add your tool configurations:

#### FleetDM Integration
```
Fleet Server URL: https://your-fleet.company.com
API Token: your-fleet-api-token
Organization: Default (or specific org)
```

#### Tactical RMM Integration  
```
Tactical RMM URL: https://your-rmm.company.com
Username: admin@company.com
API Key: your-api-key
```

## Step 4: Explore Core Features

### Dashboard Overview

The main dashboard shows:
- **Device Count**: Total managed devices
- **Recent Alerts**: Critical issues requiring attention
- **Log Activity**: Recent system events
- **Organization Status**: Health metrics

### Device Management

1. Navigate to **Devices**
2. Explore the device list with:
   - Device status indicators
   - OS type and version
   - Last seen timestamps
   - Installed agents

3. Click on a device to see:
   - **Overview**: Basic system information
   - **Hardware**: CPU, memory, disk details
   - **Software**: Installed applications
   - **Logs**: Device-specific events
   - **Remote Access**: Connect via MeshCentral
   - **File Manager**: Browse files remotely

### Log Management

1. Go to **Logs**
2. Use filters to find specific events:
   - Time range
   - Severity level
   - Device type
   - Event source

3. Click on log entries for detailed information
4. Set up log alerts for critical events

### AI Assistant (Mingo)

1. Navigate to **Mingo** (AI Assistant)
2. Start a conversation about your infrastructure:
   ```
   "Show me devices with high CPU usage"
   "What security alerts do I have?"
   "Help me troubleshoot network connectivity"
   ```

3. Mingo can:
   - Answer questions about your infrastructure
   - Suggest troubleshooting steps
   - Execute approved automated tasks
   - Generate reports and summaries

## Step 5: Set Up Integration Tools

### Configure External Tools

Based on your existing setup, configure integrations:

#### For FleetDM Users
1. **Settings** → **Integrations** → **FleetDM**
2. Enter your Fleet server details
3. Test connection
4. Import existing hosts
5. Configure query sync

#### For Tactical RMM Users
1. **Settings** → **Integrations** → **Tactical RMM** 
2. Add API credentials
3. Test connectivity
4. Sync agents and clients
5. Configure script sync

#### For New Deployments
Consider deploying integrated tools:

```bash
# Deploy FleetDM
cd integrated-tools/fleetmdm
docker-compose up -d

# Deploy Tactical RMM  
cd integrated-tools/tactical-rmm
docker-compose up -d

# Deploy MeshCentral
cd integrated-tools/meshcentral  
docker-compose up -d
```

### Verify Integration Status

1. Go to **Settings** → **Architecture**
2. Check that all integrations show "Connected" status
3. Verify data is syncing correctly

## Common Initial Configuration Tasks

### Set Up Alerting

1. **Settings** → **Notifications**
2. Configure alert destinations:
   - Email notifications
   - Slack webhooks
   - Microsoft Teams
   - SMS (via third-party)

### Configure Policies

1. **Policies and Queries**
2. Set up monitoring policies:
   - CPU usage thresholds
   - Disk space alerts  
   - Security compliance checks
   - Update status monitoring

### Create Scripts

1. **Scripts** section
2. Add commonly used scripts:
   - System health checks
   - Update installations
   - Security scans
   - Maintenance tasks

## Verification Checklist

After completing first steps, verify:

- [ ] Organization details are complete
- [ ] Authentication is configured (SSO if desired)  
- [ ] At least one device is connected and reporting
- [ ] Dashboard shows current data
- [ ] Logs are being received
- [ ] Mingo AI is responsive
- [ ] External integrations are connected (if applicable)
- [ ] Team members are invited and have access
- [ ] Basic alerts are configured

## Common Issues and Solutions

### Devices Not Appearing

Check agent connectivity:

```bash
# Verify agent status
systemctl status openframe-agent  # Linux
Get-Service OpenFrameAgent        # Windows
```

Check firewall settings:
```bash
# Allow OpenFrame client port
ufw allow 8083/tcp
```

### Authentication Problems

Reset user passwords or check SSO configuration in Settings.

### Integration Failures

Verify API credentials and network connectivity to external tools.

### Performance Issues

Monitor resource usage and consider increasing allocated memory for Java services.

## Next Steps

Now that you've completed the initial setup:

### For Daily Operations
- Learn keyboard shortcuts and navigation tips
- Set up custom dashboards
- Configure automated reports
- Train team members on the interface

### For Advanced Configuration  
- Set up high availability deployment
- Configure advanced security policies
- Integrate custom tools and scripts
- Set up comprehensive monitoring

### For Development
- Explore the [Development Guides](../development/setup/environment.md)
- Contribute to the open-source project
- Build custom integrations
- Extend Mingo AI capabilities

## Getting Help

As you explore OpenFrame:

- **Built-in Help**: Click the `?` icon in any section
- **Documentation**: Comprehensive guides for all features
- **Community**: Active discussions in OpenMSP Slack
- **Support**: Professional support available through Flamingo

---

**Congratulations!** You've successfully configured OpenFrame and are ready to start managing your infrastructure efficiently. The platform will continue learning about your environment and providing increasingly valuable insights through Mingo AI.