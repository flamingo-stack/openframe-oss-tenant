package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.EventHandlerType;
import com.openframe.data.model.enums.Destination;
import com.openframe.kafka.producer.KafkaProducer;
import com.openframe.stream.model.IntegratedToolEventKafkaMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DebeziumKafkaMessageHandler extends DebeziumMessageHandler<IntegratedToolEventKafkaMessage, DeserializedDebeziumMessage> {

    @Value("${kafka.producer.topic.it.event.name}")
    private String topic;

    protected final KafkaProducer kafkaProducer;

    public DebeziumKafkaMessageHandler(KafkaProducer kafkaProducer, ObjectMapper objectMapper) {
        super(objectMapper);
        this.kafkaProducer = kafkaProducer;
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
            message.setEventTimestamp(debeziumMessage.getEventTimestamp());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return message;
    }

    protected void handleCreate(IntegratedToolEventKafkaMessage message) {
        kafkaProducer.sendMessage(topic, message);
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
