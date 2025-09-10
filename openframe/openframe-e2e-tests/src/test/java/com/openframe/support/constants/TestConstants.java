package com.openframe.support.constants;

import java.time.Duration;

public final class TestConstants {
    public static final String DEFAULT_BASE_URL = "https://localhost";
    public static final String CONTENT_TYPE_JSON = "application/json";
    public static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    public static final int HTTP_OK = 200;
    public static final int HTTP_CREATED = 201;
    public static final int HTTP_NO_CONTENT = 204;
    public static final int HTTP_BAD_REQUEST = 400;
    public static final int HTTP_UNAUTHORIZED = 401;
    public static final int HTTP_FORBIDDEN = 403;
    public static final int HTTP_NOT_FOUND = 404;
    public static final int HTTP_CONFLICT = 409;
    public static final int HTTP_INTERNAL_SERVER_ERROR = 500;
} 