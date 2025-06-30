package com.openframe.stream.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.stream.enumeration.OperationType;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;

@Slf4j
public abstract class DebeziumMessageHandler<T, U extends DebeziumMessage> extends GenericMessageHandler<T, U, IntegratedToolEnrichedData> {

    protected DebeziumMessageHandler(ObjectMapper mapper) {
        super(mapper);
    }

    protected OperationType getOperationType(DebeziumMessage message) {
        OperationType operationType = null;
        if (message != null && message.getOperation() != null) {
            try {
                String operation = message.getOperation();

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
