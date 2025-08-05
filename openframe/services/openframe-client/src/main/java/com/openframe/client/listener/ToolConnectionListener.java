package com.openframe.client.listener;

import com.openframe.client.service.ToolConnectionService;
import com.openframe.core.exception.NatsException;
import com.openframe.data.model.nats.ToolConnectionMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ToolConnectionListener {

    private final ToolConnectionService toolConnectionService;

    @Bean
    // TODO: configure retry number
    public Consumer<Message<ToolConnectionMessage>> toolConnectionListener() {
        return message -> {
            ToolConnectionMessage toolConnectionMessage = message.getPayload();

            String machineId = "1";
            String toolId = toolConnectionMessage.getToolId();
            String agentToolId = toolConnectionMessage.getAgentToolId();

            try {
                toolConnectionService.addToolConnection(machineId, toolId, agentToolId);
            } catch (Exception e) {
                log.error("Failed to process tool connection with machineId {} tool {} agentToolId {}", machineId, toolId, agentToolId, e);
                throw new NatsException("Failed to process tool connection", e);
            }
        };
    }

}
