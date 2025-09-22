package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.enums.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import com.openframe.stream.util.TimestampParser;
import com.openframe.stream.mapping.FleetActivityTypeMapping;

import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class FleetEventDeserializer extends IntegratedToolEventDeserializer {
    // Field name constants
    private static final String FIELD_AGENT_ID = "agentId";
    private static final String FIELD_ACTIVITY_TYPE = "activity_type";
    private static final String FIELD_ID = "id";
    private static final String FIELD_DETAILS = "details";
    private static final String FIELD_CREATED_AT = "created_at";

    public FleetEventDeserializer(ObjectMapper mapper) {
        super(mapper, List.of(), List.of());
    }

    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        // Fleet events can contain either a direct agentId or a hostId that can later be resolved to an agentId.
        // First, try to read the explicit agentId (preferred). If it is absent/blank, fall back to hostId.
        return parseStringField(after, FIELD_AGENT_ID);
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode after) {
        // Fleet MDM stores the event type in the "activity_type" column
        return parseStringField(after, FIELD_ACTIVITY_TYPE);
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode after) {
        // Unique identifier of the activity row
        return parseStringField(after, FIELD_ID);
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        // Get the activity type and map it to a human-readable message
        Optional<String> activityType = getSourceEventType(after);
        Optional<String> message = Optional.empty();
        if (activityType.isPresent()) {
            message = FleetActivityTypeMapping.getMessage(activityType.get());
            if (message.isEmpty()) {
                log.warn("No message mapping found for Fleet activity type: {}", activityType.get());
            }
        }
        if (message.isEmpty()) {
            message = parseStringField(after, FIELD_DETAILS);
        }
        return message;
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, FIELD_CREATED_AT)
                .flatMap(TimestampParser::parseIso8601);
    }

    @Override
    protected String getDetails(JsonNode after) {
        return parseStringField(after, FIELD_DETAILS).orElse("{}");
    }

    @Override
    public MessageType getType() {
        return MessageType.FLEET_MDM_EVENT;
    }
}
