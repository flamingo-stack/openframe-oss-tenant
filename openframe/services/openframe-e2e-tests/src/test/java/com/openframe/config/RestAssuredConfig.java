package com.openframe.config;

import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.RestAssured;

import java.time.Duration;

/**
 * REST Assured configuration
 */
public class RestAssuredConfig {
    
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(30);
    private static final String DEFAULT_BASE_URL = "http://localhost:8100";
    
    public static void configure() {
        RestAssured.baseURI = getBaseUrl();
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails();
        
        RestAssured.filters(new AllureRestAssured());
        
        RestAssured.config = RestAssured.config()
                .httpClient(RestAssured.config().getHttpClientConfig()
                        .setParam("http.connection.timeout", (int) DEFAULT_TIMEOUT.toMillis())
                        .setParam("http.socket.timeout", (int) DEFAULT_TIMEOUT.toMillis()));
    }
    
    private static String getBaseUrl() {
        return System.getProperty("api.base.url", DEFAULT_BASE_URL);
    }
} 