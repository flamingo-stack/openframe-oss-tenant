package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.enums.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import com.openframe.stream.util.TimestampParser;
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
        // We consider the raw "details" JSON string as the message for now
        return parseStringField(after, FIELD_DETAILS);
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, FIELD_CREATED_AT)
                .flatMap(TimestampParser::parseIso8601);
    }

    @Override
    public MessageType getType() {
        return MessageType.FLEET_MDM_EVENT;
    }
}
