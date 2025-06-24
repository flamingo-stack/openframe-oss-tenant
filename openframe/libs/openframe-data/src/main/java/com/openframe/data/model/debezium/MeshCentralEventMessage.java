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
        if (getAfter() == null) {
            return null;
        }

        try {
            // The 'after' field contains a JSON string, so we need to parse it
            String afterJson = getAfter().asText();
            if (afterJson == null || afterJson.trim().isEmpty()) {
                return null;
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode afterNode = mapper.readTree(afterJson);
            
            // Extract agent ID from the 'meshId' field
            JsonNode meshIdNode = afterNode.get("meshid");
            if (meshIdNode != null && !meshIdNode.asText().isEmpty()) {
                return meshIdNode.asText();
            }
            
            return null;
        } catch (IOException e) {
            // Log the error but don't throw exception to avoid breaking the message processing
            System.err.println("Error parsing agent ID from MeshCentral event: " + e.getMessage());
            return null;
        }
    }

    /**
     * Get the user ID from the event data.
     * 
     * @return The user ID, or null if not found
     */
    public String getUserId() {
        if (getAfter() == null) {
            return null;
        }

        try {
            String afterJson = getAfter().asText();
            if (afterJson == null || afterJson.trim().isEmpty()) {
                return null;
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode afterNode = mapper.readTree(afterJson);
            
            JsonNode userIdNode = afterNode.get("userid");
            return userIdNode != null ? userIdNode.asText() : null;
        } catch (IOException e) {
            System.err.println("Error parsing user ID from MeshCentral event: " + e.getMessage());
            return null;
        }
    }
}
