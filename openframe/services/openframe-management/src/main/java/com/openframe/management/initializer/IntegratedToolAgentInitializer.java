package com.openframe.management.initializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.service.IntegratedToolAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class IntegratedToolAgentInitializer {

    private final ObjectMapper objectMapper;
    private final IntegratedToolAgentService integratedToolAgentService;

    private static final List<String> AGENT_CONFIGURATION_FILE_PATHS = Arrays.asList(
            "agent-configurations/fleetmdm-agent.json",
            "agent-configurations/tacticalrmm-agent.json", 
            "agent-configurations/meshcentral-agent.json"
    );

    @PostConstruct
    public void initializeToolAgents() {
        log.info("Initializing IntegratedToolAgent configurations from resources...");
        
        AGENT_CONFIGURATION_FILE_PATHS
                .forEach(this::processAgentConfiguration);
        
        log.info("IntegratedToolAgent configurations initialized successfully");
    }

    private void processAgentConfiguration(String agentConfigurationFilePath) {
        try {
            ClassPathResource resource = new ClassPathResource(agentConfigurationFilePath);
            IntegratedToolAgent agent = objectMapper.readValue(resource.getInputStream(), IntegratedToolAgent.class);
            
            integratedToolAgentService.findById(agent.getId())
                .ifPresentOrElse(
                    existingAgent -> processExistingAgent(existingAgent, agent, agentConfigurationFilePath),
                    () -> processNewAgent(agent, agentConfigurationFilePath)
                );
        } catch (Exception e) {
            log.error("Failed to load agent configuration from {}: {}", agentConfigurationFilePath, e.getMessage());
        }
    }

    private void processExistingAgent(IntegratedToolAgent existingAgent, IntegratedToolAgent newAgent, String filePath) {
        log.info("Agent configuration {} already exists, updating", newAgent.getId());
        integratedToolAgentService.save(newAgent);
        log.info("Updated agent configuration: {} from {}", newAgent.getId(), filePath);
    }

    private void processNewAgent(IntegratedToolAgent agent, String filePath) {
        log.info("Found no existing agent configuration for {}", agent.getId());
        integratedToolAgentService.save(agent);
        log.info("Created new agent configuration: {} from {}", agent.getId(), filePath);
    }

}
