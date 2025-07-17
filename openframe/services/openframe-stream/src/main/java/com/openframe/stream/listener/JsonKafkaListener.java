package com.openframe.stream.listener;

import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.processor.GenericJsonMessageProcessor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Service
public class JsonKafkaListener {

    private final GenericJsonMessageProcessor messageProcessor;

    public JsonKafkaListener(GenericJsonMessageProcessor messageProcessor) {
        this.messageProcessor = messageProcessor;
    }

    @KafkaListener(
            topics = {"${kafka.consumer.topic.event.meshcentral.name}", "${kafka.consumer.topic.event.tactical-rmm.name}"},
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "debeziumKafkaListenerContainerFactory"
    )
    public void listenIntegratedToolsEvents(@Payload DeserializedDebeziumMessage debeziumMessage, @Header("message-type") MessageType messageType) {
        messageProcessor.process(debeziumMessage, messageType);
    }
}
