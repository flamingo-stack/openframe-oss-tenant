# OpenFrame Architecture Overview

OpenFrame is a comprehensive system that unifies various open-source IT and security products under a single platform, providing integrated data management, AI capabilities, dashboards, APIs, and security layers.

## System Architecture

```mermaid
graph TB
    subgraph "OpenFrame Platform"
        AG[API Gateway]
        AS[Authentication Service]
        DS[Data Service]
        AIS[AI Service]
        UI[Dashboard UI]
    end

    subgraph "Open Source Tools"
        TR[TacticalRMM]
        MC[MeshCentral]
        AK[Authentik]
        FD[FleetDM]
    end

    subgraph "Data Layer"
        NF[Apache NiFi]
        KF[Kafka]
        CS[Cassandra]
        PT[Apache Pinot]
    end

    subgraph "Security Layer"
        VPC[VPC]
        JWT[JWT Auth]
        API[API Keys]
    end

    UI --> AG
    AG --> AS
    AG --> DS
    AG --> AIS
    AG --> VPC
    VPC --> TR
    VPC --> MC
    VPC --> AK
    VPC --> FD
    DS --> NF
    NF --> KF
    KF --> CS
    KF --> PT
```

## Core Components

### 1. Deployment Management
- Kubernetes-based deployment of all components
- VPC isolation for open-source tools
- Automated API key generation and management
- Internal microservices orchestration

### 2. Security Layer
- JWT-based authentication via Spring Security
- OpenFrame Gateway for request proxying
- VPC isolation for open-source tools
- Machine identity token management
- WebSocket/API client agent support

### 3. Data Layer
- Apache NiFi for data pipeline management
- Kafka for pub/sub messaging
- Cassandra for data storage
- Apache Pinot for real-time analytics
- Unified data structure and indexing

### 4. AI and Analytics
- Deep/machine learning for anomaly detection
- AI-powered issue resolution
- Log analysis and inference
- Automated problem resolution via MCP server

### 5. Unified Interface
- Integrated dashboard for all tools
- NIST-compliant unified objects
- SIEM-like log management
- Automation and orchestration capabilities

## Key Features

1. **Unified Access**
   - Single authentication point
   - Centralized API management
   - Secure proxy for all tools

2. **Data Integration**
   - Real-time data streaming
   - Unified data structure
   - Advanced analytics capabilities

3. **Intelligent Operations**
   - AI-powered issue resolution
   - Automated problem detection
   - Smart orchestration

4. **Comprehensive Monitoring**
   - Unified monitoring dashboard
   - Integrated logging
   - Performance analytics

## Security Architecture

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant Tool

    Client->>Gateway: Request
    Gateway->>Auth: Validate JWT
    Auth-->>Gateway: Token Valid
    Gateway->>Tool: Proxy Request + API Key
    Tool-->>Gateway: Response
    Gateway-->>Client: Response
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Data Sources"
        OS[Open Source DBs]
        AG[Agent Data]
        LG[Logs]
    end

    subgraph "Processing"
        KF[Kafka]
        NF[NiFi]
        ML[ML Engine]
    end

    subgraph "Storage"
        CS[Cassandra]
        PT[Pinot]
    end

    OS --> KF
    AG --> KF
    LG --> KF
    KF --> NF
    NF --> ML
    NF --> CS
    NF --> PT
```

## Next Steps

- [Detailed Component Documentation](./components/)
- [Security Implementation](./security/)
- [Data Pipeline Architecture](./data-pipeline/)
- [AI and Analytics](./ai-analytics/)
- [API Integration](./api-integration/)
- [Deployment Guide](../deployment/) 