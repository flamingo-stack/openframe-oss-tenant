# Client Service Agent Ingest

## Overview

The **Client Service Agent Ingest** module is the entry point for all machine-level interactions between deployed agents and the OpenFrame backend. It is responsible for:

- Agent authentication and token issuance
- Agent registration and machine onboarding
- Tool agent asset distribution
- Real-time machine state ingestion via NATS (heartbeats, connections, installed agents)
- Transformation of external tool identifiers into platform-consumable IDs

This module acts as the bridge between:

- ✅ Installed agents running on client machines  
- ✅ Integrated tools such as Fleet MDM and MeshCentral  
- ✅ The messaging backbone (NATS / JetStream)  
- ✅ Core data services (Mongo, tool services, machine services)

It is deployed via the `ClientApplication` entrypoint in the service applications layer and integrates tightly with data, messaging, and security modules.

---

## High-Level Architecture

```mermaid
flowchart LR
    Agent["Client Agent"] -->|"POST /api/agents/register"| AgentController
    Agent -->|"POST /oauth/token"| AgentAuthController
    Agent -->|"GET /tool-agent/{assetId}"| ToolAgentFileController

    AgentController --> AgentRegistrationService
    AgentAuthController --> AgentAuthService

    Agent -->|"machine.*.heartbeat"| NatsBroker
    Agent -->|"machine.*.installed-agent"| NatsBroker
    Agent -->|"machine.*.tool-connection"| NatsBroker

    NatsBroker --> MachineHeartbeatListener
    NatsBroker --> InstalledAgentListener
    NatsBroker --> ToolConnectionListener

    MachineHeartbeatListener --> MachineStatusService
    InstalledAgentListener --> InstalledAgentService
    ToolConnectionListener --> ToolConnectionService

    AgentRegistrationService --> MongoDB[("Mongo Database")]
    MachineStatusService --> MongoDB
    InstalledAgentService --> MongoDB
    ToolConnectionService --> MongoDB
```

The module exposes REST endpoints for synchronous operations and subscribes to NATS subjects for asynchronous ingestion.

---

# Core Responsibilities

## 1. Agent Authentication

### AgentAuthController

**Endpoint:**

```text
POST /oauth/token
```

This controller delegates to `AgentAuthService` to issue tokens for client agents. It supports:

- `grant_type`
- `refresh_token`
- `client_id`
- `client_secret`

### Flow

```mermaid
sequenceDiagram
    participant Agent
    participant Controller as AgentAuthController
    participant Service as AgentAuthService

    Agent->>Controller: POST /oauth/token
    Controller->>Service: issueClientToken(...)
    Service-->>Controller: AgentTokenResponse
    Controller-->>Agent: 200 JSON token
```

Error handling:

- `IllegalArgumentException` → 401 Unauthorized
- Unexpected error → 400 with `server_error`

### PasswordEncoderConfig

Provides a `BCryptPasswordEncoder` bean used for secure credential validation.

```text
@Bean
public PasswordEncoder passwordEncoder()
```

---

## 2. Agent Registration

### AgentController

**Endpoint:**

```text
POST /api/agents/register
Header: X-Initial-Key
Body: AgentRegistrationRequest
```

This is the primary onboarding endpoint for machines.

### AgentRegistrationRequest

Captures complete machine metadata:

- Core identification (hostname, organizationId)
- Network information (ip, macAddress, osUuid)
- Agent metadata (agentVersion, status)
- Hardware details (serialNumber, manufacturer, model)
- OS details (type, version, build, timezone)

### Registration Flow

```mermaid
flowchart TD
    A["Agent"] -->|"Register Request"| B["AgentController"]
    B --> C["AgentRegistrationService"]
    C --> D["Persist Machine"]
    C --> E["AgentRegistrationProcessor"]
    E --> F["DefaultAgentRegistrationProcessor"]
    D --> G["Return Registration Response"]
```

### DefaultAgentRegistrationProcessor

- Activated when no custom `AgentRegistrationProcessor` is defined
- Provides a no-op post-processing hook
- Allows integrators to override behavior without modifying core logic

This extension point enables:

- Custom enrichment
- External system synchronization
- Validation or transformation hooks

---

## 3. Tool Agent Asset Distribution

### ToolAgentFileController

**Endpoint:**

```text
GET /tool-agent/{assetId}?os={mac|windows}
```

Purpose:

- Serves downloadable tool agent binaries
- OS-aware filename resolution
- Temporary hardcoded implementation (intended to be replaced by artifact storage)

Flow logic:

```mermaid
flowchart TD
    A["Request Asset"] --> B{"OS Type"}
    B -->|"mac"| C["Return raw asset"]
    B -->|"windows"| D["Append .exe"]
    B -->|"unknown"| E["Throw Error"]
```

---

## 4. Real-Time Machine State Ingestion (NATS)

The module subscribes to NATS subjects to process asynchronous events.

### Subjects

```text
machine.*.heartbeat
machine.*.installed-agent
machine.*.tool-connection
```

---

## 4.1 MachineHeartbeatListener

- Subscribes to `machine.*.heartbeat`
- Uses `NatsTopicMachineIdExtractor`
- Generates service-side timestamp
- Delegates to `MachineStatusService.processHeartbeat`

### Flow

```mermaid
flowchart TD
    A["Heartbeat Message"] --> B["MachineHeartbeatListener"]
    B --> C["Extract machineId"]
    B --> D["MachineStatusService"]
    D --> E["Update lastSeen timestamp"]
```

---

## 4.2 InstalledAgentListener (JetStream)

- Stream: `INSTALLED_AGENTS`
- Subject: `machine.*.installed-agent`
- Durable consumer with:
  - Explicit ack
  - Max deliver: 50
  - Ack wait: 30s

### Processing Logic

```mermaid
flowchart TD
    A["InstalledAgentMessage"] --> B["InstalledAgentListener"]
    B --> C["Extract machineId"]
    B --> D["InstalledAgentService.addInstalledAgent"]
    D --> E{"Success?"}
    E -->|"Yes"| F["message.ack()"]
    E -->|"No"| G["Redelivery"]
```

Supports retry semantics via JetStream metadata and `deliveredCount`.

---

## 4.3 ToolConnectionListener (JetStream)

- Stream: `TOOL_CONNECTIONS`
- Subject: `machine.*.tool-connection`
- Durable consumer with delivery group

Processes `ToolConnectionMessage` and delegates to:

```text
ToolConnectionService.addToolConnection(machineId, toolType, agentToolId, lastAttempt)
```

Ensures idempotent retry handling using `deliveredCount`.

---

# Tool Agent ID Transformation Layer

The module supports transformation of external tool identifiers into platform-standard IDs.

## FleetMdmAgentIdTransformer

Tool Type: `FLEET_MDM`

Responsibilities:

- Resolve integrated tool configuration
- Fetch API URL and credentials
- Call Fleet MDM API via `FleetMdmClient`
- Search host by UUID
- Convert UUID → Fleet host ID

### Flow

```mermaid
flowchart TD
    A["UUID from Agent"] --> B["FleetMdmAgentIdTransformer"]
    B --> C["IntegratedToolService"]
    B --> D["ToolUrlService"]
    B --> E["FleetMdmClient.searchHosts"]
    E --> F{"Matching Host?"}
    F -->|"Yes"| G["Return Host ID"]
    F -->|"No & Not Last"| H["Throw Error"]
    F -->|"No & Last"| I["Return UUID"]
```

This enables delayed consistency if the external system is not immediately synchronized.

---

## MeshCentralAgentIdTransformer

Tool Type: `MESHCENTRAL`

Behavior:

```text
transformedId = "node//" + agentToolId
```

Provides simple prefix normalization for MeshCentral identifiers.

---

# Metrics Ingestion Model

### MetricsMessage

Represents telemetry:

- `machineId`
- `cpu`
- `memory`
- `timestamp`

Intended for streaming ingestion and analytics pipelines.

---

# Integration with the Platform

The Client Service Agent Ingest module interacts with:

- Data layer (Mongo documents and repositories)
- Integrated tool services
- NATS messaging infrastructure
- Security and OAuth services

## Deployment Context

```mermaid
flowchart LR
    ClientApplication --> ClientServiceAgentIngest
    ClientServiceAgentIngest --> NATS
    ClientServiceAgentIngest --> Mongo
    ClientServiceAgentIngest --> ToolServices
```

It runs as part of the client service application tier and acts as the operational backbone for machine lifecycle management.

---

# Extension Points

The module is intentionally extensible:

- `AgentRegistrationProcessor` (custom post-registration logic)
- ToolAgentIdTransformer implementations
- Service-level overrides via Spring beans
- JetStream consumer configuration adjustments

---

# Summary

The **Client Service Agent Ingest** module is the real-time ingestion and onboarding layer of OpenFrame. It:

- Authenticates agents
- Registers machines
- Processes live heartbeat and connection events
- Normalizes tool identifiers
- Ensures durable message processing
- Provides extension hooks for platform customization

It is critical for maintaining accurate, real-time machine state across distributed client environments.