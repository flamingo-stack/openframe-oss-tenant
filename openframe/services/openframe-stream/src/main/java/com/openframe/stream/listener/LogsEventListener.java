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

/**
 * Consumer for the generic <b>logs-events</b> topic ({@code logs.events}).
 *
 * <p>A single topic carries many event types; the concrete type is read from the
 * {@code message-type} header rather than encoded in the topic name (no
 * topic-per-type).
 *
 */
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
        try {
            log.info("Received logs-event: type={}", messageType);
            messageProcessor.process(message, messageType);
        } catch (Exception e) {
            log.error("Failed to process logs-event: type={}", messageType, e);
        }
    }
}
