package com.openframe.client.service.agentregistration;

import com.openframe.core.model.IntegratedToolAgent;
import com.openframe.data.service.IntegratedToolAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentRegistrationToolService {

    private final IntegratedToolAgentService integratedToolAgentService;
    private final ToolInstallationNatsPublisher toolInstallationNatsPublisher;

    public void publishInstallationMessages(String machineId) {
        List<IntegratedToolAgent> toolAgents = integratedToolAgentService.getAll();
        toolAgents.forEach(toolAgent -> publish(machineId, toolAgent));
    }

    private void publish(String machineId, IntegratedToolAgent toolAgent) {
        String toolId = toolAgent.getId();
        try {
            toolInstallationNatsPublisher.publish(machineId, toolAgent);
            log.info("Published {} agent installation message for machine {}", toolId, machineId);
        } catch (Exception e) {
            log.error("Failed to publish {} agent installation message for machine {}", toolId, machineId);
            throw e;
        }
    }



}
