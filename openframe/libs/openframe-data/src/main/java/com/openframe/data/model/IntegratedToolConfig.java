package com.openframe.data.model;

import lombok.Data;

@Data
public class IntegratedToolConfig {
    private String apiVersion;
    private String basePath;
    private String healthCheckEndpoint;
    private Integer healthCheckInterval;
    private Integer connectionTimeout;
    private Integer readTimeout;
    private String[] allowedEndpoints;
    private String[] requiredScopes;
    private TokenConfig tokenConfig;
} 