package com.openframe.management.service;

import com.openframe.data.document.device.Machine;
import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.service.ToolInstallationNatsPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
/*
    TODO:
     1. Now logic process only agent without integrated tool server(like openframe chat)
     2. Need support command args parameters
 */
public class NewIntegratedToolAgentProcessingService {

    private final MachineRepository machineRepository;
    private final ToolInstallationNatsPublisher toolInstallationNatsPublisher;

    public void process(IntegratedToolAgent agent) {
        log.info("Publishing installation message for new tool agent {} to all machines", agent.getId());

        IntegratedTool tool = buildEmptyTool();

        machineRepository.findAll()
                .stream()
                .map(Machine::getMachineId)
                .forEach(machineId -> processMachine(machineId, agent, tool));

        log.info("Completed publishing installation messages for tool agent {}", agent.getId());
    }

    private IntegratedTool buildEmptyTool() {
        IntegratedTool tool = new IntegratedTool();
        tool.setToolType("");
        tool.setId("");
        return tool;
    }

    private void processMachine(String machineId, IntegratedToolAgent agent, IntegratedTool tool) {
        String toolAgentId = agent.getId();
        try {
            log.info("Publishing tool installation message for machine {}", machineId);
            toolInstallationNatsPublisher.publish(machineId, agent, tool);
            log.info("Published installation message for tool agent {} to machine {}", toolAgentId, machineId);
        } catch (Exception e) {
            log.error("Failed to publish installation message for tool agent {} to machine {}", toolAgentId, machineId, e);
        }
    }

}
