package com.openframe.gateway.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * Rate limit status information for an API key
 */
@Getter
@Builder
@AllArgsConstructor
public class RateLimitStatus {
    private final String keyId;
    private final int minuteRequests;
    private final int minuteLimit;
    private final int hourRequests;
    private final int hourLimit;
    private final boolean isMinuteExceeded;
    private final boolean isHourExceeded;
    
    /**
     * Check if any rate limit is exceeded
     */
    public boolean isAnyLimitExceeded() {
        return isMinuteExceeded || isHourExceeded;
    }
    
    /**
     * Get remaining requests for minute window
     */
    public int getRemainingMinuteRequests() {
        return Math.max(0, minuteLimit - minuteRequests);
    }
    
    /**
     * Get remaining requests for hour window
     */
    public int getRemainingHourRequests() {
        return Math.max(0, hourLimit - hourRequests);
    }
    
    /**
     * Get usage percentage for minute window
     */
    public double getMinuteUsagePercentage() {
        return minuteLimit > 0 ? (double) minuteRequests / minuteLimit * 100 : 0;
    }
    
    /**
     * Get usage percentage for hour window
     */
    public double getHourUsagePercentage() {
        return hourLimit > 0 ? (double) hourRequests / hourLimit * 100 : 0;
    }
} 