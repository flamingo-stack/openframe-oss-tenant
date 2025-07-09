package com.openframe.stream.listener;

import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.processor.GenericJsonMessageProcessor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class JsonKafkaListener {

    private final GenericJsonMessageProcessor messageProcessor;

    public JsonKafkaListener(GenericJsonMessageProcessor messageProcessor) {
        this.messageProcessor = messageProcessor;
    }

    @KafkaListener(topics = {"${kafka.consumer.topic.event.meshcentral.name}", "${kafka.consumer.topic.event.tactical-rmm.name}"},
            groupId = "test-group-8")
    public void listenIntegratedToolsEvents(Map<String, Object> message) {
        MessageType messageType = MessageTypeResolver.resolve(message);
        messageProcessor.process(message, messageType);
    }
}
