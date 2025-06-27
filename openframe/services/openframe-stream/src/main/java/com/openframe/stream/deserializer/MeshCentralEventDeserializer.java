package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.MeshCentralEventMessage;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.enumeration.MessageType;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class MeshCentralEventDeserializer implements KafkaMessageDeserializer {

    private final ObjectMapper mapper;

    public MeshCentralEventDeserializer(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }

    @Override
    public DeserializedKafkaMessage deserialize(Map<String, Object> message) {
        try {
            return mapper.convertValue(message.get("payload"), MeshCentralEventMessage.class);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }
}
