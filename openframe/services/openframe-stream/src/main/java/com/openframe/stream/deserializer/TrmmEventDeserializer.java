package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.MeshCentralEventMessage;
import com.openframe.data.model.debezium.TrmmEventMessage;
import com.openframe.data.model.kafka.DeserializedKafkaMessage;
import com.openframe.stream.enumeration.MessageType;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class TrmmEventDeserializer implements KafkaMessageDeserializer {

    private final ObjectMapper mapper;

    public TrmmEventDeserializer(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    public DeserializedKafkaMessage deserialize(Map<String, Object> message) {
        try {
            return mapper.convertValue(message.get("payload"), TrmmEventMessage.class);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Error converting Map to DebeziumMessage", e);
        }
    }
}
