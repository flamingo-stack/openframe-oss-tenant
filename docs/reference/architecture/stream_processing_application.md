# Stream Processing Application

## Overview

The **Stream Processing Application** is the Spring Boot entry point for OpenFrame's real-time event processing service. This module bootstraps the Kafka-based stream processing infrastructure that handles Change Data Capture (CDC) events from integrated tools, enriches activity data, and routes processed events throughout the OpenFrame ecosystem.

**Key Responsibilities:**
- Bootstrap Spring Boot application with Kafka Streams support
- Initialize component scanning for stream processing, data layer, and Kafka producer modules
- Enable Kafka listener and stream processing capabilities
- Serve as the deployment artifact for the stream processing service

**Related Modules:**
- [Stream Processing Configuration](stream_processing_configuration.md) - Kafka and Kafka Streams configuration
- [Stream Processing Listeners](stream_processing_listeners.md) - Kafka message listeners
- [Stream Processing Streams](stream_processing_streams.md) - Kafka Streams topology for activity enrichment
- [Stream Processing Handlers](stream_processing_handlers.md) - Message transformation handlers
- [Data Layer Kafka](data_layer_kafka.md) - Kafka data models and producers

---

## Architecture

### System Context

```mermaid
flowchart TD
    IntegratedTools["Integrated Tools<br/>(Fleet MDM, Tactical RMM, MeshCentral)"]
    Debezium["Debezium CDC Connectors"]
    KafkaCluster["Kafka Cluster"]
    StreamApp["Stream Processing Application"]
    MongoDB["MongoDB"]
    DownstreamServices["Downstream Services<br/>(API Service, Client Service)"]
    
    IntegratedTools -->|"Database Changes"| Debezium
    Debezium -->|"CDC Events"| KafkaCluster
    KafkaCluster -->|"Raw Events"| StreamApp
    StreamApp -->|"Enriched Events"| KafkaCluster
    StreamApp -->|"Query Metadata"| MongoDB
    KafkaCluster -->|"Processed Events"| DownstreamServices
    
    style StreamApp fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style KafkaCluster fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style Debezium fill:#2196F3,stroke:#0D47A1,stroke-width:2px,color:#fff
```

### Application Architecture

```mermaid
flowchart TD
    subgraph StreamApplication["Stream Processing Application"]
        MainClass["StreamApplication<br/>(Main Entry Point)"]
        SpringBoot["Spring Boot Runtime"]
        
        subgraph ComponentScan["Component Scanning"]
            StreamPkg["com.openframe.stream"]
            DataPkg["com.openframe.data"]
            KafkaPkg["com.openframe.kafka.producer"]
        end
        
        subgraph EnabledFeatures["Enabled Features"]
            EnableKafka["@EnableKafka"]
            EnableStreams["@EnableKafkaStreams"]
        end
    end
    
    subgraph CoreModules["Core Processing Modules"]
        Config["Configuration<br/>(KafkaConfig, KafkaStreamsConfig)"]
        Listeners["Kafka Listeners<br/>(JsonKafkaListener)"]
        Streams["Kafka Streams<br/>(ActivityEnrichmentService)"]
        Handlers["Message Handlers<br/>(DebeziumMessageHandler)"]
    end
    
    subgraph DataLayer["Data Layer"]
        KafkaData["Kafka Data Models<br/>(DebeziumMessage)"]
        MongoData["MongoDB Repositories"]
        Producers["Kafka Producers"]
    end
    
    MainClass --> SpringBoot
    SpringBoot --> ComponentScan
    SpringBoot --> EnabledFeatures
    
    ComponentScan --> CoreModules
    ComponentScan --> DataLayer
    
    EnableKafka --> Listeners
    EnableStreams --> Streams
    
    style MainClass fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style SpringBoot fill:#6DB33F,stroke:#4A7C2F,stroke-width:2px,color:#fff
```

### Component Interaction Flow

```mermaid
sequenceDiagram
    participant JVM as JVM
    participant Main as StreamApplication.main()
    participant Spring as SpringApplication
    participant Context as Application Context
    participant Kafka as Kafka Infrastructure
    participant Streams as Kafka Streams
    participant Listeners as Kafka Listeners
    
    JVM->>Main: Start Application
    Main->>Spring: SpringApplication.run()
    
    Spring->>Context: Initialize Context
    Context->>Context: Scan Components<br/>(stream, data, kafka.producer)
    
    Context->>Kafka: Initialize @EnableKafka
    Kafka->>Listeners: Register Kafka Listeners
    Listeners-->>Kafka: JsonKafkaListener Ready
    
    Context->>Streams: Initialize @EnableKafkaStreams
    Streams->>Streams: Build Topology<br/>(ActivityEnrichmentService)
    Streams-->>Context: Streams Topology Ready
    
    Context->>Spring: Context Initialized
    Spring->>Main: Application Started
    
    Note over Listeners,Streams: Application Running<br/>Processing Events
```

---

## Core Components

### StreamApplication

**Location:** `openframe.services.openframe-stream.src.main.java.com.openframe.stream.StreamApplication`

The main Spring Boot application class that bootstraps the stream processing service.

#### Class Definition

```java
@SpringBootApplication
@EnableKafka
@ComponentScan(basePackages = {
        "com.openframe.stream",
        "com.openframe.data",
        "com.openframe.kafka.producer"
})
public class StreamApplication {

    public static void main(String[] args) {
        SpringApplication.run(StreamApplication.class, args);
    }
}
```

#### Annotations

| Annotation | Purpose | Impact |
|------------|---------|--------|
| `@SpringBootApplication` | Enables Spring Boot auto-configuration, component scanning, and configuration | Bootstraps Spring Boot application with default settings |
| `@EnableKafka` | Enables Kafka listener container factory and listener annotation processing | Activates `@KafkaListener` annotations in scanned components |
| `@ComponentScan` | Explicitly defines packages to scan for Spring components | Includes stream processing, data layer, and Kafka producer beans |

#### Component Scanning Strategy

```mermaid
flowchart TD
    Root["StreamApplication<br/>Component Scan"]
    
    subgraph StreamPackage["com.openframe.stream"]
        Config1["Configuration Classes"]
        Listeners1["Kafka Listeners"]
        Services1["Stream Services"]
        Handlers1["Message Handlers"]
        Processors1["Message Processors"]
    end
    
    subgraph DataPackage["com.openframe.data"]
        MongoConfig["MongoDB Configuration"]
        Repositories["Data Repositories"]
        Documents["Document Models"]
    end
    
    subgraph KafkaPackage["com.openframe.kafka.producer"]
        KafkaProducers["Kafka Producers"]
        RecoveryHandlers["Recovery Handlers"]
        Serializers["Custom Serializers"]
    end
    
    Root --> StreamPackage
    Root --> DataPackage
    Root --> KafkaPackage
    
    style Root fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
```

**Scanned Packages:**

1. **`com.openframe.stream`** - Core stream processing components
   - Kafka configuration (`KafkaConfig`, `KafkaStreamsConfig`)
   - Kafka listeners (`JsonKafkaListener`)
   - Stream services (`ActivityEnrichmentService`)
   - Message handlers (`DebeziumMessageHandler`)
   - Message processors (`GenericJsonMessageProcessor`)

2. **`com.openframe.data`** - Data layer components
   - MongoDB configuration and repositories
   - Document models (Device, Organization, User, etc.)
   - Data access abstractions

3. **`com.openframe.kafka.producer`** - Kafka producer infrastructure
   - Kafka producer beans
   - Retry and recovery handlers
   - Custom serializers and deserializers

---

## Event Processing Pipeline

### End-to-End Flow

```mermaid
flowchart LR
    subgraph External["External Systems"]
        FleetMDM["Fleet MDM<br/>PostgreSQL"]
        TacticalRMM["Tactical RMM<br/>PostgreSQL"]
        MeshCentral["MeshCentral<br/>MongoDB"]
    end
    
    subgraph CDC["Change Data Capture"]
        DebeziumFleet["Debezium<br/>Fleet Connector"]
        DebeziumTactical["Debezium<br/>Tactical Connector"]
        DebeziumMesh["Debezium<br/>Mesh Connector"]
    end
    
    subgraph Kafka["Kafka Topics"]
        RawTopics["Raw Event Topics<br/>(fleet-mdm-events,<br/>tactical-rmm-events,<br/>meshcentral-events)"]
        ActivityTopics["Activity Topics<br/>(fleet-mdm-activities,<br/>fleet-mdm-host-activities)"]
        EnrichedTopics["Enriched Topics<br/>(fleet-mdm-events-enriched)"]
    end
    
    subgraph StreamApp["Stream Processing Application"]
        Listener["JsonKafkaListener"]
        Processor["GenericJsonMessageProcessor"]
        Handler["DebeziumMessageHandler"]
        Enrichment["ActivityEnrichmentService<br/>(Kafka Streams)"]
    end
    
    subgraph Downstream["Downstream Consumers"]
        APIService["API Service"]
        ClientService["Client Service"]
        Management["Management Service"]
    end
    
    FleetMDM -->|"DB Changes"| DebeziumFleet
    TacticalRMM -->|"DB Changes"| DebeziumTactical
    MeshCentral -->|"DB Changes"| DebeziumMesh
    
    DebeziumFleet --> RawTopics
    DebeziumTactical --> RawTopics
    DebeziumMesh --> RawTopics
    
    DebeziumFleet --> ActivityTopics
    
    RawTopics --> Listener
    Listener --> Processor
    Processor --> Handler
    Handler --> EnrichedTopics
    
    ActivityTopics --> Enrichment
    Enrichment --> EnrichedTopics
    
    EnrichedTopics --> APIService
    EnrichedTopics --> ClientService
    EnrichedTopics --> Management
    
    style StreamApp fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
```

### Processing Stages

#### 1. Event Ingestion (Kafka Listeners)

**Component:** `JsonKafkaListener`

Listens to multiple Kafka topics for raw CDC events from integrated tools:

```java
@KafkaListener(
    topics = {
        "${openframe.oss-tenant.kafka.topics.inbound.meshcentral-events.name}",
        "${openframe.oss-tenant.kafka.topics.inbound.tactical-rmm-events.name}",
        "${openframe.oss-tenant.kafka.topics.inbound.fleet-mdm-events.name}",
        "${openframe.oss-tenant.kafka.topics.inbound.fleet-mdm-query-result-events.name}"
    },
    groupId = "${spring.oss-tenant.kafka.consumer.group-id}"
)
public void listenIntegratedToolsEvents(
    @Payload CommonDebeziumMessage debeziumMessage, 
    @Header(KafkaHeader.MESSAGE_TYPE_HEADER) MessageType messageType
)
```

**Consumed Topics:**
- `meshcentral-events` - MeshCentral device and session events
- `tactical-rmm-events` - Tactical RMM agent and monitoring events
- `fleet-mdm-events` - Fleet MDM host and query events
- `fleet-mdm-query-result-events` - Fleet MDM query execution results

#### 2. Message Processing (Generic Processor)

**Component:** `GenericJsonMessageProcessor`

Routes messages to appropriate handlers based on `MessageType` header:

```mermaid
flowchart TD
    Listener["JsonKafkaListener"]
    Processor["GenericJsonMessageProcessor"]
    
    subgraph Handlers["Message Handlers"]
        FleetHandler["Fleet MDM Handler"]
        TacticalHandler["Tactical RMM Handler"]
        MeshHandler["MeshCentral Handler"]
        QueryHandler["Query Result Handler"]
    end
    
    Listener -->|"CommonDebeziumMessage<br/>+ MessageType"| Processor
    
    Processor -->|"FLEET_MDM_EVENT"| FleetHandler
    Processor -->|"TACTICAL_RMM_EVENT"| TacticalHandler
    Processor -->|"MESHCENTRAL_EVENT"| MeshHandler
    Processor -->|"FLEET_MDM_QUERY_RESULT"| QueryHandler
    
    FleetHandler --> Output["Transformed Events"]
    TacticalHandler --> Output
    MeshHandler --> Output
    QueryHandler --> Output
```

#### 3. Message Transformation (Debezium Handlers)

**Component:** `DebeziumMessageHandler`

Abstract handler that processes Debezium CDC messages:

**Key Operations:**
- Extract operation type (CREATE, READ, UPDATE, DELETE)
- Transform Debezium payload to domain events
- Enrich with metadata from MongoDB
- Produce transformed events to output topics

**Operation Type Mapping:**

| Debezium Op | OpenFrame Operation | Description |
|-------------|---------------------|-------------|
| `c` | `CREATE` | New record inserted |
| `r` | `READ` | Initial snapshot read |
| `u` | `UPDATE` | Record updated |
| `d` | `DELETE` | Record deleted |

#### 4. Activity Enrichment (Kafka Streams)

**Component:** `ActivityEnrichmentService`

Kafka Streams topology that enriches Fleet MDM activities with host information:

```mermaid
flowchart TD
    subgraph Input["Input Topics"]
        Activities["fleet-mdm-activities<br/>(Activity records)"]
        HostActivities["fleet-mdm-host-activities<br/>(Host-Activity mappings)"]
    end
    
    subgraph Streams["Kafka Streams Topology"]
        ActivityStream["Activity Stream<br/>(keyed by activity.id)"]
        HostStream["Host Activity Stream<br/>(keyed by activityId)"]
        Join["Left Join<br/>(5 second window)"]
        Enrich["Enrich Activity<br/>(add hostId, agentId)"]
        AddHeaders["Add Headers<br/>(MESSAGE_TYPE, __TypeId__)"]
    end
    
    subgraph Output["Output Topic"]
        Enriched["fleet-mdm-events<br/>(Enriched activities)"]
    end
    
    Activities --> ActivityStream
    HostActivities --> HostStream
    
    ActivityStream --> Join
    HostStream --> Join
    
    Join --> Enrich
    Enrich --> AddHeaders
    AddHeaders --> Enriched
    
    style Join fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style Enrich fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
```

**Enrichment Logic:**

```java
private ActivityMessage enrichActivityWithHostInfo(
    ActivityMessage activity, 
    HostActivityMessage hostActivity
) {
    if (hostActivity != null) {
        Integer hostId = hostActivity.getPayload().getAfter().getHostId();
        activity.getPayload().getAfter().setHostId(hostId);
        activity.getPayload().getAfter().setAgentId(hostId.toString());
    }
    return activity;
}
```

**Join Window:** 5 seconds (configurable)

**Headers Added:**
- `MESSAGE_TYPE_HEADER` = `FLEET_MDM_EVENT`
- `__TypeId__` = `com.openframe.kafka.model.debezium.CommonDebeziumMessage`

---

## Configuration

### Application Properties

**Key Configuration Properties:**

```yaml
spring:
  application:
    name: openframe-stream
  
  oss-tenant:
    kafka:
      bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
      consumer:
        group-id: ${KAFKA_CONSUMER_GROUP_ID:openframe-stream-group}

openframe:
  cluster-id: ${CLUSTER_ID:}  # Tenant/cluster identifier for multi-tenancy
  
  oss-tenant:
    kafka:
      topics:
        inbound:
          meshcentral-events:
            name: ${MESHCENTRAL_EVENTS_TOPIC:meshcentral-events}
          tactical-rmm-events:
            name: ${TACTICAL_RMM_EVENTS_TOPIC:tactical-rmm-events}
          fleet-mdm-events:
            name: ${FLEET_MDM_EVENTS_TOPIC:fleet-mdm-events}
          fleet-mdm-query-result-events:
            name: ${FLEET_MDM_QUERY_RESULT_TOPIC:fleet-mdm-query-results}
          fleet-mdm-activities:
            name: ${FLEET_MDM_ACTIVITIES_TOPIC:fleet-mdm-activities}
          fleet-mdm-host-activities:
            name: ${FLEET_MDM_HOST_ACTIVITIES_TOPIC:fleet-mdm-host-activities}
```

### Kafka Streams Configuration

**From `KafkaStreamsConfig`:**

```java
@Bean(name = KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME)
public KafkaStreamsConfiguration kStreamsConfig() {
    Map<String, Object> props = new HashMap<>();
    
    // Application ID with cluster namespacing
    props.put(StreamsConfig.APPLICATION_ID_CONFIG, buildStreamsApplicationId());
    props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    
    // Processing guarantees
    props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.AT_LEAST_ONCE);
    props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);
    
    // State store
    props.put(StreamsConfig.STATE_DIR_CONFIG, "/tmp/kafka-streams");
    
    // Consumer settings
    props.put(StreamsConfig.consumerPrefix(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG), "earliest");
    props.put(StreamsConfig.consumerPrefix(ConsumerConfig.MAX_POLL_RECORDS_CONFIG), 100);
    
    // Producer settings
    props.put(StreamsConfig.producerPrefix(ProducerConfig.BATCH_SIZE_CONFIG), 16384);
    props.put(StreamsConfig.producerPrefix(ProducerConfig.LINGER_MS_CONFIG), 10);
    props.put(StreamsConfig.producerPrefix(ProducerConfig.BUFFER_MEMORY_CONFIG), 33554432);
    
    return new KafkaStreamsConfiguration(props);
}
```

**Application ID Namespacing:**

```java
private String buildStreamsApplicationId() {
    if (clusterId == null || clusterId.trim().isEmpty()) {
        return applicationName;  // e.g., "openframe-stream"
    }
    return applicationName + "-" + clusterId;  // e.g., "openframe-stream-tenant-y0-1"
}
```

This enables multi-tenant deployments where each tenant has isolated Kafka Streams state.

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `KAFKA_BOOTSTRAP_SERVERS` | Kafka cluster connection string | `localhost:9092` | Yes |
| `KAFKA_CONSUMER_GROUP_ID` | Consumer group for listeners | `openframe-stream-group` | Yes |
| `CLUSTER_ID` | Tenant/cluster identifier for namespacing | (empty) | No |
| `MESHCENTRAL_EVENTS_TOPIC` | MeshCentral events topic name | `meshcentral-events` | Yes |
| `TACTICAL_RMM_EVENTS_TOPIC` | Tactical RMM events topic name | `tactical-rmm-events` | Yes |
| `FLEET_MDM_EVENTS_TOPIC` | Fleet MDM events topic name | `fleet-mdm-events` | Yes |
| `FLEET_MDM_QUERY_RESULT_TOPIC` | Fleet MDM query results topic | `fleet-mdm-query-results` | Yes |
| `FLEET_MDM_ACTIVITIES_TOPIC` | Fleet MDM activities topic | `fleet-mdm-activities` | Yes |
| `FLEET_MDM_HOST_ACTIVITIES_TOPIC` | Fleet MDM host activities topic | `fleet-mdm-host-activities` | Yes |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` | Yes |
| `MONGODB_DATABASE` | MongoDB database name | `openframe` | Yes |

---

## Data Models

### Debezium Message Structure

**From `DebeziumMessage<T>`:**

```java
@Data
public class DebeziumMessage<T> {
    private Payload<T> payload;
    
    @Data
    public static class Payload<T> {
        private T before;           // State before change
        private T after;            // State after change
        private Source source;      // CDC metadata
        private String operation;   // c, r, u, d
        private Long timestamp;     // Event timestamp
        
        @Data
        public static class Source {
            private String version;
            private String connector;
            private String name;
            private Long timestamp;
            private String snapshot;
            private String database;
            private String schema;
            private String table;
            private String collection;
        }
    }
}
```

**Example Debezium Message:**

```json
{
  "payload": {
    "before": null,
    "after": {
      "id": 12345,
      "hostname": "workstation-01",
      "status": "online",
      "last_seen": "2024-01-15T10:30:00Z"
    },
    "source": {
      "version": "2.1.0.Final",
      "connector": "postgresql",
      "name": "fleet-mdm-connector",
      "ts_ms": 1705315800000,
      "snapshot": "false",
      "db": "fleet",
      "schema": "public",
      "table": "hosts"
    },
    "op": "c",
    "ts_ms": 1705315800000
  }
}
```

### Message Type Enum

```java
public enum MessageType {
    FLEET_MDM_EVENT,
    FLEET_MDM_QUERY_RESULT,
    TACTICAL_RMM_EVENT,
    MESHCENTRAL_EVENT
}
```

Passed as Kafka header `MESSAGE_TYPE_HEADER` to route messages to appropriate handlers.

### Activity Message Types

**ActivityMessage:**
```java
public class ActivityMessage extends DebeziumMessage<Activity> {
    // Inherits payload structure with Activity as type parameter
}
```

**HostActivityMessage:**
```java
public class HostActivityMessage extends DebeziumMessage<HostActivity> {
    // Inherits payload structure with HostActivity as type parameter
}
```

**Activity Domain Model:**
```java
public class Activity {
    private Long id;
    private String type;
    private String details;
    private Instant timestamp;
    private Integer hostId;      // Enriched by Kafka Streams
    private String agentId;      // Enriched by Kafka Streams
}
```

**HostActivity Domain Model:**
```java
public class HostActivity {
    private Long id;
    private Long activityId;     // Foreign key to Activity
    private Integer hostId;      // Host identifier
}
```

---

## Deployment

### Docker Deployment

**Dockerfile Example:**

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY target/openframe-stream-*.jar app.jar

ENV JAVA_OPTS="-Xmx512m -Xms256m"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

**Docker Compose:**

```yaml
version: '3.8'

services:
  openframe-stream:
    image: openframe/stream-service:latest
    container_name: openframe-stream
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
      - MONGODB_URI=mongodb://mongo:27017
      - MONGODB_DATABASE=openframe
      - CLUSTER_ID=tenant-y0-1
      - KAFKA_CONSUMER_GROUP_ID=openframe-stream-tenant-y0-1
    depends_on:
      - kafka
      - mongodb
    restart: unless-stopped
    networks:
      - openframe-network

networks:
  openframe-network:
    external: true
```

### Kubernetes Deployment

**Deployment Manifest:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-stream
  namespace: openframe
spec:
  replicas: 2
  selector:
    matchLabels:
      app: openframe-stream
  template:
    metadata:
      labels:
        app: openframe-stream
    spec:
      containers:
      - name: stream-service
        image: openframe/stream-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          valueFrom:
            configMapKeyRef:
              name: openframe-config
              key: kafka.bootstrap.servers
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: openframe-secrets
              key: mongodb.uri
        - name: CLUSTER_ID
          valueFrom:
            configMapKeyRef:
              name: openframe-config
              key: cluster.id
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
```

### Resource Requirements

**Minimum Requirements:**
- **CPU:** 500m (0.5 cores)
- **Memory:** 512Mi
- **Disk:** 10GB (for Kafka Streams state stores)

**Recommended Production:**
- **CPU:** 1000m (1 core)
- **Memory:** 1Gi
- **Disk:** 50GB (for state stores and logs)

**Scaling Considerations:**
- Kafka Streams state stores require persistent storage
- Each replica maintains its own state store
- Rebalancing occurs when replicas are added/removed
- Consider using StatefulSets for production deployments

---

## Monitoring and Observability

### Health Checks

**Spring Boot Actuator Endpoints:**

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  health:
    kafka:
      enabled: true
```

**Health Check URLs:**
- `/actuator/health` - Overall application health
- `/actuator/health/kafka` - Kafka connectivity status
- `/actuator/health/mongo` - MongoDB connectivity status

### Metrics

**Key Metrics to Monitor:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `kafka.consumer.lag` | Consumer lag per partition | > 10,000 messages |
| `kafka.streams.state.store.size` | State store disk usage | > 80% capacity |
| `kafka.consumer.records.consumed.rate` | Message consumption rate | < 10 msg/sec (expected > 100) |
| `kafka.producer.record.error.rate` | Producer error rate | > 1% |
| `jvm.memory.used` | JVM heap usage | > 80% |
| `kafka.streams.thread.state` | Streams thread state | Not RUNNING |

**Prometheus Scrape Configuration:**

```yaml
scrape_configs:
  - job_name: 'openframe-stream'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['openframe-stream:8080']
```

### Logging

**Log Levels:**

```yaml
logging:
  level:
    com.openframe.stream: INFO
    org.apache.kafka: WARN
    org.springframework.kafka: INFO
```

**Key Log Events:**

```text
# Application startup
INFO  c.o.stream.StreamApplication - Starting StreamApplication

# Kafka Streams topology built
INFO  c.o.s.s.ActivityEnrichmentService - Building activity enrichment stream
INFO  c.o.s.s.ActivityEnrichmentService - Activity enrichment stream built successfully

# Message processing
DEBUG c.o.s.l.JsonKafkaListener - Received message: type=FLEET_MDM_EVENT
DEBUG c.o.s.s.ActivityEnrichmentService - Set hostId 12345 for activity 67890

# Errors
ERROR c.o.k.p.r.KafkaRecoveryHandlerImpl - Kafka RECOVER invoked: topic=fleet-mdm-events
```

### Distributed Tracing

**OpenTelemetry Integration:**

```yaml
spring:
  sleuth:
    enabled: true
    sampler:
      probability: 0.1  # Sample 10% of traces
  zipkin:
    base-url: http://zipkin:9411
```

**Trace Spans:**
- `kafka.consumer.receive` - Message received from Kafka
- `message.process` - Message processing duration
- `kafka.streams.process` - Streams processing duration
- `mongodb.query` - MongoDB query duration
- `kafka.producer.send` - Message sent to Kafka

---

## Error Handling and Recovery

### Kafka Consumer Error Handling

**Retry Configuration:**

```yaml
spring:
  kafka:
    consumer:
      enable-auto-commit: false
    listener:
      ack-mode: manual
      concurrency: 3
```

**Error Handler:**

```java
@Bean
public DefaultErrorHandler errorHandler() {
    return new DefaultErrorHandler(
        new FixedBackOff(1000L, 3L)  // 3 retries with 1 second delay
    );
}
```

### Kafka Streams Error Handling

**Deserialization Error Handler:**

```java
props.put(
    StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG,
    LogAndContinueExceptionHandler.class
);
```

**Production Error Handler:**

```java
props.put(
    StreamsConfig.DEFAULT_PRODUCTION_EXCEPTION_HANDLER_CLASS_CONFIG,
    DefaultProductionExceptionHandler.class
);
```

### Recovery Handler

**From `KafkaRecoveryHandlerImpl`:**

```java
@Service
public class KafkaRecoveryHandlerImpl implements KafkaRecoveryHandler {
    
    @Override
    public void enqueue(Throwable ex, String topic, String key, Object payload) {
        log.error(
            "Kafka RECOVER invoked: topic={} key={} errorClass={} errorMsg={} payload~={}",
            topic, key, 
            ex.getClass().getName(), 
            ex.getMessage(), 
            payload,
            ex
        );
        // TODO: Implement dead letter queue or retry logic
    }
}
```

**Recovery Strategies:**

1. **Log and Continue** - Log error and skip message (default)
2. **Dead Letter Queue** - Send failed messages to DLQ topic
3. **Retry with Backoff** - Retry with exponential backoff
4. **Manual Intervention** - Alert operations team for manual review

### State Store Recovery

**Kafka Streams State Store Backup:**

```bash
# Backup state store directory
tar -czf kafka-streams-state-backup.tar.gz /tmp/kafka-streams/

# Restore state store
tar -xzf kafka-streams-state-backup.tar.gz -C /tmp/
```

**Automatic Recovery:**
- Kafka Streams automatically rebuilds state from changelog topics
- Changelog topics are compacted and retained indefinitely
- Recovery time depends on changelog topic size

---

## Performance Tuning

### Kafka Consumer Tuning

**Throughput Optimization:**

```yaml
spring:
  kafka:
    consumer:
      max-poll-records: 500          # Increase batch size
      fetch-min-size: 1048576        # 1MB minimum fetch
      fetch-max-wait: 500            # 500ms max wait
    listener:
      concurrency: 5                 # Increase parallelism
```

**Latency Optimization:**

```yaml
spring:
  kafka:
    consumer:
      max-poll-records: 100          # Smaller batches
      fetch-min-size: 1              # Fetch immediately
      fetch-max-wait: 100            # 100ms max wait
    listener:
      concurrency: 3                 # Moderate parallelism
```

### Kafka Streams Tuning

**Throughput Optimization:**

```java
props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 4);
props.put(StreamsConfig.CACHE_MAX_BYTES_BUFFERING_CONFIG, 10485760);  // 10MB cache
props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 30000);  // 30 second commits
```

**Latency Optimization:**

```java
props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 2);
props.put(StreamsConfig.CACHE_MAX_BYTES_BUFFERING_CONFIG, 0);  // Disable caching
props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 1000);  // 1 second commits
```

### JVM Tuning

**Garbage Collection:**

```bash
JAVA_OPTS="
  -Xmx1g -Xms1g
  -XX:+UseG1GC
  -XX:MaxGCPauseMillis=200
  -XX:InitiatingHeapOccupancyPercent=45
  -XX:G1ReservePercent=10
  -XX:+ParallelRefProcEnabled
"
```

**Monitoring GC:**

```bash
JAVA_OPTS="$JAVA_OPTS
  -Xlog:gc*:file=/var/log/gc.log:time,uptime,level,tags
  -XX:+HeapDumpOnOutOfMemoryError
  -XX:HeapDumpPath=/var/log/heapdump.hprof
"
```

---

## Testing

### Unit Testing

**Test StreamApplication Startup:**

```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
    "spring.data.mongodb.uri=mongodb://localhost:27017/test"
})
class StreamApplicationTests {

    @Test
    void contextLoads() {
        // Verifies application context loads successfully
    }
    
    @Test
    void kafkaListenerBeansAreCreated() {
        assertNotNull(applicationContext.getBean(JsonKafkaListener.class));
    }
    
    @Test
    void kafkaStreamsBeansAreCreated() {
        assertNotNull(applicationContext.getBean(ActivityEnrichmentService.class));
    }
}
```

### Integration Testing

**Test Kafka Listener:**

```java
@SpringBootTest
@EmbeddedKafka(
    topics = {"fleet-mdm-events"},
    partitions = 1
)
class JsonKafkaListenerIntegrationTest {

    @Autowired
    private KafkaTemplate<String, CommonDebeziumMessage> kafkaTemplate;
    
    @Test
    void testMessageConsumption() throws Exception {
        // Given
        CommonDebeziumMessage message = createTestMessage();
        
        // When
        kafkaTemplate.send("fleet-mdm-events", message).get();
        
        // Then
        await().atMost(5, SECONDS).until(() -> messageProcessed());
    }
}
```

**Test Kafka Streams Topology:**

```java
class ActivityEnrichmentServiceTest {

    private TopologyTestDriver testDriver;
    private TestInputTopic<String, ActivityMessage> activityTopic;
    private TestInputTopic<String, HostActivityMessage> hostActivityTopic;
    private TestOutputTopic<String, ActivityMessage> outputTopic;
    
    @BeforeEach
    void setup() {
        StreamsBuilder builder = new StreamsBuilder();
        activityEnrichmentService.buildActivityEnrichmentStream(builder);
        
        testDriver = new TopologyTestDriver(
            builder.build(), 
            getStreamsConfig()
        );
        
        activityTopic = testDriver.createInputTopic(
            "fleet-mdm-activities",
            Serdes.String().serializer(),
            activityMessageSerde.serializer()
        );
        
        hostActivityTopic = testDriver.createInputTopic(
            "fleet-mdm-host-activities",
            Serdes.String().serializer(),
            hostActivityMessageSerde.serializer()
        );
        
        outputTopic = testDriver.createOutputTopic(
            "fleet-mdm-events",
            Serdes.String().deserializer(),
            activityMessageSerde.deserializer()
        );
    }
    
    @Test
    void testActivityEnrichment() {
        // Given
        ActivityMessage activity = createActivity(123L);
        HostActivityMessage hostActivity = createHostActivity(123L, 456);
        
        // When
        activityTopic.pipeInput("123", activity);
        hostActivityTopic.pipeInput("123", hostActivity);
        
        // Then
        ActivityMessage enriched = outputTopic.readValue();
        assertEquals(456, enriched.getPayload().getAfter().getHostId());
        assertEquals("456", enriched.getPayload().getAfter().getAgentId());
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. Application Fails to Start

**Symptom:**
```text
ERROR o.s.boot.SpringApplication - Application run failed
Caused by: org.apache.kafka.common.errors.TimeoutException: 
  Failed to update metadata after 60000 ms.
```

**Cause:** Cannot connect to Kafka cluster

**Solution:**
```bash
# Verify Kafka connectivity
telnet kafka-broker 9092

# Check bootstrap servers configuration
echo $KAFKA_BOOTSTRAP_SERVERS

# Verify Kafka cluster is running
docker ps | grep kafka
```

#### 2. Consumer Lag Increasing

**Symptom:**
```text
WARN  o.a.k.c.consumer.internals.ConsumerCoordinator - 
  Consumer lag for partition fleet-mdm-events-0 is 50000
```

**Cause:** Processing slower than message production rate

**Solution:**
```yaml
# Increase consumer concurrency
spring:
  kafka:
    listener:
      concurrency: 5

# Increase max poll records
spring:
  kafka:
    consumer:
      max-poll-records: 500
```

#### 3. Kafka Streams State Store Full

**Symptom:**
```text
ERROR o.a.k.s.processor.internals.StateDirectory - 
  Failed to write to state store: No space left on device
```

**Cause:** State store directory out of disk space

**Solution:**
```bash
# Check disk usage
df -h /tmp/kafka-streams

# Clean old state stores
rm -rf /tmp/kafka-streams/openframe-stream-*

# Increase disk allocation or configure cleanup
```

#### 4. Deserialization Errors

**Symptom:**
```text
ERROR o.a.k.s.errors.LogAndContinueExceptionHandler - 
  Deserialization exception; taskId: 0_0
```

**Cause:** Message format mismatch or schema evolution

**Solution:**
```java
// Add deserialization error handler
props.put(
    StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG,
    LogAndContinueExceptionHandler.class
);

// Implement schema versioning
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "@type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = ActivityV1.class, name = "ActivityV1"),
    @JsonSubTypes.Type(value = ActivityV2.class, name = "ActivityV2")
})
public interface Activity { }
```

#### 5. Memory Issues

**Symptom:**
```text
java.lang.OutOfMemoryError: Java heap space
```

**Cause:** Insufficient heap memory or memory leak

**Solution:**
```bash
# Increase heap size
JAVA_OPTS="-Xmx2g -Xms2g"

# Enable heap dump on OOM
JAVA_OPTS="$JAVA_OPTS -XX:+HeapDumpOnOutOfMemoryError"

# Analyze heap dump
jhat heapdump.hprof
```

### Debugging Tools

**Kafka Consumer Groups:**

```bash
# List consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Describe consumer group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group openframe-stream-group --describe

# Reset consumer group offsets
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group openframe-stream-group --reset-offsets --to-earliest \
  --topic fleet-mdm-events --execute
```

**Kafka Streams State:**

```bash
# List Kafka Streams applications
kafka-streams-application-reset.sh --bootstrap-servers localhost:9092 \
  --list

# Reset Kafka Streams application
kafka-streams-application-reset.sh --bootstrap-servers localhost:9092 \
  --application-id openframe-stream --input-topics fleet-mdm-activities
```

**JVM Diagnostics:**

```bash
# Thread dump
jstack <pid> > thread-dump.txt

# Heap dump
jmap -dump:format=b,file=heap-dump.hprof <pid>

# GC logs
jstat -gcutil <pid> 1000
```

---

## Security Considerations

### Kafka Security

**SSL/TLS Configuration:**

```yaml
spring:
  kafka:
    security:
      protocol: SSL
    ssl:
      trust-store-location: file:/etc/kafka/truststore.jks
      trust-store-password: ${TRUSTSTORE_PASSWORD}
      key-store-location: file:/etc/kafka/keystore.jks
      key-store-password: ${KEYSTORE_PASSWORD}
```

**SASL Authentication:**

```yaml
spring:
  kafka:
    security:
      protocol: SASL_SSL
    properties:
      sasl:
        mechanism: PLAIN
        jaas:
          config: |
            org.apache.kafka.common.security.plain.PlainLoginModule required
            username="${KAFKA_USERNAME}"
            password="${KAFKA_PASSWORD}";
```

### MongoDB Security

**Authentication:**

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@mongo:27017/openframe?authSource=admin
```

**TLS/SSL:**

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://mongo:27017/openframe?ssl=true&sslInvalidHostNameAllowed=true
```

### Secrets Management

**Kubernetes Secrets:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: openframe-stream-secrets
type: Opaque
stringData:
  kafka.username: "stream-user"
  kafka.password: "secure-password"
  mongodb.uri: "mongodb://user:pass@mongo:27017/openframe"
```

**Environment Variable Injection:**

```yaml
env:
- name: KAFKA_USERNAME
  valueFrom:
    secretKeyRef:
      name: openframe-stream-secrets
      key: kafka.username
- name: KAFKA_PASSWORD
  valueFrom:
    secretKeyRef:
      name: openframe-stream-secrets
      key: kafka.password
```

---

## Related Documentation

### Core Stream Processing Modules
- [Stream Processing Configuration](stream_processing_configuration.md) - Kafka and Kafka Streams configuration
- [Stream Processing Listeners](stream_processing_listeners.md) - Kafka message listeners
- [Stream Processing Streams](stream_processing_streams.md) - Kafka Streams topology
- [Stream Processing Handlers](stream_processing_handlers.md) - Message transformation handlers
- [Stream Processing Message Processing](stream_processing_message_processing.md) - Generic message processor

### Data Layer
- [Data Layer Kafka](data_layer_kafka.md) - Kafka data models and producers
- [Data Layer MongoDB](data_layer_mongo.md) - MongoDB repositories and documents

### Integrated Tools
- [Fleet MDM SDK](fleet_mdm_sdk.md) - Fleet MDM integration
- [Tactical RMM SDK](tactical_rmm_sdk.md) - Tactical RMM integration

### Downstream Services
- [API Service](api_service.md) - REST and GraphQL API
- [Client Service](client_service.md) - Agent management service
- [Management Service](management_service.md) - System management

---

## Additional Resources

### External Documentation
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Kafka Streams Documentation](https://kafka.apache.org/documentation/streams/)
- [Spring Kafka Documentation](https://docs.spring.io/spring-kafka/reference/)
- [Debezium Documentation](https://debezium.io/documentation/)

### OpenFrame Resources
- [OpenFrame Documentation](https://www.flamingo.run/openframe)
- [OpenMSP Community](https://www.openmsp.ai/)
- [Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

---

**Last Updated:** 2024-01-15  
**Version:** 1.0  
**Maintainer:** OpenFrame Team
