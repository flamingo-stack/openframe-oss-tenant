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

    @KafkaListener(topics = {"${kafka.consumer.topic.event.meshcentral}", "${kafka.consumer.topic.event.tactical-rmm}"}, groupId = "${spring.kafka.consumer.group-id}")
    public void listenIntegratedToolsEvents(Map<String, Object> message) {
        MessageType messageType = MessageTypeResolver.resolve(message);
        messageProcessor.process(message, messageType);
    }
}
