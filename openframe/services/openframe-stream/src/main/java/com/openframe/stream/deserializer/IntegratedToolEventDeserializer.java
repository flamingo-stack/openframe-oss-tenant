package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumIntegratedToolMessage;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.enumeration.DeserializerType;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class IntegratedToolEventDeserializer implements KafkaMessageDeserializer {

    private final ObjectMapper mapper;

    public IntegratedToolEventDeserializer(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public DeserializerType getType() {
        return DeserializerType.INTEGRATED_TOOLS_EVENTS_DESERIALIZER;
    }

    @Override
    public DeserializedKafkaMessage deserialize(Map<String, Object> message) {
        try {
            return mapper.convertValue(message.get("payload"), DebeziumIntegratedToolMessage.class);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }
}
