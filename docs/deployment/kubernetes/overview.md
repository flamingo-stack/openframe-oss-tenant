# OpenFrame Deployment Guide

This document details the deployment process for OpenFrame and its components.

## Overview

```mermaid
graph TB
    subgraph "Infrastructure"
        direction TB
        K8S[Kubernetes]
        VPC[VPC]
        STORAGE[Storage]
        NETWORK[Network]
    end

    subgraph "Core Services"
        direction TB
        API[API Gateway]
        AUTH[Auth Service]
        DATA[Data Service]
        AI[AI Service]
    end

    subgraph "Open Source Tools"
        direction TB
        TR[TacticalRMM]
        MC[MeshCentral]
        AK[Authentik]
        FD[FleetDM]
    end

    K8S --> API
    K8S --> AUTH
    K8S --> DATA
    K8S --> AI
    VPC --> TR
    VPC --> MC
    VPC --> AK
    VPC --> FD
```

## Prerequisites

### Infrastructure Requirements
```mermaid
graph TB
    subgraph "Requirements"
        direction TB
        K8S[Kubernetes 1.24+]
        STORAGE[Storage Class]
        NETWORK[Network Policy]
        SECURITY[Security Context]
    end

    K8S --> STORAGE
    STORAGE --> NETWORK
    NETWORK --> SECURITY
```

### Tool Requirements
```mermaid
graph TB
    subgraph "Tools"
        direction TB
        HELM[Helm 3.0+]
        KUBECTL[kubectl 1.24+]
        DOCKER[Docker 20.10+]
        GIT[Git 2.0+]
    end

    HELM --> KUBECTL
    KUBECTL --> DOCKER
    DOCKER --> GIT
```

## Deployment Process

### Infrastructure Setup
```mermaid
sequenceDiagram
    participant Admin
    participant K8S
    participant VPC
    participant Storage

    Admin->>K8S: Create Cluster
    K8S-->>Admin: Cluster Ready
    Admin->>VPC: Configure VPC
    VPC-->>Admin: VPC Ready
    Admin->>Storage: Setup Storage
    Storage-->>Admin: Storage Ready
```

### Core Services Deployment
```mermaid
sequenceDiagram
    participant Admin
    participant Helm
    participant K8S
    participant Service

    Admin->>Helm: Deploy Service
    Helm->>K8S: Create Resources
    K8S-->>Helm: Resources Created
    Helm-->>Admin: Deployment Complete
    K8S->>Service: Start Service
    Service-->>Admin: Service Ready
```

## Kubernetes Resources

### Namespace Structure
```mermaid
graph TB
    subgraph "Namespaces"
        direction TB
        OPENFRAME[openframe]
        TOOLS[tools]
        MONITORING[monitoring]
        LOGGING[logging]
    end

    OPENFRAME --> TOOLS
    TOOLS --> MONITORING
    MONITORING --> LOGGING
```

### Resource Quotas
```mermaid
graph TB
    subgraph "Quotas"
        direction TB
        CPU[CPU]
        MEM[Memory]
        STORAGE[Storage]
        NETWORK[Network]
    end

    CPU --> MEM
    MEM --> STORAGE
    STORAGE --> NETWORK
```

## Deployment Configuration

### Helm Values
```yaml
global:
  environment: production
  domain: openframe.example.com
  storageClass: standard

services:
  apiGateway:
    replicas: 2
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi

  authService:
    replicas: 2
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: openframe-network-policy
spec:
  podSelector:
    matchLabels:
      app: openframe
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: openframe
    ports:
    - protocol: TCP
      port: 8080
```

## Tool Deployment

### Open Source Tools
```mermaid
graph TB
    subgraph "Tools"
        direction TB
        TR[TacticalRMM]
        MC[MeshCentral]
        AK[Authentik]
        FD[FleetDM]
    end

    subgraph "Deployment"
        direction TB
        HELM[Helm Chart]
        CONFIG[Configuration]
        SECRET[Secrets]
        SERVICE[Service]
    end

    HELM --> CONFIG
    CONFIG --> SECRET
    SECRET --> SERVICE
    SERVICE --> TR
    SERVICE --> MC
    SERVICE --> AK
    SERVICE --> FD
```

### Tool Configuration
```yaml
tools:
  tacticalRMM:
    enabled: true
    version: latest
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi

  meshCentral:
    enabled: true
    version: latest
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
```

## Monitoring Setup

### Monitoring Stack
```mermaid
graph TB
    subgraph "Monitoring"
        direction TB
        PROM[Prometheus]
        GRAFANA[Grafana]
        ALERT[AlertManager]
        NODE[Node Exporter]
    end

    PROM --> GRAFANA
    PROM --> ALERT
    NODE --> PROM
```

### Logging Stack
```mermaid
graph TB
    subgraph "Logging"
        direction TB
        LOKI[Loki]
        FLUENTD[Fluentd]
        KIBANA[Kibana]
    end

    FLUENTD --> LOKI
    LOKI --> KIBANA
```

## Post-deployment

### Health Checks
```mermaid
sequenceDiagram
    participant Admin
    participant Health
    participant Service
    participant Tool

    Admin->>Health: Check Health
    Health->>Service: Verify Service
    Service-->>Health: Service Status
    Health->>Tool: Verify Tool
    Tool-->>Health: Tool Status
    Health-->>Admin: Health Report
```

### Validation
```mermaid
graph TB
    subgraph "Validation"
        direction TB
        HEALTH[Health Check]
        SECURITY[Security Check]
        PERFORMANCE[Performance Check]
        FUNCTIONAL[Functional Check]
    end

    HEALTH --> SECURITY
    SECURITY --> PERFORMANCE
    PERFORMANCE --> FUNCTIONAL
```

## Maintenance

### Backup Strategy
```mermaid
graph TB
    subgraph "Backup"
        direction TB
        SCHEDULE[Schedule]
        BACKUP[Backup]
        VERIFY[Verify]
        RESTORE[Restore]
    end

    SCHEDULE --> BACKUP
    BACKUP --> VERIFY
    VERIFY --> RESTORE
```

### Update Process
```mermaid
sequenceDiagram
    participant Admin
    participant Helm
    participant K8S
    participant Service

    Admin->>Helm: Update Chart
    Helm->>K8S: Apply Changes
    K8S-->>Helm: Changes Applied
    Helm-->>Admin: Update Complete
    K8S->>Service: Rollout Update
    Service-->>Admin: Update Ready
```

## Next Steps

- [Development Guide](../development/)
- [Operations Guide](../operations/)
- [Security Guide](./security.md)
- [API Integration Guide](./api-integration.md) 