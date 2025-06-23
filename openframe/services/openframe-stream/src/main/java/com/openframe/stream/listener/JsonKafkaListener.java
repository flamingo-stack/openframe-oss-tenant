package com.openframe.stream.listener;

import com.openframe.stream.enumeration.MessageType;
import com.openframe.stream.processor.GenericJsonMessageProcessor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class JsonKafkaListener {

    private final GenericJsonMessageProcessor messageProcessor;

    public JsonKafkaListener(GenericJsonMessageProcessor messageProcessor) {
        this.messageProcessor = messageProcessor;
    }

    @KafkaListener(topics = {"meshcentral.mongodb.events", "tactical-rmm.postgres.events"}, groupId = "${spring.kafka.consumer.group-id}")
    public void listenIntegratedToolsEvents(Map<String, Object> message) {
        List<MessageType> messageTypes = MessageTypeResolver.resolve(message);
        Objects.requireNonNull(messageTypes).forEach(messageType -> {
            messageProcessor.process(message, messageType);
        });
    }
}
