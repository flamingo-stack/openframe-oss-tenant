package com.openframe.gateway.model;

import lombok.Builder;

/**
 * Rate limit status information for an API key
 */
@Builder
public record RateLimitStatus(String keyId, int minuteRequests, int minuteLimit, int hourRequests, int hourLimit,
                              int dayRequests, int dayLimit, boolean isMinuteExceeded, boolean isHourExceeded,
                              boolean isDayExceeded) {
} 