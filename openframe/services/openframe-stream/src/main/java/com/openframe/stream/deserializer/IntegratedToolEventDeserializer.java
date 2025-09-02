package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.mapper.EventTypeMapper;
import com.openframe.data.model.debezium.CommonDebeziumMessage;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.enums.IntegratedToolType;
import com.openframe.data.model.enums.MessageType;
import com.openframe.data.model.enums.UnifiedEventType;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

@Slf4j
public abstract class IntegratedToolEventDeserializer implements KafkaMessageDeserializer {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.of("UTC"));
    private static final String UNKNOWN = "unknown";
    private static final String DEFAULT_TABLE_NAME = "events";
    
    private static final int MAX_DEPTH = 64;
    private static final int MAX_ARRAY_SIZE = 1000;
    private static final int MAX_VALUE_LENGTH = 10000;
    private static final int MAX_LOG_VALUE_PREVIEW = 512;
    
    private static final String COMPOSITE_KEY_PATTERN = "%s_%s_id_%s";
    private static final String HASH_KEY_PATTERN = "%s_%s_hash_%s";
    protected final ObjectMapper mapper;

    protected IntegratedToolEventDeserializer(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public DeserializedDebeziumMessage deserialize(CommonDebeziumMessage debeziumMessage, MessageType messageType) {
        try {
            JsonNode after = debeziumMessage.getPayload().getAfter();
            long eventTimestamp = getEffectiveTimestamp(debeziumMessage, after);
            return DeserializedDebeziumMessage.builder()
                .payload(debeziumMessage.getPayload())
                .agentId(getAgentId(after).orElse(null))
                .ingestDay(formatter.format(Instant.ofEpochMilli(eventTimestamp)))
                .sourceEventType(getSourceEventType(after).orElse(UNKNOWN))
                .toolEventId(generateCompositeId(debeziumMessage, messageType, after))
                .unifiedEventType(getEventType(getSourceEventType(after).orElse(UNKNOWN), messageType.getIntegratedToolType()))
                .message(getMessage(after).orElse(null))
                .integratedToolType(messageType.getIntegratedToolType())
                .debeziumMessage(getDetails(after))
                .eventTimestamp(eventTimestamp)
                .build();
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }

    protected abstract Optional<String> getAgentId(JsonNode afterField);
    protected abstract Optional<String> getSourceEventType(JsonNode afterField);
    protected abstract Optional<String> getEventToolId(JsonNode afterField);
    protected abstract Optional<String> getMessage(JsonNode afterField);
    
    /**
     * Extract event timestamp from the source data. Override to provide tool-specific implementation.
     * Returns empty if no timestamp field is available in the event.
     */
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return Optional.empty();
    }
    
    /**
     * Get effective timestamp for the event - uses event timestamp from source data if available,
     * falls back to Debezium processing timestamp
     */
    private long getEffectiveTimestamp(CommonDebeziumMessage message, JsonNode after) {
        return getSourceEventTimestamp(after)
                .orElse(message.getPayload().getTimestamp());
    }
    
    /**
     * Generates composite ID: tool_table_id_value or tool_table_hash_value for missing PKs
     * Returns deterministic UUID for idempotency
     */
    private String generateCompositeId(CommonDebeziumMessage message, MessageType messageType, JsonNode after) {
        String toolName = messageType.getIntegratedToolType().name().toLowerCase();
        String tableName = extractTableName(message);
        
        String compositeKey = getEventToolId(after)
                .map(id -> String.format(COMPOSITE_KEY_PATTERN, toolName, tableName, id))
                .orElseGet(() -> {
                    log.warn("Event missing primary key from {}.{} - using content hash fallback", toolName, tableName);
                    
                    String contentHash = Integer.toHexString(
                        Objects.hash(toolName, tableName, after.toString())
                    );
                    
                    return String.format(HASH_KEY_PATTERN, toolName, tableName, contentHash);
                });
        
        //Generate deterministic UUID
        UUID uuid = UUID.nameUUIDFromBytes(compositeKey.getBytes());
        return uuid.toString();
    }
    
    /**
     * Extracts table name from Debezium source metadata
     * Handles different database types: PostgreSQL/MySQL use "table", MongoDB uses "collection"
     */
    private String extractTableName(CommonDebeziumMessage message) {
        return Optional.ofNullable(message)
                .map(CommonDebeziumMessage::getPayload)
                .map(DebeziumMessage.Payload::getSource)
                .flatMap(source -> {
                    String table = source.getTable();
                    if (table != null && !table.trim().isEmpty()) {
                        return Optional.of(table.trim());
                    }
                    String collection = source.getCollection();
                    if (collection != null && !collection.trim().isEmpty()) {
                        return Optional.of(collection.trim());
                    }
                    return Optional.empty();
                })
                .orElse(DEFAULT_TABLE_NAME);
    }
    
    /**
     * Convert all fields from JsonNode after to Map<String, String>
     * This method extracts all key-value pairs from the after field and converts them to strings
     */
    protected String getDetails(JsonNode after) {
        if (after == null || after.isNull()) {
            return null;
        }
        return after.toString();
    }

    private UnifiedEventType getEventType(String sourceEventType, IntegratedToolType toolType) {
        return EventTypeMapper.mapToUnifiedType(toolType, sourceEventType);
    }

    /**
     * Safely extract a string field from a JsonNode.
     * Shared utility method for consistent field parsing across all deserializers.
     */
    protected Optional<String> parseStringField(JsonNode node, String fieldName) {
        return Optional.ofNullable(node)
            .map(n -> n.get(fieldName))
            .filter(field -> !field.isNull() && !field.isMissingNode())
            .map(JsonNode::asText)
            .filter(StringUtils::isNotBlank);
    }
}
