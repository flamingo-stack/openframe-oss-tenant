package com.openframe.data.service;

import com.openframe.data.document.tool.ToolConnection;
import com.openframe.data.repository.tool.ToolConnectionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MachineIdCacheServiceTest {

    @Mock
    private ToolConnectionRepository toolConnectionRepository;

    private MachineIdCacheService machineIdCacheService;

    @BeforeEach
    void setUp() {
        machineIdCacheService = new MachineIdCacheService(toolConnectionRepository);
    }

    @Test
    void testGetMachineId_WhenFound_ReturnsMachineId() {
        // Arrange
        String agentId = "agent-123";
        String expectedMachineId = "machine-456";
        
        ToolConnection toolConnection = new ToolConnection();
        toolConnection.setMachineId(expectedMachineId);
        
        when(toolConnectionRepository.findByAgentToolId(agentId))
            .thenReturn(Optional.of(toolConnection));

        // Act
        String result = machineIdCacheService.getMachineId(agentId);

        // Assert
        assertEquals(expectedMachineId, result);
        verify(toolConnectionRepository).findByAgentToolId(agentId);
    }

    @Test
    void testGetMachineId_WhenNotFound_ReturnsNull() {
        // Arrange
        String agentId = "agent-123";
        when(toolConnectionRepository.findByAgentToolId(agentId))
            .thenReturn(Optional.empty());

        // Act
        String result = machineIdCacheService.getMachineId(agentId);

        // Assert
        assertNull(result);
        verify(toolConnectionRepository).findByAgentToolId(agentId);
    }

    @Test
    void testGetMachineId_WithException_ReturnsNull() {
        // Arrange
        String agentId = "agent-123";
        when(toolConnectionRepository.findByAgentToolId(agentId))
            .thenThrow(new RuntimeException("Database error"));

        // Act
        String result = machineIdCacheService.getMachineId(agentId);

        // Assert
        assertNull(result);
        verify(toolConnectionRepository).findByAgentToolId(agentId);
    }
} 