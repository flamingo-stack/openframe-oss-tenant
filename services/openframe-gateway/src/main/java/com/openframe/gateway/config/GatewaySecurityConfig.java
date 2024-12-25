package com.openframe.gateway.config;

import org.springframework.boot.actuate.autoconfigure.web.server.ManagementServerProperties;
import org.springframework.boot.autoconfigure.web.ServerProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import com.openframe.security.config.BaseReactiveSecurityConfig;

@Configuration
@EnableWebFluxSecurity
public class GatewaySecurityConfig extends BaseReactiveSecurityConfig {

    public GatewaySecurityConfig(ManagementServerProperties managementProperties, ServerProperties serverProperties) {
        super(managementProperties, serverProperties);
    }

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        corsConfig.addAllowedOrigin("http://localhost:5174"); // UI development server
        corsConfig.addAllowedMethod("GET");
        corsConfig.addAllowedMethod("POST");
        corsConfig.addAllowedMethod("PUT");
        corsConfig.addAllowedMethod("PATCH");
        corsConfig.addAllowedMethod("DELETE");
        corsConfig.addAllowedHeader("*");
        corsConfig.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
} 