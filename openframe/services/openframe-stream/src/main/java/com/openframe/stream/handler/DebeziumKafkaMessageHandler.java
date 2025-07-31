package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.EventHandlerType;
import com.openframe.data.model.kafka.IntegratedToolEventKafkaMessage;
import com.openframe.data.model.enums.Destination;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DebeziumKafkaMessageHandler extends DebeziumMessageHandler<IntegratedToolEventKafkaMessage, DeserializedDebeziumMessage> {

    @Value("${kafka.producer.topic.it.event.name}")
    private String topic;

    protected final KafkaTemplate<String, Object> kafkaTemplate;

    public DebeziumKafkaMessageHandler(KafkaTemplate<String, Object> kafkaTemplate, ObjectMapper objectMapper) {
        super(objectMapper);
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    protected IntegratedToolEventKafkaMessage transform(DeserializedDebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        IntegratedToolEventKafkaMessage message = new IntegratedToolEventKafkaMessage();
        try {
            message.setToolEventId(debeziumMessage.getToolEventId());
            message.setUserId(enrichedData.getUserId());
            message.setDeviceId(enrichedData.getMachineId());
            message.setIngestDay(debeziumMessage.getIngestDay());
            message.setToolType(debeziumMessage.getIntegratedToolType().name());
            message.setEventType(debeziumMessage.getUnifiedEventType().name());
            message.setSeverity(debeziumMessage.getUnifiedEventType().getSeverity().name());
            message.setSummary(debeziumMessage.getMessage());
            message.setEventTimestamp(debeziumMessage.getPayload().getTimestamp());

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
    public EventHandlerType getType() {
        return EventHandlerType.COMMON_TYPE;
    }

    @Override
    public Destination getDestination() {
        return Destination.KAFKA;
    }

    protected String getTopic() {
        return topic;
    }

}
