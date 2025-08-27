package com.openframe.gateway.config.prop;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for rate limiting
 * 
 * All properties are configurable via application.yml:
 * openframe.rate-limit.fail-open: true
 * openframe.rate-limit.log-violations: true  
 * openframe.rate-limit.include-headers: true
 * 
 * See application-example.yml for complete configuration examples
 */
@Data
@Component
@ConfigurationProperties(prefix = "openframe.rate-limit")
public class RateLimitProperties {
    
    /**
     * Default requests per minute limit
     */
    private int defaultRequestsPerMinute;
    
    /**
     * Default requests per hour limit
     */
    private int defaultRequestsPerHour;
    
    /**
     * Default requests per day limit
     */
    private int defaultRequestsPerDay;
    
    /**
     * Whether to fail open (allow requests) when Redis is unavailable
     */
    private boolean failOpen;
    
    /**
     * Whether rate limiting is enabled globally
     */
    private boolean enabled;
    
    /**
     * Whether to log rate limit violations
     */
    private boolean logViolations;
    
    /**
     * Whether to include detailed rate limit headers in response
     */
    private boolean includeHeaders;
} 