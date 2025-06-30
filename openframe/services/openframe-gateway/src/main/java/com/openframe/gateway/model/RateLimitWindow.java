package com.openframe.gateway.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.time.Duration;

/**
 * Enumeration of rate limiting time windows
 */
@Getter
@RequiredArgsConstructor
public enum RateLimitWindow {
    MINUTE("minute", Duration.ofMinutes(1)),
    HOUR("hour", Duration.ofHours(1)),
    DAY("day", Duration.ofDays(1));
    
    private final String keyName;
    private final Duration duration;
    
    /**
     * Get Redis key suffix for this time window
     */
    public String getKeySuffix() {
        return keyName;
    }
    
    /**
     * Get duration in seconds for Redis TTL
     */
    public long getDurationSeconds() {
        return duration.getSeconds();
    }
} 