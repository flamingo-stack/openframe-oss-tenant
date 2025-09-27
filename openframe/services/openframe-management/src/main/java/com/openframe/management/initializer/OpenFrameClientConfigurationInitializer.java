package com.openframe.management.initializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.management.a_tomove.OpenFrameClientConfiguration;
import com.openframe.management.a_tomove.OpenFrameClientConfigurationService;
import com.openframe.management.service.OpenFrameClientUpdatePublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OpenFrameClientConfigurationInitializer {

    private final ObjectMapper objectMapper;
    private final OpenFrameClientConfigurationService clientConfigurationService;
    private final OpenFrameClientUpdatePublisher clientUpdatePublisher;

    private static final String CONFIG_FILE = "client-configuration.json";

    @PostConstruct
    public void init() throws IOException {
        Optional<OpenFrameClientConfiguration> existingConfiguration = clientConfigurationService.findById("default");
        if (existingConfiguration.isPresent()) {
            log.info("Default OpenFrame client configuration already exists");
            ClassPathResource resource = new ClassPathResource(CONFIG_FILE);
            OpenFrameClientConfiguration newConfiguration = objectMapper.readValue(resource.getInputStream(), OpenFrameClientConfiguration.class);
            clientConfigurationService.save(newConfiguration);
            log.info("Update existing OpenFrame client configuration");

            String existingVersion = existingConfiguration.get().getVersion();
            String newVersion = newConfiguration.getVersion();
            if (!existingVersion.equals(newVersion)) {
                log.info("Detected version update from {} to {}", existingVersion, newVersion);
                clientUpdatePublisher.publish(newVersion);
            }
        } else {
            ClassPathResource resource = new ClassPathResource(CONFIG_FILE);
            OpenFrameClientConfiguration newConfiguration = objectMapper.readValue(resource.getInputStream(), OpenFrameClientConfiguration.class);
            clientConfigurationService.save(newConfiguration);
            log.info("Saved new OpenFrame client configuration");
        }
    }
}
