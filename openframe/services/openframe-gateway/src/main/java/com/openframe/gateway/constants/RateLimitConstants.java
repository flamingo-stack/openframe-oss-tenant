package com.openframe.gateway.constants;

/**
 * Constants for rate limiting and simplified API key statistics
 */
public final class RateLimitConstants {

    private RateLimitConstants() {
        // Utility class - prevent instantiation
    }

    // Logging Messages - Rate Limiting
    public static final String LOG_RATE_LIMIT_CHECK = "Checking rate limits for API key: {}";
    public static final String LOG_RATE_LIMIT_STATUS = "Retrieving rate limit status for API key: {}";

}