package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.*;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.IntegratedTool;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity, TrmmEventMessage> {

    protected TrmmEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper, TrmmEventMessage.class);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    protected boolean isValidMessage(TrmmEventMessage message) {
        return message != null && 
               message.getAfter() != null;
    }

    @Override
    protected CassandraITEventEntity transform(TrmmEventMessage debeziumMessage, IntegratedToolEnrichedData enrichedData) {
            CassandraITEventEntity entity = new CassandraITEventEntity();
            try {
                CassandraITEventEntity.CassandraITEventKey key = createKey(debeziumMessage, enrichedData, IntegratedTool.TACTICAL);
                entity.setKey(key);

                mapEvent(entity, debeziumMessage);

            } catch (Exception e) {
                log.error("Error processing Kafka message", e);
                throw e;
            }
            return entity;
        }
}
