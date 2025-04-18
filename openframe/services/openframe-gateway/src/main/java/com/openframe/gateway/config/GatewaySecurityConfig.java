package com.openframe.gateway.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementServerProperties;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.context.annotation.Configuration;

import com.openframe.security.config.BaseReactiveSecurityConfig;
import com.openframe.security.jwt.ReactiveJwtAuthenticationFilter;

@Configuration
public class GatewaySecurityConfig extends BaseReactiveSecurityConfig {

    public GatewaySecurityConfig(
            ManagementServerProperties managementProperties, 
            ServerProperties serverProperties,
            ReactiveJwtAuthenticationFilter jwtAuthFilter) {
        super(managementProperties, serverProperties, jwtAuthFilter);
    }
} 