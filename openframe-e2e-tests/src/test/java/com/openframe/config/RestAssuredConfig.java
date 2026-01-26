package com.openframe.config;

import io.restassured.RestAssured;
import io.restassured.config.HttpClientConfig;
import io.restassured.config.LogConfig;
import io.restassured.config.SSLConfig;

import java.time.Duration;

import static com.openframe.config.ApiConfig.getBaseUrl;

/**
 * REST Assured configuration
 */
public class RestAssuredConfig {

    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(60);

    public static void configure() {
        RestAssured.baseURI = getBaseUrl();
        RestAssured.config = RestAssured.config()
                .logConfig(LogConfig.logConfig().enableLoggingOfRequestAndResponseIfValidationFails())
                .sslConfig(SSLConfig.sslConfig().relaxedHTTPSValidation())
                .httpClient(HttpClientConfig.httpClientConfig()
                        .setParam("http.connection.timeout", (int) DEFAULT_TIMEOUT.toMillis())
                        .setParam("http.socket.timeout", (int) DEFAULT_TIMEOUT.toMillis()));
    }
}