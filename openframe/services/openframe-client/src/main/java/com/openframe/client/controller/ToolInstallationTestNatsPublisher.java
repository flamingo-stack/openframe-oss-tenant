package com.openframe.client.controller;

import com.openframe.client.service.agentregistration.ToolInstallationNatsPublisher;
import com.openframe.core.model.IntegratedToolAgent;
import com.openframe.data.repository.nats.NatsMessagePublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("tool-installation/publish")
@RequiredArgsConstructor
public class ToolInstallationTestNatsPublisher {

    private final ToolInstallationNatsPublisher toolInstallationNatsPublisher;

    @PostMapping
    public void publish(@RequestParam String machineId) {
        IntegratedToolAgent integratedToolAgent = new IntegratedToolAgent();
        integratedToolAgent.setId("tactical-rmm");
        integratedToolAgent.setVersion("1.0");
        toolInstallationNatsPublisher.publish(machineId, integratedToolAgent);
    }

}
