# First Steps

Welcome to OpenFrame! Now that you have the platform running, this guide will walk you through the essential first steps to get the most out of your OpenFrame installation.

> **Prerequisites**: Complete the [Quick Start Guide](quick-start.md) before proceeding.

## 5 Essential First Steps

### 1. Complete Your Organization Setup

#### Access Organization Settings
1. Open OpenFrame at http://localhost:3000
2. Navigate to **Settings** (gear icon in sidebar)
3. Go to **Company & Users** tab

#### Configure Organization Details
```mermaid
flowchart LR
    A[Settings] --> B[Company & Users]
    B --> C[Organization Info]
    C --> D[Contact Details]
    D --> E[Save Changes]
```

**Fill in these key details:**

| Field | Purpose | Example |
|-------|---------|---------|
| **Organization Name** | Display name for your MSP | "Acme IT Services" |
| **Domain** | Your business domain | "acmeit.com" |
| **Contact Email** | Support email | "support@acmeit.com" |
| **Phone** | Business phone | "+1-555-123-4567" |
| **Address** | Business address | Full mailing address |

### 2. Set Up Single Sign-On (SSO) 

#### Enable SSO Providers
1. In Settings, go to **SSO Configuration** tab
2. Choose your preferred provider:

**Google SSO Setup:**
1. Click **Configure Google SSO**
2. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console  
3. Set **Allowed Domains**: Your organization's domains
4. Click **Save Configuration**

**Microsoft SSO Setup:**
1. Click **Configure Microsoft SSO**
2. Enter your Azure AD credentials:
   - **Client ID**: From Azure portal
   - **Client Secret**: From Azure portal
   - **Tenant ID**: Your Azure tenant ID
3. Configure domain restrictions
4. Click **Save Configuration**

#### Test SSO
1. Log out of OpenFrame
2. On login page, click **Sign in with Google/Microsoft**
3. Complete OAuth flow
4. Verify automatic account creation

### 3. Create API Keys for Integrations

#### Generate Your First API Key
1. Go to **Settings** → **API Keys** tab
2. Click **Create New API Key**
3. Configure the key:

```text
Name: "Development Integration"
Description: "API key for development and testing"
Permissions: Full Access (for testing)
Rate Limit: 1000 requests/hour
```

4. Click **Generate Key**
5. **Important**: Copy and save the key immediately - it won't be shown again

#### Test Your API Key

```bash
# Set your API key
export OPENFRAME_API_KEY="ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456"

# Test API access
curl -H "Authorization: Bearer $OPENFRAME_API_KEY" \
     http://localhost:8080/api/v1/devices

# Expected response
{
  "devices": [],
  "totalCount": 0,
  "pageInfo": {
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### 4. Add Your First Device

#### Install OpenFrame Client Agent

**On Linux/macOS:**
```bash
# Download and install the client
cd clients/openframe-client
cargo build --release

# Run the client agent
sudo ./target/release/openframe-client \
  --server https://localhost:8080 \
  --registration-secret "your-secret-key"
```

**On Windows:**
```powershell
# Build the client
cd clients\openframe-client
cargo build --release

# Run as administrator
.\target\release\openframe-client.exe ^
  --server https://localhost:8080 ^
  --registration-secret "your-secret-key"
```

#### Get Registration Secret
1. In OpenFrame, go to **Settings** → **Architecture** tab
2. Copy the **Agent Registration Secret**
3. Use this in the client command above

#### Verify Device Registration
1. Go to **Devices** in the sidebar
2. You should see your newly registered device
3. Check device status shows as "Online"

### 5. Explore Key Features

#### Device Management
1. **View Device List**: Navigate to **Devices**
2. **Device Details**: Click on any device to see:
   - System information
   - Installed software
   - Performance metrics
   - Security status

#### Real-Time Logs
1. **Access Logs**: Navigate to **Logs** in sidebar
2. **Filter Logs**: Use the filter dropdown:
   - By severity (Info, Warning, Error)
   - By organization
   - By time range
   - By source device

#### Mingo AI Chat
1. **Open Chat**: Navigate to **Mingo** (chat icon)
2. **Ask Questions**: Try these example queries:
   ```text
   "Show me devices that are offline"
   "What errors occurred in the last hour?"
   "Check the health of server01"
   "Generate a report of Windows devices"
   ```

## Initial Configuration Checklist

After completing the 5 steps above, verify your setup:

- [ ] Organization details are complete
- [ ] SSO is configured and tested  
- [ ] At least one API key is created
- [ ] First device is registered and online
- [ ] You can access all main sections (Devices, Logs, Mingo)
- [ ] User profile is updated with your information

## Understanding the Dashboard

### Navigation Layout

```mermaid
graph TD
    A[Header] --> B[Logo & Org Selector]
    A --> C[User Menu]
    A --> D[Notifications]
    
    E[Sidebar] --> F[Dashboard]
    E --> G[Devices]
    E --> H[Logs]
    E --> I[Mingo AI]
    E --> J[Policies & Queries]
    E --> K[Scripts]  
    E --> L[Organizations]
    E --> M[Settings]
```

### Dashboard Widgets

The main dashboard provides:

| Widget | Information | Action |
|--------|-------------|---------|
| **Devices Overview** | Total, online, offline counts | Click to view devices |
| **Recent Logs** | Latest log entries | Click to view all logs |
| **System Health** | Overall platform status | Monitor key metrics |
| **Chats Overview** | Recent AI interactions | Access Mingo chat |

## Common Initial Tasks

### Adding Team Members

1. Go to **Settings** → **Company & Users**
2. Click **Invite Users**
3. Enter email addresses (one per line)
4. Set role: Admin, User, or Viewer
5. Click **Send Invitations**

### Setting Up Organizations

1. Navigate to **Organizations** in sidebar
2. Click **Create Organization** 
3. Fill in client details:
   - Name and contact information
   - Billing details
   - Primary contact person
4. Save and assign devices to organizations

### Creating Device Groups

1. In **Devices**, select multiple devices
2. Click **Actions** → **Add Tags**
3. Create logical groups like:
   - "Production Servers"
   - "Office Workstations"  
   - "Remote Workers"
   - "Critical Infrastructure"

## Keyboard Shortcuts

Learn these shortcuts to navigate faster:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + /` | Toggle sidebar |
| `G + D` | Go to Devices |
| `G + L` | Go to Logs |
| `G + M` | Go to Mingo |
| `G + S` | Go to Settings |

## Next Steps & Learning Resources

### Immediate Next Steps
1. **Integrate your first tool** - Connect Fleet MDM, Tactical RMM, or MeshCentral
2. **Set up monitoring policies** - Configure alerts and automated responses
3. **Explore GraphQL API** - Visit http://localhost:8080/graphql
4. **Customize your dashboard** - Add widgets and filters

### Learning Resources
- **GraphQL Playground**: http://localhost:8080/graphql
- **API Documentation**: Available in Settings → API Keys
- **OpenMSP Community**: [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Video Tutorials**: Check the YouTube channel for walkthroughs

### Advanced Topics
- **Custom integrations** using the REST/GraphQL APIs
- **Webhook configurations** for external systems
- **Advanced filtering** and search queries
- **Multi-tenant setup** for MSP scenarios

## Getting Help

If you encounter any issues:

1. **Check logs** in the UI for error messages
2. **Verify services** are running with `docker compose ps`
3. **Restart services** if needed with `docker compose restart`
4. **Join our Slack** for community support
5. **Check documentation** for specific features

## Troubleshooting Common Issues

### Device Not Appearing
- Verify agent registration secret
- Check network connectivity to OpenFrame
- Review agent logs for error messages
- Ensure ports 8080 and 4222 are accessible

### SSO Not Working
- Verify OAuth credentials in provider
- Check redirect URIs match exactly
- Ensure domains are whitelisted
- Test with incognito/private browser window

### API Key Issues
- Ensure key is correctly formatted
- Check rate limits haven't been exceeded
- Verify permissions are sufficient
- Use Bearer authentication header

Congratulations! You now have a fully configured OpenFrame installation. Start exploring the platform and integrating your IT infrastructure.