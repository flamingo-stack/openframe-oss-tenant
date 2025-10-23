package com.openframe.client.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.client.service.MachineStatusService;
import com.openframe.client.service.NatsTopicMachineIdExtractor;
import io.nats.client.Connection;
import io.nats.client.Dispatcher;
import io.nats.client.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class MachineHeartbeatListener {

    private final Connection natsConnection;
    private final ObjectMapper objectMapper;
    private final MachineStatusService machineStatusService;
    private final NatsTopicMachineIdExtractor machineIdExtractor;

    private static final String SUBJECT = "machine.*.heartbeat";

    private Dispatcher dispatcher;

    @EventListener(ApplicationReadyEvent.class)
    public void subscribeToMachineHeartbeats() {
        try {
            // NATS Dispatcher manages threads internally
            dispatcher = natsConnection.createDispatcher();

            // Subscribe with callback - NATS will invoke handleMessage in its own thread
            dispatcher.subscribe(SUBJECT, this::handleMessage);

            log.info("Subscribed to machine heartbeats: subject={}", SUBJECT);

        } catch (Exception e) {
            log.error("Failed to subscribe to machine heartbeats", e);
            throw new RuntimeException("Failed to subscribe to machine heartbeats", e);
        }
    }

    private void handleMessage(Message message) {
        String subject = message.getSubject();

        String machineId = machineIdExtractor.extract(subject);;
        try {
            // Generate timestamp at service side
            Instant eventTimestamp = Instant.now();

            log.info("Processing machine heartbeat: machineId={} timestamp={}", machineId, eventTimestamp);

            // Process the heartbeat
            machineStatusService.processHeartbeat(machineId, eventTimestamp);

            log.info("Machine heartbeat processed successfully");
        } catch (Exception e) {
            log.error("Unexpected error processing heartbeat for machine {}", machineId, e);
        }
    }

    @PreDestroy
    public void cleanup() {
        if (dispatcher != null) {
            try {
                dispatcher.drain(Duration.ofSeconds(5)); // 5 seconds timeout
                log.info("Dispatcher drained successfully");
            } catch (Exception e) {
                log.error("Error draining dispatcher", e);
            }
        }
    }
}
