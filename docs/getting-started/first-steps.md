# First Steps Guide

After completing the quick start, this guide walks you through the first 5 essential tasks to configure and explore your OpenFrame deployment.

## Step 1: Complete Initial Authentication Setup

### Create Your Admin Account

1. **Navigate to the Frontend**
   - Open http://localhost:3000
   - You'll see the OpenFrame login screen

2. **Register as Admin**
   ```text
   Email: admin@yourcompany.com
   Password: [Create a strong password]
   Company: Your Company Name
   ```

3. **Verify Email** (Development Mode)
   - Check your console logs for the verification link
   - In production, this would be sent via email

4. **Complete Profile Setup**
   - Add your full name
   - Set your timezone
   - Upload a profile picture (optional)

### Configure OAuth/SSO (Optional)

For production deployments, configure enterprise authentication:

1. Navigate to **Settings** → **SSO Configuration**
2. Choose your identity provider:
   - Google Workspace
   - Microsoft Azure AD
   - Generic OIDC provider
3. Enter your OAuth client credentials
4. Test the SSO flow

## Step 2: Create Your First Organization

Organizations in OpenFrame represent your clients or internal departments.

### Create Organization

1. **Navigate to Organizations**
   - Click **Organizations** in the sidebar
   - Click **"New Organization"**

2. **Fill Organization Details**
   ```text
   Name: Demo Client Corp
   Description: Example client organization for testing
   
   Contact Information:
   - Email: contact@democlient.com
   - Phone: +1-555-123-4567
   
   Address:
   - Street: 123 Business Ave
   - City: San Francisco
   - State: CA
   - Zip: 94105
   - Country: United States
   ```

3. **Save and Verify**
   - Click **"Create Organization"**
   - Verify the organization appears in the list
   - Click on it to view details

### Organization Best Practices

- Use descriptive names that identify the client clearly
- Include accurate contact information for billing and support
- Set up proper address information for compliance and reporting

## Step 3: Install and Register Your First Agent

The OpenFrame client agent monitors and manages devices. Let's install it on your local machine.

### Install OpenFrame CLI

First, install the OpenFrame CLI from the external repository:

```bash
# Install via npm (requires Node.js 18+)
npm install -g @openframe/cli

# Or install via GitHub releases
curl -L https://github.com/flamingo-stack/openframe-cli/releases/latest/download/openframe-cli-linux -o openframe
chmod +x openframe
sudo mv openframe /usr/local/bin/
```

### Register Your First Device

1. **Get Registration Secret**
   - In OpenFrame UI, navigate to **Devices** → **New Device**
   - Copy the generated registration secret

2. **Install Agent on Local Machine**
   ```bash
   # Download the agent
   openframe agent install
   
   # Register with your OpenFrame instance
   openframe agent register \
     --server http://localhost:8080 \
     --secret YOUR_REGISTRATION_SECRET \
     --organization "Demo Client Corp"
   ```

3. **Verify Agent Connection**
   - Return to OpenFrame UI → **Devices**
   - Your local machine should appear in the device list
   - Status should show as "Online" with a green indicator

### Agent Configuration

```bash
# Check agent status
openframe agent status

# View agent logs
openframe agent logs

# Update agent configuration
openframe agent config --update
```

## Step 4: Explore Core Features

### Device Management

1. **View Device Details**
   - Click on your registered device
   - Explore the different tabs:
     - **Hardware**: CPU, memory, disk information
     - **Software**: Installed applications and updates
     - **Agents**: Connected monitoring agents
     - **Logs**: Device-specific log entries

2. **Test Remote Actions**
   ```bash
   # From the device details page, try:
   # - Restart device (if safe)
   # - Run system info script  
   # - Check disk space
   # - View active processes
   ```

### Log Analysis

1. **Navigate to Logs**
   - Click **Logs** in the sidebar
   - Observe real-time log entries

2. **Filter Logs**
   - Filter by severity: Error, Warning, Info
   - Filter by organization
   - Search for specific events or keywords

3. **Log Details**
   - Click on any log entry to see detailed information
   - Note the structured data and metadata

### AI Assistant (Mingo)

1. **Access Mingo Chat**
   - Click **Mingo** in the sidebar
   - This opens the AI assistant interface

2. **Test Basic Queries**
   ```text
   Example queries to try:
   - "Show me the status of all devices"
   - "What are the recent errors in the system?"
   - "Help me troubleshoot connectivity issues"
   - "Generate a report of system health"
   ```

3. **Explore AI Capabilities**
   - Ask about specific devices or organizations
   - Request automated actions
   - Get explanations of log entries or alerts

## Step 5: Configure Essential Settings

### API Access

1. **Create API Key**
   - Navigate to **Settings** → **API Keys**
   - Click **"Create API Key"**
   - Choose permissions:
     - `read:devices` - View device information
     - `write:devices` - Modify device settings
     - `read:logs` - Access log data

2. **Test API Access**
   ```bash
   # Test your API key
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        http://localhost:8080/api/v1/devices
   
   # GraphQL query example
   curl -X POST http://localhost:8080/graphql \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { devices { id name status organizationId } }"
     }'
   ```

### User Management

1. **Invite Team Members**
   - Navigate to **Settings** → **Company and Users**
   - Click **"Invite User"**
   - Enter email addresses and select roles:
     - **Admin**: Full system access
     - **Technician**: Device management and troubleshooting
     - **Viewer**: Read-only access

2. **Configure Roles and Permissions**
   - Review default roles in **Settings** → **Permissions**
   - Customize permissions based on your team structure

### Notification Settings

1. **Email Notifications**
   - Configure SMTP settings in **Settings** → **Notifications**
   - Set up alert thresholds:
     - Device offline > 5 minutes
     - High CPU usage > 80%
     - Disk space < 10%
     - System errors

2. **Webhook Integration**
   ```bash
   # Example webhook for Slack integration
   curl -X POST http://localhost:8080/api/v1/webhooks \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Slack Alerts",
       "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
       "events": ["device.offline", "alert.critical"],
       "enabled": true
     }'
   ```

## Verification Checklist

Before proceeding to advanced configuration, verify you've completed these essential steps:

- [ ] ✅ Admin account created and profile configured
- [ ] ✅ First organization created with contact details
- [ ] ✅ OpenFrame CLI installed and functional
- [ ] ✅ At least one device registered and online
- [ ] ✅ Device details and tabs explored
- [ ] ✅ Log filtering and analysis tested
- [ ] ✅ Mingo AI assistant accessed and tested
- [ ] ✅ API key created and tested
- [ ] ✅ Basic notification settings configured

## Common Configuration Issues

### Agent Registration Failed

```bash
# Check connectivity
curl http://localhost:8080/health

# Verify registration secret is correct
openframe agent register --debug

# Check agent logs
tail -f ~/.openframe/agent.log
```

### Device Not Appearing

```bash
# Restart agent service
sudo systemctl restart openframe-agent

# Check agent status
openframe agent status

# Verify organization assignment
openframe agent config --show
```

### API Access Issues

```bash
# Verify API key format
echo "Bearer YOUR_API_KEY" | base64 -d

# Test authentication
curl -v -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8080/api/v1/health
```

### Performance Issues

```bash
# Check system resources
docker stats

# Increase memory limits if needed
docker-compose down
export COMPOSE_MEMORY_LIMIT=4g
docker-compose up -d
```

## Next Steps

Congratulations! You've successfully configured the core OpenFrame functionality. Here's what to explore next:

### Immediate Next Steps
- **Integrate Additional Tools**: Connect TacticalRMM, Fleet, or MeshCentral
- **Set Up Monitoring Policies**: Create automated checks and alerts
- **Configure Backup and Recovery**: Ensure data protection

### Advanced Configuration
- **Multi-Tenant Setup**: Configure additional client organizations
- **Custom Scripts**: Create automation scripts for common tasks
- **Advanced Analytics**: Set up reporting and dashboards

### Development and Customization
- Review the development documentation for custom integrations
- Explore the GraphQL API for advanced automation
- Consider contributing to the OpenMSP community

## Getting Help

For questions about configuration or troubleshooting:

- 💬 **OpenMSP Slack Community**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📖 **CLI Documentation**: [OpenFrame CLI repository](https://github.com/flamingo-stack/openframe-cli)
- 🔧 **Development Docs**: Check the development section of this documentation

Remember: OpenFrame is designed to grow with your needs. Start with these basics and gradually expand as you become more comfortable with the platform.