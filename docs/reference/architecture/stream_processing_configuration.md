# Stream Processing Configuration Module

## Overview

The **Stream Processing Configuration** module provides the foundational Kafka and Kafka Streams configuration for OpenFrame's real-time event processing infrastructure. This module establishes the core streaming capabilities that enable Change Data Capture (CDC) processing, activity enrichment, and event-driven architecture across the platform.

**Key Responsibilities:**
- Configure Kafka consumers and producers for stream processing
- Set up Kafka Streams topology with serialization/deserialization
- Provide custom converters for message type handling
- Configure multi-tenant stream processing with cluster-aware application IDs
- Define serdes for Debezium CDC messages and domain-specific events

**Related Modules:**
- [stream_processing_listeners](stream_processing_listeners.md) - Kafka message listeners
- [stream_processing_streams](stream_processing_streams.md) - Stream processing topologies
- [stream_processing_handlers](stream_processing_handlers.md) - Message handlers
- [data_layer_kafka](data_layer_kafka.md) - Kafka data layer foundation

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph StreamConfig["Stream Processing Configuration"]
        KafkaConfig["KafkaConfig"]
        KafkaStreamsConfig["KafkaStreamsConfig"]
        MessageTypeConverter["MessageType Converter"]
    end
    
    subgraph Serdes["Serialization/Deserialization"]
        ActivitySerde["ActivityMessage Serde"]
        HostActivitySerde["HostActivityMessage Serde"]
        OutgoingSerde["Outgoing Activity Serde"]
    end
    
    subgraph KafkaInfra["Kafka Infrastructure"]
        Brokers["Kafka Brokers"]
        Topics["Kafka Topics"]
        StateStores["State Stores"]
    end
    
    subgraph StreamProcessing["Stream Processing"]
        Listeners["Kafka Listeners"]
        Streams["Kafka Streams"]
        Handlers["Message Handlers"]
    end
    
    KafkaConfig -->|"Provides Converter"| MessageTypeConverter
    KafkaStreamsConfig -->|"Creates"| ActivitySerde
    KafkaStreamsConfig -->|"Creates"| HostActivitySerde
    KafkaStreamsConfig -->|"Creates"| OutgoingSerde
    
    KafkaStreamsConfig -->|"Connects to"| Brokers
    KafkaStreamsConfig -->|"Configures"| StateStores
    
    ActivitySerde -->|"Used by"| Streams
    HostActivitySerde -->|"Used by"| Streams
    OutgoingSerde -->|"Used by"| Streams
    
    MessageTypeConverter -->|"Used by"| Listeners
    
    Brokers -->|"Hosts"| Topics
    Topics -->|"Consumed by"| Listeners
    Topics -->|"Processed by"| Streams
    
    Streams -->|"Delegates to"| Handlers
    
    classDef configClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef serdeClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef infraClass fill:#F39C12,stroke:#C87F0A,color:#fff
    classDef processingClass fill:#9B59B6,stroke:#6C3483,color:#fff
    
    class KafkaConfig,KafkaStreamsConfig,MessageTypeConverter configClass
    class ActivitySerde,HostActivitySerde,OutgoingSerde serdeClass
    class Brokers,Topics,StateStores infraClass
    class Listeners,Streams,Handlers processingClass
```

---

## Core Components

### 1. KafkaConfig

**Purpose:** Provides base Kafka configuration and custom converters for message processing.

**Location:** `com.openframe.stream.config.KafkaConfig`

**Key Features:**
- Custom `MessageType` converter for Kafka headers
- Byte array to enum conversion with error handling
- UTF-8 string decoding for message type headers

**Configuration:**

```java
@Configuration
public class KafkaConfig {
    
    @Bean
    public Converter<byte[], MessageType> messageTypeConverter() {
        return new Converter<byte[], MessageType>() {
            @Override
            public MessageType convert(byte[] source) {
                try {
                    String stringValue = new String(source, StandardCharsets.UTF_8);
                    return MessageType.valueOf(stringValue.toUpperCase());
                } catch (IllegalArgumentException e) {
                    return null;
                }
            }
        };
    }
}
```

**Usage Pattern:**

```java
// Kafka listener using MessageType converter
@KafkaListener(topics = "events-topic")
public void handleMessage(
    @Payload String message,
    @Header(MESSAGE_TYPE_HEADER) MessageType messageType
) {
    // messageType is automatically converted from byte[] header
    switch (messageType) {
        case FLEET_MDM_EVENT:
            // Handle Fleet MDM event
            break;
        case TACTICAL_RMM_EVENT:
            // Handle Tactical RMM event
            break;
    }
}
```

---

### 2. KafkaStreamsConfig

**Purpose:** Configures Kafka Streams processing infrastructure with serialization, state management, and multi-tenant support.

**Location:** `com.openframe.stream.config.KafkaStreamsConfig`

**Key Configuration Properties:**

| Property | Description | Default/Example |
|----------|-------------|-----------------|
| `spring.oss-tenant.kafka.bootstrap-servers` | Kafka broker addresses | `localhost:9092` |
| `spring.application.name` | Base application name | `openframe-stream` |
| `openframe.cluster-id` | Tenant/cluster identifier | `tenant-y0-1` |

**Multi-Tenant Application ID Strategy:**

```mermaid
flowchart LR
    AppName["Application Name<br/>(openframe-stream)"]
    ClusterId["Cluster ID<br/>(tenant-y0-1)"]
    FinalId["Final Application ID<br/>(openframe-stream-tenant-y0-1)"]
    
    AppName -->|"Base"| FinalId
    ClusterId -->|"Suffix"| FinalId
    
    FinalId -->|"Isolates"| ConsumerGroup["Consumer Group"]
    FinalId -->|"Isolates"| StateStore["State Store Directory"]
    
    classDef inputClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef outputClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef resourceClass fill:#F39C12,stroke:#C87F0A,color:#fff
    
    class AppName,ClusterId inputClass
    class FinalId outputClass
    class ConsumerGroup,StateStore resourceClass
```

**Serialization Configuration:**

```mermaid
flowchart TD
    subgraph Serdes["Serde Beans"]
        ActivitySerde["activityMessageSerde()<br/>ActivityMessage"]
        HostActivitySerde["hostActivityMessageSerde()<br/>HostActivityMessage"]
        OutgoingSerde["outgoingActivityMessageSerde()<br/>No Type Info"]
    end
    
    subgraph Components["Serde Components"]
        JsonSerializer["JsonSerializer<br/>(ObjectMapper)"]
        JsonDeserializer["JsonDeserializer<br/>(ObjectMapper)"]
    end
    
    subgraph Usage["Stream Usage"]
        InputStreams["Input Streams<br/>(Consumed.with)"]
        JoinOperations["Join Operations<br/>(StreamJoined.with)"]
        OutputStreams["Output Streams<br/>(Produced.with)"]
    end
    
    ActivitySerde -->|"Uses"| JsonSerializer
    ActivitySerde -->|"Uses"| JsonDeserializer
    HostActivitySerde -->|"Uses"| JsonSerializer
    HostActivitySerde -->|"Uses"| JsonDeserializer
    OutgoingSerde -->|"Uses"| JsonSerializer
    OutgoingSerde -->|"No Type Info"| JsonDeserializer
    
    ActivitySerde -->|"Input/Join"| InputStreams
    HostActivitySerde -->|"Join"| JoinOperations
    OutgoingSerde -->|"Output"| OutputStreams
    
    classDef serdeClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef componentClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef usageClass fill:#9B59B6,stroke:#6C3483,color:#fff
    
    class ActivitySerde,HostActivitySerde,OutgoingSerde serdeClass
    class JsonSerializer,JsonDeserializer componentClass
    class InputStreams,JoinOperations,OutputStreams usageClass
```

**Serde Bean Definitions:**

```java
// ActivityMessage Serde (with type info for deserialization)
@Bean
public Serde<ActivityMessage> activityMessageSerde() {
    return Serdes.serdeFrom(
        new JsonSerializer<>(objectMapper),
        new JsonDeserializer<>(ActivityMessage.class, objectMapper)
    );
}

// HostActivityMessage Serde (with type info for deserialization)
@Bean
public Serde<HostActivityMessage> hostActivityMessageSerde() {
    return Serdes.serdeFrom(
        new JsonSerializer<>(objectMapper),
        new JsonDeserializer<>(HostActivityMessage.class, objectMapper)
    );
}

// Outgoing ActivityMessage Serde (no type info in JSON)
@Bean
public Serde<ActivityMessage> outgoingActivityMessageSerde() {
    JsonSerde<ActivityMessage> serde = new JsonSerde<>(ActivityMessage.class);
    serde.serializer().setAddTypeInfo(false); // Clean JSON output
    return serde;
}
```

**Kafka Streams Properties:**

```java
@Bean(name = KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME)
public KafkaStreamsConfiguration kStreamsConfig() {
    Map<String, Object> props = new HashMap<>();
    
    // Application identity
    props.put(StreamsConfig.APPLICATION_ID_CONFIG, buildStreamsApplicationId());
    props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
    
    // Serialization
    props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, 
              Serdes.String().getClass().getName());
    
    // Processing guarantees
    props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, 
              StreamsConfig.AT_LEAST_ONCE);
    props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);
    
    // State management
    props.put(StreamsConfig.STATE_DIR_CONFIG, "/tmp/kafka-streams");
    
    // Consumer settings
    props.put(StreamsConfig.consumerPrefix(
        ConsumerConfig.AUTO_OFFSET_RESET_CONFIG), "earliest");
    props.put(StreamsConfig.consumerPrefix(
        ConsumerConfig.MAX_POLL_RECORDS_CONFIG), 100);
    
    // Producer settings
    props.put(StreamsConfig.producerPrefix(
        ProducerConfig.BATCH_SIZE_CONFIG), 16384);
    props.put(StreamsConfig.producerPrefix(
        ProducerConfig.LINGER_MS_CONFIG), 10);
    props.put(StreamsConfig.producerPrefix(
        ProducerConfig.BUFFER_MEMORY_CONFIG), 33554432);
    
    return new KafkaStreamsConfiguration(props);
}
```

---

## Configuration Properties

### Kafka Streams Settings

```yaml
# Kafka Connection
spring:
  oss-tenant:
    kafka:
      bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}

# Application Identity
spring:
  application:
    name: openframe-stream

# Multi-Tenant Configuration
openframe:
  cluster-id: ${CLUSTER_ID:}  # e.g., tenant-y0-1

# Topic Configuration
openframe:
  oss-tenant:
    kafka:
      topics:
        inbound:
          fleet-mdm-activities:
            name: fleet.mdm.activities
          fleet-mdm-host-activities:
            name: fleet.mdm.host_activities
          fleet-mdm-events:
            name: fleet.mdm.events
```

### Processing Guarantees

```mermaid
flowchart TD
    subgraph ProcessingGuarantee["Processing Guarantee: AT_LEAST_ONCE"]
        Consume["Consume Message"]
        Process["Process Message"]
        Produce["Produce Result"]
        Commit["Commit Offset"]
    end
    
    subgraph FailureScenario["Failure Scenario"]
        Failure["Processing Failure"]
        Retry["Retry from Last Offset"]
        Duplicate["Possible Duplicate"]
    end
    
    Consume --> Process
    Process --> Produce
    Produce --> Commit
    
    Process -.->|"Failure"| Failure
    Failure --> Retry
    Retry --> Consume
    Retry -.->|"May cause"| Duplicate
    
    classDef normalClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef failureClass fill:#E74C3C,stroke:#C0392B,color:#fff
    classDef warningClass fill:#F39C12,stroke:#C87F0A,color:#fff
    
    class Consume,Process,Produce,Commit normalClass
    class Failure,Retry failureClass
    class Duplicate warningClass
```

**Why AT_LEAST_ONCE?**
- **Reliability:** Ensures no messages are lost during processing failures
- **Idempotency:** Downstream handlers must be idempotent to handle duplicates
- **Performance:** Better throughput than EXACTLY_ONCE for most use cases
- **State Management:** Simpler state store management

---

## Data Flow

### Message Type Conversion Flow

```mermaid
flowchart LR
    subgraph KafkaMessage["Kafka Message"]
        Headers["Headers<br/>(byte[])"]
        Payload["Payload<br/>(JSON)"]
    end
    
    subgraph Conversion["MessageType Conversion"]
        ByteArray["byte[] header value"]
        UTF8Decode["UTF-8 Decode"]
        EnumParse["MessageType.valueOf()"]
        ErrorHandle["Error Handling<br/>(return null)"]
    end
    
    subgraph Listener["Kafka Listener"]
        TypedHeader["@Header MessageType"]
        ProcessMessage["Process Message"]
    end
    
    Headers -->|"Extract"| ByteArray
    ByteArray --> UTF8Decode
    UTF8Decode --> EnumParse
    EnumParse -.->|"IllegalArgumentException"| ErrorHandle
    EnumParse -->|"Success"| TypedHeader
    ErrorHandle -->|"null"| TypedHeader
    
    Payload --> ProcessMessage
    TypedHeader --> ProcessMessage
    
    classDef kafkaClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef conversionClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef listenerClass fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef errorClass fill:#E74C3C,stroke:#C0392B,color:#fff
    
    class Headers,Payload kafkaClass
    class ByteArray,UTF8Decode,EnumParse conversionClass
    class TypedHeader,ProcessMessage listenerClass
    class ErrorHandle errorClass
```

### Kafka Streams Serialization Flow

```mermaid
flowchart TD
    subgraph Input["Input Topic"]
        RawMessage["Raw Kafka Message<br/>(byte[])"]
    end
    
    subgraph Deserialization["Deserialization"]
        JsonDeser["JsonDeserializer"]
        TypeInfo["Type Information<br/>(ActivityMessage.class)"]
        ObjectMapper["Jackson ObjectMapper"]
        DomainObject["Domain Object<br/>(ActivityMessage)"]
    end
    
    subgraph Processing["Stream Processing"]
        Transform["Transform/Enrich"]
        Join["Join Operations"]
        Filter["Filter/Map"]
    end
    
    subgraph Serialization["Serialization"]
        JsonSer["JsonSerializer"]
        NoTypeInfo["setAddTypeInfo(false)"]
        CleanJson["Clean JSON<br/>(no __TypeId__)"]
    end
    
    subgraph Output["Output Topic"]
        OutputMessage["Output Kafka Message<br/>(byte[])"]
    end
    
    RawMessage --> JsonDeser
    TypeInfo --> JsonDeser
    ObjectMapper --> JsonDeser
    JsonDeser --> DomainObject
    
    DomainObject --> Transform
    Transform --> Join
    Join --> Filter
    
    Filter --> JsonSer
    NoTypeInfo --> JsonSer
    JsonSer --> CleanJson
    CleanJson --> OutputMessage
    
    classDef inputClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef deserClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef processClass fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef serClass fill:#F39C12,stroke:#C87F0A,color:#fff
    classDef outputClass fill:#E74C3C,stroke:#C0392B,color:#fff
    
    class RawMessage inputClass
    class JsonDeser,TypeInfo,ObjectMapper,DomainObject deserClass
    class Transform,Join,Filter processClass
    class JsonSer,NoTypeInfo,CleanJson serClass
    class OutputMessage outputClass
```

---

## Multi-Tenant Architecture

### Application ID Generation Strategy

```mermaid
flowchart TD
    subgraph Input["Configuration Input"]
        AppName["spring.application.name<br/>(openframe-stream)"]
        ClusterId["openframe.cluster-id<br/>(tenant-y0-1)"]
    end
    
    subgraph Logic["buildStreamsApplicationId()"]
        CheckNull{"cluster-id<br/>null?"}
        CheckEmpty{"cluster-id<br/>empty?"}
        BuildId["applicationName + '-' + clusterId"]
        ReturnBase["return applicationName"]
    end
    
    subgraph Output["Application ID"]
        SingleTenant["openframe-stream<br/>(single tenant)"]
        MultiTenant["openframe-stream-tenant-y0-1<br/>(multi-tenant)"]
    end
    
    subgraph KafkaResources["Kafka Resources"]
        ConsumerGroup["Consumer Group ID"]
        StateDir["State Store Directory<br/>(/tmp/kafka-streams/APP_ID)"]
        InternalTopics["Internal Topics<br/>(APP_ID-*)"]
    end
    
    AppName --> CheckNull
    ClusterId --> CheckNull
    
    CheckNull -->|"Yes"| ReturnBase
    CheckNull -->|"No"| CheckEmpty
    CheckEmpty -->|"Yes"| ReturnBase
    CheckEmpty -->|"No"| BuildId
    
    ReturnBase --> SingleTenant
    BuildId --> MultiTenant
    
    SingleTenant --> ConsumerGroup
    MultiTenant --> ConsumerGroup
    
    ConsumerGroup --> StateDir
    ConsumerGroup --> InternalTopics
    
    classDef inputClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef logicClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef outputClass fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef resourceClass fill:#F39C12,stroke:#C87F0A,color:#fff
    
    class AppName,ClusterId inputClass
    class CheckNull,CheckEmpty,BuildId,ReturnBase logicClass
    class SingleTenant,MultiTenant outputClass
    class ConsumerGroup,StateDir,InternalTopics resourceClass
```

### Tenant Isolation

```mermaid
flowchart TD
    subgraph Tenant1["Tenant Y0-1"]
        App1["openframe-stream-tenant-y0-1"]
        CG1["Consumer Group:<br/>openframe-stream-tenant-y0-1"]
        State1["State Store:<br/>/tmp/kafka-streams/openframe-stream-tenant-y0-1"]
        Topics1["Internal Topics:<br/>openframe-stream-tenant-y0-1-*"]
    end
    
    subgraph Tenant2["Tenant Y0-2"]
        App2["openframe-stream-tenant-y0-2"]
        CG2["Consumer Group:<br/>openframe-stream-tenant-y0-2"]
        State2["State Store:<br/>/tmp/kafka-streams/openframe-stream-tenant-y0-2"]
        Topics2["Internal Topics:<br/>openframe-stream-tenant-y0-2-*"]
    end
    
    subgraph SharedKafka["Shared Kafka Cluster"]
        Brokers["Kafka Brokers"]
        InputTopics["Input Topics<br/>(tenant-specific)"]
        OutputTopics["Output Topics<br/>(tenant-specific)"]
    end
    
    App1 --> CG1
    App1 --> State1
    App1 --> Topics1
    
    App2 --> CG2
    App2 --> State2
    App2 --> Topics2
    
    CG1 -.->|"Consumes"| InputTopics
    CG2 -.->|"Consumes"| InputTopics
    
    App1 -.->|"Produces"| OutputTopics
    App2 -.->|"Produces"| OutputTopics
    
    InputTopics --> Brokers
    OutputTopics --> Brokers
    Topics1 --> Brokers
    Topics2 --> Brokers
    
    classDef tenant1Class fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef tenant2Class fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef sharedClass fill:#F39C12,stroke:#C87F0A,color:#fff
    
    class App1,CG1,State1,Topics1 tenant1Class
    class App2,CG2,State2,Topics2 tenant2Class
    class Brokers,InputTopics,OutputTopics sharedClass
```

---

## Integration Points

### Dependency on Data Layer Kafka

```mermaid
flowchart LR
    subgraph StreamConfig["Stream Processing Configuration"]
        KafkaConfig["KafkaConfig"]
        KafkaStreamsConfig["KafkaStreamsConfig"]
    end
    
    subgraph DataKafka["Data Layer Kafka"]
        OssKafkaConfig["OssKafkaConfig"]
        DebeziumMessage["DebeziumMessage<T>"]
        KafkaProducer["GenericKafkaProducer"]
    end
    
    subgraph DomainModels["Domain Models"]
        ActivityMessage["ActivityMessage<br/>(DebeziumMessage<Activity>)"]
        HostActivityMessage["HostActivityMessage<br/>(DebeziumMessage<HostActivity>)"]
    end
    
    OssKafkaConfig -.->|"Base Config"| KafkaConfig
    DebeziumMessage -->|"Generic Type"| ActivityMessage
    DebeziumMessage -->|"Generic Type"| HostActivityMessage
    
    ActivityMessage -->|"Serialized by"| KafkaStreamsConfig
    HostActivityMessage -->|"Serialized by"| KafkaStreamsConfig
    
    classDef configClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef dataClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef modelClass fill:#9B59B6,stroke:#6C3483,color:#fff
    
    class KafkaConfig,KafkaStreamsConfig configClass
    class OssKafkaConfig,DebeziumMessage,KafkaProducer dataClass
    class ActivityMessage,HostActivityMessage modelClass
```

### Usage by Stream Processing Components

```mermaid
flowchart TD
    subgraph Configuration["Stream Processing Configuration"]
        KafkaConfig["KafkaConfig"]
        KafkaStreamsConfig["KafkaStreamsConfig"]
        Serdes["Serde Beans"]
    end
    
    subgraph Listeners["Stream Processing Listeners"]
        JsonKafkaListener["JsonKafkaListener"]
        MessageTypeHeader["@Header MessageType"]
    end
    
    subgraph Streams["Stream Processing Streams"]
        ActivityEnrichment["ActivityEnrichmentService"]
        StreamBuilder["StreamsBuilder"]
    end
    
    subgraph Handlers["Stream Processing Handlers"]
        DebeziumHandler["DebeziumMessageHandler"]
        GenericHandler["GenericMessageHandler"]
    end
    
    KafkaConfig -->|"Provides Converter"| MessageTypeHeader
    MessageTypeHeader -->|"Used by"| JsonKafkaListener
    
    KafkaStreamsConfig -->|"Provides Config"| StreamBuilder
    Serdes -->|"Used by"| ActivityEnrichment
    
    JsonKafkaListener -->|"Delegates to"| DebeziumHandler
    JsonKafkaListener -->|"Delegates to"| GenericHandler
    
    ActivityEnrichment -->|"Produces to Topics"| JsonKafkaListener
    
    classDef configClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef listenerClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef streamClass fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef handlerClass fill:#F39C12,stroke:#C87F0A,color:#fff
    
    class KafkaConfig,KafkaStreamsConfig,Serdes configClass
    class JsonKafkaListener,MessageTypeHeader listenerClass
    class ActivityEnrichment,StreamBuilder streamClass
    class DebeziumHandler,GenericHandler handlerClass
```

---

## Configuration Examples

### Development Environment

```yaml
# application-dev.yml
spring:
  application:
    name: openframe-stream
  oss-tenant:
    kafka:
      bootstrap-servers: localhost:9092

openframe:
  cluster-id: ""  # Single tenant mode

# Kafka Streams will use application ID: "openframe-stream"
```

### Production Multi-Tenant Environment

```yaml
# application-prod.yml
spring:
  application:
    name: openframe-stream
  oss-tenant:
    kafka:
      bootstrap-servers: kafka-broker-1:9092,kafka-broker-2:9092,kafka-broker-3:9092

openframe:
  cluster-id: ${TENANT_ID}  # e.g., tenant-y0-1

# Kafka Streams will use application ID: "openframe-stream-tenant-y0-1"
```

### Topic Configuration

```yaml
# Topic naming convention
openframe:
  oss-tenant:
    kafka:
      topics:
        inbound:
          # Fleet MDM CDC topics
          fleet-mdm-activities:
            name: ${TENANT_ID:}.fleet.mdm.activities
            partitions: 3
            replication-factor: 3
          
          fleet-mdm-host-activities:
            name: ${TENANT_ID:}.fleet.mdm.host_activities
            partitions: 3
            replication-factor: 3
          
          # Enriched events output
          fleet-mdm-events:
            name: ${TENANT_ID:}.fleet.mdm.events
            partitions: 3
            replication-factor: 3
```

---

## Performance Tuning

### Consumer Configuration

```mermaid
flowchart TD
    subgraph ConsumerSettings["Consumer Settings"]
        AutoOffset["auto.offset.reset: earliest"]
        MaxPoll["max.poll.records: 100"]
        FetchMin["fetch.min.bytes: 1"]
        FetchMax["fetch.max.wait.ms: 500"]
    end
    
    subgraph Impact["Performance Impact"]
        Throughput["Throughput"]
        Latency["Latency"]
        Memory["Memory Usage"]
    end
    
    subgraph Tradeoffs["Tradeoffs"]
        HighPoll["Higher max.poll.records"]
        LowPoll["Lower max.poll.records"]
    end
    
    AutoOffset -.->|"Ensures"| Throughput
    MaxPoll -->|"Affects"| Throughput
    MaxPoll -->|"Affects"| Latency
    MaxPoll -->|"Affects"| Memory
    
    HighPoll -->|"+"| Throughput
    HighPoll -->|"-"| Latency
    HighPoll -->|"+"| Memory
    
    LowPoll -->|"-"| Throughput
    LowPoll -->|"+"| Latency
    LowPoll -->|"-"| Memory
    
    classDef settingClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef impactClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef tradeoffClass fill:#F39C12,stroke:#C87F0A,color:#fff
    
    class AutoOffset,MaxPoll,FetchMin,FetchMax settingClass
    class Throughput,Latency,Memory impactClass
    class HighPoll,LowPoll tradeoffClass
```

### Producer Configuration

```yaml
# Producer optimization settings
spring:
  kafka:
    producer:
      # Batching for throughput
      batch-size: 16384  # 16 KB batches
      linger-ms: 10      # Wait up to 10ms to fill batch
      
      # Memory allocation
      buffer-memory: 33554432  # 32 MB buffer
      
      # Compression
      compression-type: snappy  # Fast compression
      
      # Reliability
      acks: 1  # Leader acknowledgment (balance reliability/performance)
      retries: 3
      max-in-flight-requests-per-connection: 5
```

### State Store Configuration

```yaml
# State store settings
spring:
  kafka:
    streams:
      # State directory (should be on fast disk)
      state-dir: /var/lib/kafka-streams
      
      # Commit interval
      commit-interval-ms: 1000  # Commit every 1 second
      
      # Cache size
      cache-max-bytes-buffering: 10485760  # 10 MB cache
      
      # Cleanup policy
      state:
        cleanup:
          delay-ms: 600000  # 10 minutes
```

---

## Monitoring and Observability

### Key Metrics to Monitor

```mermaid
flowchart TD
    subgraph StreamMetrics["Kafka Streams Metrics"]
        ProcessRate["process-rate"]
        ProcessLatency["process-latency-avg"]
        CommitRate["commit-rate"]
        PollRate["poll-rate"]
    end
    
    subgraph StateMetrics["State Store Metrics"]
        StateSize["state-store-size"]
        RestoreTime["restore-time-ms"]
        FlushRate["flush-rate"]
    end
    
    subgraph ConsumerMetrics["Consumer Metrics"]
        Lag["consumer-lag"]
        FetchRate["fetch-rate"]
        RecordsConsumed["records-consumed-rate"]
    end
    
    subgraph ProducerMetrics["Producer Metrics"]
        ProduceRate["record-send-rate"]
        ProduceLatency["record-send-latency-avg"]
        ErrorRate["record-error-rate"]
    end
    
    subgraph Alerts["Alert Conditions"]
        HighLag["Lag > 10000"]
        HighLatency["Latency > 1000ms"]
        HighErrors["Error Rate > 1%"]
    end
    
    Lag -.->|"Triggers"| HighLag
    ProcessLatency -.->|"Triggers"| HighLatency
    ErrorRate -.->|"Triggers"| HighErrors
    
    classDef streamClass fill:#4A90E2,stroke:#2E5C8A,color:#fff
    classDef stateClass fill:#50C878,stroke:#2E7D4E,color:#fff
    classDef consumerClass fill:#9B59B6,stroke:#6C3483,color:#fff
    classDef producerClass fill:#F39C12,stroke:#C87F0A,color:#fff
    classDef alertClass fill:#E74C3C,stroke:#C0392B,color:#fff
    
    class ProcessRate,ProcessLatency,CommitRate,PollRate streamClass
    class StateSize,RestoreTime,FlushRate stateClass
    class Lag,FetchRate,RecordsConsumed consumerClass
    class ProduceRate,ProduceLatency,ErrorRate producerClass
    class HighLag,HighLatency,HighErrors alertClass
```

### Logging Configuration

```yaml
# logback-spring.xml
logging:
  level:
    com.openframe.stream.config: INFO
    org.apache.kafka.streams: INFO
    org.apache.kafka.clients: WARN
    
    # Enable for debugging
    # org.apache.kafka.streams.processor: DEBUG
    # org.apache.kafka.streams.state: DEBUG
```

---

## Troubleshooting

### Common Issues

#### 1. Application ID Conflicts

**Symptom:** Multiple stream instances competing for same consumer group

**Diagnosis:**
```bash
# Check consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Check group details
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group openframe-stream-tenant-y0-1 --describe
```

**Solution:**
- Ensure `openframe.cluster-id` is set correctly for each tenant
- Verify no duplicate deployments with same cluster ID
- Check state store directory for conflicts

#### 2. Serialization Errors

**Symptom:** `SerializationException` or `ClassCastException`

**Diagnosis:**
```text
org.apache.kafka.common.errors.SerializationException: 
  Error deserializing key/value for partition topic-0 at offset 123
```

**Solution:**
```java
// Ensure correct serde is used
KStream<String, ActivityMessage> stream = builder
    .stream(topic, Consumed.with(
        Serdes.String(),           // Key serde
        activityMessageSerde       // Value serde - must match message type
    ));
```

#### 3. State Store Recovery Slow

**Symptom:** Long startup times due to state restoration

**Diagnosis:**
```bash
# Check state store size
du -sh /tmp/kafka-streams/openframe-stream-tenant-y0-1

# Check changelog topic lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group openframe-stream-tenant-y0-1 --describe
```

**Solution:**
- Use faster disk for state directory
- Increase `num.standby.replicas` for faster failover
- Consider compaction for changelog topics
- Reduce state store size through windowing

#### 4. High Consumer Lag

**Symptom:** Processing falling behind message production

**Diagnosis:**
```bash
# Monitor lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group openframe-stream-tenant-y0-1 --describe

# Check processing rate
# Look for process-rate metric in JMX/Prometheus
```

**Solution:**
- Increase `num.stream.threads` (currently 1)
- Increase topic partitions for parallelism
- Optimize processing logic
- Scale horizontally (add more instances)

---

## Best Practices

### 1. Serde Configuration

✅ **DO:**
```java
// Use specific serdes for type safety
@Bean
public Serde<ActivityMessage> activityMessageSerde() {
    return Serdes.serdeFrom(
        new JsonSerializer<>(objectMapper),
        new JsonDeserializer<>(ActivityMessage.class, objectMapper)
    );
}

// Disable type info for clean output
@Bean
public Serde<ActivityMessage> outgoingActivityMessageSerde() {
    JsonSerde<ActivityMessage> serde = new JsonSerde<>(ActivityMessage.class);
    serde.serializer().setAddTypeInfo(false);
    return serde;
}
```

❌ **DON'T:**
```java
// Don't use generic Object serde
Serde<Object> genericSerde = new JsonSerde<>();  // Type unsafe

// Don't mix serdes with different type info settings
stream.to(topic, Produced.with(Serdes.String(), activityMessageSerde));
// If consuming side expects no type info, this will fail
```

### 2. Multi-Tenant Configuration

✅ **DO:**
```yaml
# Use environment variable for cluster ID
openframe:
  cluster-id: ${TENANT_ID:}

# Namespace topics by tenant
topics:
  activities: ${TENANT_ID:}.fleet.mdm.activities
```

❌ **DON'T:**
```yaml
# Don't hardcode tenant IDs
openframe:
  cluster-id: tenant-y0-1  # Hardcoded - bad for multi-tenant

# Don't share topics across tenants
topics:
  activities: fleet.mdm.activities  # No tenant isolation
```

### 3. Error Handling

✅ **DO:**
```java
@Bean
public Converter<byte[], MessageType> messageTypeConverter() {
    return source -> {
        try {
            String stringValue = new String(source, StandardCharsets.UTF_8);
            return MessageType.valueOf(stringValue.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Invalid message type: {}", new String(source, StandardCharsets.UTF_8));
            return null;  // Graceful degradation
        }
    };
}
```

❌ **DON'T:**
```java
// Don't let exceptions propagate
@Bean
public Converter<byte[], MessageType> messageTypeConverter() {
    return source -> {
        String stringValue = new String(source, StandardCharsets.UTF_8);
        return MessageType.valueOf(stringValue);  // Throws exception on invalid input
    };
}
```

### 4. State Management

✅ **DO:**
```yaml
# Use persistent volume for state stores in production
spring:
  kafka:
    streams:
      state-dir: /var/lib/kafka-streams  # Persistent volume

# Configure cleanup policy
state:
  cleanup:
    delay-ms: 600000  # 10 minutes
```

❌ **DON'T:**
```yaml
# Don't use /tmp in production
spring:
  kafka:
    streams:
      state-dir: /tmp/kafka-streams  # Lost on pod restart
```

---

## Security Considerations

### SSL/TLS Configuration

```yaml
spring:
  kafka:
    ssl:
      enabled: true
      key-store-location: classpath:kafka.keystore.jks
      key-store-password: ${KEYSTORE_PASSWORD}
      trust-store-location: classpath:kafka.truststore.jks
      trust-store-password: ${TRUSTSTORE_PASSWORD}
    
    properties:
      security.protocol: SSL
      ssl.endpoint.identification.algorithm: https
```

### SASL Authentication

```yaml
spring:
  kafka:
    properties:
      security.protocol: SASL_SSL
      sasl.mechanism: PLAIN
      sasl.jaas.config: |
        org.apache.kafka.common.security.plain.PlainLoginModule required
        username="${KAFKA_USERNAME}"
        password="${KAFKA_PASSWORD}";
```

---

## Related Documentation

- **[Stream Processing Listeners](stream_processing_listeners.md)** - Kafka message listeners and consumer configuration
- **[Stream Processing Streams](stream_processing_streams.md)** - Kafka Streams topologies and processing logic
- **[Stream Processing Handlers](stream_processing_handlers.md)** - Message handlers and processing strategies
- **[Data Layer Kafka](data_layer_kafka.md)** - Kafka data layer foundation and models
- **[Stream Processing Application](stream_processing_application.md)** - Main application and service orchestration

---

## Additional Resources

### Kafka Streams Documentation
- [Kafka Streams Developer Guide](https://kafka.apache.org/documentation/streams/)
- [Spring Kafka Documentation](https://docs.spring.io/spring-kafka/reference/html/)
- [Kafka Streams Architecture](https://kafka.apache.org/documentation/streams/architecture)

### OpenFrame Resources
- **Community:** [OpenMSP Slack](https://www.openmsp.ai/)
- **Platform:** [OpenFrame Documentation](https://www.flamingo.run/openframe)
- **Company:** [Flamingo AI](https://flamingo.run)

---

**Last Updated:** 2024  
**Module Version:** 1.0  
**Maintained By:** OpenFrame Engineering Team
