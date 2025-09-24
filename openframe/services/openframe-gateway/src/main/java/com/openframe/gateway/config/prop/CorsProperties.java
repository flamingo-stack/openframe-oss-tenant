package com.openframe.gateway.config.prop;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Configuration properties for CORS settings used by the gateway.
 * <p>
 * Properties prefix: openframe.gateway.cors
 * <p>
 * Example (application.yml):
 * openframe:
 * gateway:
 * cors:
 * allowed-origin-patterns: ${CORS_ALLOWED_ORIGIN_PATTERNS:http://localhost,https://localhost}
 * allowed-headers: ["*"]
 * allowed-methods: ["*"]
 * exposed-headers: ["Authorization", "Content-Type", "access_token", "refresh_token"]
 * allow-credentials: true
 * max-age: 3600
 */
@Data
@Component
@ConfigurationProperties(prefix = "openframe.gateway.cors")
public class CorsProperties {

    /**
     * Exact origins list. Use this OR allowedOriginPatterns.
     */
    private List<String> allowedOrigins;

    /**
     * Origin patterns list, e.g. https://*.example.com
     */
    private List<String> allowedOriginPatterns;

    /**
     * Allowed headers. Default: *
     */
    private List<String> allowedHeaders;

    /**
     * Allowed methods. Default: *
     */
    private List<String> allowedMethods;

    /**
     * Exposed headers.
     */
    private List<String> exposedHeaders;

    /**
     * Whether to allow credentials.
     */
    private Boolean allowCredentials;

    /**
     * Max age for preflight cache in seconds.
     */
    private Long maxAge = 3600L;
}


