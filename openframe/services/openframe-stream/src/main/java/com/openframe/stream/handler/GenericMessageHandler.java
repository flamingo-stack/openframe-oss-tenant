package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@Slf4j
public abstract class GenericMessageHandler<T> implements MessageHandler {

    protected final ObjectMapper mapper;

    protected GenericMessageHandler(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public void handle(Map<String, Object> message) {
        if (isValidMessage(message)) {

            T transformedData = transform(message);
            pushData(transformedData);
        }
    }

    protected  boolean isValidMessage(Map<String, Object> message) {
        return true;
    }

    protected T transform(Map<String, Object> message) {
        try {
            log.info("Received message: {}", message);
            JsonNode messageJson = mapper.valueToTree(message);
            return transform(messageJson);
        } catch (Exception e) {
            log.error("Error processing message: {}", message, e);
            throw new RuntimeException("Failed to process message", e);
        }
    }

    protected abstract T transform(JsonNode messageJson);

    protected abstract void pushData(T data);

}
