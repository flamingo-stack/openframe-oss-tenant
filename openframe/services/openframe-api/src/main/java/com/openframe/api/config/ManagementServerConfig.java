package com.openframe.api.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementContextAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.annotation.Order;

@Configuration
@Order(1)
@Import({
    ManagementContextAutoConfiguration.class,
    ManagementEndpointsConfig.class
})
public class ManagementServerConfig {
    // Configuration is handled through application.yml in config server
} 