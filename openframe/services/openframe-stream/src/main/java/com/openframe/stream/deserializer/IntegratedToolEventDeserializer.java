package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;

import java.util.Map;

public abstract class IntegratedToolEventDeserializer <T extends DebeziumMessage> implements KafkaMessageDeserializer {

    private final Class<T> clazz;
    protected final ObjectMapper mapper;

    IntegratedToolEventDeserializer(ObjectMapper objectMapper, Class<T> clazz) {
        this.clazz = clazz;
        this.mapper = objectMapper;
    }

    @Override
    public T deserialize(Map<String, Object> message) {
        try {
            T deserializedMessage = mapper.convertValue(message.get("payload"), clazz);
            deserializedMessage.setAgentId(getAgentId(deserializedMessage));
            deserializedMessage.setSourceEventType(getSourceEventType(deserializedMessage));
            deserializedMessage.setEventToolId(getEventToolId(deserializedMessage));
            deserializedMessage.setUserId(getUserId(deserializedMessage));
            deserializedMessage.setSeverity(getSeverity(deserializedMessage));
            deserializedMessage.setDetails(getDetails(deserializedMessage));
            return deserializedMessage;
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }

    protected abstract String getAgentId(T deserializedMessage);
    protected abstract String getSourceEventType(T deserializedMessage);
    protected abstract String getEventToolId(T deserializedMessage);
    protected abstract String getUserId(T deserializedMessage);
    protected abstract String getSeverity(T deserializedMessage);
    protected Map<String, String> getDetails(T deserializedMessage) {
        return Map.of();
    }

}
