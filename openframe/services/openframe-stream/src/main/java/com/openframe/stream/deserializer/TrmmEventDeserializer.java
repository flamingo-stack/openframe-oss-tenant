package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.TrmmEventMessage;
import com.openframe.data.model.enums.MessageType;
import org.springframework.stereotype.Component;

@Component
public class TrmmEventDeserializer extends IntegratedToolEventDeserializer<TrmmEventMessage> {

    public TrmmEventDeserializer(ObjectMapper mapper) {
        super(mapper, TrmmEventMessage.class);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    protected String getAgentId(TrmmEventMessage deserializedMessage) {
        JsonNode event = deserializedMessage.getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return null;
        }
        JsonNode agentIdNode = event.get("agent_id");
        if (agentIdNode != null && !agentIdNode.isNull() && !agentIdNode.asText().isEmpty()) {
            return agentIdNode.asText();
        }
        return null;
    }

    @Override
    protected String getSourceEventType(TrmmEventMessage deserializedMessage) {
        JsonNode event = deserializedMessage.getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return "unknown";
        }

        // Extract event type from Tactical RMM event structure
        JsonNode eventTypeNode = event.get("action");
        if (eventTypeNode != null && !eventTypeNode.isNull() && !eventTypeNode.asText().isEmpty()) {
            return eventTypeNode.asText();
        }

        // Fallback: try to determine from table name and operation
        String tableName = deserializedMessage.getTableName();
        String operation = deserializedMessage.getOperation();
        if (tableName != null && operation != null) {
            return tableName + "_" + operation;
        }

        return "unknown";
    }

    @Override
    protected String getEventToolId(TrmmEventMessage deserializedMessage) {
        return "";
    }

    @Override
    protected String getUserId(TrmmEventMessage deserializedMessage) {
        return "";
    }

    @Override
    protected String getSeverity(TrmmEventMessage deserializedMessage) {
        return "INFO";
    }
}
