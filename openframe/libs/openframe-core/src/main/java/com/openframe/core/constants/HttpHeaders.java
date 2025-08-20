package com.openframe.core.constants;

/**
 * HTTP header constants used throughout the OpenFrame application.
 * This class centralizes all header name definitions to avoid hardcoded strings.
 */
public final class HttpHeaders {

    private HttpHeaders() {
    }

    // Authentication headers
    public static final String X_API_KEY = "X-API-Key";
    public static final String X_USER_ID = "X-User-Id";
    public static final String X_API_KEY_ID = "X-API-Key-Id";
    public static final String X_REFRESH_TOKEN = "X-Refresh-Token";
    
    // User context headers
    public static final String X_USER_EMAIL = "X-User-Email";
    public static final String X_USER_FIRST_NAME = "X-User-FirstName";
    public static final String X_USER_LAST_NAME = "X-User-LastName";

    // Client context headers
    public static final String X_CLIENT_ID = "X-Client-Id";
    public static final String X_CLIENT_SCOPES = "X-Client-Scopes";

    // Standard HTTP headers
    public static final String AUTHORIZATION = "Authorization";
    public static final String CONTENT_TYPE = "Content-Type";
    public static final String ACCEPT = "Accept";
    public static final String ACCEPT_CHARSET = "Accept-Charset";
    public static final String ACCEPT_LANGUAGE = "Accept-Language";

    // Custom rate limiting headers
    public static final String X_RATE_LIMIT_LIMIT_MINUTE = "X-RateLimit-Limit-Minute";
    public static final String X_RATE_LIMIT_REMAINING_MINUTE = "X-RateLimit-Remaining-Minute";
    public static final String X_RATE_LIMIT_LIMIT_HOUR = "X-RateLimit-Limit-Hour";
    public static final String X_RATE_LIMIT_REMAINING_HOUR = "X-RateLimit-Remaining-Hour";
    public static final String X_RATE_LIMIT_LIMIT_DAY = "X-RateLimit-Limit-Day";
    public static final String X_RATE_LIMIT_REMAINING_DAY = "X-RateLimit-Remaining-Day";
    
    // Media type constants
    public static final String APPLICATION_JSON = "application/json";

    public static final String X_FORWARDED_PROTO= "X-Forwarded-Proto";
    public static final String X_FORWARDED_HOST = "X-Forwarded-Host";
    public static final String X_FORWARDED_PORT = "X-Forwarded-Port";
} 