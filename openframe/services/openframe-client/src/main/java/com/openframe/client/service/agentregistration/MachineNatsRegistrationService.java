package com.openframe.client.service.agentregistration;

import com.openframe.data.service.NatsConsumerManagementService;
import io.nats.client.api.ConsumerConfiguration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MachineNatsRegistrationService {
    
    private final NatsConsumerManagementService natsManagementService;

    public void register(String machineId) {
        ConsumerConfiguration consumerConfiguration = ConsumerConfiguration.builder()
            .durable("machine-" + machineId)
            .filterSubject("machine.>" + machineId)
            .build();

        natsManagementService.create("TOOL_INSTALLATION", consumerConfiguration);
    }
}
