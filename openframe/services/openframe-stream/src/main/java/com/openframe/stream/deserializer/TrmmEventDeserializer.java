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
    protected String getAgentId(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "agentid")
                .orElse(null);
    }

    @Override
    protected String getSourceEventType(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "event_type")
                .orElse("unknown");
    }

    @Override
    protected String getEventToolId(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "id")
                .orElse("");
    }

    @Override
    protected String getMessage(TrmmEventMessage deserializedMessage) {
        return parseField(deserializedMessage.getAfter(), "message")
                .orElse("unknown");
    }

    /**
     * Безопасно парсит JSON-строку из JsonNode и извлекает значение указанного поля.
     */
    private Optional<String> parseField(JsonNode rawNode, String fieldName) {
        return Optional.ofNullable(rawNode)
                .map(JsonNode::asText)
                .filter(StringUtils::isNotBlank)
                .flatMap(json -> {
                    try {
                        JsonNode node = mapper.readTree(json);
                        JsonNode fieldNode = node.get(fieldName);
                        return fieldNode != null && StringUtils.isNotBlank(fieldNode.asText())
                                ? Optional.of(fieldNode.asText())
                                : Optional.empty();
                    } catch (IOException e) {
                        log.error("Failed to parse JSON field '{}': {}", fieldName, e.getMessage());
                        return Optional.empty();
                    }
                });
    }
}
