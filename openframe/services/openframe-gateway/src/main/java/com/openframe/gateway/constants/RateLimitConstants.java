package com.openframe.gateway.constants;

import java.time.Duration;

/**
 * Constants for rate limiting functionality
 */
public final class RateLimitConstants {

    private RateLimitConstants() {
        // Utility class - prevent instantiation
    }

    // Default Limits
    public static final int DEFAULT_REQUESTS_PER_MINUTE = 100;
    public static final int DEFAULT_REQUESTS_PER_HOUR = 1000;
    public static final int DEFAULT_REQUESTS_PER_DAY = 10000;

    // Redis Configuration
    public static final String DEFAULT_KEY_PREFIX = "rate_limit:";
    public static final Duration DEFAULT_REDIS_TIMEOUT = Duration.ofSeconds(2);

    // Logging Messages
    public static final String LOG_RATE_LIMIT_EXCEEDED = "Rate limit exceeded for API key: {} in window: {}";
    public static final String LOG_REDIS_ERROR = "Redis error in rate limiting for key {}: {}";
    public static final String LOG_RATE_LIMIT_CHECK = "Checking rate limits for API key: {}";
    public static final String LOG_RATE_LIMIT_STATUS = "Retrieving rate limit status for API key: {}";
    public static final String LOG_RATE_LIMIT_RESET = "Resetting rate limits for API key: {}";
    public static final String LOG_RATE_LIMIT_DELETED = "Deleted {} rate limit keys for API key: {}";
}