package com.openframe.client.listener;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.client.service.NatsTopicMachineIdExtractor;
import com.openframe.client.service.ToolConnectionService;
import com.openframe.core.exception.NatsException;
import com.openframe.data.model.nats.ToolConnectionMessage;
import io.nats.client.*;
import io.nats.client.api.AckPolicy;
import io.nats.client.api.ConsumerConfiguration;
import io.nats.client.api.ConsumerInfo;
import io.nats.client.api.DeliverPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
// TODO: remove spring cloud stream configs as deprecated
public class ToolConnectionListener {

    private final Connection natsConnection;
    private final ObjectMapper objectMapper;
    private final ToolConnectionService toolConnectionService;
    private final NatsTopicMachineIdExtractor machineIdExtractor;

    private static final String STREAM_NAME = "TOOL_CONNECTIONS";
    private static final String SUBJECT = "machine.*.tool-connection";
    private static final String CONSUMER_NAME = "tool-connection-processor";
    private static final int MAX_DELIVER = 50;
    private static final Duration ACK_WAIT = Duration.ofSeconds(30);

    private Dispatcher dispatcher;
    private JetStreamSubscription subscription;

    @EventListener(ApplicationReadyEvent.class)
    public void subscribeToToolConnections() {
        try {
            JetStream js = natsConnection.jetStream();

            // NATS Dispatcher manages threads internally
            dispatcher = natsConnection.createDispatcher();

            ConsumerConfiguration consumerConfig = buildConsumerConfig();

            PushSubscribeOptions pushOptions = PushSubscribeOptions.builder()
                    .stream(STREAM_NAME)
                    .configuration(consumerConfig)
                    .build();

            subscription = js.subscribe(SUBJECT, dispatcher, this::handleMessage, false, pushOptions);

            log.info("Subscribed to JetStream with Dispatcher: subject={} consumer={} (maxDeliver={}, ackWait={})", SUBJECT, CONSUMER_NAME, MAX_DELIVER, ACK_WAIT);

        } catch (Exception e) {
            log.error("Failed to subscribe to JetStream", e);
            throw new RuntimeException("Failed to subscribe to JetStream", e);
        }
    }

    private ConsumerConfiguration buildConsumerConfig() throws IOException, JetStreamApiException {
        JetStream js = natsConnection.jetStream();
        JetStreamManagement jsm = natsConnection.jetStreamManagement();

        try {
            ConsumerInfo existingConsumer = jsm.getConsumerInfo(STREAM_NAME, CONSUMER_NAME);

            log.info("Existing consumer config: {}", existingConsumer.getConsumerConfiguration());

            String deliverSubject = existingConsumer.getConsumerConfiguration().getDeliverSubject();
            ConsumerConfiguration consumerConfig = ConsumerConfiguration.builder()
                    .durable(CONSUMER_NAME)
                    .ackPolicy(AckPolicy.Explicit)
                    .deliverPolicy(DeliverPolicy.All)
                    .ackWait(ACK_WAIT)
                    .maxDeliver(MAX_DELIVER)
                    .filterSubject(SUBJECT)
                    .deliverSubject(deliverSubject)
                    .build();

            log.info("New consumer config: " + consumerConfig);

            jsm.addOrUpdateConsumer(STREAM_NAME, consumerConfig);

            return consumerConfig;
        } catch (JetStreamApiException e) {
            if (e.getErrorCode() == 404) {
                log.info("Consumer {} {} doesn't exist", STREAM_NAME, CONSUMER_NAME);
                ConsumerConfiguration consumerConfig = ConsumerConfiguration.builder()
                        .durable(CONSUMER_NAME)
                        .ackPolicy(AckPolicy.Explicit)
                        .deliverPolicy(DeliverPolicy.All)
                        .ackWait(ACK_WAIT)
                        .maxDeliver(MAX_DELIVER)
                        .filterSubject(SUBJECT)
                        .deliverSubject("machine.tool-connection.delivery")
                        .build();

                jsm.createConsumer(STREAM_NAME, consumerConfig);

                return consumerConfig;
            }
            throw new NatsException("Api error during consumer " + STREAM_NAME + " retrieve", e);
        }
    }

    private void handleMessage(Message message) {
        String messagePayload = new String(message.getData(), StandardCharsets.UTF_8);
        String subject = message.getSubject();

        try {
            String machineId = machineIdExtractor.extract(subject);
            ToolConnectionMessage toolConnectionMessage = objectMapper.readValue(messagePayload, ToolConnectionMessage.class);

            String toolType = toolConnectionMessage.getToolType();
            String agentToolId = toolConnectionMessage.getAgentToolId();
            long deliveredCount = message.metaData().deliveredCount();
            boolean lastAttempt = isLastAttempt(deliveredCount);

            log.info("Processing tool connection: machineId={} toolType={} agentToolId={} (delivery={})", machineId, toolType, agentToolId, deliveredCount);

            // Process the tool connection
            toolConnectionService.addToolConnection(machineId, toolType, agentToolId, lastAttempt);

            // Acknowledge successful processing
            message.ack();
            log.info("Tool connection processed successfully and acked");
        } catch (Exception e) {
            log.error("Unexpected error processing tool connection: {}", messagePayload, e);
            // Don't ack the message and let it be redelivered
            log.info("Leaving message unacked for potential redelivery: tool connection");
        }
    }

    private boolean isLastAttempt(long deliveredCount) {
        return deliveredCount == MAX_DELIVER;
    }

    @PreDestroy
    public void cleanup() {
        if (subscription != null) {
            try {
                subscription.unsubscribe();
                log.info("Unsubscribed from JetStream");
            } catch (Exception e) {
                log.error("Error unsubscribing from JetStream", e);
            }
        }

        if (dispatcher != null) {
            try {
                dispatcher.drain(Duration.ofSeconds(5));
                log.info("Dispatcher drained successfully");
            } catch (Exception e) {
                log.error("Error draining dispatcher", e);
            }
        }
    }
}