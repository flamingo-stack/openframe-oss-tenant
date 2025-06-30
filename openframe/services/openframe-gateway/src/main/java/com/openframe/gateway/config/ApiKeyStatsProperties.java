package com.openframe.gateway.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Configuration properties for API Key Statistics service
 */
@Data
@Component
@ConfigurationProperties(prefix = "openframe.api-key-stats")
public class ApiKeyStatsProperties {
    
    /**
     * Sync interval for batch synchronization from Redis to MongoDB (milliseconds)
     * Default: 300000 (5 minutes)
     */
    private long syncInterval = 300000L;
    
    /**
     * TTL for Redis keys (seconds)
     * Default: 604800 (7 days)
     */
    private long redisTtl = 604800L;
    
    /**
     * Whether to enable API key statistics collection
     * Default: true
     */
    private boolean enabled = true;
    
    /**
     * Timeout for Redis operations
     * Default: 2 seconds
     */
    private Duration redisTimeout = Duration.ofSeconds(2);
    
    /**
     * Get Redis TTL as Duration
     * @return Duration object
     */
    public Duration getRedisTtlDuration() {
        return Duration.ofSeconds(redisTtl);
    }
} 