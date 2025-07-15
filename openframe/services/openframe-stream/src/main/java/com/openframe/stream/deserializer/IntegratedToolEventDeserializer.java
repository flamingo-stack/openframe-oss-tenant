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
    protected final ObjectMapper mapper;

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
            deserializedMessage.setSourceEventType(getSourceEventType(deserializedMessage));
            deserializedMessage.setToolEventId("%s_%s".formatted(deserializedMessage.getToolType().name(), getEventToolId(deserializedMessage)));
            deserializedMessage.setSeverity(deserializedMessage.getEventType().getSeverity());
            deserializedMessage.setMessage(getMessage(deserializedMessage));
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
     */
    private void convertJsonNodeToMap(JsonNode node, String prefix, Map<String, String> result) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String key = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
                convertJsonNodeToMap(entry.getValue(), key, result);
            }
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                String key = prefix + "[" + i + "]";
                convertJsonNodeToMap(node.get(i), key, result);
            }
        } else {
            // Handle primitive values
            String value;
            if (node.isTextual()) {
                value = node.asText();
            } else if (node.isNumber()) {
                value = node.asText(); // Preserve number format
            } else if (node.isBoolean()) {
                value = String.valueOf(node.asBoolean());
            } else if (node.isNull()) {
                value = null;
            } else {
                value = node.asText();
            }
            
            if (value != null) {
                result.put(prefix, value);
            }
        }
    }
}
