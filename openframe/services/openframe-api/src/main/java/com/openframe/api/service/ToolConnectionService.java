package com.openframe.api.service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.openframe.api.dto.agent.ToolConnectionResponse;
import com.openframe.api.dto.agent.AgentToolCollectionResponse;
import com.openframe.api.dto.agent.AgentToolCollectionResponse.ToolInfo;
import com.openframe.api.exception.ConnectionNotFoundException;
import com.openframe.api.exception.DuplicateConnectionException;
import com.openframe.api.exception.InvalidAgentIdException;
import com.openframe.api.exception.InvalidToolTypeException;
import com.openframe.api.exception.MachineNotFoundException;
import com.openframe.core.model.ConnectionStatus;
import com.openframe.core.model.ToolConnection;
import com.openframe.core.model.ToolType;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.ToolConnectionRepository;
import lombok.RequiredArgsConstructor;

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
        validateAgentId(openframeAgentId);
        return toolConnectionRepository.findByMachineId(openframeAgentId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public AgentToolCollectionResponse getAgentToolCollection(String openframeAgentId) {
        validateAgentId(openframeAgentId);
        List<ToolConnection> connections = toolConnectionRepository.findByMachineId(openframeAgentId);
        List<ToolInfo> tools = connections.stream()
                .map(conn -> new ToolInfo(
                        conn.getToolType().toString().toLowerCase(),
                        conn.getAgentToolId()))
                .collect(Collectors.toList());

        return new AgentToolCollectionResponse(openframeAgentId, tools);
    }

    public ToolConnectionResponse getToolConnectionByMachineIdAndToolType(String openframeAgentId, String agentToolType) {
        validateAgentId(openframeAgentId);
        validateToolType(agentToolType);

        ToolType toolType = getToolTypeFromString(agentToolType);
        return toolConnectionRepository.findByMachineIdAndToolType(openframeAgentId, toolType)
                .map(this::convertToResponse)
                .orElseThrow(() -> new ConnectionNotFoundException("Connection not found for machine " + openframeAgentId + " and tool type " + agentToolType));
    }

    @Transactional
    public ToolConnectionResponse addToolConnection(String openframeAgentId, String agentToolType, String agentId) {
        validateAgentId(openframeAgentId);
        validateToolType(agentToolType);
        validateAgentToolId(agentId);
        validateMachineExists(openframeAgentId);

        ToolType toolType = getToolTypeFromString(agentToolType);
        Optional<ToolConnection> existingConnection = toolConnectionRepository
                .findByMachineIdAndToolType(openframeAgentId, toolType);

        if (existingConnection.isPresent()) {
            ToolConnection connection = existingConnection.get();
            if (connection.getStatus() == ConnectionStatus.CONNECTED) {
                throw new DuplicateConnectionException("Tool connection already exists for this machine and tool type");
            } else {
                connection.setStatus(ConnectionStatus.CONNECTED);
                connection.setAgentToolId(agentId);
                connection.setConnectedAt(Instant.now());
                connection.setDisconnectedAt(null);
                ToolConnection saved = toolConnectionRepository.save(connection);
                return convertToResponse(saved);
            }
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
    public ToolConnectionResponse updateToolConnection(String openframeAgentId, String agentToolType, String agentId) {
        validateAgentId(openframeAgentId);
        validateToolType(agentToolType);
        validateAgentToolId(agentId);

        ToolType toolType = getToolTypeFromString(agentToolType);
        ToolConnection connection = toolConnectionRepository.findByMachineIdAndToolType(openframeAgentId, toolType)
                .orElseThrow(() -> new ConnectionNotFoundException("Connection not found for machine " + openframeAgentId + " and tool type " + agentToolType));

        connection.setAgentToolId(agentId);
        connection.setLastSyncAt(Instant.now());
        return convertToResponse(toolConnectionRepository.save(connection));
    }

    @Transactional
    public void deleteToolConnection(String openframeAgentId, String agentToolType) {
        validateAgentId(openframeAgentId);
        validateToolType(agentToolType);

        ToolType toolType = getToolTypeFromString(agentToolType);
        ToolConnection connection = toolConnectionRepository.findByMachineIdAndToolType(openframeAgentId, toolType)
                .orElseThrow(() -> new ConnectionNotFoundException("Connection not found for machine " + openframeAgentId + " and tool type " + agentToolType));

        connection.setStatus(ConnectionStatus.DISCONNECTED);
        connection.setDisconnectedAt(Instant.now());
        toolConnectionRepository.save(connection);
    }

    private void validateMachineExists(String machineId) {
        if (!machineRepository.findByMachineId(machineId).isPresent()) {
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

    private ToolConnectionResponse convertToResponse(ToolConnection connection) {
        return new ToolConnectionResponse(
                connection.getMachineId(),
                connection.getToolType().toString().toLowerCase(),
                connection.getAgentToolId(),
                connection.getStatus().toString()
        );
    }
}