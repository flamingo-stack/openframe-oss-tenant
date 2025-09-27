package com.openframe.management.initializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.management.document.OpenFrameClientConfiguration;
import com.openframe.management.service.OpenFrameClientConfigurationService;
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

    private final ObjectMapper objectMapper;
    private final OpenFrameClientConfigurationService service;

    private static final String CONFIG_FILE = "client-configuration.json";

    @PostConstruct
    public void init() throws IOException {
        if (service.findById("default").isPresent()) {
            log.debug("Default OpenFrame client configuration already exists");
            return;
        }
        ClassPathResource res = new ClassPathResource(CONFIG_FILE);
        OpenFrameClientConfiguration cfg = objectMapper.readValue(res.getInputStream(), OpenFrameClientConfiguration.class);
        service.save(cfg);
        log.info("Saved default OpenFrame client configuration");
    }
}
