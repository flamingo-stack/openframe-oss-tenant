# First Steps

After getting OpenFrame OSS Tenant up and running, here are the first 5 things to do to get productive.

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)

---

## 1. Register Your First Tenant

OpenFrame uses a multi-tenant architecture. Every user, device, and organization is scoped to a tenant.

### Register via the Authorization Server

Use the tenant registration endpoint to create your first tenant:

```bash
curl -X POST https://localhost/auth/registration/tenant \
  -H "Content-Type: application/json" \
  -d '{
    "tenantDomain": "your-msp-domain",
    "adminEmail": "admin@yourmsp.com",
    "adminPassword": "your-secure-password"
  }'
```

The registration flow:
1. Creates a new tenant record in MongoDB
2. Generates a per-tenant RSA key pair for JWT signing
3. Creates the initial admin user
4. Sets up the OAuth2 client registration

> **Note:** The exact field names and endpoint path may vary based on your deployment configuration. Refer to your environment's `TenantRegistrationController` implementation.

---

## 2. Explore the GraphQL API

The GraphQL API is the primary interface for querying data in OpenFrame. Once authenticated, explore it using the GraphQL playground:

```text
https://localhost/graphql/graphiql
```

### Example: Query Devices

```bash
curl -X POST https://localhost/api/graphql \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ devices { edges { node { id hostname status } } } }"
  }'
```

### Example: Query Organizations

```bash
curl -X POST https://localhost/api/graphql \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ organizations { edges { node { id name status } } } }"
  }'
```

---

## 3. Connect Your First Integration Tool

OpenFrame integrates with popular MSP tools like **Tactical RMM**, **MeshCentral**, and **FleetDM**.

### Via the Management API

```bash
curl -X POST https://localhost/management/v1/tools \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolType": "TACTICAL_RMM",
    "url": "https://your-tactical-rmm-instance.com",
    "credentials": {
      "apiKey": "your-tactical-rmm-api-key"
    }
  }'
```

Once a tool is connected:
- Debezium connectors are automatically provisioned
- Device data begins flowing into MongoDB via Kafka CDC
- Devices become visible in the API and frontend

### Check Tool Health

```bash
curl -X GET "https://localhost/tools/{toolId}/health" \
  -H "Authorization: Bearer <your-access-token>"
```

---

## 4. Install the OpenFrame Client Agent

The OpenFrame Client Agent (`clients/openframe-client`) is a Rust-based agent that runs on managed devices.

### Get the Agent Registration Secret

```bash
curl https://localhost/api/agent/registration-secret/active \
  -H "Authorization: Bearer <your-access-token>"
```

Save the returned registration secret — you'll need it when installing the agent on client machines.

### Configure the Dev Environment (for testing)

Use the provided setup script:

```bash
bash clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script:
1. Prompts for your access token
2. Fetches the active registration secret from the API
3. Generates an initial configuration file for the agent

---

## 5. Set Up SSO (Optional but Recommended)

For production deployments, configure Single Sign-On with Google or Microsoft:

### Configure SSO via the API

```bash
curl -X POST https://localhost/api/sso-config \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "GOOGLE",
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret",
    "allowedDomains": ["yourmsp.com"]
  }'
```

Supported SSO providers:
- **Google** — `GoogleClientRegistrationStrategy`
- **Microsoft** — `MicrosoftClientRegistrationStrategy`

---

## Key Configuration Areas

After initial setup, review these configuration areas:

| Area | Description |
|------|-------------|
| **Tenant Settings** | Domain, registration policy, active status |
| **OAuth2 Clients** | Registered applications and their scopes |
| **API Keys** | External API authentication keys |
| **Agent Registration Secrets** | Keys used by device agents to self-register |
| **Integrated Tools** | Configured RMM, MDM, and remote access tools |
| **User Invitations** | Invite technicians and team members |
| **SSO Configuration** | Google / Microsoft identity provider settings |

---

## Explore the Frontend

OpenFrame includes a full Next.js frontend application located at `openframe/services/openframe-frontend`. It provides:

- **Dashboard** — Overview of devices, customers, and tickets
- **Devices** — Manage all connected endpoints
- **Customers** — Organization management
- **Tickets** — AI-powered help desk (PSA)
- **Mingo** — AI assistant for technicians
- **Scripts** — Remote script execution
- **Monitoring** — Policies and compliance checks
- **Knowledge Base** — Documentation management
- **Settings** — Users, SSO, API keys, billing

---

## Where to Get Help

> **Community Slack:** Join the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for questions, feature requests, and community support.
>
> **Website:** [https://www.openmsp.ai/](https://www.openmsp.ai/)
>
> **OpenFrame Platform:** [https://openframe.ai](https://openframe.ai)

All issues and discussions are managed through the OpenMSP Slack — not GitHub Issues or Discussions.
