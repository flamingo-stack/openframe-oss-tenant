# OpenFrame Data Pipeline

This document details the data pipeline architecture and flow in OpenFrame.

## Overview

```mermaid
graph TB
    subgraph "Data Sources"
        direction TB
        OS[Open Source DBs]
        AG[Agent Data]
        LG[Logs]
        MET[Metrics]
    end

    subgraph "Data Collection"
        direction TB
        KAFKA[Kafka]
        STREAM[Stream Processing Service]
        COLLECTOR[Data Collectors]
    end

    subgraph "Processing"
        direction TB
        TRANSFORM[Transform]
        ENRICH[Enrich]
        ML[ML Processing]
    end

    subgraph "Storage"
        direction TB
        MONGO[MongoDB]
        CASS[Cassandra]
        PINOT[Pinot]
        REDIS[Redis Cache]
    end

    OS --> KAFKA
    AG --> KAFKA
    LG --> KAFKA
    MET --> KAFKA
    KAFKA --> STREAM
    STREAM --> COLLECTOR
    COLLECTOR --> TRANSFORM
    TRANSFORM --> ENRICH
    ENRICH --> ML
    ML --> MONGO
    ML --> CASS
    ML --> PINOT
    COLLECTOR --> REDIS
```

## Data Sources

### Open Source Tools
- Database dumps
- API responses
- Event streams
- Configuration changes

### Agent Data
- System metrics
- Performance data
- Health checks
- Status updates

### Logs
- Application logs
- System logs
- Security logs
- Audit trails

### Metrics
- Performance metrics
- Resource utilization
- Business metrics
- Custom metrics

## Data Collection

### Kafka Topics
```mermaid
graph LR
    subgraph "Kafka Topics"
        direction LR
        RAW[Raw Data]
        PROCESSED[Processed Data]
        ALERTS[Alerts]
        METRICS[Metrics]
    end

    RAW --> PROCESSED
    PROCESSED --> ALERTS
    PROCESSED --> METRICS
```

### Stream Processing Components
```mermaid
graph TB
    subgraph "Stream Processing Service"
        direction TB
        INGEST[Data Ingestion]
        VALIDATE[Data Validation]
        TRANSFORM[Data Transformation]
        ROUTE[Data Routing]
    end

    INGEST --> VALIDATE
    VALIDATE --> TRANSFORM
    TRANSFORM --> ROUTE
```

## Data Processing

### Transformation Pipeline
```mermaid
graph LR
    subgraph "Transformation"
        direction LR
        NORMALIZE[Normalize]
        ENRICH[Enrich]
        AGGREGATE[Aggregate]
        FILTER[Filter]
    end

    NORMALIZE --> ENRICH
    ENRICH --> AGGREGATE
    AGGREGATE --> FILTER
```

### Machine Learning Processing
```mermaid
graph TB
    subgraph "ML Pipeline"
        direction TB
        FEATURES[Feature Extraction]
        MODEL[Model Inference]
        ANOMALY[Anomaly Detection]
        ACTION[Action Generation]
    end

    FEATURES --> MODEL
    MODEL --> ANOMALY
    ANOMALY --> ACTION
```

## Data Storage

### Cassandra Schema
```mermaid
graph TB
    subgraph "Cassandra Tables"
        direction TB
        EVENTS[Events]
        METRICS[Metrics]
        ALERTS[Alerts]
        STATE[State]
    end

    EVENTS --> METRICS
    METRICS --> ALERTS
    ALERTS --> STATE
```

### Pinot Tables
```mermaid
graph TB
    subgraph "Pinot Tables"
        direction TB
        ANALYTICS[Analytics]
        DASHBOARDS[Dashboards]
        REPORTS[Reports]
    end

    ANALYTICS --> DASHBOARDS
    DASHBOARDS --> REPORTS
```

## Data Flow Examples

### Log Processing Flow
```mermaid
sequenceDiagram
    participant Source
    participant Kafka
    participant StreamService
    participant ML
    participant Storage

    Source->>Kafka: Send Log
    Kafka->>StreamService: Process Log
    StreamService->>ML: Analyze
    ML->>Storage: Store Results
```

### Metrics Collection Flow
```mermaid
sequenceDiagram
    participant Agent
    participant Kafka
    participant StreamService
    participant Pinot
    participant Cassandra

    Agent->>Kafka: Send Metrics
    Kafka->>StreamService: Process Metrics
    StreamService->>Pinot: Real-time Analytics
    StreamService->>Cassandra: Historical Data
```

## Data Quality

### Validation Rules
- Schema validation
- Data type checking
- Required field validation
- Business rule validation

### Data Enrichment
- Metadata addition
- Reference data lookup
- Context enrichment
- Relationship mapping

### Data Governance
- Data lineage
- Access control
- Retention policies
- Compliance rules

## Monitoring and Maintenance

### Pipeline Health
```mermaid
graph TB
    subgraph "Health Monitoring"
        direction TB
        LATENCY[Latency]
        THROUGHPUT[Throughput]
        ERRORS[Errors]
        RESOURCES[Resources]
    end

    LATENCY --> THROUGHPUT
    THROUGHPUT --> ERRORS
    ERRORS --> RESOURCES
```

### Maintenance Tasks
- Pipeline optimization
- Data cleanup
- Performance tuning
- Capacity planning

## Next Steps

- [AI and Analytics](./ai-analytics/)
- [API Integration](./api-integration/)
- [Security Implementation](../security/)
- [Deployment Guide](../deployment/) 