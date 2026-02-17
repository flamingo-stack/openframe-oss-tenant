# First Steps with OpenFrame OSS Tenant

Congratulations on getting OpenFrame running! This guide walks you through the first 5 essential steps to start using and configuring the platform effectively.

> **Prerequisite**: Complete the [Quick Start Guide](quick-start.md) to ensure OpenFrame is running.

## Overview of What You'll Accomplish

After following this guide, you'll have:

1. ✅ **Explored the API endpoints** and GraphQL playground
2. ✅ **Set up your first tenant** and user account
3. ✅ **Configured basic integrations** with MSP tools
4. ✅ **Tested agent registration** and device management
5. ✅ **Understood monitoring and logging** capabilities

Let's dive in!

---

## Step 1: Explore the API Landscape

OpenFrame provides multiple API endpoints for different purposes. Let's explore what's available.

### GraphQL Playground (Recommended Starting Point)

Access the GraphQL playground to explore the schema interactively:

**URL**: `http://localhost:8080/graphql`

**First Query - Test Connection:**

```graphql
query HealthCheck {
  __schema {
    queryType {
      name
    }
  }
}
```

**Explore Available Data:**

```graphql
query ExploreSchema {
  __schema {
    types {
      name
      kind
      description
    }
  }
}
```

### Key GraphQL Queries to Try

**1. Device Management:**

```graphql
query GetDevices {
  devices(first: 10) {
    edges {
      node {
        id
        name
        status
        deviceType
        lastSeen
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**2. Organization Listing:**

```graphql
query GetOrganizations {
  organizations(first: 5) {
    edges {
      node {
        id
        name
        contactInformation {
          email
          phone
        }
      }
    }
  }
}
```

**3. Event Stream:**

```graphql
query GetRecentEvents {
  events(first: 20, orderBy: TIMESTAMP_DESC) {
    edges {
      node {
        id
        type
        timestamp
        source
        message
      }
    }
  }
}
```

### REST API Endpoints

**Health and Status:**

```bash
# Overall system health
curl http://localhost:8080/actuator/health

# Service metrics
curl http://localhost:8080/actuator/metrics

# Platform version
curl http://localhost:8080/api/release-version
```

**External API (Public Endpoints):**

```bash
# Device information (requires API key)
curl -H "X-API-Key: your-api-key" \
     http://localhost:8081/api/v1/devices

# Organization details
curl -H "X-API-Key: your-api-key" \
     http://localhost:8081/api/v1/organizations
```

---

## Step 2: Set Up Your First Tenant and User

OpenFrame is multi-tenant by design. Let's create your first tenant and administrative user.

### Understanding Tenants

In OpenFrame:
- **Tenant** = An MSP organization (your company or a customer)
- **Users** = People within that tenant/organization
- **Isolation** = Complete data separation between tenants

### Create a Tenant (via Authorization Server)

**Option 1: Using Development Scripts**

If available, use the development initialization script:

```bash
# Run the development setup script
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

**Option 2: Direct API Calls**

```bash
# Create tenant registration request
curl -X POST "http://localhost:9000/register/tenant" \
     -H "Content-Type: application/json" \
     -d '{
       "domain": "yourmsp.local",
       "organizationName": "Your MSP Company",
       "contactEmail": "admin@yourmsp.local",
       "adminUserDetails": {
         "firstName": "Admin",
         "lastName": "User",
         "email": "admin@yourmsp.local"
       }
     }'
```

### Verify Tenant Setup

**Check tenant in MongoDB:**

```bash
# Connect to MongoDB
docker exec -it mongodb mongosh

# Switch to OpenFrame database
use openframe

# List tenants
db.tenants.find().pretty()

# List users
db.users.find().pretty()
```

### Access Token Generation

After tenant setup, you'll need access tokens for API calls:

**Get OAuth2 Token:**

```bash
curl -X POST "http://localhost:9000/oauth2/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=your-client-id&client_secret=your-client-secret"
```

---

## Step 3: Configure Basic Integrations

OpenFrame integrates with various MSP tools. Let's configure basic integrations to see data flowing through the system.

### Available Integration Types

OpenFrame supports these tool categories:

| Tool Type | Purpose | Examples |
|-----------|---------|----------|
| **Remote Monitoring & Management (RMM)** | Device management | TacticalRMM |
| **Mobile Device Management (MDM)** | Fleet management | FleetDM |
| **Remote Access** | Device control | MeshCentral |
| **Password Management** | Credential storage | Custom integrations |
| **Ticketing Systems** | Issue tracking | Custom integrations |

### Configure TacticalRMM Integration

**1. Create Tool Connection:**

```bash
# Add TacticalRMM tool via API
curl -X POST "http://localhost:8080/api/tools" \
     -H "Authorization: Bearer your-access-token" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "TacticalRMM Instance",
       "toolType": "TACTICAL_RMM", 
       "toolUrls": [
         {
           "type": "API_URL",
           "url": "https://your-tacticalrmm.com/api"
         }
       ],
       "credentials": {
         "apiKey": "your-tactical-rmm-api-key"
       }
     }'
```

**2. Test Connection:**

```bash
# Test tool connectivity
curl -X POST "http://localhost:8080/api/tools/test-connection" \
     -H "Authorization: Bearer your-access-token" \
     -H "Content-Type: application/json" \
     -d '{"toolId": "your-tool-id"}'
```

### Configure FleetDM Integration

```bash
# Add FleetDM tool
curl -X POST "http://localhost:8080/api/tools" \
     -H "Authorization: Bearer your-access-token" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Fleet Instance",
       "toolType": "FLEET_MDM",
       "toolUrls": [
         {
           "type": "API_URL", 
           "url": "https://your-fleet.com"
         }
       ],
       "credentials": {
         "apiKey": "your-fleet-api-key"
       }
     }'
```

### Verify Integration Data Flow

**Check Event Stream:**

```bash
# Monitor events from integrations
curl -X GET "http://localhost:8080/api/events?source=TACTICAL_RMM" \
     -H "Authorization: Bearer your-access-token"
```

**Monitor Kafka Topics:**

```bash
# List Kafka topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Watch integration events
docker exec kafka kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic integrated-tool-events \
    --from-beginning
```

---

## Step 4: Test Agent Registration and Device Management

OpenFrame agents run on managed devices and report back to the platform. Let's test the agent registration process.

### Generate Agent Registration Secret

**Via API:**

```bash
# Generate new registration secret
curl -X POST "http://localhost:8080/api/agent/registration-secret" \
     -H "Authorization: Bearer your-access-token" \
     -H "Content-Type: application/json" \
     -d '{
       "organizationId": "your-org-id",
       "description": "Test environment secret"
     }'
```

**Via Development Script:**

```bash
# Use the development configuration script
./clients/openframe-client/scripts/setup_dev_init_config.sh
```

### Simulate Agent Registration

**Manual Registration Test:**

```bash
# Simulate agent registration
curl -X POST "http://localhost:8080/api/agent/register" \
     -H "Content-Type: application/json" \
     -d '{
       "registrationSecret": "your-registration-secret",
       "machineInfo": {
         "hostname": "test-machine",
         "platform": "linux",
         "architecture": "x86_64",
         "osVersion": "Ubuntu 22.04"
       }
     }'
```

### Monitor Device Status

**Check Device Registration:**

```graphql
query CheckDevices {
  devices(first: 10) {
    edges {
      node {
        id
        name
        status
        platform
        lastSeen
        installedAgents {
          agentId
          toolType
          status
        }
      }
    }
  }
}
```

**View Device Details:**

```bash
# Get specific device information
curl -X GET "http://localhost:8080/api/devices/{device-id}" \
     -H "Authorization: Bearer your-access-token"
```

### Test Agent Heartbeat

Agents send periodic heartbeats to maintain connection status:

```bash
# Simulate heartbeat
curl -X POST "http://localhost:8080/api/agent/heartbeat" \
     -H "Authorization: Bearer your-agent-token" \
     -H "Content-Type: application/json" \
     -d '{
       "machineId": "your-machine-id",
       "status": "ONLINE",
       "systemInfo": {
         "cpuUsage": 25.5,
         "memoryUsage": 60.2,
         "diskUsage": 45.8
       }
     }'
```

---

## Step 5: Understand Monitoring and Logging

OpenFrame provides comprehensive monitoring and logging capabilities. Let's explore what's available.

### Application Metrics (Prometheus)

**Access Metrics Endpoints:**

```bash
# API service metrics
curl http://localhost:8080/actuator/prometheus

# Gateway service metrics
curl http://localhost:8761/actuator/prometheus

# Authorization server metrics
curl http://localhost:9000/actuator/prometheus
```

**Key Metrics to Monitor:**

- `http_requests_total` - Request volume by service
- `jvm_memory_used_bytes` - Memory usage
- `kafka_producer_records_sent_total` - Message throughput
- `mongodb_connections_active` - Database connections

### Log Aggregation

**View Application Logs:**

```bash
# API service logs
docker-compose logs -f openframe-api

# Stream service logs (event processing)
docker-compose logs -f openframe-stream

# All services
docker-compose logs -f
```

**Query Logs via API:**

```graphql
query GetSystemLogs {
  logs(first: 50, filters: {
    severity: [ERROR, WARN],
    timeRange: {
      start: "2024-01-01T00:00:00Z",
      end: "2024-01-31T23:59:59Z"
    }
  }) {
    edges {
      node {
        id
        timestamp
        severity
        message
        source
        details
      }
    }
  }
}
```

### Event Stream Monitoring

**Monitor Event Processing:**

```bash
# Watch Kafka event topics
docker exec kafka kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic unified-events

# Monitor NATS streams
docker exec nats nats stream info
```

**Check Event Processing Health:**

```bash
# Stream service health
curl http://localhost:8083/actuator/health

# Check processing lag
curl http://localhost:8083/actuator/metrics/kafka.consumer.lag
```

### Database Monitoring

**MongoDB Health:**

```bash
# MongoDB connection status
docker exec mongodb mongosh --eval "db.adminCommand('ismaster')"

# Database statistics
docker exec mongodb mongosh --eval "db.stats()"

# Collection sizes
docker exec mongodb mongosh --eval "
  use openframe;
  db.stats();
  db.devices.count();
  db.events.count();
  db.organizations.count();
"
```

### Set Up Basic Alerting

**Create Health Check Script:**

```bash
#!/bin/bash
# save as health-check.sh

services=("api:8080" "gateway:8761" "authz:9000" "external-api:8081")

for service in "${services[@]}"; do
    name="${service%%:*}"
    port="${service##*:}"
    
    if curl -s "http://localhost:$port/actuator/health" | grep -q "UP"; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is unhealthy"
    fi
done
```

**Run Periodic Checks:**

```bash
# Make executable
chmod +x health-check.sh

# Run every 5 minutes (add to cron)
*/5 * * * * /path/to/health-check.sh >> /var/log/openframe-health.log
```

---

## Summary of What You've Accomplished

🎉 **Congratulations!** You've successfully:

1. **✅ Explored OpenFrame APIs** - GraphQL and REST endpoints
2. **✅ Set up multi-tenant architecture** - Created tenants and users  
3. **✅ Configured tool integrations** - Connected TacticalRMM/FleetDM
4. **✅ Tested agent management** - Registration and heartbeat flows
5. **✅ Implemented monitoring** - Metrics, logs, and health checks

## Common Next Steps

### For MSP Operations Teams:
- Configure real tool integrations with your existing RMM/MDM systems
- Set up organization hierarchies and user permissions  
- Configure automated scripts and policies
- Implement custom alerting and dashboards

### For Development Teams:
- Explore the codebase architecture in the [Development Guide](../development/README.md)
- Set up local development environment with hot reload
- Learn about extending integrations and adding custom tools
- Understand the event-driven architecture and message flows

### For System Administrators:
- Plan production deployment strategies
- Configure backup and disaster recovery
- Set up monitoring and alerting infrastructure  
- Implement security hardening and access controls

## Getting Help

- **OpenMSP Slack Community**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **OpenFrame Documentation**: https://www.flamingo.run/openframe
- **Architecture Details**: Review the `./architecture/` directory documentation

## Troubleshooting Common Issues

### API Authentication Errors

**Problem**: `401 Unauthorized` responses

**Solution**:
```bash
# Verify token is valid and not expired
curl -H "Authorization: Bearer your-token" \
     http://localhost:8080/api/me

# Generate new token if needed
```

### Integration Connection Failures

**Problem**: Tool integrations showing as disconnected

**Solution**:
```bash
# Check tool configuration
curl -X GET "http://localhost:8080/api/tools/{tool-id}/test-connection"

# Verify network connectivity and credentials
# Check integration logs in the stream service
```

### No Events Showing

**Problem**: Event stream appears empty

**Solution**:
```bash
# Check Kafka connectivity
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Verify stream service is processing
curl http://localhost:8083/actuator/health

# Check if integrations are sending data
```

---

**Next Steps**: Dive deeper into OpenFrame development by exploring the [Development Guide](../development/README.md) or learn about production deployment strategies.