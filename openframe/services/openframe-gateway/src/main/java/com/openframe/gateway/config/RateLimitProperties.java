package com.openframe.gateway.config;

import com.openframe.gateway.constants.RateLimitConstants;
import com.openframe.gateway.model.RateLimitWindow;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

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
    private int defaultRequestsPerMinute = RateLimitConstants.DEFAULT_REQUESTS_PER_MINUTE;
    
    /**
     * Default requests per hour limit
     */
    private int defaultRequestsPerHour = RateLimitConstants.DEFAULT_REQUESTS_PER_HOUR;
    
    /**
     * Default requests per day limit
     */
    private int defaultRequestsPerDay = RateLimitConstants.DEFAULT_REQUESTS_PER_DAY;
    
    /**
     * Redis key prefix for rate limiting
     */
    private String keyPrefix = RateLimitConstants.DEFAULT_KEY_PREFIX;
    
    /**
     * Whether to fail open (allow requests) when Redis is unavailable
     */
    private boolean failOpen = true;
    
    /**
     * Redis operation timeout
     */
    private Duration redisTimeout = RateLimitConstants.DEFAULT_REDIS_TIMEOUT;
    
    /**
     * Whether rate limiting is enabled globally
     */
    private boolean enabled = true;
    
    /**
     * Whether to log rate limit violations
     */
    private boolean logViolations = true;
    
    /**
     * Whether to include detailed rate limit headers in response
     */
    private boolean includeHeaders = true;
    
    /**
     * Get limit for specific time window
     */
    public int getLimitForWindow(RateLimitWindow window) {
        return switch (window) {
            case MINUTE -> defaultRequestsPerMinute;
            case HOUR -> defaultRequestsPerHour;
            case DAY -> defaultRequestsPerDay;
        };
    }
} 