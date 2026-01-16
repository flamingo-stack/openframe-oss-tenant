package com.openframe.config;

import io.restassured.RestAssured;
import io.restassured.config.HttpClientConfig;
import io.restassured.config.SSLConfig;
import lombok.extern.slf4j.Slf4j;

import static com.openframe.support.constants.TestConstants.DEFAULT_BASE_URL;
import static com.openframe.support.constants.TestConstants.DEFAULT_TIMEOUT;

/**
 * REST Assured configuration
 */
@Slf4j
public class RestAssuredConfig {

    public static void configure() {
        String baseUrl = getBaseUrl();
        log.info("Configuring REST Assured with base URL: {}", baseUrl);

        RestAssured.baseURI = baseUrl;
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();

        RestAssured.config = RestAssured.config()
                .sslConfig(SSLConfig.sslConfig().relaxedHTTPSValidation())
                .httpClient(HttpClientConfig.httpClientConfig()
                        .setParam("http.connection.timeout", (int) DEFAULT_TIMEOUT.toMillis())
                        .setParam("http.socket.timeout", (int) DEFAULT_TIMEOUT.toMillis()));
    }

    private static String getBaseUrl() {
        // 1. Command line args (highest priority)
        String baseUrl = System.getProperty("api.base.url");
        if (baseUrl != null && !baseUrl.trim().isEmpty()) {
            log.info("Using base URL from command line: {}", baseUrl);
            return baseUrl;
        }

        // 2. Environment variables
        baseUrl = System.getenv("API_BASE_URL");
        if (baseUrl != null && !baseUrl.trim().isEmpty()) {
            log.info("Using base URL from environment: {}", baseUrl);
            return baseUrl;
        }

        // 3. Default value (lowest priority)
        log.info("Using default base URL: {}", DEFAULT_BASE_URL);
        return DEFAULT_BASE_URL;
    }
}