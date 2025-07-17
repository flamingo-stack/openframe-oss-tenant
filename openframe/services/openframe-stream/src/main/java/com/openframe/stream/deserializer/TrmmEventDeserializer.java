package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.enums.MessageType;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Slf4j
public class TrmmEventDeserializer extends IntegratedToolEventDeserializer {

    @Override
    public MessageType getType() {
        return MessageType.TACTICAL_RMM_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        return parseField(after, "agentid");
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode after) {
        Optional<String> objectType = parseField(after, "object_type");
        Optional<String> action = parseField(after, "action");
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
    protected Optional<String> getEventToolId(JsonNode after) {
        return parseField(after, "id");
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        return parseField(after, "message");
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
