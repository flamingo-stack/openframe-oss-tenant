package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.MessageDeliveryException;

@Slf4j
public abstract class KafkaMessageHandler<T> extends GenericMessageHandler<T> {

    private final KafkaTemplate<String, T> kafkaTemplate;

    public KafkaMessageHandler(KafkaTemplate<String, T> kafkaTemplate, ObjectMapper objectMapper) {
        super(objectMapper);
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    protected void pushData(T message) {
        try {
            kafkaTemplate.send(getTopic(), message);
            log.info("Message sent to Kafka topic {}: {}", getTopic(), message);
        } catch (Exception e) {
            log.error("Error sending message to Kafka topic {}: {}", getTopic(), message, e);
            throw new MessageDeliveryException("Failed to send message to Kafka");
        }
    }

    protected abstract String getTopic();

}
