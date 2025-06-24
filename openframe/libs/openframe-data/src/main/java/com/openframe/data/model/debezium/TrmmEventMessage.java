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
        if (getAfter() == null) {
            return null;
        }

        // In PostgreSQL Debezium messages, 'after' is already a JsonNode object
        JsonNode afterNode = getAfter();
        
        // Extract agent ID from the 'agent_id' field
        JsonNode agentIdNode = afterNode.get("agent_id");
        if (agentIdNode != null && !agentIdNode.isNull() && !agentIdNode.asText().isEmpty()) {
            return agentIdNode.asText();
        }
        
        // Alternative: try to extract from 'agent' field if agent_id is null
        JsonNode agentNode = afterNode.get("agent");
        if (agentNode != null && !agentNode.isNull() && !agentNode.asText().isEmpty()) {
            return agentNode.asText();
        }
        
        return null;
    }

    /**
     * Get the username from the event data.
     * 
     * @return The username, or null if not found
     */
    public String getUsername() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode usernameNode = afterNode.get("username");
        return usernameNode != null && !usernameNode.isNull() ? usernameNode.asText() : null;
    }

    /**
     * Get the action from the event data.
     * 
     * @return The action, or null if not found
     */
    public String getAction() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode actionNode = afterNode.get("action");
        return actionNode != null && !actionNode.isNull() ? actionNode.asText() : null;
    }

    /**
     * Get the object type from the event data.
     * 
     * @return The object type, or null if not found
     */
    public String getObjectType() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode objectTypeNode = afterNode.get("object_type");
        return objectTypeNode != null && !objectTypeNode.isNull() ? objectTypeNode.asText() : null;
    }

    /**
     * Get the message from the event data.
     * 
     * @return The message, or null if not found
     */
    public String getMessage() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode messageNode = afterNode.get("message");
        return messageNode != null && !messageNode.isNull() ? messageNode.asText() : null;
    }

    /**
     * Get the entry time from the event data.
     * 
     * @return The entry time, or null if not found
     */
    public String getEntryTime() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode entryTimeNode = afterNode.get("entry_time");
        return entryTimeNode != null && !entryTimeNode.isNull() ? entryTimeNode.asText() : null;
    }

    /**
     * Get the debug info from the event data.
     * 
     * @return The debug info as JSON string, or null if not found
     */
    public String getDebugInfo() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode debugInfoNode = afterNode.get("debug_info");
        return debugInfoNode != null && !debugInfoNode.isNull() ? debugInfoNode.asText() : null;
    }

    /**
     * Get the before value from the event data.
     * 
     * @return The before value as JSON string, or null if not found
     */
    public String getBeforeValue() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode beforeValueNode = afterNode.get("before_value");
        return beforeValueNode != null && !beforeValueNode.isNull() ? beforeValueNode.asText() : null;
    }

    /**
     * Get the after value from the event data.
     * 
     * @return The after value as JSON string, or null if not found
     */
    public String getAfterValue() {
        if (getAfter() == null) {
            return null;
        }

        JsonNode afterNode = getAfter();
        JsonNode afterValueNode = afterNode.get("after_value");
        return afterValueNode != null && !afterValueNode.isNull() ? afterValueNode.asText() : null;
    }
}
