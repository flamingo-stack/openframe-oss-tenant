package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.stream.enumeration.Destination;
import com.openframe.stream.enumeration.IntegratedTool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.cassandra.repository.CassandraRepository;

import java.time.Instant;

@Slf4j
public abstract class DebeziumCassandraMessageHandler<T extends CassandraITEventEntity, U extends DebeziumMessage> extends DebeziumMessageHandler<T, U> {

    private final CassandraRepository repository;

    protected DebeziumCassandraMessageHandler(CassandraRepository repository, ObjectMapper objectMapper, Class<U> clazz) {
        super(objectMapper, clazz);
        this.repository = repository;
    }

    @Override
    public Destination getDestination() {
        return Destination.CASSANDRA;
    }

    protected void mapEvent(T entity, DebeziumMessage debeziumMessage) {
        entity.setEventType(determineEventType(debeziumMessage));

        entity.setOperation(debeziumMessage.getOperation());

        entity.setBeforeData(jsonNodeToString(debeziumMessage.getBefore()));
        entity.setAfterData(jsonNodeToString(debeziumMessage.getAfter()));
        entity.setSource(sourceToString(debeziumMessage.getSource()));
    }

    protected CassandraITEventEntity.CassandraITEventKey createKey(DebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData,
                                                                   IntegratedTool integratedTool) {
            CassandraITEventEntity.CassandraITEventKey key = new CassandraITEventEntity.CassandraITEventKey();

            String toolId = debeziumMessage.getAgentId();
            key.setToolId(toolId != null ? toolId : "");
            key.setToolName(integratedTool.getDbName());

            if (debeziumMessage.getTimestamp() != null) {
                key.setTimestamp(Instant.ofEpochMilli(debeziumMessage.getTimestamp()));
            } else {
                key.setTimestamp(Instant.now());
            }

            key.setMachineId(enrichedData.getMachineId() != null ? enrichedData.getMachineId() : "");
            key.setId(key.generatePK());

            return key;
    }

    private String determineEventType(DebeziumMessage debeziumMessage) {
        String operation = debeziumMessage.getOperation();
        String tableName = debeziumMessage.getTableName();

        return String.format("%s_%s", tableName, operation).toUpperCase();
    }

    private String jsonNodeToString(com.fasterxml.jackson.databind.JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }

        try {
            return mapper.writeValueAsString(node);
        } catch (Exception e) {
            log.warn("Failed to serialize JsonNode to string", e);
            return node.toString();
        }
    }

    private String sourceToString(DebeziumMessage.Source source) {
        if (source == null) {
            return null;
        }
        try {
            return mapper.writeValueAsString(source);
        } catch (Exception e) {
            log.warn("Failed to serialize Source to string", e);
            return source.toString();
        }
    }

    protected void handleCreate(T data) {
        repository.save(data);
    }

    protected void handleRead(T message) {
        handleCreate(message);
    }
    protected void handleUpdate(T message) {
        handleCreate(message);
    }
    protected void handleDelete(T data) {
    }
}
