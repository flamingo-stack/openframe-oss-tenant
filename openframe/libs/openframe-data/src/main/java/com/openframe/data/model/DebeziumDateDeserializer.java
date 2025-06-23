package com.openframe.data.model;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;
import java.time.Instant;

public class DebeziumDateDeserializer extends JsonDeserializer<String> {

    @Override
    public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        JsonNode node = p.getCodec().readTree(p);

        if (node.has("$date")) {
            long timestamp = node.get("$date").asLong();
            return Instant.ofEpochMilli(timestamp).toString();
        }

        if (node.isTextual()) {
            return Instant.parse(node.asText()).toString();
        } else if (node.isNumber()) {
            return Instant.ofEpochMilli(node.asLong()).toString();
        }

        throw new IOException("Cannot deserialize date: " + node.toString());
    }
}
