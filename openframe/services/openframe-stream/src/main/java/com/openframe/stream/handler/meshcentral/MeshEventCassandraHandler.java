package com.openframe.stream.handler.meshcentral;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.debezium.MongoDbDebeziumMessage;
import com.openframe.data.model.debezium.PostgreSqlDebeziumMessage;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class MeshEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity, MongoDbDebeziumMessage> {

    public MeshEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper, MongoDbDebeziumMessage.class);
    }

    @Override
    protected CassandraITEventEntity transform(MongoDbDebeziumMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
        CassandraITEventEntity entity = new CassandraITEventEntity();
        try {
            CassandraITEventEntity.CassandraITEventKey key = new CassandraITEventEntity.CassandraITEventKey();
            
            // Extract ID from MongoDB message
            String documentId = extractDocumentId(debeziumMessage);
            key.setToolId(documentId);
            key.setToolName(IntegratedTool.MESHCENTRAL.getDbName());
            key.setTimestamp(Instant.now());
            key.setMachineId(enrichedData.getMachineId());
            key.setId(key.generatePK());
            entity.setKey(key);
            
            Map<String, String> payload = new HashMap<>();
            // Add document ID to payload if needed
            if (documentId != null) {
                payload.put("documentId", documentId);
            }
            
            entity.setPayload(payload);

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return entity;
    }
    
    /**
     * Extract document ID from MongoDB Debezium message
     */
    private String extractDocumentId(MongoDbDebeziumMessage debeziumMessage) {
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
