package com.openframe.client.listener;

import com.openframe.client.service.MachineStatusService;
import com.openframe.core.exception.NatsException;
import io.nats.client.Nats;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClientConnectionListener {

    private final MachineStatusService machineStatusService;

    // TODO: nats died - heartbeat fallback
    @Bean
    public Consumer<Message<String>> machineConnectedListener() {
        return message -> {
            try {
                String data = message.getPayload();

                // extract from event
                String machineId = "1";
                Instant timestamp = Instant.now();
                machineStatusService.updateToOnline(machineId, timestamp);
            } catch (Exception e) {
                throw new NatsException("Failed to process client connected event", e);
            }
        };
    }

    @Bean
    public Consumer<Message<String>> machineDisconnectionListener() {
        return message -> {
            try {
                String data = message.getPayload();

                // extract from event
                String machineId = "1";
                Instant timestamp = Instant.now();
                machineStatusService.updateToOffline(machineId, timestamp);
            } catch (Exception e) {
                throw new NatsException("Failed to process disconnected connect event", e);
            }
        };
    }
}
