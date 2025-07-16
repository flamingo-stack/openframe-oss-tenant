# Event Unification System for OpenFrame

## Overview

Упрощенная система унификации типов событий для OpenFrame, которая интегрируется в существующий flow openframe-stream через абстрактные методы в моделях Debezium.

## Problem Statement

В настоящее время каждый интегрированный инструмент имеет свои собственные типы событий:
- **MeshCentral**: `user.login`, `device.connect`, `file.transfer`, etc.
- **Tactical RMM**: `user_login`, `agent_created`, `script_executed`, etc.  
- **Fleet MDM**: `user_login`, `host_enrolled`, `policy_applied`, etc.

Это создает проблемы:
- Несогласованность в отображении событий
- Сложность поиска и корреляции событий
- Дублирование логики обработки

## Solution: Abstract Method + Deserializer Logic

Создать простую систему маппинга типов событий, которая:
- Добавляет абстрактный метод `getEventType()` в `DebeziumMessage`
- Реализует логику маппинга в десериализаторах
- Использует `EventTypeMapperService` для унификации типов событий
- Интегрируется в существующий flow без сложных изменений

## Architecture

### Current Flow (Simplified)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   MeshCentral   │───▶│    Debezium     │───▶│   Kafka Topic   │
│   (MongoDB)     │    │   Connector     │    │ meshcentral.mongodb.events │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Tactical RMM   │───▶│    Debezium     │───▶│   Kafka Topic   │
│   (PostgreSQL)  │    │   Connector     │    │ tactical-rmm.postgres.events │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Fleet MDM     │───▶│    Debezium     │───▶│   Kafka Topic   │
│    (MySQL)      │    │   Connector     │    │ fleet.mysql.events │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 openframe-stream (KafkaListener)               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              JsonKafkaListener                          │   │
│  │  @KafkaListener(topics = {...})                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                 │
│                              ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         GenericJsonMessageProcessor                     │   │
│  │  - Deserializes messages (WITH EVENT TYPE MAPPING)     │   │
│  │  - Enriches data                                        │   │
│  │  - Routes to handlers                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                 │
│                              ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         IntegratedToolDataEnrichmentService             │   │
│  │  - Gets machineId                                       │   │
│  │  - Gets unified event type (from message)               │   │
│  │  - Returns enriched data                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                 │
│                              ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Existing Handlers                          │   │
│  │  - MeshEventKafkaHandler                                │   │
│  │  - TrmmEventKafkaHandler                                │   │
│  │  - FleetMdmEventKafkaHandler (NEW)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Core Components

#### 1.1 Unified Event Types Enum
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/unified/UnifiedEventType.java
public enum UnifiedEventType {
    // Authentication events
    LOGIN("Authentication", "User login event"),
    LOGOUT("Authentication", "User logout event"),
    LOGIN_FAILED("Authentication", "Failed login attempt"),
    PASSWORD_CHANGED("Authentication", "Password change event"),
    SESSION_EXPIRED("Authentication", "Session expiration event"),
    
    // Device management events
    DEVICE_ONLINE("Device Management", "Device came online"),
    DEVICE_OFFLINE("Device Management", "Device went offline"),
    DEVICE_REGISTERED("Device Management", "New device registration"),
    DEVICE_UPDATED("Device Management", "Device information updated"),
    DEVICE_DELETED("Device Management", "Device removed"),
    
    // User management events
    USER_CREATED("User Management", "New user created"),
    USER_UPDATED("User Management", "User information updated"),
    USER_DELETED("User Management", "User removed"),
    USER_ROLE_CHANGED("User Management", "User role modified"),
    
    // Script and automation events
    SCRIPT_EXECUTED("Automation", "Script executed"),
    SCRIPT_FAILED("Automation", "Script execution failed"),
    SCRIPT_CREATED("Automation", "New script created"),
    SCRIPT_UPDATED("Automation", "Script modified"),
    
    // Policy and compliance events
    POLICY_APPLIED("Policy Management", "Policy applied to device"),
    POLICY_VIOLATION("Policy Management", "Policy violation detected"),
    COMPLIANCE_CHECK("Policy Management", "Compliance check performed"),
    
    // File and data events
    FILE_TRANSFER("File Management", "File transfer event"),
    FILE_UPLOADED("File Management", "File uploaded"),
    FILE_DOWNLOADED("File Management", "File downloaded"),
    FILE_DELETED("File Management", "File removed"),
    
    // Remote access events
    REMOTE_SESSION_START("Remote Access", "Remote session started"),
    REMOTE_SESSION_END("Remote Access", "Remote session ended"),
    REMOTE_SESSION_FAILED("Remote Access", "Remote session failed"),
    
    // Monitoring and alerting events
    ALERT_TRIGGERED("Monitoring", "Alert triggered"),
    ALERT_RESOLVED("Monitoring", "Alert resolved"),
    MONITORING_CHECK_CREATED("Monitoring", "New monitoring check"),
    MONITORING_CHECK_FAILED("Monitoring", "Monitoring check failed"),
    
    // System events
    SYSTEM_STARTUP("System", "System startup"),
    SYSTEM_SHUTDOWN("System", "System shutdown"),
    SYSTEM_ERROR("System", "System error occurred"),
    
    // Unknown events
    UNKNOWN("Unknown", "Unknown event type");
    
    private final String category;
    private final String description;
    
    UnifiedEventType(String category, String description) {
        this.category = category;
        this.description = description;
    }
    
    public String getCategory() {
        return category;
    }
    
    public String getDescription() {
        return description;
    }
}
```

#### 1.2 Event Type Mapper Service
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/service/EventTypeMapperService.java
@Service
@Slf4j
public class EventTypeMapperService {
    
    private final Map<String, UnifiedEventType> mappings = new ConcurrentHashMap<>();
    
    public EventTypeMapperService() {
        initializeDefaultMappings();
    }
    
    public UnifiedEventType mapToUnifiedType(String toolName, String sourceEventType) {
        String key = toolName + ":" + sourceEventType;
        UnifiedEventType unifiedType = mappings.get(key);
        
        if (unifiedType == null) {
            log.debug("No mapping found for {}:{}, using UNKNOWN", toolName, sourceEventType);
            return UnifiedEventType.UNKNOWN;
        }
        
        log.debug("Mapped {}:{} -> {}", toolName, sourceEventType, unifiedType);
        return unifiedType;
    }
    
    public void registerMapping(String toolName, String sourceEventType, UnifiedEventType unifiedType) {
        String key = toolName + ":" + sourceEventType;
        mappings.put(key, unifiedType);
        log.info("Registered mapping: {}:{} -> {}", toolName, sourceEventType, unifiedType);
    }
    
    private void initializeDefaultMappings() {
        // MeshCentral mappings
        registerMapping("meshcentral", "user.login", UnifiedEventType.LOGIN);
        registerMapping("meshcentral", "user.logout", UnifiedEventType.LOGOUT);
        registerMapping("meshcentral", "device.connect", UnifiedEventType.DEVICE_ONLINE);
        registerMapping("meshcentral", "device.disconnect", UnifiedEventType.DEVICE_OFFLINE);
        registerMapping("meshcentral", "file.transfer", UnifiedEventType.FILE_TRANSFER);
        registerMapping("meshcentral", "remote.session.start", UnifiedEventType.REMOTE_SESSION_START);
        registerMapping("meshcentral", "remote.session.end", UnifiedEventType.REMOTE_SESSION_END);
        
        // Tactical RMM mappings
        registerMapping("tactical-rmm", "user_login", UnifiedEventType.LOGIN);
        registerMapping("tactical-rmm", "user_logout", UnifiedEventType.LOGOUT);
        registerMapping("tactical-rmm", "agent_created", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping("tactical-rmm", "agent_updated", UnifiedEventType.DEVICE_UPDATED);
        registerMapping("tactical-rmm", "script_executed", UnifiedEventType.SCRIPT_EXECUTED);
        registerMapping("tactical-rmm", "check_created", UnifiedEventType.MONITORING_CHECK_CREATED);
        registerMapping("tactical-rmm", "alert_triggered", UnifiedEventType.ALERT_TRIGGERED);
        
        // Fleet MDM mappings
        registerMapping("fleet-mdm", "user_login", UnifiedEventType.LOGIN);
        registerMapping("fleet-mdm", "user_logout", UnifiedEventType.LOGOUT);
        registerMapping("fleet-mdm", "host_enrolled", UnifiedEventType.DEVICE_REGISTERED);
        registerMapping("fleet-mdm", "host_updated", UnifiedEventType.DEVICE_UPDATED);
        registerMapping("fleet-mdm", "policy_applied", UnifiedEventType.POLICY_APPLIED);
        registerMapping("fleet-mdm", "profile_installed", UnifiedEventType.POLICY_APPLIED);
        registerMapping("fleet-mdm", "query_executed", UnifiedEventType.SCRIPT_EXECUTED);
    }
}
```

#### 1.3 Update DebeziumMessage (Add Abstract Method)
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/debezium/DebeziumMessage.java
@Data
public abstract class DebeziumMessage implements DeserializedKafkaMessage {
    
    @JsonProperty("before")
    private JsonNode before;
    
    @JsonProperty("after")
    private JsonNode after;
    
    @JsonProperty("source")
    private Source source;
    
    @JsonProperty("op")
    private String operation;
    
    @JsonProperty("ts_ms")
    private Long timestamp;
    
    // NEW: Unified event type field
    private UnifiedEventType unifiedEventType;
    
    /**
     * Get the table/collection name - to be implemented by subclasses
     */
    public abstract String getTableName();
    
    /**
     * Get the agent ID - to be implemented by subclasses
     */
    public abstract String getAgentId();
    
    /**
     * Get the source event type from the message data - to be implemented by subclasses
     * This method should extract the original event type from the tool-specific data
     */
    public abstract String getSourceEventType();
    
    /**
     * Get the tool name - to be implemented by subclasses
     */
    public abstract String getToolName();
    
    // ... existing Source class ...
}
```

#### 1.4 Update MeshCentralEventMessage
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/debezium/MeshCentralEventMessage.java
@Data
public class MeshCentralEventMessage extends MongoDbDebeziumMessage {

    @Override
    public String getAgentId() {
        // ... existing implementation ...
    }
    
    @Override
    public String getSourceEventType() {
        JsonNode event = getAfter() != null && !getAfter().asText().trim().isEmpty()
                ? getAfter() : getBefore();
        if (event == null || event.asText().trim().isEmpty()) {
            return "unknown";
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            event = mapper.readTree(event.asText());

            // Extract event type from MeshCentral event structure
            JsonNode eventTypeNode = event.get("etype");
            if (eventTypeNode != null && !eventTypeNode.asText().isEmpty()) {
                return eventTypeNode.asText();
            }
            
            // Fallback: try to determine from action field
            JsonNode actionNode = event.get("action");
            if (actionNode != null && !actionNode.asText().isEmpty()) {
                return actionNode.asText();
            }
            
            return "unknown";
        } catch (IOException e) {
            log.error("Error parsing event type from MeshCentral event: {}", e.getMessage());
            return "unknown";
        }
    }
    
    @Override
    public String getToolName() {
        return "meshcentral";
    }
}
```

#### 1.5 Update TrmmEventMessage
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/debezium/TrmmEventMessage.java
@Data
@EqualsAndHashCode(callSuper = true)
public class TrmmEventMessage extends PostgreSqlDebeziumMessage {
    
    @Override
    public String getAgentId() {
        // ... existing implementation ...
    }
    
    @Override
    public String getSourceEventType() {
        JsonNode event = getAfter() == null ? getBefore() : getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return "unknown";
        }
        
        // Extract event type from Tactical RMM event structure
        JsonNode eventTypeNode = event.get("action");
        if (eventTypeNode != null && !eventTypeNode.isNull() && !eventTypeNode.asText().isEmpty()) {
            return eventTypeNode.asText();
        }
        
        // Fallback: try to determine from table name and operation
        String tableName = getTableName();
        String operation = getOperation();
        if (tableName != null && operation != null) {
            return tableName + "_" + operation;
        }
        
        return "unknown";
    }
    
    @Override
    public String getToolName() {
        return "tactical-rmm";
    }
}
```

### Phase 2: Abstract Deserializer

#### 2.1 Create Abstract Event Deserializer
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/deserializer/AbstractEventDeserializer.java
public abstract class AbstractEventDeserializer<T extends DebeziumMessage> implements KafkaMessageDeserializer {
    
    protected final ObjectMapper mapper;
    protected final EventTypeMapperService eventTypeMapperService;
    
    public AbstractEventDeserializer(ObjectMapper mapper, EventTypeMapperService eventTypeMapperService) {
        this.mapper = mapper;
        this.eventTypeMapperService = eventTypeMapperService;
    }
    
    @Override
    public DeserializedKafkaMessage deserialize(Map<String, Object> message) {
        try {
            T debeziumMessage = mapper.convertValue(message.get("payload"), getMessageClass());
            
            // NEW: Map event type and set it in the message
            String toolName = debeziumMessage.getToolName();
            String sourceEventType = debeziumMessage.getSourceEventType();
            UnifiedEventType unifiedEventType = eventTypeMapperService.mapToUnifiedType(toolName, sourceEventType);
            
            debeziumMessage.setUnifiedEventType(unifiedEventType);
            
            log.debug("Deserialized message for tool {}: sourceEvent={}, unifiedEvent={}", 
                    toolName, sourceEventType, unifiedEventType);
            
            return debeziumMessage;
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to " + getMessageClass().getSimpleName(), e);
        }
    }
    
    protected abstract Class<T> getMessageClass();
}
```

#### 2.2 Update MeshCentralEventDeserializer
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/deserializer/MeshCentralEventDeserializer.java
@Component
public class MeshCentralEventDeserializer extends AbstractEventDeserializer<MeshCentralEventMessage> {

    public MeshCentralEventDeserializer(ObjectMapper mapper, EventTypeMapperService eventTypeMapperService) {
        super(mapper, eventTypeMapperService);
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }
    
    @Override
    protected Class<MeshCentralEventMessage> getMessageClass() {
        return MeshCentralEventMessage.class;
    }
}
```

#### 2.3 Update TrmmEventDeserializer
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/deserializer/TrmmEventDeserializer.java
@Component
public class TrmmEventDeserializer extends AbstractEventDeserializer<TrmmEventMessage> {

    public TrmmEventDeserializer(ObjectMapper mapper, EventTypeMapperService eventTypeMapperService) {
        super(mapper, eventTypeMapperService);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }
    
    @Override
    protected Class<TrmmEventMessage> getMessageClass() {
        return TrmmEventMessage.class;
    }
}
```

### Phase 3: Update IntegratedToolEnrichedData

#### 3.1 Update IntegratedToolEnrichedData
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/debezium/IntegratedToolEnrichedData.java
@Data
public class IntegratedToolEnrichedData implements ExtraParams {
    private String machineId;
    private UnifiedEventType unifiedEventType; // NEW FIELD - from message
    private String sourceEventType; // NEW FIELD - from message
    private String toolName; // NEW FIELD - from message
}
```

#### 3.2 Update IntegratedToolDataEnrichmentService
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/service/IntegratedToolDataEnrichmentService.java
@Service
@Slf4j
public class IntegratedToolDataEnrichmentService implements DataEnrichmentService<DebeziumMessage> {

    private final ToolConnectionRepository toolConnectionRepository;
    private final MachineIdCacheService machineIdCacheService;

    public IntegratedToolDataEnrichmentService(ToolConnectionRepository toolConnectionRepository,
                                             MachineIdCacheService machineIdCacheService) {
        this.toolConnectionRepository = toolConnectionRepository;
        this.machineIdCacheService = machineIdCacheService;
    }

    @Override
    public ExtraParams getExtraParams(DebeziumMessage message) {
        IntegratedToolEnrichedData integratedToolEnrichedData = new IntegratedToolEnrichedData();
        
        if (message == null || message.getAgentId() == null) {
            return integratedToolEnrichedData;
        }
        
        // Get machine ID (existing logic)
        String agentId = message.getAgentId();
        Optional<String> machineIdOptional = machineIdCacheService.getMachineId(agentId);
        
        if (machineIdOptional.isPresent()) {
            log.debug("Machine ID found in cache for agent: {}", agentId);
            integratedToolEnrichedData.setMachineId(machineIdOptional.get());
        } else {
            log.debug("Machine ID not found in cache, querying database for agent: {}", agentId);
            Optional<ToolConnection> toolConnectionOptional = toolConnectionRepository.findByAgentToolId(agentId);
            toolConnectionOptional.ifPresent(toolConnection -> {
                String dbMachineId = toolConnection.getMachineId();
                integratedToolEnrichedData.setMachineId(dbMachineId);
                if (dbMachineId != null) {
                    machineIdCacheService.putMachineId(agentId, dbMachineId);
                }
            });
        }
        
        // NEW: Get event type information from the message (already mapped in deserializer)
        integratedToolEnrichedData.setToolName(message.getToolName());
        integratedToolEnrichedData.setSourceEventType(message.getSourceEventType());
        integratedToolEnrichedData.setUnifiedEventType(message.getUnifiedEventType());
        
        log.debug("Enriched data for agent {}: tool={}, sourceEvent={}, unifiedEvent={}", 
                agentId, message.getToolName(), message.getSourceEventType(), message.getUnifiedEventType());
        
        return integratedToolEnrichedData;
    }

    @Override
    public DataEnrichmentServiceType getType() {
        return DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS;
    }
}
```

### Phase 4: Add Fleet MDM Support

#### 4.1 Create MySqlDebeziumMessage (if not exists)
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/debezium/MySqlDebeziumMessage.java
@Data
@EqualsAndHashCode(callSuper = true)
public abstract class MySqlDebeziumMessage extends DebeziumMessage {
    
    @JsonProperty("table")
    private String table;
    
    @Override
    public String getTableName() {
        return table;
    }
}
```

#### 4.2 Create FleetMdmEventMessage
```java
// openframe/libs/openframe-data/src/main/java/com/openframe/data/model/debezium/FleetMdmEventMessage.java
@Data
@EqualsAndHashCode(callSuper = true)
public class FleetMdmEventMessage extends MySqlDebeziumMessage {
    
    @Override
    public String getAgentId() {
        JsonNode event = getAfter() == null ? getBefore() : getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return null;
        }
        JsonNode agentIdNode = event.get("host_id"); // Fleet MDM uses host_id
        if (agentIdNode != null && !agentIdNode.isNull() && !agentIdNode.asText().isEmpty()) {
            return agentIdNode.asText();
        }
        return null;
    }
    
    @Override
    public String getSourceEventType() {
        JsonNode event = getAfter() == null ? getBefore() : getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return "unknown";
        }
        
        // Extract event type from Fleet MDM event structure
        JsonNode eventTypeNode = event.get("type");
        if (eventTypeNode != null && !eventTypeNode.isNull() && !eventTypeNode.asText().isEmpty()) {
            return eventTypeNode.asText();
        }
        
        // Fallback: try to determine from table name and operation
        String tableName = getTableName();
        String operation = getOperation();
        if (tableName != null && operation != null) {
            return tableName + "_" + operation;
        }
        
        return "unknown";
    }
    
    @Override
    public String getToolName() {
        return "fleet-mdm";
    }
}
```

#### 4.3 Create FleetMdmEventDeserializer
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/deserializer/FleetMdmEventDeserializer.java
@Component
public class FleetMdmEventDeserializer extends AbstractEventDeserializer<FleetMdmEventMessage> {

    public FleetMdmEventDeserializer(ObjectMapper mapper, EventTypeMapperService eventTypeMapperService) {
        super(mapper, eventTypeMapperService);
    }

    @Override
    public MessageType getType() {
        return MessageType.FLEET_EVENT;
    }
    
    @Override
    protected Class<FleetMdmEventMessage> getMessageClass() {
        return FleetMdmEventMessage.class;
    }
}
```

#### 4.4 Create FleetMdmEventKafkaHandler
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/handler/fleet/FleetMdmEventKafkaHandler.java
@Service
@Slf4j
public class FleetMdmEventKafkaHandler extends DebeziumKafkaMessageHandler<KafkaITPinotMessage, FleetMdmEventMessage> {
    
    @Value("${kafka.producer.topic.it.event.name}")
    private String topic;

    public FleetMdmEventKafkaHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    public MessageType getType() {
        return MessageType.FLEET_EVENT;
    }

    @Override
    protected KafkaITPinotMessage transform(FleetMdmEventMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        KafkaITPinotMessage message = new KafkaITPinotMessage();
        try {
            message.setTimestamp(debeziumMessage.getTimestamp());
            message.setToolName(IntegratedTool.FLEET.getDbName());
            message.setAgentId(debeziumMessage.getAgentId());
            message.setMachineId(enrichedData.getMachineId());
            
            // NEW: Add unified event type information
            if (enrichedData.getUnifiedEventType() != null) {
                // You can add unified event type to the message if needed
                log.debug("Unified event type: {} for agent: {}", 
                        enrichedData.getUnifiedEventType(), debeziumMessage.getAgentId());
            }

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return message;
    }
}
```

### Phase 5: Update Existing Components

#### 5.1 Update MessageType Enum
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/enumeration/MessageType.java
@Getter
public enum MessageType {
    MESHCENTRAL_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA)),
    TACTICAL_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA)),
    FLEET_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA));

    private final DataEnrichmentServiceType dataEnrichmentServiceType;
    private final List<Destination> destinationList;

    MessageType(DataEnrichmentServiceType dataEnrichmentServiceType, List<Destination> destinationList) {
        this.dataEnrichmentServiceType = dataEnrichmentServiceType;
        this.destinationList = destinationList;
    }
}
```

#### 5.2 Update Kafka Listener
```java
// openframe/services/openframe-stream/src/main/java/com/openframe/stream/listener/JsonKafkaListener.java
@Service
public class JsonKafkaListener {

    private final GenericJsonMessageProcessor messageProcessor;

    public JsonKafkaListener(GenericJsonMessageProcessor messageProcessor) {
        this.messageProcessor = messageProcessor;
    }

    @KafkaListener(topics = {
            "${kafka.consumer.topic.event.meshcentral.name}", 
            "${kafka.consumer.topic.event.tactical-rmm.name}",
            "${kafka.consumer.topic.event.fleet-mdm.name}"
        },
        groupId = "${spring.kafka.consumer.group-id}")
    public void listenIntegratedToolsEvents(Map<String, Object> message) {
        MessageType messageType = MessageTypeResolver.resolve(message);
        messageProcessor.process(message, messageType);
    }
}
```

### Phase 6: Configuration

#### 6.1 Application Properties
```yaml
# openframe/services/openframe-stream/src/main/resources/application.yml
kafka:
  consumer:
    topic:
      event:
        meshcentral:
          name: meshcentral.mongodb.events
        tactical-rmm:
          name: tactical-rmm.postgres.events
        fleet-mdm:
          name: fleet.mysql.events
  producer:
    topic:
      it:
        event:
          name: it-events

openframe:
  events:
    unification:
      enabled: true
      mappings:
        meshcentral:
          user.login: LOGIN
          user.logout: LOGOUT
          device.connect: DEVICE_ONLINE
          device.disconnect: DEVICE_OFFLINE
          file.transfer: FILE_TRANSFER
          remote.session.start: REMOTE_SESSION_START
          remote.session.end: REMOTE_SESSION_END
        tactical-rmm:
          user_login: LOGIN
          user_logout: LOGOUT
          agent_created: DEVICE_REGISTERED
          agent_updated: DEVICE_UPDATED
          script_executed: SCRIPT_EXECUTED
          check_created: MONITORING_CHECK_CREATED
          alert_triggered: ALERT_TRIGGERED
        fleet-mdm:
          user_login: LOGIN
          user_logout: LOGOUT
          host_enrolled: DEVICE_REGISTERED
          host_updated: DEVICE_UPDATED
          policy_applied: POLICY_APPLIED
          profile_installed: POLICY_APPLIED
          query_executed: SCRIPT_EXECUTED
```

## Benefits

1. **Clean Architecture**: Абстрактные методы в базовом классе обеспечивают единообразие
2. **Separation of Concerns**: Логика маппинга в десериализаторах, логика обогащения в сервисе
3. **Reusability**: Абстрактный десериализатор для всех инструментов
4. **Extensibility**: Легко добавлять новые инструменты
5. **Minimal Changes**: Минимальные изменения в существующей архитектуре

## Next Steps

1. **Implement Core Components**: Создать UnifiedEventType enum и EventTypeMapperService
2. **Update DebeziumMessage**: Добавить абстрактные методы
3. **Update Event Messages**: Реализовать методы в MeshCentralEventMessage и TrmmEventMessage
4. **Create Abstract Deserializer**: Создать AbstractEventDeserializer
5. **Update Deserializers**: Обновить существующие десериализаторы
6. **Add Fleet MDM Support**: Создать модели и обработчики для Fleet MDM
7. **Testing**: Создать тесты для всех компонентов

## Questions to Investigate

1. **Event Type Extraction**: Как точно извлекать типы событий из каждого инструмента?
2. **Performance**: Как оптимизировать производительность маппинга?
3. **Error Handling**: Как обрабатывать ошибки маппинга?
4. **Configuration**: Как сделать маппинги конфигурируемыми? 