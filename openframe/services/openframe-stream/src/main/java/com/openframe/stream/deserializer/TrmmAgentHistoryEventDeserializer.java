package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.util.TimestampParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Slf4j
public class TrmmAgentHistoryEventDeserializer extends IntegratedToolEventDeserializer {
    // Field name constants for agents_agenthistory table
    private static final String FIELD_AGENT_ID = "agent_id";
    private static final String FIELD_TYPE = "type";
    private static final String FIELD_COMMAND = "command";
    private static final String FIELD_RESULTS = "results";
    private static final String FIELD_USERNAME = "username";
    private static final String FIELD_ID = "id";
    private static final String FIELD_TIME = "time";

    protected TrmmAgentHistoryEventDeserializer(ObjectMapper mapper) {
        super(mapper);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_RMM_AGENT_HISTORY_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        return parseStringField(after, FIELD_AGENT_ID);
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode after) {
        // For agent history events, we use the type field (e.g., "cmd_run")
        return parseStringField(after, FIELD_TYPE);
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode after) {
        return parseStringField(after, FIELD_ID);
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        // Create a meaningful message from command and results
        Optional<String> command = parseStringField(after, FIELD_COMMAND);
        Optional<String> results = parseStringField(after, FIELD_RESULTS);
        Optional<String> username = parseStringField(after, FIELD_USERNAME);
        
        if (command.isPresent()) {
            StringBuilder messageBuilder = new StringBuilder();
            
            if (username.isPresent()) {
                messageBuilder.append("User ").append(username.get()).append(" executed: ");
            } else {
                messageBuilder.append("Command executed: ");
            }
            
            messageBuilder.append(command.get());
            
            if (results.isPresent() && !results.get().trim().isEmpty()) {
                messageBuilder.append(" | Result: ").append(results.get());
            }
            
            return Optional.of(messageBuilder.toString());
        }
        
        // Fallback to results if no command is available
        return results;
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, FIELD_TIME)
                .flatMap(TimestampParser::parseIso8601);
    }
}
