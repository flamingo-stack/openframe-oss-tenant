package com.openframe.stream.handler.meshcentral;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.repository.cassandra.UnifiedLogEventRepository;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.handler.DebeziumCassandraMessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class MeshEventCassandraHandler extends DebeziumCassandraMessageHandler {

    public MeshEventCassandraHandler(UnifiedLogEventRepository repository, ObjectMapper objectMapper) {
        super(repository, objectMapper);
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }
}