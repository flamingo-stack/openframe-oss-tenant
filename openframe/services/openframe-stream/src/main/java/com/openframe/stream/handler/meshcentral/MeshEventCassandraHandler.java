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
            CassandraITEventEntity.CassandraITEventKey key = createKey(debeziumMessage, enrichedData, IntegratedTool.MESHCENTRAL);
            entity.setKey(key);

            mapEvent(entity, debeziumMessage);

        } catch (Exception e) {
            log.error("Error processing Kafka message", e);
            throw e;
        }
        return entity;
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }
}