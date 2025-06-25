package com.openframe.data.model.debezium;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TrmmEventMessage extends PostgreSqlDebeziumMessage {
    
    /**
     * Extract agent ID from the after field of the Debezium message.
     * Based on the Tactical RMM event structure, the agent ID is in the 'agent_id' field.
     * 
     * @return The agent ID, or null if not found or if the after field is null
     */
    @Override
    public String getAgentId() {
        JsonNode event = getAfter() == null ? getBefore() : getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return null;
        }
        JsonNode agentIdNode = event.get("agent_id");
        if (agentIdNode != null && !agentIdNode.isNull() && !agentIdNode.asText().isEmpty()) {
            return agentIdNode.asText();
        }
        return null;
    }
}
