# OpenFrame API Integration

This document details how OpenFrame integrates with various open-source tools and provides a unified API interface.

## Overview

```mermaid
graph TB
    subgraph "OpenFrame Platform"
        direction TB
        AG[API Gateway]
        AUTH[Auth Service]
        MCP[MCP Server]
        UI[Dashboard UI]
    end

    subgraph "Open Source Tools"
        direction TB
        TR[TacticalRMM]
        MC[MeshCentral]
        AK[Authentik]
        FD[FleetDM]
    end

    subgraph "Integration Layer"
        direction TB
        ADAPTER[API Adapter]
        PROXY[Proxy Service]
        WS[WebSocket]
    end

    UI --> AG
    AG --> AUTH
    AG --> MCP
    MCP --> ADAPTER
    ADAPTER --> PROXY
    PROXY --> TR
    PROXY --> MC
    PROXY --> AK
    PROXY --> FD
    WS --> ADAPTER
```

## API Gateway

### Request Flow
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Adapter
    participant Tool

    Client->>Gateway: Request
    Gateway->>Auth: Validate JWT
    Auth-->>Gateway: Token Valid
    Gateway->>Adapter: Route Request
    Adapter->>Tool: Proxy Request
    Tool-->>Adapter: Response
    Adapter-->>Gateway: Process Response
    Gateway-->>Client: Response
```

### WebSocket Support
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant WS
    participant Tool

    Client->>Gateway: WS Connect
    Gateway->>WS: Upgrade Connection
    WS->>Tool: Proxy WS
    Tool-->>WS: WS Data
    WS-->>Client: Forward Data
```

## Tool Integration

### TacticalRMM Integration
```mermaid
graph LR
    subgraph "TacticalRMM"
        direction LR
        API[API]
        AGENT[Agent]
        TASKS[Tasks]
    end

    subgraph "Integration"
        direction LR
        ADAPTER[Adapter]
        PROXY[Proxy]
        WS[WebSocket]
    end

    API --> ADAPTER
    AGENT --> ADAPTER
    TASKS --> ADAPTER
    ADAPTER --> PROXY
    ADAPTER --> WS
```

### MeshCentral Integration
```mermaid
graph LR
    subgraph "MeshCentral"
        direction LR
        API[API]
        DEVICE[Device]
        CONTROL[Control]
    end

    subgraph "Integration"
        direction LR
        ADAPTER[Adapter]
        PROXY[Proxy]
        WS[WebSocket]
    end

    API --> ADAPTER
    DEVICE --> ADAPTER
    CONTROL --> ADAPTER
    ADAPTER --> PROXY
    ADAPTER --> WS
```

## Unified API Interface

### API Structure
```mermaid
graph TB
    subgraph "API Structure"
        direction TB
        AUTH[Authentication]
        DEVICE[Device Management]
        MONITOR[Monitoring]
        TASK[Task Management]
    end

    AUTH --> DEVICE
    DEVICE --> MONITOR
    MONITOR --> TASK
```

### Endpoint Convention
```mermaid
graph LR
    subgraph "Endpoint Pattern"
        direction LR
        TOOL[Tool]
        RESOURCE[Resource]
        ACTION[Action]
    end

    TOOL --> RESOURCE
    RESOURCE --> ACTION
```

## Integration Features

### Authentication
```mermaid
graph TB
    subgraph "Authentication"
        direction TB
        JWT[JWT]
        API[API Key]
        MACHINE[Machine Identity]
    end

    JWT --> API
    API --> MACHINE
```

### Authorization
```mermaid
graph TB
    subgraph "Authorization"
        direction TB
        RBAC[RBAC]
        POLICY[Policy]
        AUDIT[Audit]
    end

    RBAC --> POLICY
    POLICY --> AUDIT
```

## API Security

### Security Flow
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Tool

    Client->>Gateway: Request
    Gateway->>Auth: Validate
    Auth-->>Gateway: Authorized
    Gateway->>Tool: Secure Request
    Tool-->>Gateway: Response
    Gateway-->>Client: Secure Response
```

### Security Features
- JWT validation
- API key injection
- Request signing
- Response encryption

## Integration Patterns

### REST API Pattern
```mermaid
graph LR
    subgraph "REST Pattern"
        direction LR
        GET[GET]
        POST[POST]
        PUT[PUT]
        DELETE[DELETE]
    end

    GET --> POST
    POST --> PUT
    PUT --> DELETE
```

### WebSocket Pattern
```mermaid
graph LR
    subgraph "WebSocket Pattern"
        direction LR
        CONNECT[Connect]
        SUBSCRIBE[Subscribe]
        MESSAGE[Message]
        CLOSE[Close]
    end

    CONNECT --> SUBSCRIBE
    SUBSCRIBE --> MESSAGE
    MESSAGE --> CLOSE
```

## Error Handling

### Error Flow
```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Adapter
    participant Tool

    Client->>Gateway: Request
    Gateway->>Adapter: Process
    Adapter->>Tool: Request
    Tool-->>Adapter: Error
    Adapter-->>Gateway: Transform Error
    Gateway-->>Client: Error Response
```

### Error Types
- Authentication errors
- Authorization errors
- Validation errors
- Service errors

## Monitoring

### API Monitoring
```mermaid
graph TB
    subgraph "Monitoring"
        direction TB
        LATENCY[Latency]
        ERRORS[Errors]
        THROUGHPUT[Throughput]
        HEALTH[Health]
    end

    LATENCY --> ERRORS
    ERRORS --> THROUGHPUT
    THROUGHPUT --> HEALTH
```

### Integration Monitoring
```mermaid
graph TB
    subgraph "Integration"
        direction TB
        STATUS[Status]
        METRICS[Metrics]
        ALERTS[Alerts]
        LOGS[Logs]
    end

    STATUS --> METRICS
    METRICS --> ALERTS
    ALERTS --> LOGS
```

## Next Steps

- [Security Implementation](../security/)
- [Deployment Guide](../deployment/)
- [Development Guide](../development/)
- [Operations Guide](../operations/) 