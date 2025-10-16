package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.service.TacticalRmmCacheService;
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
    private static final String FIELD_SCRIPT_ID = "script_id";
    private static final String FIELD_SCRIPT_RESULTS = "script_results";
    private static final String FIELD_ID = "id";
    private static final String FIELD_TIME = "time";
    
    // Details field constants for LogDetails JSON structure
    private static final String DETAILS_OUTPUT = "output";
    private static final String DETAILS_EXECUTION_TIME = "execution_time";
    private static final String DETAILS_STDERR = "stderr";
    private static final String DETAILS_STDOUT = "stdout";
    
    private final TacticalRmmCacheService tacticalRmmCacheService;

    protected TrmmAgentHistoryEventDeserializer(ObjectMapper mapper, TacticalRmmCacheService tacticalRmmCacheService) {
        super(mapper, List.of(), List.of());
        this.tacticalRmmCacheService = tacticalRmmCacheService;
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_RMM_AGENT_HISTORY_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        try {
            Integer agentPkId = parseStringField(after, FIELD_AGENT_ID)
                    .map(Integer::parseInt)
                    .orElse(null);
            if (agentPkId == null) {
                log.error("Agent id is null");
                return Optional.empty();
            } else {
                return Optional.ofNullable(tacticalRmmCacheService.getAgentIdByPrimaryKey(agentPkId));
            }
        } catch (NumberFormatException e) {
            log.error("Invalid agent_id format: {}", parseStringField(after, FIELD_AGENT_ID).orElse("null"), e);
            return Optional.empty();
        }
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
        String type = parseStringField(after, FIELD_TYPE).orElse("");
        
        switch (type) {
            case "cmd_run" -> {
                String command = parseStringField(after, "command").orElse("unknown command");
                boolean hasResults = parseStringField(after, FIELD_RESULTS).isPresent();
                
                if (hasResults) {
                    return Optional.of(String.format("Command '%s' completed", command));
                } else {
                    return Optional.of(String.format("Command '%s' started", command));
                }
            }
            case "script_run" -> {
                try {
                    Integer scriptId = parseStringField(after, FIELD_SCRIPT_ID)
                            .map(Integer::parseInt)
                            .orElse(null);
                    if (scriptId == null) {
                        return Optional.of("Script execution event (script ID not found)");
                    }
                    
                    String scriptName = tacticalRmmCacheService.getScriptNameById(scriptId);
                    if (scriptName == null) {
                        scriptName = "Unknown Script (ID: " + scriptId + ")";
                    }
                    
                    boolean hasScriptResults = parseStringField(after, FIELD_SCRIPT_RESULTS).isPresent();
                    
                    if (hasScriptResults) {
                        return Optional.of(String.format("Script '%s' completed", scriptName));
                    } else {
                        return Optional.of(String.format("Script '%s' started", scriptName));
                    }
                } catch (NumberFormatException e) {
                    log.error("Invalid script_id format: {}", parseStringField(after, FIELD_SCRIPT_ID).orElse("null"), e);
                    return Optional.of("Script execution event (invalid script ID format)");
                }
            }
            default -> {
                return Optional.empty();
            }
        }
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, FIELD_TIME)
                .flatMap(TimestampParser::parseIso8601);
    }

    @Override
    protected String getError(JsonNode after) {
        // Parse script_results and extract error if stderr is present
        Optional<String> scriptResults = parseStringField(after, FIELD_SCRIPT_RESULTS);
        
        if (scriptResults.isPresent()) {
            try {
                JsonNode scriptResultsNode = mapper.readTree(scriptResults.get());
                
                // Check if stderr exists and is not empty
                if (scriptResultsNode.has(DETAILS_STDERR)) {
                    String stderr = scriptResultsNode.get(DETAILS_STDERR).asText();
                    if (stderr != null && !stderr.trim().isEmpty()) {
                        ObjectNode errorNode = mapper.createObjectNode();
                        errorNode.put(DETAILS_OUTPUT, stderr);
                        return mapper.writeValueAsString(errorNode);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to parse script_results for error extraction", e);
            }
        }
        
        return null;
    }
    
    @Override
    protected String getResult(JsonNode after) {
        // For script_run events, use script_results
        Optional<String> scriptResults = parseStringField(after, FIELD_SCRIPT_RESULTS);
        if (scriptResults.isPresent()) {
            try {
                JsonNode scriptResultsNode = mapper.readTree(scriptResults.get());
                ObjectNode resultNode = mapper.createObjectNode();

                if (scriptResultsNode.has(DETAILS_STDOUT)) {
                    resultNode.put(DETAILS_OUTPUT, scriptResultsNode.get(DETAILS_STDOUT).asText());
                }
                if (scriptResultsNode.has(DETAILS_EXECUTION_TIME)) {
                    resultNode.put(DETAILS_EXECUTION_TIME, scriptResultsNode.get(DETAILS_EXECUTION_TIME).asDouble());
                }
                
                return mapper.writeValueAsString(resultNode);
            } catch (Exception e) {
                log.error("Failed to parse script_results for result extraction", e);
                // Return original script_results as is
                return scriptResults.get();
            }
        }
        
        // For cmd_run events, use results field
        Optional<String> results = parseStringField(after, FIELD_RESULTS);
        if (results.isPresent()) {
            try {
                ObjectNode resultNode = mapper.createObjectNode();
                resultNode.put(DETAILS_OUTPUT, results.get());
                return mapper.writeValueAsString(resultNode);
            } catch (Exception e) {
                log.error("Failed to create result from results field", e);
            }
        }
        
        return null;
    }

    @Override
    protected String getDetails(JsonNode after) {
        return null;
    }
}
