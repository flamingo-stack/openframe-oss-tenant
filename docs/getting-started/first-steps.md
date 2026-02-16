# First Steps Guide

Now that you have OpenFrame running, let's explore the key features and get you comfortable with the platform. This guide walks you through the essential first 5 things to do after installation.

> **Before You Start**: Complete the [Quick Start Guide](quick-start.md) to ensure OpenFrame is running.

## 1. 🏠 Explore the Dashboard

The dashboard is your command center for monitoring and managing your infrastructure.

### Understanding the Dashboard Layout

#### System Overview Card
- **Total Devices**: Number of managed endpoints
- **Active Agents**: Currently online devices  
- **Organizations**: Client organizations under management
- **Recent Events**: Latest system activities

#### Health Status Indicators
Look for these status indicators:

| Status | Meaning | Action |
|--------|---------|---------|
| 🟢 **Healthy** | All services operational | Continue monitoring |
| 🟡 **Warning** | Minor issues detected | Investigate warnings |
| 🔴 **Critical** | Service disruption | Immediate attention required |

#### Quick Actions Panel
Access frequently used features:
- **Add New Device**: Register additional endpoints
- **Create Organization**: Set up new client
- **Generate API Key**: Create integration credentials
- **Run System Check**: Verify platform health

### Real-time Updates

The dashboard updates automatically. Watch for:
- Live agent status changes
- New event notifications  
- System health alerts
- Performance metrics

## 2. 📱 Manage Your First Device

Device management is a core OpenFrame capability. Let's explore device features in detail.

### Navigate to Device Management

1. Click **"Devices"** in the left navigation
2. You should see any devices registered during quick start

### Device Information Panel

Select any device to view:

#### System Information Tab
```text
• Operating System: Windows 11 Pro
• CPU: Intel Core i7-12700K
• Memory: 32 GB RAM
• Storage: 1 TB SSD
• Network: 192.168.1.100
• Last Seen: 2 minutes ago
```

#### Installed Software Tab
View all installed applications and their versions.

#### Security Status Tab  
Monitor security compliance:
- Windows Updates status
- Antivirus status
- Firewall configuration
- User account security

#### Performance Metrics Tab
Real-time system performance:
- CPU usage
- Memory utilization
- Disk I/O
- Network activity

### Remote Management Actions

Try these management actions:

#### Run Remote Commands
1. Click **"Remote Shell"**
2. Execute a test command:
```bash
# Windows
systeminfo | findstr "OS Name"

# macOS/Linux  
uname -a
```

#### File Management
1. Click **"File Manager"**
2. Browse the device filesystem
3. Try uploading/downloading a test file

#### Software Management
1. Go to **"Software"** tab
2. View installed applications
3. Check for available updates

## 3. 🏢 Set Up Organizations

Organizations allow you to manage multiple clients or departments separately.

### Create Your First Client Organization

1. Navigate to **"Organizations"** → **"New Organization"**
2. Fill in the organization details:

```text
Organization Name: Acme Corporation
Contact Person: John Smith
Email: john@acme.com
Phone: +1-555-123-4567
Address: 123 Business St, City, State 12345
```

3. Click **"Create Organization"**

### Organization Features

#### Device Assignment
- Assign devices to specific organizations
- Maintain separation between clients
- Control access per organization

#### User Management
- Add organization-specific users
- Set role-based permissions
- Manage access levels

#### Billing & Usage Tracking
- Monitor resource consumption
- Track API usage
- Generate usage reports

### Multi-Tenant Benefits

Organizations provide:
- **Data Isolation**: Each client's data remains separate
- **Custom Branding**: Organization-specific configurations
- **Access Control**: Role-based permissions per organization
- **Reporting**: Organization-specific analytics

## 4. ⚙️ Configure Essential Settings

Customize OpenFrame to match your environment and requirements.

### User Profile Settings

1. Click your profile picture → **"Profile Settings"**
2. Update your information:
   - Display name
   - Email preferences
   - Notification settings
   - Time zone

### API Key Management

API keys enable external integrations and automations.

#### Create Your First API Key

1. Go to **"Settings"** → **"API Keys"**
2. Click **"Generate New Key"**
3. Configure the key:

```text
Key Name: Integration Testing
Description: For testing external integrations
Permissions: Read devices, Read organizations
Expiration: 90 days
```

4. **Important**: Copy and save the key - it won't be shown again!

#### Test Your API Key

```bash
# Test API access
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:8080/api/v1/devices

# Expected response: JSON array of devices
```

### Security Configuration

#### Password Policy
1. Navigate to **"Settings"** → **"Security"**
2. Configure password requirements:
   - Minimum length: 8 characters
   - Require special characters
   - Password expiration: 90 days
   - Failed attempt lockout: 5 attempts

#### Two-Factor Authentication
1. Enable 2FA for your account
2. Use an authenticator app (Google Authenticator, Authy)
3. Save backup codes securely

### System Configuration

#### Email Settings (Optional)
Configure SMTP for notifications:
```text
SMTP Server: smtp.gmail.com
Port: 587
Username: notifications@yourdomain.com
Password: app-password
Use TLS: Yes
```

#### Backup Configuration
Set up automated backups:
- Database backup schedule
- Configuration export
- Backup retention policy

## 5. 🔧 Test Core Integrations

Verify that OpenFrame's integration capabilities are working correctly.

### Agent Communication Test

#### Heartbeat Verification
1. Go to **"Devices"** → select a device
2. Check **"Last Seen"** timestamp
3. It should update every 60 seconds

#### Command Execution Test
1. Use **"Remote Shell"** 
2. Run this test sequence:

```bash
# Test 1: Basic system info
echo "OpenFrame Agent Test - $(date)"

# Test 2: Network connectivity  
ping -c 3 8.8.8.8

# Test 3: System resources
df -h
```

3. Verify commands execute and return results

### Real-time Monitoring Test

#### Live Metrics Verification
1. Navigate to **"Dashboard"** 
2. Watch for real-time updates:
   - CPU usage changes
   - Memory utilization
   - Network activity

#### Event Stream Test
1. Trigger an event (restart a service, create a file)
2. Check **"Recent Activity"** for the event
3. Verify event details are accurate

### External API Test

#### GraphQL API
1. Open [http://localhost:8080/graphql](http://localhost:8080/graphql)
2. Run this test query:

```graphql
query TestQuery {
  devices(first: 5) {
    edges {
      node {
        id
        hostname
        operatingSystem
        lastSeen
      }
    }
  }
}
```

#### REST API
Test the REST endpoints:

```bash
# Get devices
curl http://localhost:8080/api/v1/devices

# Get organizations  
curl http://localhost:8080/api/v1/organizations

# Health check
curl http://localhost:8080/health
```

## Verification Checklist

Confirm you've successfully completed each first step:

### Dashboard & Navigation
- [ ] Dashboard loads and displays system overview
- [ ] Navigation between sections works smoothly
- [ ] Real-time updates are visible

### Device Management
- [ ] Can view device details and system information
- [ ] Remote commands execute successfully
- [ ] File management works (upload/download)
- [ ] Performance metrics display correctly

### Organization Setup
- [ ] Created at least one organization
- [ ] Understand multi-tenant structure
- [ ] Can assign devices to organizations

### Settings Configuration
- [ ] Profile settings updated
- [ ] API key created and tested
- [ ] Security settings configured

### Integration Testing
- [ ] Agent communication verified
- [ ] Real-time monitoring working
- [ ] API endpoints accessible
- [ ] Event logging functional

## Common Initial Issues

### Device Not Reporting
**Problem**: Device shows as offline  
**Solution**: 
```bash
# Check agent service status
# Windows
Get-Service OpenFrameAgent

# Linux/macOS
systemctl status openframe-agent
```

### Slow Dashboard Loading
**Problem**: Dashboard takes long to load  
**Solution**: Check database connections
```bash
# Verify MongoDB
docker-compose logs mongodb

# Check service health
curl http://localhost:8080/health
```

### API Authentication Failing
**Problem**: API calls return 401 Unauthorized  
**Solution**: Verify API key format
```bash
# Correct format
Authorization: Bearer ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnop
```

## Next Steps

Congratulations! You've completed the essential first steps with OpenFrame. You're now ready to:

### Immediate Actions
1. **Add More Devices**: Register additional endpoints
2. **Create Users**: Invite team members to the platform
3. **Set Up Monitoring**: Configure alerts and notifications

### Advanced Features to Explore
- **Tool Integration**: Connect TacticalRMM, Fleet MDM, or MeshCentral
- **Automation**: Create automated workflows and scripts
- **Custom Dashboards**: Build organization-specific views
- **Advanced Security**: Implement SSO and advanced access controls

### Development & Customization
- Explore the development guides for custom integrations
- Learn about the API for building custom solutions
- Review architecture documentation for deeper understanding

## Getting Help

If you need assistance with any of these first steps:

- **Community Support**: [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Check the development and architecture guides
- **API Reference**: Use the GraphQL playground for API exploration

You're now well on your way to mastering OpenFrame! 🚀