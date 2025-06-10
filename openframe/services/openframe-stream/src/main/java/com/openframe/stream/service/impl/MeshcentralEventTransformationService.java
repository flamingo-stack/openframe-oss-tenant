package com.openframe.stream.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.pinot.PinotEventEntity;
import com.openframe.stream.service.IntegratedToolEventTransformationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class MeshcentralEventTransformationService implements IntegratedToolEventTransformationService {


    @Override
    public CassandraITEventEntity transformForCassandra(JsonNode rootNode) {
        CassandraITEventEntity entity = new CassandraITEventEntity();
        try {
            CassandraITEventEntity.CassandraITEventKey key = new CassandraITEventEntity.CassandraITEventKey();
            key.setId(UUID.randomUUID().toString());
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
    public PinotEventEntity transformForPinot(JsonNode message) {
        return null;
    }

}
