package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.stream.enumeration.Destination;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.MessageDeliveryException;

@Slf4j
public abstract class DebeziumKafkaMessageHandler<T, U extends DebeziumMessage> extends DebeziumMessageHandler<T, U> {

    protected final KafkaTemplate<String, Object> kafkaTemplate;

    public DebeziumKafkaMessageHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(objectMapper);
        this.kafkaTemplate = kafkaTemplate;
    }

    protected void handleCreate(T message) {
        try {
            kafkaTemplate.send(getTopic(), message);
            log.info("Message sent to Kafka topic {}: {}", getTopic(), message);
        } catch (Exception e) {
            log.error("Error sending message to Kafka topic {}: {}", getTopic(), message, e);
            throw new MessageDeliveryException("Failed to send message to Kafka");
        }
    }

    protected void handleRead(T message) {
        handleCreate(message);
    }
    protected void handleUpdate(T message) {
        handleCreate(message);
    }
    protected void handleDelete(T data) {
    }

    @Override
    public Destination getDestination() {
        return Destination.KAFKA;
    }

    protected abstract String getTopic();

}
