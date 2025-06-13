package com.openframe.stream.events.handler.tactical;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.kafka.KafkaITPinotMessage;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.KafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class TrmmEventKafkaHandler extends KafkaMessageHandler<KafkaITPinotMessage> {

    @Value("${kafka.producer.topic.event.tactical-rmm.name}")
    private String topic;

    public TrmmEventKafkaHandler(KafkaTemplate<String, KafkaITPinotMessage> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    protected KafkaITPinotMessage transform(JsonNode messageJson) {
        return null;
    }

    @Override
    public MessageType getType() {
        return MessageType.TRMM_PSQL_AUDIT_LOG_TO_KAFKA;
    }

    @Override
    protected boolean isValidMessage(Map<String, Object> message) {
        return false;
    }
}
