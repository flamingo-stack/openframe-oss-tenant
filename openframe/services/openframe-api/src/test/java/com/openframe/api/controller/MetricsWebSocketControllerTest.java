package com.openframe.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.openframe.api.dto.metrics.MetricsMessage;

@ExtendWith(MockitoExtension.class)
class MetricsWebSocketControllerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private MetricsWebSocketController controller;

    @Test
    void whenReceivingMetrics_ShouldBroadcastToTopic() {
        // Arrange
        MetricsMessage metrics = new MetricsMessage();
        metrics.setMachineId("test_machine");
        metrics.setCpu(75.5);
        metrics.setMemory(82.3);

        // Act
        MetricsMessage result = controller.handleMetrics(metrics);

        // Assert
        verify(messagingTemplate).convertAndSend("/topic/metrics", metrics);
        assertThat(result).isEqualTo(metrics);
    }
} 