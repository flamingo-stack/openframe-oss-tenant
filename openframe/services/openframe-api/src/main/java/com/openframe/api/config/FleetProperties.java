package com.openframe.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

@Data
@ConfigurationProperties(prefix = "fleet")
public class FleetProperties {
    private String baseUrl;
    private String apiKey;
} 