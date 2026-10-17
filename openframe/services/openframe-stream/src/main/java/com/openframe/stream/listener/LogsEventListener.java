package com.openframe.stream.listener;

import com.openframe.data.model.enums.MessageType;
import com.openframe.kafka.enumeration.KafkaHeader;
import com.openframe.kafka.model.debezium.CommonDebeziumMessage;
import com.openframe.stream.processor.GenericJsonMessageProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "openframe.oss-tenant.kafka.topics.inbound.logs-events.name")
public class LogsEventListener {

    private final GenericJsonMessageProcessor messageProcessor;

    @KafkaListener(
            topics = "${openframe.oss-tenant.kafka.topics.inbound.logs-events.name}",
            groupId = "openframe-oss-logs-events-group",
            containerFactory = "ossTenantKafkaListenerContainerFactory"
    )
    public void listenLogsEvents(@Payload CommonDebeziumMessage message,
                                 @Header(KafkaHeader.MESSAGE_TYPE_HEADER) MessageType messageType) {
        log.info("Received logs-event: type={}", messageType);
        messageProcessor.process(message, messageType);
    }
}
