package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.cassandra.UnifiedLogEvent;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.Destination;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
public abstract class DebeziumCassandraMessageHandler extends DebeziumMessageHandler<UnifiedLogEvent, DebeziumMessage> {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneId.of("UTC"));
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
    protected UnifiedLogEvent transform(DebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        UnifiedLogEvent logEvent = new UnifiedLogEvent();
        try {
            UnifiedLogEvent.UnifiedLogEventKey key = createKey(debeziumMessage);
            logEvent.setKey(key);
            logEvent.setUserId(debeziumMessage.getUserId());
            logEvent.setDeviceId(enrichedData.getMachineId());
            logEvent.setSeverity(debeziumMessage.getSeverity());
            logEvent.setDetails(debeziumMessage.getDetails());

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return logEvent;
    }

    protected UnifiedLogEvent.UnifiedLogEventKey createKey(DebeziumMessage debeziumMessage) {
        UnifiedLogEvent.UnifiedLogEventKey key = new UnifiedLogEvent.UnifiedLogEventKey();
        Instant timestamp = Instant.ofEpochMilli(debeziumMessage.getTimestamp());

        key.setIngestDay(formatter.format(timestamp));
        key.setToolType(debeziumMessage.getToolType().getDbName());
        key.setEventType(debeziumMessage.getEventType().name());
        key.setTimestamp(timestamp);
        key.setToolEventId(debeziumMessage.getEventToolId());

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
