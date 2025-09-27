package com.openframe.stream.listener;

import com.openframe.data.model.enums.MessageType;
import com.openframe.kafka.enumeration.KafkaHeader;
import com.openframe.kafka.model.debezium.CommonDebeziumMessage;
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
            topics = {
                    "${openframe.oss-tenant.kafka.topics.inbound.meshcentral-events}",
                    "${openframe.oss-tenant.kafka.topics.inbound.tactical-rmm-events}",
                    "${openframe.oss-tenant.kafka.topics.inbound.fleet-mdm-events}"
            },
            groupId = "${spring.oss-tenant.kafka.consumer.group-id}"
    )
    public void listenIntegratedToolsEvents(@Payload CommonDebeziumMessage debeziumMessage, @Header(KafkaHeader.MESSAGE_TYPE_HEADER) MessageType messageType) {
        messageProcessor.process(debeziumMessage, messageType);
    }
}
