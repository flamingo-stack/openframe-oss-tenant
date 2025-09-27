package com.openframe.stream.deserializer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.mapping.SourceEventTypes;
import com.openframe.stream.util.TimestampParser;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class MeshCentralEventDeserializer extends IntegratedToolEventDeserializer {

    private static final String FIELD_NODEID = "nodeid";
    private static final String FIELD_ETYPE = "etype";
    private static final String FIELD_ACTION = "action";
    private static final String FIELD_ID = "_id";
    private static final String FIELD_OID = "$oid";
    private static final String FIELD_MSG = "msg";

    public MeshCentralEventDeserializer(ObjectMapper mapper) {
        super(mapper,
                List.of(SourceEventTypes.MeshCentral.SERVER_TIMELINE_STATS),
                List.of());
    }

    @Override
    public MessageType getType() {
        return MessageType.MESHCENTRAL_EVENT;
    }

    @Override
    protected Optional<String> getAgentId(JsonNode after) {
        if (after == null) {
            log.warn("Invalid message structure for agent ID extraction");
            return Optional.empty();
        }
        return parseAndExtractField(after, FIELD_NODEID);
    }

    @Override
    protected Optional<String> getSourceEventType(JsonNode after) {
        return parseJson(after)
                .flatMap(event -> {
                    Optional<String> etype = extractField(event, FIELD_ETYPE);
                    Optional<String> action = extractField(event, FIELD_ACTION);

                    if (etype.isPresent() && action.isPresent()) {
                        return Optional.of("%s.%s".formatted(etype.get(), action.get()));
                    }
                    return etype.or(() -> action);
                });
    }

    @Override
    protected Optional<String> getEventToolId(JsonNode after) {
        return parseJson(after)
                .flatMap(this::extractEventId);
    }

    @Override
    protected Optional<String> getMessage(JsonNode after) {
        if (after == null) {
            log.warn("Invalid message structure for message extraction");
            return Optional.empty();
        }
        return parseAndExtractField(after, FIELD_MSG);
    }

    private Optional<JsonNode> parseJson(JsonNode rawNode) {
        return Optional.ofNullable(rawNode)
                .map(JsonNode::asText)
                .filter(StringUtils::isNotBlank)
                .flatMap(json -> {
                    try {
                        return Optional.of(mapper.readTree(json));
                    } catch (IOException e) {
                        log.error("Failed to parse JSON from node: {}, error: {}",
                                 rawNode, e.getMessage(), e);
                        return Optional.empty();
                    }
                });
    }

    private Optional<String> parseAndExtractField(JsonNode rawNode, String fieldName) {
        return parseJson(rawNode)
                .flatMap(event -> extractField(event, fieldName));
    }

    private Optional<String> extractField(JsonNode event, String fieldName) {
        return Optional.ofNullable(event.get(fieldName))
                .map(JsonNode::asText)
                .filter(StringUtils::isNotBlank);
    }

    private Optional<String> extractEventId(JsonNode event) {
        JsonNode idNode = event.get(FIELD_ID);
        if (idNode == null) return Optional.empty();

        return Optional.ofNullable(idNode.get(FIELD_OID))
                .map(JsonNode::asText)
                .filter(StringUtils::isNotBlank)
                .or(() -> Optional.of(idNode.asText())
                        .filter(StringUtils::isNotBlank));
    }

    @Override
    protected Optional<Long> getSourceEventTimestamp(JsonNode afterField) {
        return parseStringField(afterField, "time")
                .flatMap(TimestampParser::parseIso8601);
    }

    @Override
    protected String getDetails(JsonNode after) {
        return "{}";
    }
}
