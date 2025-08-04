package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.enums.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;
import org.apache.commons.lang3.StringUtils;

@Component
@Slf4j
public class FleetEventDeserializer extends IntegratedToolEventDeserializer {
    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        // Fleet events can contain either a direct agentId or a hostId that can later be resolved to an agentId.
        // First, try to read the explicit agentId (preferred). If it is absent/blank, fall back to hostId.
        return parseField(after, "agentId")
                .filter(StringUtils::isNotBlank);
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode after) {
        // Fleet MDM stores the event type in the "activity_type" column
        return parseField(after, "activity_type");
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode after) {
        // Unique identifier of the activity row
        return parseField(after, "id");
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        // We consider the raw "details" JSON string as the message for now
        return parseField(after, "details");
    }

    /**
     * Utility method to safely read a String value from a JsonNode by field name.
     * Mirrors the implementation used in {@link TrmmEventDeserializer}.
     */
    private Optional<String> parseField(JsonNode rawNode, String fieldName) {
        return Optional.ofNullable(rawNode)
                .flatMap(node -> {
                    JsonNode fieldNode = node.get(fieldName);
                    return fieldNode != null && !fieldNode.isNull() && StringUtils.isNotBlank(fieldNode.asText())
                            ? Optional.of(fieldNode.asText())
                            : Optional.empty();
                });
    }

    @Override
    public MessageType getType() {
        return MessageType.FLEET_MDM_EVENT;
    }
}
