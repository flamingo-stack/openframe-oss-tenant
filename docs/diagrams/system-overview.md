# System Overview

This diagram shows the high-level architecture of OpenFrame, including its core components and their relationships.

```mermaid
graph TB
    subgraph Client
        UI[Web UI]
        API[API Client]
        Agent[OpenFrame Agent]
    end

    subgraph Kubernetes Cluster
        subgraph Ingress
            IG[Ingress Gateway]
        end

        subgraph Core Services
            AG[API Gateway]
            AS[Authentication Service]
            DMS[Device Management Service]
            MS[Monitoring Service]
            RS[Reporting Service]
        end

        subgraph Data Storage
            CS[(Cassandra)]
            RD[(Redis)]
            PG[(PostgreSQL)]
        end

        subgraph Infrastructure
            SM[Service Mesh]
            MON[Monitoring Stack]
        end
    end

    %% Client connections
    UI --> IG
    API --> IG
    Agent --> IG

    %% Ingress to services
    IG --> AG

    %% Service mesh connections
    AG --> AS
    AG --> DMS
    AG --> MS
    AG --> RS

    %% Data storage connections
    AS --> PG
    DMS --> CS
    MS --> RD
    RS --> CS
    RS --> PG

    %% Infrastructure connections
    SM --> AG
    SM --> AS
    SM --> DMS
    SM --> MS
    SM --> RS

    MON --> AG
    MON --> AS
    MON --> DMS
    MON --> MS
    MON --> RS

    %% Styling
    classDef client fill:#f9f,stroke:#333,stroke-width:2px
    classDef service fill:#bbf,stroke:#333,stroke-width:2px
    classDef storage fill:#bfb,stroke:#333,stroke-width:2px
    classDef infra fill:#fbb,stroke:#333,stroke-width:2px

    class UI,API,Agent client
    class AG,AS,DMS,MS,RS service
    class CS,RD,PG storage
    class SM,MON infra
```

## Component Description

### Client Layer
- **Web UI**: Browser-based interface for users
- **API Client**: External applications using OpenFrame API
- **OpenFrame Agent**: Software installed on monitored devices

### Core Services
- **API Gateway**: Entry point for all requests
- **Authentication Service**: Handles user authentication and authorization
- **Device Management Service**: Manages device registration and configuration
- **Monitoring Service**: Collects and processes monitoring data
- **Reporting Service**: Generates reports and analytics

### Data Storage
- **Cassandra**: Stores monitoring data and device information
- **Redis**: Caches frequently accessed data
- **PostgreSQL**: Stores user data and configuration

### Infrastructure
- **Service Mesh**: Handles service-to-service communication
- **Monitoring Stack**: Collects system metrics and logs

## Data Flow

1. Client requests enter through the Ingress Gateway
2. API Gateway routes requests to appropriate services
3. Services communicate through the Service Mesh
4. Data is stored in appropriate databases
5. Monitoring Stack collects metrics from all components 