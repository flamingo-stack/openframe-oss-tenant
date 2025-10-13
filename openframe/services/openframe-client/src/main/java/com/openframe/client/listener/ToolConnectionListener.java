package com.openframe.client.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.client.service.ToolConnectionService;
import com.openframe.data.model.nats.ToolConnectionMessage;
import io.nats.client.Connection;
import io.nats.client.JetStream;
import io.nats.client.JetStreamSubscription;
import io.nats.client.Message;
import io.nats.client.PushSubscribeOptions;
import io.nats.client.api.AckPolicy;
import io.nats.client.api.ConsumerConfiguration;
import io.nats.client.api.DeliverPolicy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import static org.apache.commons.lang3.StringUtils.isEmpty;

@Component
@RequiredArgsConstructor
@Slf4j
// TODO: remove spring cloud stream configs as deprecated
public class ToolConnectionListener {

    private final Connection natsConnection;
    private final ObjectMapper objectMapper;
    private final ToolConnectionService toolConnectionService;

    private static final String STREAM_NAME = "TOOL_CONNECTIONS";
    private static final String SUBJECT = "machine.*.tool-connection";
    private static final String CONSUMER_NAME = "tool-connection-processor";
    private static final int MAX_DELIVER = 10;
    private static final Duration ACK_WAIT = Duration.ofSeconds(30);
    
    private JetStreamSubscription subscription;

    @EventListener(ApplicationReadyEvent.class)
    public void subscribeToToolConnections() {
        try {
            JetStream js = natsConnection.jetStream();

            // Create consumer configuration with retry policy
            ConsumerConfiguration consumerConfig = ConsumerConfiguration.builder()
                    .durable(CONSUMER_NAME)
                    .ackPolicy(AckPolicy.Explicit)
                    .deliverPolicy(DeliverPolicy.All)
                    .ackWait(ACK_WAIT)
                    .maxDeliver(MAX_DELIVER)
                    .build();

            // Subscribe with push-based consumer
            PushSubscribeOptions pushOptions = PushSubscribeOptions.builder()
                    .stream(STREAM_NAME)
                    .configuration(consumerConfig)
                    .build();

            subscription = js.subscribe(SUBJECT, pushOptions);

            // Start message handler in separate thread
            Thread handlerThread = new Thread(this::processMessages, "tool-connection-handler");
            handlerThread.setDaemon(true);
            handlerThread.start();

            log.info("Subscribed to JetStream subject: {} with consumer: {} (maxDeliver={}, ackWait={})", 
                    SUBJECT, CONSUMER_NAME, MAX_DELIVER, ACK_WAIT);

        } catch (Exception e) {
            log.error("Failed to subscribe to JetStream", e);
            throw new RuntimeException("Failed to subscribe to JetStream", e);
        }
    }

    private void processMessages() {
        log.info("Started processing JetStream messages");
        
        while (!Thread.currentThread().isInterrupted() && subscription != null && subscription.isActive()) {
            try {
                Message message = subscription.nextMessage(Duration.ofSeconds(1));
                
                if (message != null) {
                    handleMessage(message);
                }
                
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.info("Message processing interrupted");
                break;
            } catch (Exception e) {
                log.error("Error in message processing loop", e);
            }
        }
        
        log.info("Stopped processing JetStream messages");
    }

    private void handleMessage(Message message) {
        String messagePayload = new String(message.getData(), StandardCharsets.UTF_8);
        String subject = message.getSubject();
        
        try {
            String machineId = extractMachineId(subject);
            ToolConnectionMessage toolConnectionMessage = objectMapper.readValue(
                messagePayload, ToolConnectionMessage.class);

            String toolType = toolConnectionMessage.getToolType();
            String agentToolId = toolConnectionMessage.getAgentToolId();

            log.info("Processing tool connection: machineId={} toolType={} agentToolId={} (delivery={})", 
                    machineId, toolType, agentToolId, 
                    message.metaData() != null ? message.metaData().deliveredCount() : "?");

            // Process the tool connection
            toolConnectionService.addToolConnection(machineId, toolType, agentToolId);
            
            // Acknowledge successful processing
            message.ack();
            log.info("Tool connection processed successfully and acked");
        } catch (Exception e) {
            log.error("Unexpected error processing tool connection: {}", messagePayload, e);
            // Don't ack the message and let it be redelivered
            log.info("Leaving message unacked for potential redelivery: tool connection");
        }
    }

    private String extractMachineId(String subject) {
        if (isEmpty(subject)) {
            throw new IllegalStateException("Tool connection subject is empty");
        }
        
        // subject format: machine.{machineId}.tool-connection
        String[] parts = subject.split("\\.");
        if (parts.length < 3) {
            throw new IllegalStateException("Invalid tool connection subject format: " + subject);
        }
        
        return parts[1];
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
    }
}

