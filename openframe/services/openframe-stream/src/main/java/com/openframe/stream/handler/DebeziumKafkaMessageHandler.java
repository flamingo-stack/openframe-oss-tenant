package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.EventHandlerType;
import com.openframe.data.model.enums.Destination;
import com.openframe.kafka.model.IntegratedToolEvent;
import com.openframe.kafka.producer.OssTenantMessageProducer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class DebeziumKafkaMessageHandler extends DebeziumMessageHandler<IntegratedToolEvent, DeserializedDebeziumMessage> {

    @Value("${openframe.oss-tenant.kafka.topics.outbound.integrated-tool-events}")
    private String topic;

    protected final OssTenantMessageProducer messageProducer;

    public DebeziumKafkaMessageHandler(OssTenantMessageProducer ossTenantMessageProducer, ObjectMapper objectMapper) {
        super(objectMapper);
        this.messageProducer = ossTenantMessageProducer;
    }

    @Override
    protected IntegratedToolEvent transform(DeserializedDebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        IntegratedToolEvent message = new IntegratedToolEvent();
        try {
            message.setToolEventId(debeziumMessage.getToolEventId());
            message.setUserId(enrichedData.getUserId());
            message.setDeviceId(enrichedData.getMachineId());
            message.setIngestDay(debeziumMessage.getIngestDay());
            message.setToolType(debeziumMessage.getIntegratedToolType().name());
            message.setEventType(debeziumMessage.getUnifiedEventType().name());
            message.setSeverity(debeziumMessage.getUnifiedEventType().getSeverity().name());
            message.setSummary(debeziumMessage.getMessage() == null || debeziumMessage.getMessage().isBlank()
                    ? debeziumMessage.getUnifiedEventType().getSummary()
                    : debeziumMessage.getMessage() );
            message.setEventTimestamp(debeziumMessage.getEventTimestamp());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return message;
    }

    protected void handleCreate(IntegratedToolEvent message) {
        messageProducer.sendMessage(topic, message, buildMessageBrokerKey(message));
    }

    protected void handleRead(IntegratedToolEvent message) {
        handleCreate(message);
    }

    protected void handleUpdate(IntegratedToolEvent message) {
        handleCreate(message);
    }

    protected void handleDelete(IntegratedToolEvent data) {
    }

    @Override
    public EventHandlerType getType() {
        return EventHandlerType.COMMON_TYPE;
    }

    @Override
    public Destination getDestination() {
        return Destination.KAFKA;
    }

    @Override
    protected boolean isValidMessage(DeserializedDebeziumMessage message) {
        return message.getIsVisible();
    }

    protected String getTopic() {
        return topic;
    }

    private String buildMessageBrokerKey(IntegratedToolEvent message) {
        if (message.getDeviceId() != null) {
            return "%s-%s".formatted(message.getDeviceId(), message.getToolType());
        }  else if (message.getUserId() != null) {
            return "%s-%s".formatted(message.getUserId(), message.getToolType());
        } else {
            return message.getToolType();
        }
    }

}
