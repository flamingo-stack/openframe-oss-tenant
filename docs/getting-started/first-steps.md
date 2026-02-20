# First Steps with OpenFrame

Congratulations! You have OpenFrame running. This guide walks you through the essential first steps to configure your OpenFrame platform, create your first tenant, and explore the key features that make OpenFrame a powerful MSP platform.

## Your First 5 Actions

### 1. Access the OpenFrame Dashboard

Open your web browser and navigate to the OpenFrame web interface:

```bash
# Open the OpenFrame dashboard
https://localhost:8443
```

You should see the OpenFrame login screen. The platform automatically detects your development environment and provides appropriate authentication options.

**Expected Result**: A clean, modern interface welcoming you to OpenFrame with authentication options visible.

### 2. Create Your First Tenant

OpenFrame is multi-tenant by design. Let's create your first tenant organization:

#### Using the Web Interface

1. **Navigate to Tenant Registration**
   - Click "Create New Tenant" or "Sign Up"
   - You'll be redirected to the tenant registration flow

2. **Fill Tenant Information**
   ```text
   Organization Name: Your MSP Company
   Domain: your-msp.local
   Admin Email: admin@your-msp.local
   Password: SecurePassword123!
   ```

3. **Complete Registration**
   - The system will create your tenant
   - Generate OAuth2 keys automatically
   - Set up initial database collections

#### Using the API (Alternative)

```bash
# Create tenant via REST API
curl -X POST https://localhost:8443/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Your MSP Company",
    "domain": "your-msp.local",
    "adminEmail": "admin@your-msp.local",
    "plan": "PROFESSIONAL"
  }'
```

**Expected Result**: You'll receive a confirmation email and can log in with your tenant credentials.

### 3. Configure Your First Integration

OpenFrame shines when integrated with existing MSP tools. Let's set up your first integration:

#### Option A: TacticalRMM Integration

1. **Navigate to Settings → Integrated Tools**
2. **Add TacticalRMM Connection**:
   ```text
   Tool Name: TacticalRMM Production
   Base URL: https://your-tactical-rmm.com
   API Token: [Your TacticalRMM API Token]
   Organization: [Select your organization]
   ```

3. **Test Connection**:
   - Click "Test Connection"  
   - Verify authentication succeeds
   - View synchronized devices (may take 1-2 minutes)

#### Option B: Fleet MDM Integration

1. **Navigate to Settings → Integrated Tools**
2. **Add Fleet MDM Connection**:
   ```text
   Tool Name: Fleet Production
   Base URL: https://your-fleet.com
   API Token: [Your Fleet API Token]
   ```

3. **Test Connection**:
   - Verify fleet enrollment works
   - Check device synchronization

**Expected Result**: Your integrated tool appears in the "Integrated Tools" list with a green "Connected" status.

### 4. Add Your First Device

Once integrations are configured, devices should automatically sync. You can also manually register devices:

#### Automatic Registration (Recommended)

```bash
# On the target device, install the OpenFrame client
# Download the appropriate binary for your platform:
wget https://your-openframe-instance.com/downloads/openframe-client-linux
chmod +x openframe-client-linux

# Register the device
./openframe-client-linux register \
  --tenant your-msp.local \
  --secret [registration-secret-from-dashboard]
```

#### Manual Device Addition

1. **Navigate to Devices → Add Device**
2. **Fill Device Information**:
   ```text
   Device Name: TEST-WORKSTATION-01
   Device Type: Workstation
   Operating System: Windows 11
   Organization: [Select your organization]
   ```

3. **Generate Agent Installation**:
   - The platform generates a custom installer
   - Download and run on target device
   - Device appears in dashboard within 30 seconds

**Expected Result**: Your device appears in the Devices list with real-time status information.

### 5. Explore AI-Powered Features

OpenFrame's AI capabilities are one of its key differentiators. Let's test them:

#### Chat with Mingo AI

1. **Open the AI Chat Interface**:
   - Click the "Mingo AI" button or navigate to `/mingo`
   - This opens the AI assistant for technicians

2. **Ask Your First Question**:
   ```text
   "Show me the health status of all devices"
   ```

3. **Test Device Management**:
   ```text
   "Create a script to update Windows devices"
   ```

4. **Ask for Analytics**:
   ```text
   "What are the top 5 alerts from the last 24 hours?"
   ```

**Expected Result**: Mingo AI responds with relevant information, suggested actions, and can execute authorized tasks.

#### Test Event Processing

1. **Generate Test Events**:
   ```bash
   # Trigger a test event
   curl -X POST https://localhost:8443/api/events \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [your-jwt-token]" \
     -d '{
       "eventType": "DEVICE_OFFLINE",
       "deviceId": "test-device-01",
       "message": "Device has not reported in 5 minutes",
       "severity": "WARNING"
     }'
   ```

2. **View Event Processing**:
   - Navigate to **Logs → Events**
   - See the event appear in real-time
   - Notice AI enrichment and correlation

**Expected Result**: Events appear in the dashboard with AI-generated insights and suggested remediation actions.

## Essential Configuration

### Set Up Authentication (SSO)

Configure Single Sign-On for your organization:

1. **Navigate to Settings → SSO Configuration**
2. **Choose Your Provider** (Google, Microsoft, etc.):
   ```text
   Provider: Google Workspace
   Client ID: [Your Google Client ID]
   Client Secret: [Your Google Client Secret]
   Domain: your-msp.com
   ```

3. **Test SSO Flow**:
   - Log out of OpenFrame
   - Click "Login with Google"
   - Verify authentication works

### Configure API Keys

Set up API access for external integrations:

1. **Navigate to Settings → API Keys**
2. **Create New API Key**:
   ```text
   Key Name: External Integration
   Permissions: Read Devices, Write Events
   Rate Limit: 1000 requests/hour
   ```

3. **Test API Access**:
   ```bash
   # Test with your new API key
   curl -H "X-API-Key: [your-api-key]" \
     https://localhost:8443/external/api/v1/devices
   ```

### Enable AI Features

Configure the AI components:

1. **Set Anthropic API Key** (if not done during setup):
   ```bash
   # Add to your environment
   export ANTHROPIC_API_KEY=your_anthropic_key_here
   
   # Or configure in Settings → AI Configuration
   ```

2. **Configure AI Policies**:
   - Navigate to **Settings → AI Settings**
   - Set approval requirements for AI actions
   - Configure auto-approval for safe operations

## Explore Key Features

### Real-Time Device Monitoring

1. **Navigate to Devices**
2. **Select a Device** for detailed view:
   - Real-time performance metrics
   - Network connectivity status
   - Security compliance scores
   - Agent installation status

3. **Test Remote Access**:
   - Click "Remote Desktop" or "Remote Shell"
   - Verify MeshCentral integration works
   - Test file management capabilities

### Event and Log Analysis

1. **Navigate to Logs**
2. **Use Advanced Filtering**:
   ```text
   Filter by: Last 24 hours
   Severity: Warning and above
   Organization: [Your organization]
   ```

3. **Test GraphQL Queries**:
   - Open the GraphQL explorer at https://localhost:8443/graphql
   - Run sample queries to understand the data model

### Script Management

1. **Navigate to Scripts**
2. **Create Your First Script**:
   ```powershell
   # Example PowerShell script for Windows updates
   Get-WUInstall -AutoSelectOnWebSites -AutoReboot
   Write-Output "Windows updates installed successfully"
   ```

3. **Deploy to Devices**:
   - Select target devices
   - Schedule execution
   - Monitor results in real-time

## Verify Everything is Working

Run this comprehensive check to ensure your OpenFrame setup is fully functional:

### Health Check Commands

```bash
# Check all service endpoints
echo "=== Service Health Check ==="
curl -s https://localhost:8443/health | jq
curl -s https://localhost:8080/actuator/health | jq
curl -s https://localhost:9000/actuator/health | jq

# Check database connectivity
echo "=== Database Connectivity ==="
mongosh --eval "db.runCommand('ping')" "mongodb://admin:admin123@localhost:27017/openframe"
redis-cli ping

# Check Kafka topics
echo "=== Kafka Topics ==="
kafka-topics.sh --list --bootstrap-server localhost:9092

# Test GraphQL API
echo "=== GraphQL API Test ==="
curl -X POST https://localhost:8443/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [your-jwt-token]" \
  -d '{"query": "{ organizations { id name } }"}'
```

### Web Interface Checklist

Navigate through each section and verify:

- ✅ **Dashboard**: Shows summary statistics and recent activity
- ✅ **Devices**: Lists all connected devices with status
- ✅ **Organizations**: Shows your tenant and any sub-organizations  
- ✅ **Logs**: Displays events and system logs with filtering
- ✅ **Scripts**: Allows script creation and deployment
- ✅ **Settings**: All configuration options accessible
- ✅ **AI Chat**: Mingo AI responds to queries appropriately

## Common Initial Configuration Issues

### Authentication Issues

**Problem**: Can't log in or token errors

**Solution**:
```bash
# Restart authorization server
pkill -f openframe-authorization-server
java -jar openframe/services/openframe-authorization-server/target/openframe-authorization-server-1.0.0-SNAPSHOT.jar --spring.profiles.active=dev &

# Clear browser cache and try again
```

### Device Registration Issues  

**Problem**: Devices not appearing or failing to register

**Solution**:
```bash
# Check registration secret is valid
curl -H "Authorization: Bearer [admin-token]" \
  https://localhost:8443/api/agent/registration-secret/active

# Verify client can reach the API
telnet localhost 8443
```

### AI Features Not Working

**Problem**: Mingo AI not responding or giving errors

**Solution**:
```bash
# Verify Anthropic API key is set
echo $ANTHROPIC_API_KEY

# Check AI service logs
grep -i "anthropic\|claude" openframe-api.log

# Test Anthropic API directly
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  https://api.anthropic.com/v1/messages
```

## Get Help and Support

### Community Resources

- **OpenMSP Slack**: https://www.openmsp.ai/ - Primary support channel
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **OpenFrame Website**: https://www.flamingo.run/openframe

### Documentation Resources

When you're ready to dive deeper:
- Review architecture details in the development documentation
- Explore API documentation at https://localhost:8443/swagger-ui
- Check integration guides for specific MSP tools

### Logging and Debugging

Enable verbose logging for troubleshooting:

```bash
# Set debug logging
export OPENFRAME_LOG_LEVEL=DEBUG

# Watch logs in real-time
tail -f openframe-api.log | grep ERROR
tail -f openframe-gateway.log | grep WARN
```

## What's Next?

You now have a fully functional OpenFrame environment! Here's what to explore next:

1. **Advanced Integrations**: Connect additional MSP tools and services
2. **Custom Scripts**: Develop automation scripts for your specific workflows  
3. **AI Workflows**: Create custom AI-powered workflows for common tasks
4. **Multi-Tenant Setup**: Add additional client organizations
5. **API Development**: Build custom applications using OpenFrame's APIs

## Summary

You've successfully:

✅ Accessed the OpenFrame dashboard  
✅ Created your first tenant organization  
✅ Configured initial integrations  
✅ Registered your first device  
✅ Tested AI-powered features  
✅ Verified all core functionality  

OpenFrame is now ready to transform your MSP operations with AI-powered automation and unified management capabilities.

Ready to learn more? Join the OpenMSP community and start building the future of MSP operations! 🚀