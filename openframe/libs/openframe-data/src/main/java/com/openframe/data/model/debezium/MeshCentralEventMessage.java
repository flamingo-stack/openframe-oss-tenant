package com.openframe.data.model.debezium;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

import java.io.IOException;

@Data
public class MeshCentralEventMessage extends MongoDbDebeziumMessage {

    /**
     * Extract agent ID (meshId) from the after field of the Debezium message.
     * Based on the MeshCentral event structure, the agent ID is the 'meshId' field.
     *
     * @return The agent ID (meshId), or null if not found or if the after field is null
     */
    @Override
    public String getAgentId() {
        JsonNode event = getAfter() != null && !getAfter().asText().trim().isEmpty()
                ? getAfter() : getBefore();
        if (event == null || event.asText().trim().isEmpty()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            event = mapper.readTree(event.asText());

            JsonNode agentIdNode = event.get("nodeid");
            if (agentIdNode != null && !agentIdNode.asText().isEmpty()) {
                return agentIdNode.asText();
            }
            return null;
        } catch (IOException e) {
            // Log the error but don't throw exception to avoid breaking the message processing
            System.err.println("Error parsing agent ID from MeshCentral event: " + e.getMessage());
            return null;
        }
    }
}
