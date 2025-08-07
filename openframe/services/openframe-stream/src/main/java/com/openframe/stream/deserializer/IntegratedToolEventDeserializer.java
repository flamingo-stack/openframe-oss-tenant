package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.mapper.EventTypeMapper;
import com.openframe.data.model.debezium.CommonDebeziumMessage;
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

@Slf4j
public abstract class IntegratedToolEventDeserializer implements KafkaMessageDeserializer {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.of("UTC"));
    private static final String UNKNOWN = "unknown";
    private static final String DEFAULT_TABLE_NAME = "events";
    
    private static final int MAX_DEPTH = 10;
    private static final int MAX_ARRAY_SIZE = 1000;
    private static final int MAX_VALUE_LENGTH = 10000;
    
    private static final String COMPOSITE_KEY_PATTERN = "%s_%s_id_%s";
    private static final String HASH_KEY_PATTERN = "%s_%s_hash_%s";

    @Override
    public DeserializedDebeziumMessage deserialize(CommonDebeziumMessage debeziumMessage, MessageType messageType) {
        try {
            JsonNode after = debeziumMessage.getPayload().getAfter();
            return DeserializedDebeziumMessage.builder()
                .payload(debeziumMessage.getPayload())
                .agentId(getAgentId(after).orElse(null))
                .ingestDay(formatter.format(Instant.ofEpochMilli(debeziumMessage.getPayload().getTimestamp())))
                .sourceEventType(getSourceEventType(after).orElse(UNKNOWN))
                .toolEventId(generateCompositeId(debeziumMessage, messageType, after))
                .unifiedEventType(getEventType(getSourceEventType(after).orElse(UNKNOWN), messageType.getIntegratedToolType()))
                .message(getMessage(after).orElse(null))
                .integratedToolType(messageType.getIntegratedToolType())
                .details(getDetails(after))
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
     * Generates composite ID: tool_table_id_value or tool_table_hash_value for missing PKs
     * Returns deterministic UUID for idempotency
     */
    private String generateCompositeId(CommonDebeziumMessage message, MessageType messageType, JsonNode after) {
        String toolName = messageType.getIntegratedToolType().name().toLowerCase();
        String tableName = extractTableName(message);
        Optional<String> primaryKeyValue = getEventToolId(after);
        String compositeKey;
        if (primaryKeyValue.isPresent() && !UNKNOWN.equals(primaryKeyValue.get())) {
            compositeKey = String.format(COMPOSITE_KEY_PATTERN, 
                toolName, 
                tableName, 
                primaryKeyValue.get()
            );
        } else {
            log.warn("Event missing primary key from {}.{} - using content hash fallback", toolName, tableName);

            String contentHash = Integer.toHexString(
                Objects.hash(toolName, tableName, after.toString())
            );
            
            compositeKey = String.format(HASH_KEY_PATTERN,
                toolName,
                tableName,
                contentHash
            );
        }
        
        //Generate deterministic UUID
        UUID uuid = UUID.nameUUIDFromBytes(compositeKey.getBytes());
        return uuid.toString();
    }
    
    /**
     * Extracts table name from Debezium source metadata
     * Handles different database types: PostgreSQL/MySQL use "table", MongoDB uses "collection"
     */
    private String extractTableName(CommonDebeziumMessage message) {
        if (message == null || message.getPayload() == null) {
            return DEFAULT_TABLE_NAME;
        }
        var source = message.getPayload().getSource();
        if (source == null) {
            return DEFAULT_TABLE_NAME;
        }
        if (source.getTable() != null && !source.getTable().trim().isEmpty()) {
            return source.getTable().trim();
        }
        if (source.getCollection() != null && !source.getCollection().trim().isEmpty()) {
            return source.getCollection().trim();
        }
        return DEFAULT_TABLE_NAME;
    }
    
    /**
     * Convert all fields from JsonNode after to Map<String, String>
     * This method extracts all key-value pairs from the after field and converts them to strings
     */
    protected Map<String, String> getDetails(JsonNode after) {
        if (after == null || after.isNull()) {
            return new HashMap<>();
        }

        Map<String, String> details = new HashMap<>();
        convertJsonNodeToMap(after, "", details);
        return details;
    }

    private UnifiedEventType getEventType(String sourceEventType, IntegratedToolType toolType) {
        return EventTypeMapper.mapToUnifiedType(toolType, sourceEventType);
    }

    /**
     * Recursively convert JsonNode to Map<String, String>
     * Handles nested objects and arrays by flattening them with dot notation
     * Includes safety limits to prevent stack overflow and memory issues
     */
    private void convertJsonNodeToMap(JsonNode node, String prefix, Map<String, String> result) {
        convertJsonNodeToMap(node, prefix, result, 0);
    }

    private void convertJsonNodeToMap(JsonNode node, String prefix, Map<String, String> result, int depth) {
        if (node == null || result == null || depth > MAX_DEPTH) {
            return;
        }

        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
                convertJsonNodeToMap(entry.getValue(), key, result, depth + 1);
            }
        } else if (node.isArray()) {
            int maxSize = Math.min(node.size(), MAX_ARRAY_SIZE);
            for (int i = 0; i < maxSize; i++) {
                String key = prefix + "[" + i + "]";
                convertJsonNodeToMap(node.get(i), key, result, depth + 1);
            }
        } else {
            if (!node.isNull()) {
                String value = node.asText();
                if (value.length() > MAX_VALUE_LENGTH) {
                    value = value.substring(0, MAX_VALUE_LENGTH) + "...";
                }
                result.put(prefix, value);
            }
        }
    }
}
