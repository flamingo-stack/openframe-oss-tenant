# Kubernetes Architecture

This diagram shows the Kubernetes-specific architecture of OpenFrame, including pod layout, service mesh configuration, and network topology.

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: openframe"
            subgraph "Ingress Layer"
                IG[Ingress Controller]
                GW[API Gateway]
            end

            subgraph "Core Services"
                subgraph "Authentication"
                    AS1[Auth Pod 1]
                    AS2[Auth Pod 2]
                    AS_SVC[Auth Service]
                end

                subgraph "Device Management"
                    DMS1[DMS Pod 1]
                    DMS2[DMS Pod 2]
                    DMS_SVC[DMS Service]
                end

                subgraph "Monitoring"
                    MS1[Monitoring Pod 1]
                    MS2[Monitoring Pod 2]
                    MS_SVC[Monitoring Service]
                end
            end

            subgraph "Data Layer"
                subgraph "Cassandra"
                    CS1[Cassandra Pod 1]
                    CS2[Cassandra Pod 2]
                    CS3[Cassandra Pod 3]
                    CS_SVC[Cassandra Service]
                end

                subgraph "Redis"
                    RD1[Redis Pod 1]
                    RD2[Redis Pod 2]
                    RD3[Redis Pod 3]
                    RD_SVC[Redis Service]
                end

                subgraph "PostgreSQL"
                    PG1[PostgreSQL Pod 1]
                    PG2[PostgreSQL Pod 2]
                    PG_SVC[PostgreSQL Service]
                end
            end

            subgraph "Infrastructure"
                SM[Service Mesh]
                MON[Monitoring Stack]
            end
        end
    end

    %% External connections
    External[External Clients] --> IG
    IG --> GW

    %% Service mesh connections
    GW --> AS_SVC
    GW --> DMS_SVC
    GW --> MS_SVC

    %% Pod connections
    AS_SVC --> AS1
    AS_SVC --> AS2
    DMS_SVC --> DMS1
    DMS_SVC --> DMS2
    MS_SVC --> MS1
    MS_SVC --> MS2

    %% Data layer connections
    AS1 --> PG_SVC
    AS2 --> PG_SVC
    DMS1 --> CS_SVC
    DMS2 --> CS_SVC
    MS1 --> RD_SVC
    MS2 --> RD_SVC

    %% Database pod connections
    PG_SVC --> PG1
    PG_SVC --> PG2
    CS_SVC --> CS1
    CS_SVC --> CS2
    CS_SVC --> CS3
    RD_SVC --> RD1
    RD_SVC --> RD2
    RD_SVC --> RD3

    %% Infrastructure connections
    SM --> GW
    SM --> AS_SVC
    SM --> DMS_SVC
    SM --> MS_SVC
    MON --> GW
    MON --> AS_SVC
    MON --> DMS_SVC
    MON --> MS_SVC

    %% Styling
    classDef external fill:#f9f,stroke:#333,stroke-width:2px
    classDef ingress fill:#bbf,stroke:#333,stroke-width:2px
    classDef service fill:#bfb,stroke:#333,stroke-width:2px
    classDef storage fill:#fbb,stroke:#333,stroke-width:2px
    classDef infra fill:#fbf,stroke:#333,stroke-width:2px

    class External external
    class IG,GW ingress
    class AS_SVC,DMS_SVC,MS_SVC service
    class CS_SVC,RD_SVC,PG_SVC storage
    class SM,MON infra
```

## Component Description

### Ingress Layer
- **Ingress Controller**: Handles external traffic routing
- **API Gateway**: Routes requests to appropriate services

### Core Services
Each service runs with multiple replicas for high availability:
- **Authentication Service**: 2 replicas
- **Device Management Service**: 2 replicas
- **Monitoring Service**: 2 replicas

### Data Layer
- **Cassandra**: 3-node cluster for monitoring data
- **Redis**: 3-node cluster for caching
- **PostgreSQL**: 2-node cluster for user data

### Infrastructure
- **Service Mesh**: Manages service-to-service communication
- **Monitoring Stack**: Collects system metrics

## Network Topology

1. External traffic enters through Ingress Controller
2. API Gateway routes to appropriate services
3. Services communicate through Service Mesh
4. Data layer services maintain their own clusters
5. Monitoring Stack collects metrics from all components

## High Availability

- All services run with multiple replicas
- Database clusters are configured for redundancy
- Service Mesh provides load balancing
- Ingress Controller handles external traffic distribution 