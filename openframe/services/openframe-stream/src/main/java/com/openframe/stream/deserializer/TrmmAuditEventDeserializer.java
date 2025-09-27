package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.mapping.SourceEventTypes;
import com.openframe.stream.util.TimestampParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class TrmmAuditEventDeserializer extends IntegratedToolEventDeserializer {
    // Field name constants
    private static final String FIELD_AGENT_ID = "agentid";
    private static final String FIELD_OBJECT_TYPE = "object_type";
    private static final String FIELD_ACTION = "action";
    private static final String FIELD_ID = "id";
    private static final String FIELD_MESSAGE = "message";
    private static final String FIELD_ENTRY_TIME = "entry_time";
    private static final String FIELD_AFTER_VALUE = "after_value";

    public TrmmAuditEventDeserializer(ObjectMapper objectMapper) {
        super(objectMapper,
                List.of(),
                List.of(SourceEventTypes.Tactical.AGENT_EXECUTE_SCRIPT, SourceEventTypes.Tactical.AGENT_EXECUTE_COMMAND)
        );
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_RMM_AUDIT_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        return parseStringField(after, FIELD_AGENT_ID);
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode after) {
        Optional<String> objectType = parseStringField(after, FIELD_OBJECT_TYPE);
        Optional<String> action = parseStringField(after, FIELD_ACTION);
        
        if (objectType.isPresent() && action.isPresent()) {
            return Optional.of("%s.%s".formatted(objectType.get(), action.get()));
        }
        return objectType.or(() -> action);
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode after) {
        return parseStringField(after, FIELD_ID);
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        return parseStringField(after, FIELD_MESSAGE);
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, FIELD_ENTRY_TIME)
                .flatMap(TimestampParser::parseIso8601);
    }

    @Override
    protected String getDetails(JsonNode after) {
        return parseStringField(after, FIELD_AFTER_VALUE).orElse("{}");
    }
}
