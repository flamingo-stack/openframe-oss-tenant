# First Steps with OpenFrame

Welcome to OpenFrame! Now that you have the platform running, this guide walks you through the first 5 essential steps to get you productive with your new MSP platform.

## Overview

After completing the quick start, you should have OpenFrame running locally. These first steps will help you:

1. Complete initial tenant setup
2. Configure your first organization
3. Add users and set permissions
4. Install and register your first agent
5. Explore AI-powered features

Let's dive in!

---

## Step 1: Complete Initial Tenant Setup

### Access Your OpenFrame Instance

Navigate to [http://localhost:3000](http://localhost:3000) in your browser. You'll see the OpenFrame welcome screen.

### Create Your Admin Account

1. **Click "Sign Up"** to create your first tenant
2. **Fill in your details**:
   - Email address (will be your admin login)
   - Password (minimum 8 characters)
   - Organization name
   - Your full name

3. **Complete registration** - you'll be automatically logged in

### Verify Your Setup

After registration, you should see:
- Clean dashboard interface
- Navigation sidebar with main sections
- Welcome tour popup (optional)

> 💡 **Tip**: The first user created becomes the tenant administrator with full permissions.

---

## Step 2: Configure Your Organization

### Access Organization Settings

1. Navigate to **Organizations** in the sidebar
2. Click on your organization (created during registration)
3. Select **Edit** or use the **General Information** tab

### Complete Organization Profile

Fill in essential organization details:

```text
Organization Information:
├── Basic Details
│   ├── Name: Your MSP Company Name
│   ├── Description: Brief company description
│   └── Industry: Managed Service Provider
│
├── Contact Information
│   ├── Primary Email: support@your-company.com
│   ├── Phone: +1-555-123-4567
│   └── Website: https://your-company.com
│
└── Address Information
    ├── Street: 123 Business Ave
    ├── City: Your City
    ├── State/Province: Your State
    └── Country: Your Country
```

### Set Organization Preferences

Configure key settings:
- **Time Zone**: Set your primary operating timezone
- **Default Language**: Choose interface language
- **Security Policies**: Review and adjust as needed

---

## Step 3: Add Users and Configure Permissions

### Invite Additional Users

1. Go to **Settings** → **Company and Users**
2. Click **Add Users** or **Invite User**
3. **Enter user details**:
   - Email address
   - Full name
   - Role assignment

### Understanding User Roles

OpenFrame includes these built-in roles:

| Role | Permissions | Best For |
|------|-------------|----------|
| **Administrator** | Full system access | IT directors, MSP owners |
| **Technician** | Device management, support tools | Field technicians, support staff |
| **Manager** | User management, reporting | Team leads, service managers |
| **Viewer** | Read-only access to reports | Executives, auditors |

### Set Up Your Team

Create accounts for key team members:
```bash
# Example team structure:
Admin User (you) → Full access
Lead Technician → Technician role  
Service Manager → Manager role
Junior Tech → Technician role (limited)
```

### Configure SSO (Optional)

If your organization uses single sign-on:

1. Navigate to **Settings** → **SSO Configuration**
2. Choose your provider:
   - **Azure Active Directory**
   - **Google Workspace**
   - **Microsoft 365**
3. Follow the setup wizard with your SSO credentials

---

## Step 4: Install and Register Your First Agent

### Download the OpenFrame Agent

The OpenFrame agent connects your devices to the platform for management and monitoring.

1. **Go to Devices** → **Add New Device**
2. **Select your platform**:
   - Windows (PowerShell installer)
   - macOS (PKG installer)
   - Linux (bash script)

3. **Copy the installation command** - it includes your unique registration secret

### Install on Windows

```powershell
# Run PowerShell as Administrator
Invoke-WebRequest -Uri "https://your-openframe-url/agent/install.ps1" -OutFile "install.ps1"
.\install.ps1 -Secret "your-registration-secret"
```

### Install on macOS/Linux

```bash
# Run with sudo privileges
curl -fsSL https://your-openframe-url/agent/install.sh | sudo bash -s -- --secret your-registration-secret
```

### Verify Agent Registration

After installation:
1. **Check the Devices page** - your device should appear within 2-3 minutes
2. **Verify connection status** - look for green "Connected" status
3. **Review device information** - OS, hardware specs, installed software

### Agent Capabilities

Once connected, your agent provides:
- **Real-time monitoring**: CPU, memory, disk usage
- **Remote access**: Desktop and shell access
- **File management**: Browse and transfer files
- **Software management**: Install, update, remove applications
- **Security monitoring**: Compliance checking and vulnerability scanning

---

## Step 5: Explore AI-Powered Features

### Meet Mingo - Your AI Assistant

OpenFrame includes Mingo, an AI assistant designed specifically for MSP operations.

[![OpenFrame v0.4.4: Mingo AI Assistant with Enterprise Guardrails](https://img.youtube.com/vi/mAi4qqA8b00/maxresdefault.jpg)](https://www.youtube.com/watch?v=mAi4qqA8b00)

### Access Mingo

1. **Click the Mingo icon** in the sidebar (robot icon)
2. **Or use the chat bubble** in the bottom-right corner
3. **Start with a simple question** like "Show me my device overview"

### Example Mingo Interactions

Try these commands to explore Mingo's capabilities:

```text
"Show me all offline devices"
→ Mingo displays devices that haven't checked in recently

"Create a maintenance report for Device-001"  
→ Generates comprehensive device status report

"What security alerts need attention?"
→ Summarizes critical security findings

"Help me troubleshoot slow performance on Device-002"
→ Provides step-by-step diagnostic guidance
```

### Configure AI Policies

Set up enterprise guardrails for AI usage:

1. **Go to Settings** → **AI Settings**
2. **Configure approval workflows**:
   - Require approval for system changes
   - Set spending limits for AI operations
   - Define restricted actions
3. **Set data privacy controls**:
   - Restrict sensitive data access
   - Configure data retention policies
   - Enable audit logging

### AI-Powered Automation

Explore automation capabilities:
- **Smart Alerting**: AI prioritizes and categorizes alerts
- **Predictive Maintenance**: Proactive issue identification
- **Automated Responses**: Configure AI to handle routine tasks
- **Report Generation**: Intelligent reporting and insights

---

## Quick Configuration Checklist

Use this checklist to ensure you've covered the basics:

### ✅ Initial Setup
- [ ] Admin account created and verified
- [ ] Organization profile completed
- [ ] Basic preferences configured

### ✅ User Management  
- [ ] Key team members invited
- [ ] Roles and permissions assigned
- [ ] SSO configured (if applicable)

### ✅ Device Management
- [ ] First agent installed and registered
- [ ] Device appears in dashboard
- [ ] Agent connectivity verified

### ✅ AI Configuration
- [ ] Mingo assistant tested
- [ ] AI policies configured
- [ ] Automation preferences set

### ✅ Basic Security
- [ ] User permissions reviewed
- [ ] API access configured
- [ ] Security policies enabled

---

## Common Initial Questions

### "How do I add more devices?"

Go to **Devices** → **Add Device**, select the platform, and follow the installation instructions. Each device gets a unique registration secret.

### "What if an agent won't connect?"

Check:
1. Network connectivity to OpenFrame server
2. Firewall rules allowing outbound connections
3. Registration secret is correct
4. Agent service is running

### "How do I configure remote access?"

Once an agent is connected:
1. Click the device in your device list
2. Select **Remote Desktop** or **Remote Shell**
3. Authenticate if prompted
4. Access is granted through the browser

### "Can I import existing device lists?"

Yes! Use the **Tools** → **Import/Export** feature to bulk import device information and generate installation scripts.

---

## What's Next?

Now that you've completed the first steps:

### Immediate Actions
- **Install agents** on your critical devices
- **Set up monitoring alerts** for key systems
- **Create device groups** for easier management
- **Configure backup and maintenance schedules**

### Advanced Configuration
- **Set up integrations** with existing tools
- **Configure automated scripts** and policies
- **Create custom dashboards** and reports
- **Implement compliance monitoring**

### Explore Documentation
- **Development guides** for custom integrations
- **Security best practices** for production deployment  
- **Advanced AI configuration** for complex workflows
- **API documentation** for custom development

## Getting Help

### Community Support
- **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time help
- **Documentation**: Browse guides for specific features
- **Video Tutorials**: Check out our YouTube channel for walkthroughs

### Professional Services
- **Implementation Support**: Get help with complex deployments
- **Custom Development**: Extend OpenFrame for unique requirements
- **Training Services**: Team training and certification programs

Welcome to the OpenFrame community! You're now ready to transform your MSP operations with intelligent automation and unified platform management. 🚀