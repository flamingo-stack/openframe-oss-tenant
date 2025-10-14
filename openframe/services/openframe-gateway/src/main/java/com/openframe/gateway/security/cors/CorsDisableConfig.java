package com.openframe.gateway.security.cors;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

/**
 * Configuration to disable CORS restrictions for SaaS Gateway.
 * <p>
 * When enabled (openframe.gateway.disable-cors=true), this creates a permissive
 * CORS filter that allows all origins with credentials support.
 * </p>
 * <p>
 * This is safe for SaaS deployment where frontend and backend are on the same domain,
 * but should NOT be used for OSS deployment where different origins need proper CORS.
 * </p>
 */
@Slf4j
@Configuration
@ConditionalOnProperty(
        name = "openframe.gateway.disable-cors",
        havingValue = "true"
)
public class CorsDisableConfig {

  @Bean
  @Primary
  public CorsWebFilter disabledCorsWebFilter() {
    log.info("CORS restrictions disabled - allowing all origins with credentials");
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

    CorsConfiguration config = new CorsConfiguration();
    config.setAllowCredentials(true);
    config.addAllowedOriginPattern("*");
    config.addAllowedMethod("*");
    config.addAllowedHeader("*");
    config.setMaxAge(3600L);

    source.registerCorsConfiguration("/**", config);

    return new CorsWebFilter(source);
  }
}
