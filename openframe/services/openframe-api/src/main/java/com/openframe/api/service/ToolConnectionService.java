package com.openframe.api.service;
import com.openframe.api.dto.agent.ToolConnectionResponse;
import com.openframe.api.dto.agent.AgentToolCollectionResponse;
import com.openframe.api.dto.agent.AgentToolCollectionResponse.ToolInfo;
import com.openframe.core.model.ConnectionStatus;
import com.openframe.core.model.Machine;
import com.openframe.core.model.ToolConnection;
import com.openframe.core.model.ToolType;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.ToolConnectionRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ToolConnectionService {

    private final ToolConnectionRepository toolConnectionRepository;
    private final MachineRepository machineRepository;

    public List<ToolConnectionResponse> getAllToolConnections() {
        return toolConnectionRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<ToolConnectionResponse> getToolConnectionsByMachineId(String openframeAgentId) {
        return toolConnectionRepository.findByMachineId(openframeAgentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public AgentToolCollectionResponse getAgentToolCollection(String openframeAgentId) {
        List<ToolConnection> connections = toolConnectionRepository.findByMachineId(openframeAgentId);

        List<ToolInfo> tools = connections.stream()
                .map(conn -> new ToolInfo(
                        conn.getToolType().toString().toLowerCase(),
                        conn.getAgentToolId()))
                .collect(Collectors.toList());

        return new AgentToolCollectionResponse(openframeAgentId, tools);
    }

    public Optional<ToolConnectionResponse> getToolConnectionByMachineIdAndToolType(String openframeAgentId, String agentToolType) {
        ToolType toolType = getToolTypeFromString(agentToolType);
        return toolConnectionRepository.findByMachineIdAndToolType(openframeAgentId, toolType)
                .map(this::convertToResponse);
    }

    @Transactional
    public ToolConnectionResponse addToolConnection(String openframeAgentId, String agentToolType, String agentId) {
        Optional<Machine> machine = machineRepository.findByMachineId(openframeAgentId);
        if (machine.isEmpty()) {
            throw new RuntimeException("Machine not found: " + openframeAgentId);
        }

        ToolType toolType = getToolTypeFromString(agentToolType);

        Optional<ToolConnection> existingConnection = toolConnectionRepository
                .findByMachineIdAndToolType(openframeAgentId, toolType);

        if (existingConnection.isPresent()) {
            throw new RuntimeException("Tool connection already exists for this machine and tool type");
        }

        ToolConnection connection = new ToolConnection();
        connection.setMachineId(openframeAgentId);
        connection.setToolType(toolType);
        connection.setAgentToolId(agentId);
        connection.setStatus(ConnectionStatus.CONNECTED);
        connection.setConnectedAt(Instant.now());

        ToolConnection saved = toolConnectionRepository.save(connection);
        return convertToResponse(saved);
    }

    @Transactional
    public Optional<ToolConnectionResponse> updateToolConnection(String openframeAgentId, String agentToolType, String agentId) {
        ToolType toolType = getToolTypeFromString(agentToolType);

        return toolConnectionRepository.findByMachineIdAndToolType(openframeAgentId, toolType)
                .map(connection -> {
                    connection.setAgentToolId(agentId);
                    connection.setLastSyncAt(Instant.now());
                    return convertToResponse(toolConnectionRepository.save(connection));
                });
    }

    @Transactional
    public void deleteToolConnection(String openframeAgentId, String agentToolType) {
        ToolType toolType = getToolTypeFromString(agentToolType);
        toolConnectionRepository.findByMachineIdAndToolType(openframeAgentId, toolType)
                .ifPresent(connection -> {
                    connection.setStatus(ConnectionStatus.DISCONNECTED);
                    connection.setDisconnectedAt(Instant.now());
                    toolConnectionRepository.save(connection);
                });
    }

    private ToolConnectionResponse convertToResponse(ToolConnection connection) {
        return new ToolConnectionResponse(
                connection.getMachineId(),
                connection.getToolType().toString().toLowerCase(),
                connection.getAgentToolId(),
                connection.getStatus().toString()
        );
    }

    private ToolType getToolTypeFromString(String agentToolType) {
        try {
            return ToolType.valueOf(agentToolType.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid tool type: " + agentToolType);
        }
    }
}