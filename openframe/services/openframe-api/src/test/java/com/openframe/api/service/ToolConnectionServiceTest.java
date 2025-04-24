package com.openframe.api.service;

import com.openframe.api.dto.agent.ToolConnectionResponse;
import com.openframe.api.dto.agent.AgentToolCollectionResponse;
import com.openframe.core.model.ConnectionStatus;
import com.openframe.core.model.Machine;
import com.openframe.core.model.ToolConnection;
import com.openframe.core.model.ToolType;
import com.openframe.data.repository.mongo.MachineRepository;
import com.openframe.data.repository.mongo.ToolConnectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ToolConnectionServiceTest {

    @Mock
    private ToolConnectionRepository toolConnectionRepository;

    @Mock
    private MachineRepository machineRepository;

    @Captor
    private ArgumentCaptor<ToolConnection> toolConnectionCaptor;

    private ToolConnectionService toolConnectionService;

    private static final String MACHINE_ID = "test-machine-id";
    private static final String TOOL_TYPE = "MESHCENTRAL";
    private static final String AGENT_TOOL_ID = "test-agent-tool-id";

    @BeforeEach
    void setUp() {
        toolConnectionService = new ToolConnectionService(toolConnectionRepository, machineRepository);
    }

    @Test
    void getAllToolConnections_ReturnsAllConnections() {
        ToolConnection connection1 = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        ToolConnection connection2 = createToolConnection("other-machine", ToolType.TACTICAL_RMM, "other-agent");
        when(toolConnectionRepository.findAll()).thenReturn(Arrays.asList(connection1, connection2));

        List<ToolConnectionResponse> responses = toolConnectionService.getAllToolConnections();

        assertEquals(2, responses.size());
        ToolConnectionResponse response1 = responses.get(0);
        assertEquals(MACHINE_ID, response1.getOpenframeAgentId());
        assertEquals(TOOL_TYPE.toLowerCase(), response1.getToolType());
        assertEquals(AGENT_TOOL_ID, response1.getAgentToolId());
        assertEquals(ConnectionStatus.CONNECTED.toString(), response1.getStatus());
    }

    @Test
    void getToolConnectionsByMachineId_ReturnsMatchingConnections() {
        ToolConnection connection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        when(toolConnectionRepository.findByMachineId(MACHINE_ID)).thenReturn(List.of(connection));

        List<ToolConnectionResponse> responses = toolConnectionService.getToolConnectionsByMachineId(MACHINE_ID);

        assertEquals(1, responses.size());
        ToolConnectionResponse response = responses.get(0);
        assertEquals(MACHINE_ID, response.getOpenframeAgentId());
        assertEquals(TOOL_TYPE.toLowerCase(), response.getToolType());
    }

    @Test
    void getAgentToolCollection_ReturnsToolInfo() {
        ToolConnection connection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        when(toolConnectionRepository.findByMachineId(MACHINE_ID)).thenReturn(List.of(connection));

        AgentToolCollectionResponse response = toolConnectionService.getAgentToolCollection(MACHINE_ID);

        assertEquals(MACHINE_ID, response.getOpenframeAgentId());
        assertEquals(1, response.getTools().size());
        assertEquals(TOOL_TYPE.toLowerCase(), response.getTools().get(0).getToolType());
        assertEquals(AGENT_TOOL_ID, response.getTools().get(0).getAgentToolId());
    }

    @Test
    void getToolConnectionByMachineIdAndToolType_ReturnsConnection() {
        ToolConnection connection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(connection));

        Optional<ToolConnectionResponse> response = toolConnectionService
                .getToolConnectionByMachineIdAndToolType(MACHINE_ID, TOOL_TYPE);

        assertTrue(response.isPresent());
        assertEquals(MACHINE_ID, response.get().getOpenframeAgentId());
        assertEquals(TOOL_TYPE.toLowerCase(), response.get().getToolType());
    }

    @Test
    void addToolConnection_CreatesNewConnection() {
        Machine machine = new Machine();
        machine.setMachineId(MACHINE_ID);
        when(machineRepository.findByMachineId(MACHINE_ID)).thenReturn(Optional.of(machine));
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.empty());
        when(toolConnectionRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ToolConnectionResponse response = toolConnectionService.addToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID);

        verify(toolConnectionRepository).save(toolConnectionCaptor.capture());
        ToolConnection savedConnection = toolConnectionCaptor.getValue();
        assertEquals(MACHINE_ID, savedConnection.getMachineId());
        assertEquals(ToolType.MESHCENTRAL, savedConnection.getToolType());
        assertEquals(AGENT_TOOL_ID, savedConnection.getAgentToolId());
        assertEquals(ConnectionStatus.CONNECTED, savedConnection.getStatus());
        assertNotNull(savedConnection.getConnectedAt());
    }

    @Test
    void addToolConnection_WithExistingConnection_ThrowsException() {
        Machine machine = new Machine();
        machine.setMachineId(MACHINE_ID);
        when(machineRepository.findByMachineId(MACHINE_ID)).thenReturn(Optional.of(machine));
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(new ToolConnection()));

        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> toolConnectionService.addToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID)
        );
        assertEquals("Tool connection already exists for this machine and tool type", exception.getMessage());
    }

    @Test
    void updateToolConnection_UpdatesExistingConnection() {
        ToolConnection existingConnection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, "old-agent-id");
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(existingConnection));
        when(toolConnectionRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        Optional<ToolConnectionResponse> response = toolConnectionService
                .updateToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID);

        assertTrue(response.isPresent());
        verify(toolConnectionRepository).save(toolConnectionCaptor.capture());
        ToolConnection savedConnection = toolConnectionCaptor.getValue();
        assertEquals(AGENT_TOOL_ID, savedConnection.getAgentToolId());
        assertNotNull(savedConnection.getLastSyncAt());
    }

    @Test
    void deleteToolConnection_DisconnectsExistingConnection() {
        ToolConnection existingConnection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(existingConnection));
        when(toolConnectionRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        toolConnectionService.deleteToolConnection(MACHINE_ID, TOOL_TYPE);

        verify(toolConnectionRepository).save(toolConnectionCaptor.capture());
        ToolConnection savedConnection = toolConnectionCaptor.getValue();
        assertEquals(ConnectionStatus.DISCONNECTED, savedConnection.getStatus());
        assertNotNull(savedConnection.getDisconnectedAt());
    }

    @Test
    void getToolConnectionByMachineIdAndToolType_WithInvalidToolType_ThrowsException() {
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> toolConnectionService.getToolConnectionByMachineIdAndToolType(MACHINE_ID, "INVALID_TOOL")
        );
        assertEquals("Invalid tool type: INVALID_TOOL", exception.getMessage());
    }

    private ToolConnection createToolConnection(String machineId, ToolType toolType, String agentToolId) {
        ToolConnection connection = new ToolConnection();
        connection.setMachineId(machineId);
        connection.setToolType(toolType);
        connection.setAgentToolId(agentToolId);
        connection.setStatus(ConnectionStatus.CONNECTED);
        connection.setConnectedAt(Instant.now());
        return connection;
    }
} 