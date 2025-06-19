package com.openframe.stream.events.handler.tactical;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class TrmmEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity> {

    protected TrmmEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper);
    }

    @Override
    protected CassandraITEventEntity transform(JsonNode message) {
        return null;
    }

    @Override
    public MessageType getType() {
        return MessageType.TRMM_PSQL_AUDIT_LOG_TO_CASSANDRA;
    }

    @Override
    protected boolean isValidMessage(Map<String, Object> message) {
        return false;
    }
}
