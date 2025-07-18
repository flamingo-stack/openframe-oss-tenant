package com.openframe.stream.handler.tactical;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.*;
import com.openframe.data.repository.cassandra.UnifiedLogEventRepository;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class TrmmEventCassandraHandler extends DebeziumCassandraMessageHandler {

    protected TrmmEventCassandraHandler(UnifiedLogEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_RMM_EVENT;
    }

    @Override
    protected boolean isValidMessage(DeserializedDebeziumMessage message) {
        return message != null && 
               message.getPayload().getAfter() != null;
    }
}
