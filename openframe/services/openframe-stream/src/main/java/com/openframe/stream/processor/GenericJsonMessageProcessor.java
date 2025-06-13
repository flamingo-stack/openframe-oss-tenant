package com.openframe.stream.processor;

import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.handler.MessageHandler;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class GenericJsonMessageProcessor {

    private final Map<MessageType, MessageHandler> handlers;

    public GenericJsonMessageProcessor(List<MessageHandler> handlers) {
        this.handlers = handlers.stream()
                .collect(Collectors.toMap(
                        MessageHandler::getType,
                        Function.identity()
                ));
    }

    public void process(Map<String, Object> message, MessageType type) {
        MessageHandler handler = handlers.get(type);
        if (handler == null) {
            throw new IllegalArgumentException("No handler found for type: " + type);
        }
        handler.handle(message);
    }

}
