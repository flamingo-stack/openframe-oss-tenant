package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.DebeziumMessage;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity> {

    protected TrmmEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper);
    }

    @Override
    public MessageType getType() {
        return MessageType.TRMM_PSQL_AUDIT_LOG_TO_CASSANDRA;
    }

    @Override
    protected boolean isValidMessage(DebeziumMessage message) {
        return false;
    }

    @Override
    protected CassandraITEventEntity transform(DebeziumMessage debeziumMessage) {
        return null;
    }
}
