package com.openframe.stream.meshcentral.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.CassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class MeshEventCassandraHandler extends CassandraMessageHandler<CassandraITEventEntity> {

    public MeshEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper);
    }

    @Override
    protected CassandraITEventEntity transform(JsonNode rootNode) {
        CassandraITEventEntity entity = new CassandraITEventEntity();
        try {
            CassandraITEventEntity.CassandraITEventKey key = new CassandraITEventEntity.CassandraITEventKey();
            key.setId(UUID.randomUUID().toString());
            key.setToolName(IntegratedTool.MESHCENTRAL.getName());
            key.setTimestamp(Instant.now());
            entity.setKey(key);
            if (rootNode.has("eventType")) {
                entity.setEventType(rootNode.get("eventType").asText());
            }

            if (rootNode.has("payload")) {
                Map<String, String> payload = new HashMap<>();
                JsonNode metadataNode = rootNode.get("payload");
                metadataNode.fields().forEachRemaining(entry -> {
                    payload.put(entry.getKey(), entry.getValue().asText());
                });
                entity.setPayload(payload);
            }

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return entity;
    }

    @Override
    public MessageType getType() {
        return MessageType.MESH_MONGO_EVENT_TO_CASSANDRA;
    }
}
