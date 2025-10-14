package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.cassandra.UnifiedLogEvent;
import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.Destination;
import com.openframe.data.model.enums.EventHandlerType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Slf4j
@Component
public class DebeziumCassandraMessageHandler extends DebeziumMessageHandler<UnifiedLogEvent, DeserializedDebeziumMessage> {

    private final CassandraRepository repository;

    protected DebeziumCassandraMessageHandler(CassandraRepository repository, ObjectMapper objectMapper) {
        super(objectMapper);
        this.repository = repository;
    }

    @Override
    public EventHandlerType getType() {
        return EventHandlerType.COMMON_TYPE;
    }

    @Override
    public Destination getDestination() {
        return Destination.CASSANDRA;
    }

    @Override
    protected UnifiedLogEvent transform(DeserializedDebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        UnifiedLogEvent logEvent = new UnifiedLogEvent();
        try {
            UnifiedLogEvent.UnifiedLogEventKey key = createKey(debeziumMessage);
            logEvent.setKey(key);
            logEvent.setUserId(enrichedData.getUserId());
            logEvent.setDeviceId(enrichedData.getMachineId());
            logEvent.setHostname(enrichedData.getHostname());
            logEvent.setOrganizationId(enrichedData.getOrganizationId());
            logEvent.setOrganizationName(enrichedData.getOrganizationName());
            logEvent.setSeverity(debeziumMessage.getUnifiedEventType().getSeverity().name());
            logEvent.setDebeziumMessage(debeziumMessage.getDebeziumMessage());
            logEvent.setMessage(debeziumMessage.getMessage() ==  null
                    ? debeziumMessage.getUnifiedEventType().getSummary()
                    : debeziumMessage.getMessage());
            logEvent.setDetails(debeziumMessage.getDetails());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return logEvent;
    }

    protected UnifiedLogEvent.UnifiedLogEventKey createKey(DeserializedDebeziumMessage debeziumMessage) {
        UnifiedLogEvent.UnifiedLogEventKey key = new UnifiedLogEvent.UnifiedLogEventKey();
        Instant timestamp = Instant.ofEpochMilli(debeziumMessage.getEventTimestamp());

        key.setIngestDay(debeziumMessage.getIngestDay());
        key.setToolType(debeziumMessage.getIntegratedToolType().name());
        key.setEventType(debeziumMessage.getUnifiedEventType().name());
        key.setEventTimestamp(timestamp);
        key.setToolEventId(debeziumMessage.getToolEventId());

        return key;
    }

    protected void handleCreate(UnifiedLogEvent data) {
        repository.save(data);
    }

    protected void handleRead(UnifiedLogEvent message) {
        handleCreate(message);
    }

    protected void handleUpdate(UnifiedLogEvent message) {
        handleCreate(message);
    }

    protected void handleDelete(UnifiedLogEvent data) {
    }
}
