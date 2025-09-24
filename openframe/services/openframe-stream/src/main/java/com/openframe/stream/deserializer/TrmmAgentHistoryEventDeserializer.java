package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.util.TimestampParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class TrmmAgentHistoryEventDeserializer extends IntegratedToolEventDeserializer {
    // Field name constants for agents_agenthistory table
    private static final String FIELD_AGENT_ID = "agent_id";
    private static final String FIELD_TYPE = "type";
    private static final String FIELD_RESULTS = "results";
    private static final String FIELD_SCRIPT_RESULTS = "script_results";
    private static final String FIELD_ID = "id";
    private static final String FIELD_TIME = "time";

    protected TrmmAgentHistoryEventDeserializer(ObjectMapper mapper) {
        super(mapper, List.of(), List.of());
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
        return parseStringField(after, FIELD_TYPE).map(it -> {
            if (parseStringField(after, FIELD_RESULTS).isEmpty() && parseStringField(after, FIELD_SCRIPT_RESULTS).isEmpty()) {
                return "%s.%s".formatted(it, "started");
            } else {
                return "%s.%s".formatted(it, "finished");
            }
        });
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode after) {
        return parseStringField(after, FIELD_ID);
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        return Optional.empty();
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, FIELD_TIME)
                .flatMap(TimestampParser::parseIso8601);
    }

    @Override
    protected String getDetails(JsonNode after) {
        try {
            ObjectNode details = mapper.createObjectNode();
            
            // Add results or script_results if they are not empty
            addResultsToDetails(after, details);
            
            return mapper.writeValueAsString(details);
        } catch (Exception e) {
            log.error("Error creating details JSON for TRMM agent history event", e);
            return "{}";
        }
    }

    /**
     * Adds results or script_results to the details JSON if they are not empty.
     * For script_run events, script_results takes precedence over results.
     */
    private void addResultsToDetails(JsonNode after, ObjectNode details) {
        Optional<String> scriptResults = parseStringField(after, FIELD_SCRIPT_RESULTS);
        Optional<String> results = parseStringField(after, FIELD_RESULTS);
        
        if (scriptResults.isPresent()) {
            // Try to parse script_results as JSON, otherwise add as string
            try {
                JsonNode scriptResultsJson = mapper.readTree(scriptResults.get());
                details.set("script_results", scriptResultsJson);
            } catch (Exception e) {
                // If parsing fails, add as string
                details.put("script_results", scriptResults.get());
            }
        } else if (results.isPresent()) {
            details.put("results", results.get());
        }
    }
}
