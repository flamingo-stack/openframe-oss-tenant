package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.MeshCentralEventMessage;
import com.openframe.data.model.enums.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class MeshCentralEventDeserializer extends IntegratedToolEventDeserializer<MeshCentralEventMessage> {


    public MeshCentralEventDeserializer(ObjectMapper mapper) {
        super(mapper, MeshCentralEventMessage.class);
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }

    @Override
    protected String getAgentId(MeshCentralEventMessage deserializedMessage) {
        JsonNode event = deserializedMessage.getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return null;
        }
        try {
            event = mapper.readTree(event.asText());
            JsonNode agentIdNode = event.get("nodeid");
            if (agentIdNode != null && !agentIdNode.asText().isEmpty()) {
                return agentIdNode.asText();
            }
            return null;
        } catch (IOException e) {
            // Log the error but don't throw exception to avoid breaking the message processing
            log.error("Error parsing agent ID from MeshCentral event: {}", e.getMessage());
            return null;
        }
    }

    @Override
    protected String getSourceEventType(MeshCentralEventMessage deserializedMessage) {
        JsonNode event = deserializedMessage.getAfter();
        if (event == null || event.asText().trim().isEmpty()) {
            return "unknown";
        }
        try {
            event = mapper.readTree(event.asText());

            // Extract event type from MeshCentral event structure
            JsonNode eventTypeNode = event.get("etype");
            if (eventTypeNode != null && !eventTypeNode.asText().isEmpty()) {
                return eventTypeNode.asText();
            }

            // Fallback: try to determine from action field
            JsonNode actionNode = event.get("action");
            if (actionNode != null && !actionNode.asText().isEmpty()) {
                return actionNode.asText();
            }

            return "unknown";
        } catch (IOException e) {
            log.error("Error parsing event type from MeshCentral event: {}", e.getMessage());
            return "unknown";
        }
    }

    @Override
    protected String getEventToolId(MeshCentralEventMessage deserializedMessage) {
        return "";
    }

    @Override
    protected String getUserId(MeshCentralEventMessage deserializedMessage) {
        return "";
    }

    @Override
    protected String getSeverity(MeshCentralEventMessage deserializedMessage) {
        return "INFO";
    }
}
