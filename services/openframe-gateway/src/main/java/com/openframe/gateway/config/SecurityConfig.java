package com.openframe.gateway.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementServerProperties;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;

import com.openframe.security.config.BaseReactiveSecurityConfig;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig extends BaseReactiveSecurityConfig {

    public SecurityConfig(
            ManagementServerProperties managementProperties,
            ServerProperties serverProperties) {
        super(managementProperties, serverProperties);
    }
}
