package com.openframe.stream.listener;

import com.openframe.stream.enumeration.MessageType;
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

    @KafkaListener(topics = "${kafka.consumer.topic.event.meshcentral.name}", groupId = "${spring.kafka.consumer.group-id}")
    public void listen(Map<String, Object> message) {
        messageProcessor.process(message, MessageType.MESH_MONGO_EVENT_TO_CASSANDRA);
        messageProcessor.process(message, MessageType.MESH_MONGO_EVENT_TO_KAFKA);
    }
}
