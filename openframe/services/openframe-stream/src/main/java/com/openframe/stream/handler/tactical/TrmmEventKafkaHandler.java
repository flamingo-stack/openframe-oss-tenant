package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.kafka.KafkaITPinotMessage;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumKafkaMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventKafkaHandler extends DebeziumKafkaMessageHandler<KafkaITPinotMessage> {

    @Value("${kafka.producer.topic.event.tactical-rmm.name}")
    private String topic;

    public TrmmEventKafkaHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(kafkaTemplate, objectMapper);
    }

    @Override
    protected String getTopic() {
        return topic;
    }

    @Override
    public MessageType getType() {
        return MessageType.TRMM_PSQL_AUDIT_LOG_TO_KAFKA;
    }

    @Override
    protected boolean isValidMessage(DebeziumMessage message) {
        return false;
    }

    @Override
    protected KafkaITPinotMessage transform(DebeziumMessage debeziumMessage) {
        return null;
    }
}
