package com.openframe.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "integrations")
@Data
public class IntegrationProperties {
    private Integration fleet = new Integration();
    private Integration authentik = new Integration();

    @Data
    public static class Integration {
        private String baseUrl;
        private String apiKey;
        private boolean enabled = true;
    }
} 