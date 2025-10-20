package com.openframe.management.service;

import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.document.toolagent.SessionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntegratedToolAgentUpdateProcessingService {

    private final ToolAgentUpdatePublisher toolAgentUpdatePublisher;

    public void process(
            IntegratedToolAgent existingToolAgentConfiguration,
            IntegratedToolAgent newToolAgentConfiguration
    ) {
        // Temporary allow update only specific fields
        processSessionTypeUpdate(existingToolAgentConfiguration, newToolAgentConfiguration);
    }

    private void processSessionTypeUpdate(
            IntegratedToolAgent existingToolAgentConfiguration,
            IntegratedToolAgent newToolAgentConfiguration
    ) {
        SessionType existingSessionType = existingToolAgentConfiguration.getSessionType();
        SessionType newSessionType = newToolAgentConfiguration.getSessionType();
        if (existingSessionType != newSessionType) {
            toolAgentUpdatePublisher.publish(newToolAgentConfiguration);
        }
    }

    // Temporary disable version update
    private void processVersionUpdate(
            IntegratedToolAgent existingToolAgentConfiguration,
            IntegratedToolAgent newToolAgentConfiguration
    ) {
        String toolAgentId = existingToolAgentConfiguration.getToolId();
        String existingVersion = existingToolAgentConfiguration.getVersion();
        String newVersion = newToolAgentConfiguration.getVersion();

        if (!existingVersion.equals(newVersion)) {
            log.info("Detected version update for {} from {} to {}", toolAgentId, existingVersion, newVersion);
            toolAgentUpdatePublisher.publish(newToolAgentConfiguration);
            log.info("Processed version update for {}", toolAgentId);
        }
    }

}
