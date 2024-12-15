package com.openframe.api.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan(basePackages = {
    "com.openframe.api.controller.management"
})
public class ManagementEndpointsConfig {
    // Configuration for management endpoints
} 