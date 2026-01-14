package com.openframe.support.constants;

import java.time.Duration;

public final class TestConstants {
    
    public static final String DEFAULT_BASE_URL = "https://localhost/";
    public static final String CONTENT_TYPE_JSON = "application/json";
    public static final String CLIENT_ID = "openframe-gateway";
    public static final String TENANT_DOMAIN_NAME = "localhost";
    public static final String CORRECT_PASSWORD = "Password123!";

    public static final String API_SERVICE_URL = "http://openframe-api.microservices.svc.cluster.local:8090";
    public static final String CLIENT_SERVICE_URL = "http://openframe-client.microservices.svc.cluster.local:8097";
    public static final String GATEWAY_URL = "http://openframe-gateway.microservices.svc.cluster.local:8100";

    public static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(60);
    public static final Duration EVENTUAL_CONSISTENCY = Duration.ofSeconds(30);
    public static final Duration PIPELINE_TIMEOUT = Duration.ofSeconds(60);
    public static final Duration PINOT_INDEXING_TIMEOUT = Duration.ofSeconds(45);
    public static final Duration MONGODB_TIMEOUT = Duration.ofSeconds(10);

    public static final int AUTHORIZATION_CODE_LOG_LENGTH = 20;
    public static final int CONCURRENT_AGENTS_COUNT = 5;

    public static final int HTTP_OK = 200;
    public static final int HTTP_CREATED = 201;
    public static final int HTTP_NO_CONTENT = 204;
    public static final int HTTP_MOVED_TEMP = 302;
    public static final int HTTP_BAD_REQUEST = 400;
    public static final int HTTP_UNAUTHORIZED = 401;
    public static final int HTTP_FORBIDDEN = 403;
    public static final int HTTP_NOT_FOUND = 404;
    public static final int HTTP_CONFLICT = 409;
    public static final int HTTP_INTERNAL_SERVER_ERROR = 500;

    public static final String USER_FILE = "user.json";
} 