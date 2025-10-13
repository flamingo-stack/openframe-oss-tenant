package com.openframe.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    @Bean
    @ConfigurationProperties(prefix = "spring.cloud.gateway.globalcors.cors-configurations.[/**]")
    public CorsConfiguration corsConfiguration() {
        return new CorsConfiguration();
    }

    @Bean
    public CorsWebFilter corsWebFilterForOAuth(CorsConfiguration corsConfiguration) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/oauth/**", corsConfiguration);
        return new CorsWebFilter(source);
    }
}
