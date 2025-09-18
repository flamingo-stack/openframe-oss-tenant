package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.model.fleet.debezium.DeserializedDebeziumMessage;
import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.stream.enumeration.OperationType;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public abstract class DebeziumMessageHandler<T, U extends DeserializedDebeziumMessage> extends GenericMessageHandler<T, U, IntegratedToolEnrichedData> {

    protected DebeziumMessageHandler(ObjectMapper mapper) {
        super(mapper);
    }

    protected OperationType getOperationType(DeserializedDebeziumMessage message) {
        OperationType operationType = null;
        if (message != null && message.getPayload().getOperation() != null) {
            try {
                String operation = message.getPayload().getOperation();

                operationType = switch (operation) {
                    case "c" -> OperationType.CREATE;
                    case "r" -> OperationType.READ;
                    case "u" -> OperationType.UPDATE;
                    case "d" -> OperationType.DELETE;
                    default -> null;
                };
            } catch (Exception e) {
                log.error("Failed to process tag message", e);
            }
        }
        return operationType;
    }

    abstract protected T transform(U debeziumMessage, IntegratedToolEnrichedData extraParams);

}
