# First Steps with OpenFrame

After completing the quick start installation, this guide walks you through the essential first steps to get familiar with OpenFrame's core functionality.

## Initial System Access

### 1. Access the Web Dashboard

Navigate to your OpenFrame installation:

```text
http://localhost:8080
```

If this is your first time accessing the system, you'll see the authentication page.

### 2. Create Your First Account

1. Click **"Sign Up"** to create a new tenant account
2. Fill in the registration form:
   - **Email**: Your administrative email address
   - **Password**: Strong password (minimum 8 characters)
   - **Organization Name**: Your company or organization name
   - **Domain**: Your organization's domain (e.g., `company.com`)
3. Click **"Create Account"**
4. Check your email for verification (if email is configured)

### 3. Complete Initial Login

1. Click **"Login"** on the main page
2. Enter your email and password
3. You'll be redirected to the main dashboard

## Essential Configuration

### 1. Organization Setup

Your first task is to complete your organization profile:

1. Navigate to **Settings** → **Company & Users**
2. Complete the organization details:
   - **Contact Information**: Primary contact details
   - **Address**: Physical business address (optional)
   - **Business Details**: Industry, size, description
3. Click **"Save Organization"**

### 2. Create Additional Users

Add team members to your organization:

1. Go to **Settings** → **Company & Users** → **Users** tab
2. Click **"Invite User"**
3. Fill in the invitation form:
   - **Email**: Team member's email address
   - **Role**: Choose appropriate role (Admin, User, Viewer)
   - **Organizations**: Select accessible organizations
4. Click **"Send Invitation"**

The user will receive an email invitation to join your OpenFrame tenant.

### 3. Configure Authentication (Optional)

Set up Single Sign-On for your organization:

1. Navigate to **Settings** → **SSO Configuration**
2. Choose your identity provider:
   - **Google Workspace**: For Google-based organizations  
   - **Microsoft 365**: For Office 365 organizations
   - **Custom OIDC**: For other identity providers
3. Follow the configuration wizard
4. Test the SSO connection
5. Enable for your organization

## Device Management Setup

### 1. Install the OpenFrame Client Agent

Install the client agent on devices you want to manage:

#### Windows
```powershell
# Download installer
Invoke-WebRequest -Uri "https://releases.openframe.ai/latest/openframe-client-windows.msi" -OutFile "openframe-client.msi"
# Install
Start-Process msiexec.exe -ArgumentList "/i", "openframe-client.msi", "/quiet" -Wait
```

#### macOS
```bash
# Download and mount
curl -L "https://releases.openframe.ai/latest/openframe-client-macos.dmg" -o openframe-client.dmg
# Follow installation prompts
```

#### Linux
```bash
# Ubuntu/Debian
wget https://releases.openframe.ai/latest/openframe-client-linux.deb
sudo dpkg -i openframe-client-linux.deb

# RHEL/CentOS
wget https://releases.openframe.ai/latest/openframe-client-linux.rpm
sudo rpm -i openframe-client-linux.rpm
```

### 2. Generate Registration Secret

Create a registration secret for device enrollment:

1. Go to **Devices** → **Add Device**
2. Click **"Generate Registration Secret"**
3. Copy the registration secret (starts with `ars_`)
4. Set expiration time (default: 30 days)
5. Click **"Create Secret"**

### 3. Register Your First Device

Using the OpenFrame client agent:

1. **Open terminal** on the target device
2. **Run registration command**:
   ```bash
   openframe-client register --secret ars_your_secret_here --server https://localhost:8080
   ```
3. **Verify registration**: The device should appear in **Devices** within 60 seconds

## Explore Key Features

### 1. Device Dashboard

Navigate to **Devices** to see your enrolled devices:

- **Device List**: View all managed devices with status indicators
- **Device Details**: Click a device to see detailed information
- **Health Status**: Monitor device health and connectivity
- **Remote Access**: Access remote desktop and file management

### 2. Organization Management  

Explore **Organizations** to manage business entities:

- **View Organizations**: See all organizations you have access to
- **Create Organization**: Add new client organizations
- **Organization Details**: Manage contact info and settings
- **Device Assignment**: Associate devices with organizations

### 3. Activity Logs

Check **Logs** for system activity and events:

- **Event Stream**: Real-time view of system events
- **Search & Filter**: Find specific events by date, type, or device
- **Event Details**: Deep-dive into specific occurrences
- **Audit Trail**: Track user actions and system changes

### 4. AI Assistant (Mingo)

Try the AI assistant for automated support:

1. Click the **Mingo** button in the navigation
2. Ask questions like:
   - "Show me offline devices"
   - "What events happened today?"
   - "Generate a device health report"
3. Observe how Mingo provides intelligent responses and actions

## Integration Configuration

### 1. Tool Integrations

Connect external MSP tools:

1. Navigate to **Settings** → **Integrations**
2. Choose from available integrations:
   - **TacticalRMM**: Windows/Linux endpoint management
   - **FleetDM**: Cross-platform device management
   - **MeshCentral**: Remote access and management
3. Follow the connection wizard for each tool
4. Test connectivity and data synchronization

### 2. API Keys

Create API keys for external integrations:

1. Go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Configure key settings:
   - **Name**: Descriptive name for the key
   - **Scope**: Access permissions (read, write, admin)
   - **Expiration**: Key lifetime (optional)
4. Copy the generated key (shown only once)
5. Use in external applications or scripts

## Basic Operations

### 1. Device Control

Try basic device management operations:

1. Select a device from the **Devices** list
2. Explore available actions:
   - **Remote Desktop**: Open remote desktop session
   - **File Manager**: Browse device file system  
   - **Shell Access**: Open terminal/command prompt
   - **System Info**: View hardware and software details
   - **Update Status**: Force device status refresh

### 2. Event Monitoring

Monitor system activity:

1. Go to **Logs** or **Events**
2. Use filters to narrow down events:
   - **Date Range**: Select time period
   - **Event Type**: Filter by event category
   - **Device**: Show events from specific devices
   - **Organization**: Filter by organization
3. Click events for detailed information

### 3. User Management

Manage user access and permissions:

1. Navigate to **Settings** → **Company & Users**
2. Manage user accounts:
   - **Edit Users**: Update roles and permissions
   - **Deactivate Users**: Temporarily disable access
   - **Resend Invitations**: Re-send invitation emails
   - **View Activity**: Track user actions

## Testing and Validation

### 1. Verify Core Functionality

Confirm everything is working properly:

```bash
# Check service health
curl http://localhost:8080/actuator/health

# Test API connectivity
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/devices

# Verify agent connectivity
openframe-client status
```

### 2. Test Device Communication

Ensure devices can communicate with the platform:

1. **Check device status** in the dashboard (should show "Online")
2. **Run remote command** to test connectivity
3. **View recent events** to confirm data flow
4. **Test remote access** functionality

### 3. Validate User Access

Test multi-user functionality:

1. **Log out** of your admin account
2. **Log in** as an invited user
3. **Verify permissions** match assigned roles
4. **Test restricted actions** to confirm security

## Where to Get Help

### 1. Built-in Documentation

- **Help tooltips**: Hover over UI elements for context
- **Settings wizards**: Step-by-step configuration guides
- **Error messages**: Specific guidance when issues occur

### 2. Community Support

Join the OpenMSP community:

- **Slack Community**: https://www.openmsp.ai/
- **Direct Invite**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Channel Guidelines**: Use appropriate channels for different topics

### 3. Troubleshooting

Common first-time issues and solutions:

- **Can't access dashboard**: Check service status and port configuration
- **Device won't register**: Verify registration secret and network connectivity  
- **User invitations failing**: Check email configuration and SMTP settings
- **Integration not working**: Verify API credentials and network access

## Next Steps

Now that you've completed the first steps, consider:

1. **Advanced Configuration**: Explore detailed settings and customization options
2. **Security Hardening**: Implement production security measures
3. **Automation Setup**: Configure automated workflows and policies
4. **Monitoring**: Set up comprehensive monitoring and alerting
5. **Backup Strategy**: Implement data backup and recovery procedures

## Success Indicators

By the end of this guide, you should have:

- ✅ Successfully logged into the OpenFrame dashboard
- ✅ Created and configured your organization  
- ✅ Invited and managed additional users
- ✅ Registered at least one device
- ✅ Explored the main dashboard features
- ✅ Tested basic device management operations
- ✅ Connected to community support channels

You're now ready to start using OpenFrame for real MSP operations!

> **Remember**: OpenFrame is under active development. Features and workflows may evolve. Stay connected with the community for the latest updates and best practices.