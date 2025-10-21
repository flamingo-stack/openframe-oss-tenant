package com.openframe.client.service;

import com.openframe.client.service.agentregistration.transformer.ToolAgentIdTransformerService;
import com.openframe.data.document.device.Machine;
import com.openframe.data.document.tool.ConnectionStatus;
import com.openframe.data.document.tool.ToolConnection;
import com.openframe.data.document.tool.ToolType;
import com.openframe.data.repository.device.MachineRepository;
import com.openframe.data.repository.tool.ToolConnectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ToolConnectionServiceTest {

    @Mock
    private ToolConnectionRepository toolConnectionRepository;

    @Mock
    private MachineRepository machineRepository;

    @Mock
    private ToolAgentIdTransformerService toolAgentIdTransformerService;

    @Captor
    private ArgumentCaptor<ToolConnection> toolConnectionCaptor;

    private ToolConnectionService toolConnectionService;

    private static final String MACHINE_ID = "test-machine-id";
    private static final String TOOL_TYPE = "MESHCENTRAL";
    private static final String AGENT_TOOL_ID = "test-agent-tool-id";
    private static final String TRANSFORMED_AGENT_TOOL_ID = "node//test-agent-tool-id";

    @BeforeEach
    void setUp() {
        toolConnectionService = new ToolConnectionService(toolConnectionRepository, machineRepository, toolAgentIdTransformerService);
    }

    @Test
    void addToolConnection_CreatesNewConnection() {
        when(machineRepository.findByMachineId(MACHINE_ID))
                .thenReturn(Optional.of(new Machine()));
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.empty());
        when(toolConnectionRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        when(toolAgentIdTransformerService.transform(ToolType.MESHCENTRAL, AGENT_TOOL_ID, true))
                .thenReturn(TRANSFORMED_AGENT_TOOL_ID);

        toolConnectionService.addToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID, true);

        verify(toolConnectionRepository).save(toolConnectionCaptor.capture());
        ToolConnection savedConnection = toolConnectionCaptor.getValue();
        assertEquals(MACHINE_ID, savedConnection.getMachineId());
        assertEquals(ToolType.MESHCENTRAL, savedConnection.getToolType());
        assertEquals(TRANSFORMED_AGENT_TOOL_ID, savedConnection.getAgentToolId());
        assertEquals(ConnectionStatus.CONNECTED, savedConnection.getStatus());
        assertNotNull(savedConnection.getConnectedAt());
    }

    @Test
    void addToolConnection_WithExistingConnection_NoException() {
        when(machineRepository.findByMachineId(MACHINE_ID))
                .thenReturn(Optional.of(new Machine()));
        ToolConnection existingConnection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        existingConnection.setStatus(ConnectionStatus.CONNECTED);
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(existingConnection));

        assertDoesNotThrow(() ->
                toolConnectionService.addToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID, true)
        );
    }

    @Test
    void addToolConnection_ReactivatesDisconnectedConnection() {
        when(machineRepository.findByMachineId(MACHINE_ID))
                .thenReturn(Optional.of(new Machine()));
        ToolConnection existingConnection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, "old-agent-tool-id");
        existingConnection.setStatus(ConnectionStatus.DISCONNECTED);
        existingConnection.setDisconnectedAt(Instant.now().minusSeconds(3600));
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(existingConnection));
        when(toolConnectionRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        toolConnectionService.addToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID, true);

        verify(toolConnectionRepository).save(toolConnectionCaptor.capture());
        ToolConnection savedConnection = toolConnectionCaptor.getValue();
        assertEquals(MACHINE_ID, savedConnection.getMachineId());
        assertEquals(ToolType.MESHCENTRAL, savedConnection.getToolType());
        assertEquals(AGENT_TOOL_ID, savedConnection.getAgentToolId());
        assertEquals(ConnectionStatus.CONNECTED, savedConnection.getStatus());
        assertNotNull(savedConnection.getConnectedAt());
        assertNull(savedConnection.getDisconnectedAt());
    }

    @Test
    void addToolConnection_WithAlreadyConnected_ThrowsException() {
        when(machineRepository.findByMachineId(MACHINE_ID))
                .thenReturn(Optional.of(new Machine()));
        ToolConnection existingConnection = createToolConnection(MACHINE_ID, ToolType.MESHCENTRAL, AGENT_TOOL_ID);
        existingConnection.setStatus(ConnectionStatus.CONNECTED);
        when(toolConnectionRepository.findByMachineIdAndToolType(MACHINE_ID, ToolType.MESHCENTRAL))
                .thenReturn(Optional.of(existingConnection));

        assertDoesNotThrow(() ->
                toolConnectionService.addToolConnection(MACHINE_ID, TOOL_TYPE, AGENT_TOOL_ID, true)
        );
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