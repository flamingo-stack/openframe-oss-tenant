# First Steps with OpenFrame

Congratulations! You now have OpenFrame running. This guide walks you through the essential first steps to start using your OpenFrame instance effectively.

## 1. Complete Initial Configuration

### Set Up Your Organization

After logging in for the first time, complete your organization setup:

1. **Navigate to Organizations** in the sidebar
2. **Click "Create Organization"** 
3. **Fill in details**:
   - Organization name
   - Contact information
   - Business address
   - Primary contact person
4. **Save your organization**

Your organization serves as the root container for all devices, users, and configurations.

### Configure User Access

Set up additional users and access controls:

1. **Go to Settings → Company and Users**
2. **Add team members**:
   - Click "Invite Users"
   - Enter email addresses
   - Select appropriate roles
   - Send invitations
3. **Configure SSO** (Optional):
   - Navigate to Settings → SSO Configuration
   - Set up Google Workspace or Microsoft 365
   - Test SSO integration

## 2. Connect Your First Devices

### Deploy OpenFrame Agent

The OpenFrame agent is the bridge between your devices and the platform:

1. **Download the agent installer**:
   - Go to Devices → "Add New Device"
   - Select your operating system
   - Download the agent installer

2. **Install on target devices**:

   **Windows:**
   ```powershell
   # Run as Administrator
   ./openframe-agent-installer.exe --registration-key YOUR_KEY
   ```

   **macOS:**
   ```bash
   sudo ./openframe-agent-installer --registration-key YOUR_KEY
   ```

   **Linux:**
   ```bash
   sudo ./openframe-agent-installer.sh --registration-key YOUR_KEY
   ```

3. **Verify device registration**:
   - Devices should appear in the Devices tab within 2-3 minutes
   - Check device status shows as "Online"

### Test Device Connectivity

1. **View device details**:
   - Click on a device in the Devices list
   - Explore the tabs: Hardware, Software, Network, Security
   - Review compliance status and alerts

2. **Test remote access** (if MeshCentral is configured):
   - Click "Remote Desktop" on a device
   - Verify remote connection works
   - Test file manager functionality

## 3. Explore Core Features

### Dashboard Overview

The dashboard provides a quick overview of your environment:

- **Device count** and status distribution
- **Recent log events** and their severity levels  
- **Organization summary** and user activity
- **Quick actions** for common tasks

### Device Management

OpenFrame provides comprehensive device management:

1. **Device Monitoring**:
   - Real-time status and health metrics
   - Hardware and software inventory
   - Network configuration and connectivity
   - Security compliance status

2. **Remote Operations**:
   - Remote desktop access via MeshCentral
   - File management and transfers
   - Script execution and automation
   - Command-line access

3. **Compliance Tracking**:
   - Security policy enforcement
   - Vulnerability assessments
   - Update management
   - Audit trail maintenance

### Log Analysis

OpenFrame centralizes logs from all connected systems:

1. **Browse logs**:
   - Navigate to Logs in the sidebar
   - Use filters to find specific events
   - Set date ranges and severity levels

2. **Advanced filtering**:
   - Filter by organization, device, or user
   - Search by message content or event type
   - Export filtered results for analysis

3. **Log analysis**:
   - Click on log entries for detailed view
   - Review related events and context
   - Set up alerts for critical events

## 4. Configure Tool Integrations

### FleetDM Integration

If you have FleetDM, integrate it for enhanced device management:

1. **Get FleetDM credentials**:
   - FleetDM instance URL
   - API key with appropriate permissions

2. **Configure in OpenFrame**:
   - Settings → Integrations → FleetDM
   - Enter instance URL and API key
   - Test connection and save

3. **Verify integration**:
   - Check that FleetDM devices appear in OpenFrame
   - Test queries and policy deployment

### Tactical RMM Integration

For remote monitoring and management:

1. **Configure Tactical RMM**:
   - Get Tactical RMM API credentials
   - Settings → Integrations → Tactical RMM
   - Enter connection details

2. **Test functionality**:
   - Verify agents are synchronized
   - Test remote command execution
   - Check alert forwarding

### MeshCentral Setup

For remote desktop and file management:

1. **MeshCentral connection**:
   - Ensure MeshCentral is accessible
   - Configure in Settings → Integrations
   - Test remote desktop functionality

2. **Verify remote access**:
   - Connect to a test device
   - Test file transfer capabilities
   - Verify session recording (if enabled)

## 5. Set Up AI Features

### Enable Mingo AI

Configure OpenFrame's AI assistant for automated support:

1. **AI Configuration**:
   - Navigate to Settings → AI Settings
   - Configure AI provider (OpenAI, Anthropic, etc.)
   - Set API keys and model preferences

2. **Test AI features**:
   - Open the Mingo chat interface
   - Ask questions about your devices or issues
   - Test autonomous incident response

3. **Configure AI policies**:
   - Set automation boundaries
   - Define approval requirements for AI actions
   - Configure escalation procedures

### Ticket Integration

Set up AI-assisted ticketing:

1. **Access tickets**:
   - Navigate to Tickets in the sidebar
   - Review open tickets and their status
   - Test AI-assisted triage and resolution

2. **Configure workflows**:
   - Set up automatic ticket creation from alerts
   - Define escalation rules and SLAs
   - Configure customer notification templates

## 6. Essential Configurations

### Security Settings

Secure your OpenFrame instance:

```bash
# Generate secure JWT secret
openssl rand -base64 64

# Generate encryption key  
openssl rand -hex 32
```

1. **Update environment variables**:
   - Set strong `JWT_SECRET`
   - Configure `ENCRYPTION_KEY`
   - Enable HTTPS in production

2. **Configure access controls**:
   - Set up role-based permissions
   - Configure session timeouts
   - Enable audit logging

### Backup Configuration

Set up automated backups:

1. **Database backups**:
   ```bash
   # MongoDB backup script example
   mongodump --host localhost:27017 --db openframe --out /backup/$(date +%Y%m%d)
   ```

2. **Configuration backups**:
   - Export organization settings
   - Save integration configurations
   - Document custom scripts and policies

### Monitoring Setup

Configure system monitoring:

1. **Log retention policies**:
   - Set appropriate log retention periods
   - Configure log rotation
   - Set up log archiving

2. **Alert configuration**:
   - Define critical alert thresholds
   - Configure notification channels
   - Set up escalation procedures

## 7. Test Core Workflows

### Device Onboarding Workflow

Test the complete device lifecycle:

1. **Register a new device** using the agent installer
2. **Verify automatic discovery** and inventory collection
3. **Apply initial policies** and compliance checks
4. **Test remote access** and management capabilities
5. **Validate monitoring** and alert generation

### Incident Response Workflow

Test your incident response capabilities:

1. **Generate a test alert** (e.g., simulate high CPU usage)
2. **Verify alert reaches OpenFrame** and creates a ticket
3. **Test AI triage** and suggested resolution steps  
4. **Practice manual resolution** and ticket closure
5. **Review audit trail** and documentation

### User Management Workflow

Test multi-user capabilities:

1. **Invite a new user** via email
2. **Verify SSO integration** (if configured)
3. **Test role-based access** controls
4. **Practice user deactivation** and cleanup
5. **Review access audit logs**

## Common First-Steps Issues

### Agent Registration Failures

```bash
# Check agent logs for connection issues
tail -f /var/log/openframe-agent.log

# Verify network connectivity
curl -I http://your-openframe-instance.com:8080/health

# Check registration key validity
# Go to Settings → Agents → Registration Keys
```

### Service Discovery Problems

```bash
# Verify all services are running
docker-compose ps

# Check service health endpoints
curl http://localhost:8080/health
curl http://localhost:8081/health  
curl http://localhost:8082/health
```

### Integration Connection Failures

```bash
# Test external tool connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-fleetdm-instance.com/api/latest/fleet/hosts

# Check firewall and network settings
# Verify API credentials are correct
```

## Getting Help

### Community Resources

- **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: [OpenFrame Documentation](https://openframe.ai/docs)
- **Website**: [https://openframe.ai](https://openframe.ai)

### Debugging Tips

1. **Check service logs** in each terminal window
2. **Verify network connectivity** between services
3. **Confirm database connections** are working
4. **Test API endpoints** individually
5. **Review browser console** for frontend errors

## What's Next?

After completing these first steps, you're ready to:

1. **[Set up development environment](../development/setup/environment.md)** - For customization and development
2. **[Learn the architecture](../development/architecture/overview.md)** - Understand how OpenFrame works
3. **[Explore advanced features](../development/testing/overview.md)** - Testing and advanced configuration
4. **[Contribute to the project](../development/contributing/guidelines.md)** - Join the development community

Congratulations! You now have a fully functional OpenFrame instance and understand the core workflows. Start managing your devices, monitoring your infrastructure, and leveraging AI-powered automation!