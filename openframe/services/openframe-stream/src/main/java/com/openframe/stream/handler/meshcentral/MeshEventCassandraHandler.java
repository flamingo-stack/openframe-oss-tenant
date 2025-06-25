package com.openframe.stream.handler.meshcentral;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.*;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@Slf4j
public class MeshEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity, MeshCentralEventMessage> {

    public MeshEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper, MeshCentralEventMessage.class);
    }

    @Override
    protected CassandraITEventEntity transform(MeshCentralEventMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        CassandraITEventEntity entity = new CassandraITEventEntity();
        try {
            CassandraITEventEntity.CassandraITEventKey key = createKey(debeziumMessage, enrichedData);
            entity.setKey(key);

            mapEvent(entity, debeziumMessage);

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return entity;
    }

    private CassandraITEventEntity.CassandraITEventKey createKey(MeshCentralEventMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        CassandraITEventEntity.CassandraITEventKey key = new CassandraITEventEntity.CassandraITEventKey();

        // Extract ID from MongoDB message
        String documentId = extractDocumentId(debeziumMessage);
        key.setToolId(documentId != null ? documentId : UUID.randomUUID().toString());
        key.setToolName(IntegratedTool.MESHCENTRAL.getDbName());

        // Используем timestamp из debezium сообщения если есть, иначе текущее время
        if (debeziumMessage.getTimestamp() != null) {
            key.setTimestamp(Instant.ofEpochMilli(debeziumMessage.getTimestamp()));
        } else {
            key.setTimestamp(Instant.now());
        }

        key.setMachineId(enrichedData.getMachineId() != null ? enrichedData.getMachineId() : "");
        key.setId(key.generatePK());

        return key;
    }

    /**
     * Extract document ID from MongoDB Debezium message
     */
    private String extractDocumentId(MeshCentralEventMessage debeziumMessage) {
        try {
            if (debeziumMessage.getAfter() != null && !debeziumMessage.getAfter().isNull()) {
                // Try to get ID from "after" field (for create/update operations)
                var idNode = debeziumMessage.getAfter().get("_id");
                if (idNode != null && !idNode.isNull()) {
                    if (idNode.has("$oid")) {
                        return idNode.get("$oid").asText();
                    } else {
                        return idNode.asText();
                    }
                }
            }

            if (debeziumMessage.getBefore() != null && !debeziumMessage.getBefore().isNull()) {
                // Try to get ID from "before" field (for delete operations)
                var idNode = debeziumMessage.getBefore().get("_id");
                if (idNode != null && !idNode.isNull()) {
                    if (idNode.has("$oid")) {
                        return idNode.get("$oid").asText();
                    } else {
                        return idNode.asText();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract document ID from MongoDB message", e);
        }

        return null;
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }
}