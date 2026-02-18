# First Steps with OpenFrame

Welcome to OpenFrame! Now that you have the platform running locally, let's explore the key features and get you started with the essential workflows. This guide covers the first 5 things you should do after installation.

## Overview

After completing the [Quick Start Guide](quick-start.md), you should have:
- ✅ All core services running
- ✅ Frontend accessible at `http://localhost:3000`
- ✅ A working development tenant
- ✅ Access to the main dashboard

Let's explore what you can do next!

## 1. Complete Your Organization Setup

The first step is to configure your MSP organization with proper contact information and settings.

### Access Organization Management

1. Navigate to **Organizations** in the main menu
2. Click on your default organization or create a new one
3. Fill in the organization details:

**Essential Fields:**
- **Organization Name** - Your MSP company name
- **Domain** - Your company domain (e.g., `yourmsp.com`)
- **Contact Information** - Primary contact details
- **Address** - Business address for client communications

**Configuration Example:**
```text
Organization: "Acme MSP Solutions"
Domain: "acmemsp.com"
Contact Person: "John Smith"
Email: "admin@acmemsp.com"
Phone: "+1-555-0123"
```

### Why This Matters
- Enables proper tenant isolation
- Sets up client-facing branding
- Configures email templates and notifications
- Establishes the foundation for multi-tenant operations

## 2. Set Up Device Management

OpenFrame's core strength is unified device management across multiple tools.

### Add Your First Device

1. Go to **Devices** → **Add New Device**
2. Choose your device type:
   - **Workstation** - Employee computers
   - **Server** - Infrastructure servers
   - **Mobile Device** - Phones and tablets

### Install the OpenFrame Agent

The platform will provide you with an agent installation command:

```bash
# Example installation command (yours will be unique)
curl -sSL https://your-tenant.openframe.local/agent/install | bash
```

### Agent Features

Once installed, the agent provides:
- **Real-time monitoring** - System health and performance
- **Remote access** - Via MeshCentral integration
- **Script execution** - Remote PowerShell, Bash, Python
- **File management** - Remote file browser
- **Security monitoring** - Vulnerability scans and compliance

### Verify Device Connection

Check that your device appears in the **Devices** dashboard with:
- ✅ Online status
- ✅ Agent version information
- ✅ Basic system information (OS, CPU, Memory)

## 3. Invite Team Members

Set up your team for collaborative MSP operations.

### Send Invitations

1. Navigate to **Settings** → **Company & Users**
2. Click **Add Users** 
3. Enter email addresses for team members
4. Select appropriate roles:

**Available Roles:**
- **Administrator** - Full platform access
- **Technician** - Device management and troubleshooting
- **Manager** - Oversight and reporting
- **Client** - Limited access for specific organizations

### Email Invitation Process

Team members will receive an email with:
- Platform access link
- Temporary password or SSO setup
- Role and permission summary
- Getting started instructions

### Verify Team Access

Ensure invited users can:
- Successfully log in to the platform
- Access appropriate features based on their role
- See the correct tenant and organization data

## 4. Configure Authentication (SSO)

Set up Single Sign-On for streamlined team access.

### Google SSO Setup

1. Go to **Settings** → **SSO Configuration**
2. Select **Google** as provider
3. Enter your Google OAuth credentials:

```text
Client ID: your-google-client-id
Client Secret: your-google-client-secret
Domain Restrictions: yourdomain.com (optional)
```

### Microsoft SSO Setup

For Microsoft Azure AD:

1. Choose **Microsoft** in SSO Configuration
2. Configure Azure AD integration:

```text
Tenant ID: your-azure-tenant-id
Client ID: your-azure-client-id
Client Secret: your-azure-client-secret
```

### Test SSO Integration

- Log out of the platform
- Attempt to log in using "Sign in with Google/Microsoft"
- Verify automatic account creation for domain users
- Confirm proper role assignment

## 5. Explore Mingo AI Assistant

Experience the AI-powered technician assistant that makes OpenFrame unique.

### Access the Chat Interface

1. Click on **Mingo** in the main navigation
2. Start with a simple query like:
   ```
   "Show me the status of all my devices"
   ```

### Common Mingo Commands

Try these example interactions:

**Device Management:**
```
"List all offline devices"
"Show devices with high CPU usage"
"Restart the web server on SERVER-001"
```

**System Information:**
```
"What's the current system load across all servers?"
"Show me recent security alerts"
"Generate a health report for this month"
```

**Automation Tasks:**
```
"Schedule a backup for all database servers"
"Update Windows patches on workstations"
"Run disk cleanup on low-space devices"
```

### Understanding AI Responses

Mingo provides:
- **Contextual answers** based on your real device data
- **Actionable suggestions** for resolving issues
- **Automated task execution** with your approval
- **Follow-up questions** to clarify requirements

## Key Platform Features to Explore

### Device Management Dashboard
- Real-time device status monitoring
- Performance metrics and alerts
- Remote access capabilities
- Software inventory and compliance

### Log Analysis
- Centralized log collection from all devices
- AI-powered anomaly detection
- Custom alerting rules
- Integration with external SIEM tools

### Automation Scripts
- Pre-built maintenance scripts
- Custom PowerShell/Bash automation
- Scheduled task execution
- Approval workflows for sensitive operations

### API Integration
- RESTful APIs for custom integrations
- GraphQL endpoint for complex queries
- Webhook support for real-time events
- API key management and rate limiting

## Configuration Best Practices

### Security Settings
1. **Enable MFA** - Multi-factor authentication for all admin accounts
2. **API Key Rotation** - Regular rotation of API keys
3. **Role-Based Access** - Principle of least privilege
4. **Audit Logging** - Enable comprehensive audit trails

### Performance Optimization
1. **Agent Update Policies** - Configure automatic agent updates
2. **Data Retention** - Set appropriate log retention periods
3. **Alerting Thresholds** - Fine-tune alert sensitivity
4. **Backup Scheduling** - Regular configuration backups

### Integration Planning
1. **Tool Assessment** - Identify existing tools to integrate
2. **Migration Strategy** - Plan gradual migration from legacy systems
3. **Training Schedule** - Team training on new workflows
4. **Client Communication** - Inform clients about platform benefits

## Troubleshooting Common Issues

### Agent Connection Problems
```bash
# Check agent status
systemctl status openframe-agent

# Review agent logs
tail -f /var/log/openframe/agent.log

# Restart agent service
systemctl restart openframe-agent
```

### SSO Authentication Issues
- Verify domain configuration in SSO provider
- Check redirect URLs match platform configuration
- Ensure proper permissions in Google/Microsoft admin console

### Performance Issues
- Monitor system resources on the OpenFrame server
- Check database connection pools
- Review log files for error patterns

## Getting Help

### Documentation Resources
- Check the comprehensive architecture documentation
- Review API documentation for integration questions
- Explore configuration examples in the codebase

### Community Support
- **OpenMSP Slack:** [Join the Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- Share your use cases and learn from other MSPs
- Get help with technical issues and best practices

### Advanced Topics
Once you're comfortable with these basics, explore:
- Custom integration development
- Advanced automation workflows
- Multi-tenant architecture deep-dive
- Performance tuning and scaling

## Next Steps

Now that you've completed your first steps:

1. **[Development Environment Setup](../development/setup/environment.md)** - Configure your IDE for customization
2. **[Architecture Overview](../development/architecture/README.md)** - Understand the technical foundation
3. **[Security Best Practices](../development/security/README.md)** - Implement production-ready security

## Quick Reference

### Essential URLs (Local Development)
- **Frontend:** `http://localhost:3000`
- **API Documentation:** `http://localhost:8080/graphiql` (GraphQL)
- **Health Checks:** `http://localhost:8080/actuator/health`
- **Config Server:** `http://localhost:8888`

### Key Directories
- **Services:** `openframe/services/`
- **Configuration:** `openframe/config/`
- **Client Apps:** `clients/`
- **Scripts:** `clients/openframe-client/scripts/`

---

🚀 **You're ready to go!** You now have a solid foundation with OpenFrame OSS Tenant and understand the core workflows. The platform is designed to grow with your MSP operations, so explore additional features as your needs expand.