package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventKafkaHandler extends DebeziumKafkaMessageHandler {



    public TrmmEventKafkaHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }
}
