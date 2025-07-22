package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.cassandra.UnifiedLogEvent;
import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.Destination;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;

import java.time.Instant;

@Slf4j
public abstract class DebeziumCassandraMessageHandler extends DebeziumMessageHandler<UnifiedLogEvent, DeserializedDebeziumMessage> {

    private final CassandraRepository repository;

    protected DebeziumCassandraMessageHandler(CassandraRepository repository, ObjectMapper objectMapper) {
        super(objectMapper);
        this.repository = repository;
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
            logEvent.setSeverity(debeziumMessage.getUnifiedEventType().getSeverity().name());
            logEvent.setDetails(debeziumMessage.getDetails());
            logEvent.setMessage(debeziumMessage.getMessage());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return logEvent;
    }

    protected UnifiedLogEvent.UnifiedLogEventKey createKey(DeserializedDebeziumMessage debeziumMessage) {
        UnifiedLogEvent.UnifiedLogEventKey key = new UnifiedLogEvent.UnifiedLogEventKey();
        Instant timestamp = Instant.ofEpochMilli(debeziumMessage.getPayload().getTimestamp());

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
