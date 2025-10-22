package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.openframe.data.model.enums.MessageType;
import com.openframe.sdk.fleetmdm.model.Query;
import com.openframe.stream.service.FleetMdmCacheService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

import static com.openframe.stream.mapping.SourceEventTypes.Fleet.EXECUTE_SCHEDULED_QUERY;

@Component
@Slf4j
public class FleetQueryResultEventDeserializer extends IntegratedToolEventDeserializer {

    private final FleetMdmCacheService fleetMdmCacheService;

    protected FleetQueryResultEventDeserializer(ObjectMapper mapper, FleetMdmCacheService fleetMdmCacheService) {
        super(mapper, List.of(), List.of());
        this.fleetMdmCacheService = fleetMdmCacheService;
    }

    @Override
    public MessageType getType() {
        return MessageType.FLEET_MDM_QUERY_RESULT_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(JsonNode afterField) {
        // host_id represents the agent/device that executed the query
        return Optional.ofNullable(afterField.get("host_id"))
                .map(JsonNode::asText);
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode afterField) {
        return Optional.of(EXECUTE_SCHEDULED_QUERY);
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode afterField) {
        // id is the unique identifier for this query result
        return Optional.ofNullable(afterField.get("id"))
                .map(JsonNode::asText);
    }

    @Override
    protected Optional<String> getMessage(JsonNode afterField) {
        // Get query name from cache if available
        String queryName = getQueryName(afterField);
        
        // Check if there's an error
        JsonNode errorNode = afterField.get("error");
        if (errorNode != null && !errorNode.isNull()) {
            if (queryName != null) {
                return Optional.of(String.format("Query '%s' execution failed: %s", queryName, errorNode.asText()));
            }
            return Optional.of("Query execution failed: " + errorNode.asText());
        }
        
        // Check if data is present
        JsonNode dataNode = afterField.get("data");
        if (dataNode != null && !dataNode.isNull() && !dataNode.asText().isEmpty()) {
            if (queryName != null) {
                return Optional.of(String.format("Query '%s' executed successfully", queryName));
            }
            return Optional.of("Query executed successfully on host");
        }
        
        if (queryName != null) {
            return Optional.of(String.format("Query '%s' result received", queryName));
        }
        return Optional.of("Query result received");
    }

    @Override
    protected String getError(JsonNode after) {
        // Check if error field is present in the event
        JsonNode errorNode = after.get("error");
        if (errorNode == null || errorNode.isNull() || errorNode.asText().isEmpty()) {
            return null;
        }

        try {
            ObjectNode errorJson = mapper.createObjectNode();
            
            // Try to parse error as JSON, fallback to plain text
            String errorText = errorNode.asText();
            try {
                JsonNode parsedError = mapper.readTree(errorText);
                errorJson.set("output", parsedError);
            } catch (Exception e) {
                // If not valid JSON, store as plain text
                errorJson.put("output", errorText);
            }
            
            // Add query metadata if available
            Query queryInfo = getQueryInfo(after);
            if (queryInfo != null && queryInfo.getQuery() != null) {
                errorJson.put("query", queryInfo.getQuery());
            }
            
            return mapper.writeValueAsString(errorJson);
        } catch (Exception e) {
            log.error("Failed to create error JSON", e);
            return null;
        }
    }

    @Override
    protected String getResult(JsonNode after) {
        // Get the data field from the event
        JsonNode dataNode = after.get("data");
        if (dataNode == null || dataNode.isNull() || dataNode.asText().isEmpty()) {
            return null;
        }

        try {
            ObjectNode resultJson = mapper.createObjectNode();
            
            // Parse the data field as JSON
            String dataText = dataNode.asText();
            try {
                JsonNode parsedData = mapper.readTree(dataText);
                resultJson.set("output", parsedData);
            } catch (Exception e) {
                // If data is not valid JSON, store as plain text
                log.warn("Data field is not valid JSON, storing as plain text: {}", dataText);
                resultJson.put("output", dataText);
            }
            
            // Add query SQL from Query metadata if available
            Query queryInfo = getQueryInfo(after);
            if (queryInfo != null && queryInfo.getQuery() != null) {
                resultJson.put("query", queryInfo.getQuery());
            }
            
            return mapper.writeValueAsString(resultJson);
        } catch (Exception e) {
            log.error("Failed to create result JSON", e);
            return null;
        }
    }

    @Override
    protected String getDetails(JsonNode after) {
        return null;
    }

    /**
     * Get query name from cache using query_id
     * 
     * @param afterField JSON node with query result data
     * @return Query name or null if not found
     */
    private String getQueryName(JsonNode afterField) {
        Query queryInfo = getQueryInfo(afterField);
        return queryInfo != null ? queryInfo.getName() : null;
    }

    /**
     * Get full query information from cache using query_id
     * 
     * @param afterField JSON node with query result data
     * @return Query object or null if not found
     */
    private Query getQueryInfo(JsonNode afterField) {
        JsonNode queryIdNode = afterField.get("query_id");
        if (queryIdNode == null || queryIdNode.isNull()) {
            return null;
        }

        try {
            Long queryId = queryIdNode.asLong();
            Query query = fleetMdmCacheService.getQueryById(queryId);
            
            if (query == null) {
                log.debug("Query not found in cache for query_id: {}", queryId);
            }
            
            return query;
        } catch (Exception e) {
            log.error("Error fetching query info for query_id: {}", queryIdNode.asText(), e);
            return null;
        }
    }
}
