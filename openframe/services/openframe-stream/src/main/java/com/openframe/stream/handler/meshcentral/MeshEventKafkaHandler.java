package com.openframe.stream.handler.meshcentral;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MeshEventKafkaHandler extends DebeziumKafkaMessageHandler {

    public MeshEventKafkaHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }

}
