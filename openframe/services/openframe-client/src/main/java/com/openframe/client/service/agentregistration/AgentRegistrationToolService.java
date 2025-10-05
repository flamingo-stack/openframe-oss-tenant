package com.openframe.client.service.agentregistration;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.service.IntegratedToolAgentService;
import com.openframe.data.service.IntegratedToolService;
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
    private final ToolCommandParamsResolver toolCommandParamsResolver;
    private final IntegratedToolService integratedToolService;

    public void publishInstallationMessages(String machineId) {
        List<IntegratedToolAgent> toolAgents = integratedToolAgentService.getAllEnabled();
        toolAgents.forEach(toolAgent -> publish(machineId, toolAgent));
    }

    private void publish(String machineId, IntegratedToolAgent toolAgent) {
        String toolId = toolAgent.getToolId();
        IntegratedTool tool = integratedToolService.getToolById(toolId)
                .orElseThrow(() -> new IllegalStateException("No tool found for " + toolId));

        try {
            // process params for installation command args
            List<String> installationCommandArgs = toolAgent.getInstallationCommandArgs();
            toolAgent.setInstallationCommandArgs(toolCommandParamsResolver.process(toolId, installationCommandArgs));

            // TODO: avoid double tool calls for registration secret
            // process params for run command args
            List<String> runCommandArgs = toolAgent.getRunCommandArgs();
            toolAgent.setRunCommandArgs(toolCommandParamsResolver.process(toolId, runCommandArgs));

            toolInstallationNatsPublisher.publish(machineId, toolAgent, tool);
            log.info("Published {} agent installation message for machine {}", toolId, machineId);
        } catch (Exception e) {
            // TODO: add fallback mechanism
            log.error("Failed to publish {} agent installation message for machine {}", toolId, machineId);
        }
    }



}
