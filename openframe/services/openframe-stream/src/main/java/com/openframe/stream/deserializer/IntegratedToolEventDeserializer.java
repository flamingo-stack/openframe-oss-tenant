package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.openframe.stream.mapping.EventTypeMapper;
import com.openframe.kafka.model.debezium.CommonDebeziumMessage;
import com.openframe.kafka.model.debezium.DebeziumMessage;
import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.enums.IntegratedToolType;
import com.openframe.data.model.enums.MessageType;
import com.openframe.data.model.enums.UnifiedEventType;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
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

    private static final String COMPOSITE_KEY_PATTERN = "%s_%s_id_%s";
    private static final String HASH_KEY_PATTERN = "%s_%s_hash_%s";
    protected final ObjectMapper mapper;
    private final List<String> eventsToSkip;
    private final List<String> eventsInvisible;

    protected IntegratedToolEventDeserializer(ObjectMapper mapper, List<String> eventsToSkip, List<String> eventsInvisible) {
        this.mapper = mapper;
        this.eventsToSkip = eventsToSkip;
        this.eventsInvisible = eventsInvisible;
    }

    @Override
    public DeserializedDebeziumMessage deserialize(CommonDebeziumMessage debeziumMessage, MessageType messageType) {
        try {
            JsonNode after = debeziumMessage.getPayload().getAfter();
            if (after == null || after.isNull()) {
                return null;
            }
            long eventTimestamp = getEffectiveTimestamp(debeziumMessage, after);
            String sourceEventType = getSourceEventType(after).orElse(UNKNOWN);

            // Build complete details JSON with error, result, and dynamic fields
            String detailsJson = buildDetailsJson(after);

            return DeserializedDebeziumMessage.builder()
                    .payload(debeziumMessage.getPayload())
                    .agentId(getAgentId(after).orElse(null))
                    .ingestDay(formatter.format(Instant.ofEpochMilli(eventTimestamp)))
                    .sourceEventType(sourceEventType)
                    .toolEventId(generateCompositeId(debeziumMessage, messageType, after))
                    .unifiedEventType(getEventType(sourceEventType, messageType.getIntegratedToolType()))
                    .message(getMessage(after).orElse(null))
                    .integratedToolType(messageType.getIntegratedToolType())
                    .debeziumMessage(getDebeziumMessage(after))
                    .details(detailsJson)
                    .eventTimestamp(eventTimestamp)
                    .skipProcessing(getSkipProcessing(sourceEventType))
                    .isVisible(isVisible(sourceEventType))
                    .build();
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }

    /**
     * Builds complete details JSON combining error, result, and additional dynamic fields
     */
    private String buildDetailsJson(JsonNode after) {
        try {
            ObjectNode detailsNode = mapper.createObjectNode();

            // Add error if present
            String error = getError(after);
            if (error != null && !error.trim().isEmpty() && !error.equals("{}")) {
                try {
                    JsonNode errorNode = mapper.readTree(error);
                    detailsNode.set("error", errorNode);
                } catch (Exception e) {
                    log.warn("Failed to parse error JSON, storing as-is: {}", error);
                    detailsNode.put("error", error);
                }
            }

            // Add result if present
            String result = getResult(after);
            if (result != null && !result.trim().isEmpty() && !result.equals("{}")) {
                try {
                    JsonNode resultNode = mapper.readTree(result);
                    detailsNode.set("result", resultNode);
                } catch (Exception e) {
                    log.warn("Failed to parse result JSON, storing as-is: {}", result);
                    detailsNode.put("result", result);
                }
            }

            // Add dynamic fields from getDetails()
            String additionalDetails = getDetails(after);
            if (additionalDetails != null && !additionalDetails.trim().isEmpty() && !additionalDetails.equals("{}")) {
                try {
                    JsonNode additionalNode = mapper.readTree(additionalDetails);
                    if (additionalNode.isObject()) {
                        if (!detailsNode.has("additional_info")) {
                            detailsNode.set("additional_info", additionalNode);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse additional details JSON: {}", additionalDetails);
                }
            }

            return detailsNode.toString();
        } catch (Exception e) {
            log.error("Error building details JSON", e);
            return "{}";
        }
    }

    protected abstract Optional<String> getAgentId(JsonNode afterField);

    protected abstract Optional<String> getSourceEventType(JsonNode afterField);

    protected abstract Optional<String> getEventToolId(JsonNode afterField);

    protected abstract Optional<String> getMessage(JsonNode afterField);

    protected Boolean getSkipProcessing(String sourceEventType) {
        return eventsToSkip.contains(sourceEventType);
    }

    protected Boolean isVisible(String sourceEventType) {
        return !eventsInvisible.contains(sourceEventType);
    }

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
    protected String getDebeziumMessage(JsonNode after) {
        if (after == null || after.isNull()) {
            return null;
        }
        return after.toString();
    }

    /**
     * Extract standard error details from the event
     * Override in specific deserializers to populate error information
     *
     * @return JSON string for error field, or null if no error information
     */
    protected String getError(JsonNode after) {
        return null;
    }

    /**
     * Extract standard result details from the event
     * Override in specific deserializers to populate result information
     *
     * @return JSON string for result field, or null if no result information
     */
    protected String getResult(JsonNode after) {
        return null;
    }

    /**
     * Extract additional details that don't fit into error/result
     * These will be stored as dynamic fields in LogDetails
     */
    abstract protected String getDetails(JsonNode after);

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
