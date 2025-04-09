package com.openframe.api.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementServerProperties;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;

import com.openframe.security.config.BaseSecurityConfig;
import com.openframe.security.jwt.JwtAuthenticationFilter;

@Configuration
public class SecurityConfig extends BaseSecurityConfig {

    public SecurityConfig(
            ManagementServerProperties managementProperties,
            ServerProperties serverProperties,
            JwtAuthenticationFilter jwtAuthFilter,
            AuthenticationProvider authenticationProvider) {
        super(managementProperties, serverProperties, jwtAuthFilter, authenticationProvider);
    }
}
