package com.openframe.gateway.security.cors;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Slf4j
@Configuration
@ConditionalOnProperty(
        name = "openframe.gateway.disable-cors",
        havingValue = "false",
        matchIfMissing = true
)
public class CorsConfig {
    @Bean
    @ConfigurationProperties(prefix = "spring.cloud.gateway.globalcors.cors-configurations.[/**]")
    public CorsConfiguration corsConfiguration() {
        return new CorsConfiguration();
    }

    @Bean
    public CorsWebFilter corsWebFilter(CorsConfiguration corsConfiguration) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return new CorsWebFilter(source);
    }
}
