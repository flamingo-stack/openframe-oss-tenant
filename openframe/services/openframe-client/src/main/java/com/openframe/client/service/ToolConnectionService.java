package com.openframe.client.service;

import com.openframe.client.exception.InvalidAgentIdException;
import com.openframe.client.exception.InvalidToolTypeException;
import com.openframe.client.exception.MachineNotFoundException;
import com.openframe.client.service.agentregistration.transformer.ToolAgentIdTransformerService;
import com.openframe.data.document.tool.ConnectionStatus;
import com.openframe.data.document.tool.ToolConnection;
import com.openframe.data.document.tool.ToolType;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.repository.tool.ToolConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolConnectionService {

    private final ToolConnectionRepository toolConnectionRepository;
    private final MachineRepository machineRepository;
    private final ToolAgentIdTransformerService toolAgentIdTransformerService;

    @Transactional
    public void addToolConnection(String openframeAgentId, String toolTypeValue, String agentToolId) {
        validateAgentId(openframeAgentId);
        validateToolType(toolTypeValue);
        validateAgentToolId(agentToolId);
        validateMachineExists(openframeAgentId);

        ToolType toolType = getToolTypeFromString(toolTypeValue);
        
        log.info("Tool connection processing: machineId={}, toolType={}, agentToolId={}", openframeAgentId, toolType, agentToolId);

        toolConnectionRepository
                .findByMachineIdAndToolType(openframeAgentId, toolType)
                .ifPresentOrElse(
                        toolConnection -> processExistingToolConnection(
                                toolConnection,
                                openframeAgentId,
                                toolType,
                                agentToolId
                        ),
                        () -> addNewToolConnection(openframeAgentId, toolType, agentToolId)
                );
    }

    private void processExistingToolConnection(
            ToolConnection toolConnection,
            String openframeAgentId,
            ToolType toolType,
            String agentId
    ) {
        if (toolConnection.getStatus() == ConnectionStatus.DISCONNECTED) {
            toolConnection.setStatus(ConnectionStatus.CONNECTED);
            toolConnection.setAgentToolId(agentId);
            toolConnection.setConnectedAt(Instant.now());
            toolConnection.setDisconnectedAt(null);
            toolConnectionRepository.save(toolConnection);

            log.info("Updated existing tool connection with machineId {} tool {} agentToolId {}", openframeAgentId, toolType, agentId);
        } else {
            ConnectionStatus toolConnectionStatus = toolConnection.getStatus();
            log.warn("Tools agent already connected with machineId {} tool {} agentToolId {} status {}", openframeAgentId, toolType, agentId, toolConnectionStatus);
        }
    }

    private void addNewToolConnection(String openframeAgentId, ToolType toolType, String agentToolId) {
        ToolConnection connection = new ToolConnection();
        connection.setMachineId(openframeAgentId);
        connection.setToolType(toolType);
        connection.setAgentToolId(toolAgentIdTransformerService.transform(toolType, agentToolId));
        connection.setStatus(ConnectionStatus.CONNECTED);
        connection.setConnectedAt(Instant.now());
        toolConnectionRepository.save(connection);

        log.info("Saved tool connection with machineId {} tool {} agentToolId {}", openframeAgentId, toolType, agentToolId);
    }

    private void validateMachineExists(String machineId) {
        if (machineRepository.findByMachineId(machineId).isEmpty()) {
            throw new MachineNotFoundException("Machine not found: " + machineId);
        }
    }

    private void validateAgentToolId(String agentToolId) {
        if (agentToolId == null || agentToolId.trim().isEmpty()) {
            throw new InvalidAgentIdException("Agent tool ID cannot be empty");
        }
    }

    private void validateAgentId(String agentId) {
        if (agentId == null || agentId.trim().isEmpty()) {
            throw new InvalidAgentIdException("Agent ID cannot be empty");
        }
    }

    private void validateToolType(String toolType) {
        if (toolType == null || toolType.trim().isEmpty()) {
            throw new InvalidToolTypeException("Tool type cannot be empty");
        }
    }

    private ToolType getToolTypeFromString(String agentToolType) {
        try {
            return ToolType.valueOf(agentToolType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidToolTypeException("Invalid tool type: " + agentToolType);
        }
    }

}