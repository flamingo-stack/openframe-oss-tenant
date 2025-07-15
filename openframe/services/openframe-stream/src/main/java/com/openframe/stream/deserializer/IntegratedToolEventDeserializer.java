package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

public abstract class IntegratedToolEventDeserializer <T extends DebeziumMessage> implements KafkaMessageDeserializer {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.of("UTC"));
    private final Class<T> clazz;
    private static final String UNKNOWN = "unknown";
    protected final ObjectMapper mapper;
    
    private static final int MAX_DEPTH = 10;
    private static final int MAX_ARRAY_SIZE = 1000;
    private static final int MAX_VALUE_LENGTH = 10000;

    IntegratedToolEventDeserializer(ObjectMapper objectMapper, Class<T> clazz) {
        this.clazz = clazz;
        this.mapper = objectMapper;
    }

    @Override
    public T deserialize(Map<String, Object> message) {
        try {
            T deserializedMessage = mapper.convertValue(message.get("payload"), clazz);
            deserializedMessage.setAgentId(getAgentId(deserializedMessage).orElse(null));
            deserializedMessage.setIngestDay(formatter.format(Instant.ofEpochMilli(deserializedMessage.getTimestamp())));
            deserializedMessage.setSourceEventType(getSourceEventType(deserializedMessage).orElse(UNKNOWN));
            deserializedMessage.setToolEventId("%s_%s".formatted(deserializedMessage.getToolType().name(), getEventToolId(deserializedMessage).orElse(UNKNOWN)));
            deserializedMessage.setSeverity(deserializedMessage.getEventType().getSeverity());
            deserializedMessage.setMessage(getMessage(deserializedMessage).orElse(null));
            deserializedMessage.setDetails(getDetails(deserializedMessage));
            return deserializedMessage;
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }

    protected abstract Optional<String> getAgentId(T deserializedMessage);
    protected abstract Optional<String> getSourceEventType(T deserializedMessage);
    protected abstract Optional<String> getEventToolId(T deserializedMessage);
    protected abstract Optional<String> getMessage(T deserializedMessage);
    
    /**
     * Convert all fields from JsonNode after to Map<String, String>
     * This method extracts all key-value pairs from the after field and converts them to strings
     */
    protected Map<String, String> getDetails(T deserializedMessage) {
        JsonNode after = deserializedMessage.getAfter();
        if (after == null || after.isNull()) {
            return new HashMap<>();
        }
        
        Map<String, String> details = new HashMap<>();
        convertJsonNodeToMap(after, "", details);
        return details;
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
