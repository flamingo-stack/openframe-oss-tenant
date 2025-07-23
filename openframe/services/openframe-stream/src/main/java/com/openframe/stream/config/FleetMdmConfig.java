package com.openframe.stream.config;

import com.openframe.sdk.fleetmdm.FleetMdmClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for Fleet MDM SDK client
 */
@Configuration
@Slf4j
public class FleetMdmConfig {

    @Bean
    public FleetMdmClient fleetMdmClient(
            @Value("${fleet.mdm.base-url:http://fleetmdm-server.integrated-tools.svc.cluster.local:8070}") String baseUrl,
            @Value("${fleet.mdm.api-token:uc5faaujir7ASVzInk1iwE7g/H4EyEm9yPUrNmi+gISjmSk/tqiX+S9foWOAPMnTXqXjpSJWNjqQDV8E+ef6Gw==}") String apiToken) {
        log.info("Creating Fleet MDM client with base URL: {}", baseUrl);
        return new FleetMdmClient(baseUrl, apiToken);
    }
} 