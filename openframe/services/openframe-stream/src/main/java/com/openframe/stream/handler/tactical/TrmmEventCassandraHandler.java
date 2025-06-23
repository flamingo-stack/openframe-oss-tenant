package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.debezium.PostgreSqlDebeziumMessage;
import com.openframe.data.repository.cassandra.CassandraITEventRepository;
import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventCassandraHandler extends DebeziumCassandraMessageHandler<CassandraITEventEntity, PostgreSqlDebeziumMessage> {

    protected TrmmEventCassandraHandler(CassandraITEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper, PostgreSqlDebeziumMessage.class);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    protected boolean isValidMessage(PostgreSqlDebeziumMessage message) {
        return false;
    }

    @Override
    protected CassandraITEventEntity transform(PostgreSqlDebeziumMessage debeziumMessage) {
        return null;
    }
}
