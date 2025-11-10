package com.openframe.client.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.client.service.InstalledAgentService;
import com.openframe.client.service.NatsTopicMachineIdExtractor;
import com.openframe.core.exception.NatsException;
import com.openframe.data.model.nats.InstalledAgentMessage;
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
public class InstalledAgentListener {

    private final Connection natsConnection;
    private final ObjectMapper objectMapper;
    private final InstalledAgentService installedAgentService;
    private final NatsTopicMachineIdExtractor machineIdExtractor;

    private static final String STREAM_NAME = "INSTALLED_AGENTS";
    private static final String SUBJECT = "machine.*.installed-agent";
    private static final String CONSUMER_NAME = "installed-agent-processor-v1";
    private static final String DELIVERY_GROUP = "installed-agent";
    private static final String DELIVERY_SUBJECT = "machine.installed-agent.delivery";
    private static final int MAX_DELIVER = 50;
    private static final Duration ACK_WAIT = Duration.ofSeconds(30);

    private Dispatcher dispatcher;
    private JetStreamSubscription subscription;

    @EventListener(ApplicationReadyEvent.class)
    public void subscribeToInstalledAgents() {
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

            log.info("Subscribed to JetStream with Dispatcher: subject={} consumer={} (maxDeliver={}, ackWait={})", 
                    SUBJECT, CONSUMER_NAME, MAX_DELIVER, ACK_WAIT);

        } catch (Exception e) {
            log.error("Failed to subscribe to JetStream", e);
            throw new RuntimeException("Failed to subscribe to JetStream", e);
        }
    }

    private ConsumerConfiguration buildConsumerConfig() throws IOException, JetStreamApiException {
        JetStreamManagement jsm = natsConnection.jetStreamManagement();

        try {
            ConsumerInfo existingConsumer = jsm.getConsumerInfo(STREAM_NAME, CONSUMER_NAME);

            log.info("Existing consumer config: {}", existingConsumer.getConsumerConfiguration());

            ConsumerConfiguration consumerConfig = ConsumerConfiguration.builder()
                    .durable(CONSUMER_NAME)
                    .ackPolicy(AckPolicy.Explicit)
                    .deliverPolicy(DeliverPolicy.All)
                    .ackWait(ACK_WAIT)
                    .maxDeliver(MAX_DELIVER)
                    .filterSubject(SUBJECT)
                    .deliverSubject(DELIVERY_SUBJECT)
                    .deliverGroup(DELIVERY_GROUP)
                    .build();

            log.info("New consumer config: {}", consumerConfig);

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
                        .deliverGroup(DELIVERY_GROUP)
                        .deliverSubject(DELIVERY_SUBJECT)
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
            InstalledAgentMessage installedAgentMessage = objectMapper.readValue(messagePayload, InstalledAgentMessage.class);

            String agentType = installedAgentMessage.getAgentType();
            String version = installedAgentMessage.getVersion();
            long deliveredCount = message.metaData().deliveredCount();
            boolean lastAttempt = isLastAttempt(deliveredCount);

            log.info("Processing installed agent: machineId={} agentType={} version={} (delivery={})", 
                    machineId, agentType, version, deliveredCount);

            // Process the installed agent
            installedAgentService.addInstalledAgent(machineId, agentType, version, lastAttempt);

            // Acknowledge successful processing
            message.ack();
            log.info("Installed agent processed successfully and acked");
        } catch (Exception e) {
            log.error("Unexpected error processing installed agent: {}", messagePayload, e);
            // Don't ack the message and let it be redelivered
            log.info("Leaving message unacked for potential redelivery: installed agent");
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

