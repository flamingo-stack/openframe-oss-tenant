package com.openframe.data.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HostAgentCacheServiceTest {

    @Mock
    private HostAgentCacheService.FleetHostRepository fleetHostRepository;

    private HostAgentCacheService hostAgentCacheService;

    @BeforeEach
    void setUp() {
        hostAgentCacheService = new HostAgentCacheService(fleetHostRepository);
    }

    @Test
    void testGetAgentId_WhenFound_ReturnsAgentId() {
        // Arrange
        Long hostId = 123L;
        String expectedAgentId = "agent-456";
        
        when(fleetHostRepository.findAgentIdByHostId(hostId))
            .thenReturn(Optional.of(expectedAgentId));

        // Act
        String result = hostAgentCacheService.getAgentId(hostId);

        // Assert
        assertEquals(expectedAgentId, result);
        verify(fleetHostRepository).findAgentIdByHostId(hostId);
    }

    @Test
    void testGetAgentId_WhenNotFound_ReturnsNull() {
        // Arrange
        Long hostId = 123L;
        when(fleetHostRepository.findAgentIdByHostId(hostId))
            .thenReturn(Optional.empty());

        // Act
        String result = hostAgentCacheService.getAgentId(hostId);

        // Assert
        assertNull(result);
        verify(fleetHostRepository).findAgentIdByHostId(hostId);
    }

    @Test
    void testGetAgentId_WithException_ReturnsNull() {
        // Arrange
        Long hostId = 123L;
        when(fleetHostRepository.findAgentIdByHostId(hostId))
            .thenThrow(new RuntimeException("Database error"));

        // Act
        String result = hostAgentCacheService.getAgentId(hostId);

        // Assert
        assertNull(result);
        verify(fleetHostRepository).findAgentIdByHostId(hostId);
    }
} 