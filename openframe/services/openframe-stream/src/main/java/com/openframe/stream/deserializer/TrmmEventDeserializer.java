package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.TrmmEventMessage;
import com.openframe.data.model.enums.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
@Slf4j
public class TrmmEventDeserializer extends IntegratedToolEventDeserializer<TrmmEventMessage> {

    public TrmmEventDeserializer(ObjectMapper mapper) {
        super(mapper, TrmmEventMessage.class);
    }

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "agentid");
    }

    @Override
    protected Optional<String> getSourceEventType(TrmmEventMessage deserializedMessage) {
        Optional<String> objectType = parseField(deserializedMessage.getAfter(), "object_type");
        Optional<String> action = parseField(deserializedMessage.getAfter(), "action");
        Optional<String> result = Optional.empty();
        if (objectType.isPresent() && action.isPresent()) {
            result = Optional.of("%s.%s".formatted(objectType.get(), action.get()));
        } else if (objectType.isPresent()) {
            result = objectType;
        } else if (action.isPresent()) {
            result = action;
        }

        return result;
    }

    @Override
    protected Optional<String> getEventToolId(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "id");
    }

    @Override
    protected Optional<String> getMessage(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "message");
    }


    private Optional<String> parseField(JsonNode rawNode, String fieldName) {
        return Optional.ofNullable(rawNode)
                .flatMap(node -> {
                    JsonNode fieldNode = node.get(fieldName);
                    return fieldNode != null && StringUtils.isNotBlank(fieldNode.asText())
                            ? Optional.of(fieldNode.asText())
                            : Optional.empty();
                });
    }
}
