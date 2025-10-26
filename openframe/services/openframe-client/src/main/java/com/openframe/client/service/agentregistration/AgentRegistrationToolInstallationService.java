package com.openframe.client.service.agentregistration;

import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.service.IntegratedToolAgentService;
import com.openframe.data.service.ToolInstallationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentRegistrationToolInstallationService {

    private final IntegratedToolAgentService integratedToolAgentService;
    private final ToolInstallationService toolInstallationService;

    public void process(String machineId) {
        List<IntegratedToolAgent> toolAgents = integratedToolAgentService.getAllEnabled();
        toolAgents.forEach(toolAgent -> toolInstallationService.process(machineId, toolAgent));
    }



}
