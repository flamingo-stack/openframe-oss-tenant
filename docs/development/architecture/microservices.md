# OpenFrame Components

This document details the major components of the OpenFrame system and their interactions.

## Core Services

### API Gateway
```mermaid
graph TB
    subgraph "API Gateway"
        direction TB
        LB[Load Balancer]
        JWT[JWT Validator]
        RP[Reverse Proxy]
        WS[WebSocket Handler]
    end

    LB --> JWT
    JWT --> RP
    RP --> WS
```

The API Gateway is a reactive server that:
- Validates JWT tokens from OpenFrame API
- Manages reverse proxy to open-source tools
- Handles WebSocket connections
- Injects appropriate API keys for tool access
- Routes traffic based on service discovery

### Authentication Service
```mermaid
graph TB
    subgraph "Authentication Service"
        direction TB
        JWT[JWT Generator]
        RBAC[RBAC Manager]
        MACHINE[Machine Identity]
    end

    JWT --> RBAC
    RBAC --> MACHINE
```

The Authentication Service:
- Generates and validates JWT tokens
- Manages role-based access control
- Handles machine identity tokens
- Integrates with Spring Security

### Data Service
```mermaid
graph TB
    subgraph "Data Service"
        direction TB
        PIPELINE[Data Pipeline]
        STREAM[Stream Processor]
        STORE[Data Store]
    end

    PIPELINE --> STREAM
    STREAM --> STORE
```

The Data Service manages:
- Data pipeline orchestration
- Stream processing
- Data storage and retrieval
- Real-time analytics

## Integration Layer

### Open Source Tools Integration
```mermaid
graph TB
    subgraph "Tool Integration"
        direction TB
        TR[TacticalRMM]
        MC[MeshCentral]
        AK[Authentik]
        FD[FleetDM]
    end

    subgraph "Integration Layer"
        API[API Adapter]
        AGENT[Agent Manager]
        PROXY[Proxy Service]
    end

    API --> TR
    API --> MC
    API --> AK
    API --> FD
    AGENT --> API
    PROXY --> API
```

Each tool integration provides:
- Standardized API interface
- Agent management
- Secure proxy access
- Data synchronization

## Data Processing

### Data Pipeline
```mermaid
graph LR
    subgraph "Data Sources"
        DB[Databases]
        LOG[Logs]
        METRICS[Metrics]
    end

    subgraph "Processing"
        KAFKA[Kafka]
        STREAM[Stream Processing Service]
        ML[ML Engine]
    end

    subgraph "Storage"
        MONGO[MongoDB]
        CASS[Cassandra]
        PINOT[Pinot]
        REDIS[Redis]
    end

    DB --> KAFKA
    LOG --> KAFKA
    METRICS --> KAFKA
    KAFKA --> STREAM
    STREAM --> ML
    STREAM --> MONGO
    STREAM --> CASS
    STREAM --> PINOT
    ML --> REDIS
```

The data pipeline:
- Collects data from various sources
- Processes and transforms data
- Applies machine learning models
- Stores data in appropriate databases

## AI and Analytics

### AI Service
```mermaid
graph TB
    subgraph "AI Service"
        direction TB
        ML[ML Engine]
        INFERENCE[Inference Engine]
        RESOLUTION[Resolution Engine]
    end

    ML --> INFERENCE
    INFERENCE --> RESOLUTION
```

The AI Service provides:
- Anomaly detection
- Issue inference
- Automated resolution
- Pattern recognition

## Dashboard and UI

### Unified Dashboard
```mermaid
graph TB
    subgraph "Dashboard Components"
        direction TB
        MONITOR[Monitoring]
        ANALYTICS[Analytics]
        AUTOMATION[Automation]
        SIEM[SIEM View]
    end

    MONITOR --> ANALYTICS
    ANALYTICS --> AUTOMATION
    AUTOMATION --> SIEM
```

The dashboard offers:
- Unified monitoring view
- Real-time analytics
- Automation controls
- SIEM-like interface
- NIST-compliant views

## Security Components

### Security Layer
```mermaid
graph TB
    subgraph "Security Components"
        direction TB
        VPC[VPC]
        JWT[JWT]
        API[API Keys]
        MACHINE[Machine Identity]
    end

    VPC --> JWT
    JWT --> API
    API --> MACHINE
```

Security features include:
- VPC isolation
- JWT authentication
- API key management
- Machine identity tokens
- Network security policies

## Component Interactions

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Data
    participant AI
    participant Tools

    Client->>Gateway: Request
    Gateway->>Auth: Validate
    Auth-->>Gateway: Token Valid
    Gateway->>Data: Get Data
    Gateway->>AI: Process
    Gateway->>Tools: Execute
    Tools-->>Gateway: Response
    Gateway-->>Client: Result
```

## Next Steps

- [Security Implementation](../security/)
- [Data Pipeline Details](./data-pipeline/)
- [AI and Analytics](./ai-analytics/)
- [API Integration](./api-integration/)
- [Deployment Guide](../deployment/) 