package com.openframe.management.initializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.document.toolagent.IntegratedToolAgent;
import com.openframe.data.service.IntegratedToolAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.time.LocalDateTime;
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
        
        for (String agentConfigurationFilePath : AGENT_CONFIGURATION_FILE_PATHS) {
            try {
                saveToolAgent(agentConfigurationFilePath);
            } catch (Exception e) {
                log.error("Failed to load agent configuration from {}: {}", agentConfigurationFilePath, e.getMessage());
            }
        }
        
        log.info("IntegratedToolAgent configurations initialized successfully");
    }

    private void saveToolAgent(String agentConfigurationFilePath) throws IOException {
        ClassPathResource resource = new ClassPathResource(agentConfigurationFilePath);
        IntegratedToolAgent agent = objectMapper.readValue(resource.getInputStream(), IntegratedToolAgent.class);
        integratedToolAgentService.save(agent);
        log.info("Saved agent configuration: {} from {}", agent.getId(), agentConfigurationFilePath);
    }

}
