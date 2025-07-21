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
import java.util.Optional;

public abstract class IntegratedToolEventDeserializer implements KafkaMessageDeserializer {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.of("UTC"));
    private static final String UNKNOWN = "unknown";
    
    private static final int MAX_DEPTH = 10;
    private static final int MAX_ARRAY_SIZE = 1000;
    private static final int MAX_VALUE_LENGTH = 10000;

    @Override
    public DeserializedDebeziumMessage deserialize(CommonDebeziumMessage debeziumMessage, MessageType messageType) {
        try {
            JsonNode after = debeziumMessage.getPayload().getAfter();
            return DeserializedDebeziumMessage.builder()
                .payload(debeziumMessage.getPayload())
                .agentId(getAgentId(after).orElse(null))
                .ingestDay(formatter.format(Instant.ofEpochMilli(debeziumMessage.getPayload().getTimestamp())))
                .sourceEventType(getSourceEventType(after).orElse(UNKNOWN))
                .toolEventId("%s_%s".formatted(messageType.getIntegratedToolType().name(), getEventToolId(after).orElse(UNKNOWN)))
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
