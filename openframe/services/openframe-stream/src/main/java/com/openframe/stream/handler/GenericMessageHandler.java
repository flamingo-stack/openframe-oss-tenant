package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.openframe.stream.enumeration.OperationType;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@Slf4j
public abstract class GenericMessageHandler<T, U> implements MessageHandler {

    protected final ObjectMapper mapper;

    protected GenericMessageHandler(ObjectMapper mapper) {
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT, true);
        this.mapper = mapper;
    }

    @Override
    public void handle(Map<String, Object> message) {
        U deserializedMessage = deserialize(message);
        if (isValidMessage(deserializedMessage)) {
            T transformedData = transform(deserializedMessage);
            OperationType operationType = getOperationType(deserializedMessage);
            if (operationType != null) {
                pushData(transformedData, operationType);
            }
        }
    }

    protected  boolean isValidMessage(U message) {
        return true;
    }

    protected void pushData(T data, OperationType operationType) {
        switch (operationType) {
            case READ -> handleRead(data);
            case CREATE ->  handleCreate(data);
            case UPDATE ->  handleUpdate(data);
            case DELETE ->  handleDelete(data);
        }
    }

    protected abstract U deserialize(Map<String, Object> message);

    protected abstract T transform(U message);

    protected abstract OperationType getOperationType(U message);

    protected abstract void handleCreate(T data);
    protected abstract void handleRead(T data);
    protected abstract void handleUpdate(T data);
    protected abstract void handleDelete(T data);

}
