package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.kafka.IntegratedToolEventKafkaMessage;
import com.openframe.data.model.enums.Destination;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.MessageDeliveryException;

@Slf4j
public abstract class DebeziumKafkaMessageHandler extends DebeziumMessageHandler<IntegratedToolEventKafkaMessage, DebeziumMessage> {

    @Value("${kafka.producer.topic.it.event.name}")
    private String topic;

    protected final KafkaTemplate<String, Object> kafkaTemplate;

    public DebeziumKafkaMessageHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(objectMapper);
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    protected IntegratedToolEventKafkaMessage transform(DebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        IntegratedToolEventKafkaMessage message = new IntegratedToolEventKafkaMessage();
        try {
            message.setTimestamp(debeziumMessage.getTimestamp());
            message.setToolName(debeziumMessage.getToolType().getDbName());
            message.setAgentId(debeziumMessage.getAgentId());
            message.setMachineId(enrichedData.getMachineId());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return message;
    }

    protected void handleCreate(IntegratedToolEventKafkaMessage message) {
        try {
            kafkaTemplate.send(getTopic(), message);
            log.info("Message sent to Kafka topic {}: {}", getTopic(), message);
        } catch (Exception e) {
            log.error("Error sending message to Kafka topic {}: {}", getTopic(), message, e);
            throw new MessageDeliveryException("Failed to send message to Kafka");
        }
    }

    protected void handleRead(IntegratedToolEventKafkaMessage message) {
        handleCreate(message);
    }
    protected void handleUpdate(IntegratedToolEventKafkaMessage message) {
        handleCreate(message);
    }
    protected void handleDelete(IntegratedToolEventKafkaMessage data) {
    }

    @Override
    public Destination getDestination() {
        return Destination.KAFKA;
    }

    protected String getTopic() {
        return topic;
    }

}
