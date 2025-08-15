package com.openframe.stream.listener;

import com.openframe.data.model.debezium.CommonDebeziumMessage;
import com.openframe.data.model.enums.MessageType;
import com.openframe.stream.processor.GenericJsonMessageProcessor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

@Service
public class JsonKafkaListener {

    private final GenericJsonMessageProcessor messageProcessor;

    public static final String MESSAGE_TYPE_HEADER = "message-type";

    public JsonKafkaListener(GenericJsonMessageProcessor messageProcessor) {
        this.messageProcessor = messageProcessor;
    }

    @KafkaListener(
            topics = {
                    "${kafka.consumer.topic.event.meshcentral.name}",
                    "${kafka.consumer.topic.event.tactical-rmm.name}",
                    "${kafka.consumer.topic.event.fleet-mdm.name}"
            },
            groupId = "local-2",
            containerFactory = "debeziumKafkaListenerContainerFactory"
    )
    public void listenIntegratedToolsEvents(@Payload CommonDebeziumMessage debeziumMessage, @Header(MESSAGE_TYPE_HEADER) MessageType messageType) {
        messageProcessor.process(debeziumMessage, messageType);
    }
}
