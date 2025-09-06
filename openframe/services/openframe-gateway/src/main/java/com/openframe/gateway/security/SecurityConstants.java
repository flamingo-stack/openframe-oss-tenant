package com.openframe.gateway.security;

/**
 * Security-related constants for the Gateway.
 */
public final class SecurityConstants {

    private SecurityConstants() {
        // Utility class
    }

    /**
     * Query parameter name for authorization token
     */
    public static final String AUTHORIZATION_QUERY_PARAM = "authorization";

    /**
     * Authorization header
     */
    public static final String AUTHORIZATION_HEADER = "Authorization";

    /**
     * Development-only headers for propagating tokens back to localhost clients
     */
    public static final String ACCESS_TOKEN = "access_token";
    public static final String REFRESH_TOKEN = "refresh_token";
    public static final String ACCESS_TOKEN_HEADER = "Access-Token";
    public static final String REFRESH_TOKEN_HEADER = "Refresh-Token";

    /**
     * Path prefixes for different types of endpoints
     */
    public static final String CLIENTS_PREFIX = "/clients";
    public static final String DASHBOARD_PREFIX = "/api";
    public static final String TOOLS_PREFIX = "/tools";
    public static final String WS_TOOLS_PREFIX = "/ws/tools";
} 