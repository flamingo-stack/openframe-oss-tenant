package com.openframe.management.initializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.data.document.clientconfiguration.OpenFrameClientConfiguration;
import com.openframe.data.service.OpenFrameClientConfigurationService;
import com.openframe.management.service.OpenFrameClientUpdatePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpenFrameClientConfigurationInitializer {

    private static final String DEFAULT_ID = "default";
    private static final String CONFIG_FILE = "agent-configurations/client-configuration.json";

    private final ObjectMapper objectMapper;
    private final OpenFrameClientConfigurationService clientConfigurationService;
    private final OpenFrameClientUpdatePublisher clientUpdatePublisher;

    @PostConstruct
    public void init() throws IOException {
        log.info("Initializing OpenFrame client configuration");
        ClassPathResource resource = new ClassPathResource(CONFIG_FILE);
        OpenFrameClientConfiguration newConfiguration = objectMapper.readValue(resource.getInputStream(), OpenFrameClientConfiguration.class);
        
        clientConfigurationService.findById(DEFAULT_ID)
            .ifPresentOrElse(
                existingConfiguration ->
                        processExistingConfiguration(existingConfiguration, newConfiguration),
                    () -> processNewConfiguration(newConfiguration)
            );

        log.info("Initialized OpenFrame client configuration");
    }

    private void processExistingConfiguration(
            OpenFrameClientConfiguration existingConfiguration,
            OpenFrameClientConfiguration newConfiguration
    ) {
        log.info("Default OpenFrame client configuration already exists");
        clientConfigurationService.save(newConfiguration);
        log.info("Updated existing OpenFrame client configuration");

        processVersionUpdate(existingConfiguration, newConfiguration);
    }

    private void processVersionUpdate(
            OpenFrameClientConfiguration existingConfiguration,
            OpenFrameClientConfiguration newConfiguration
    ) {
        String existingVersion = existingConfiguration.getVersion();
        String newVersion = newConfiguration.getVersion();
        if (!existingVersion.equals(newVersion)) {
            log.info("Detected version update from {} to {}", existingVersion, newVersion);
            clientUpdatePublisher.publish(newVersion);
            log.info("Processed version update");
        }
    }

    private void processNewConfiguration(OpenFrameClientConfiguration newConfiguration) {
        log.info("Found no existing openframe client configuration");
        clientConfigurationService.save(newConfiguration);
        log.info("Updated save new OpenFrame client configuration");
    }
}
