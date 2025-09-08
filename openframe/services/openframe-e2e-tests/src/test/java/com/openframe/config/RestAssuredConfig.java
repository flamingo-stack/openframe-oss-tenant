package com.openframe.config;

import io.qameta.allure.restassured.AllureRestAssured;
import io.restassured.RestAssured;
import io.restassured.config.SSLConfig;
import io.restassured.config.HttpClientConfig;
import lombok.extern.slf4j.Slf4j;

import static com.openframe.support.constants.TestConstants.*;

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
        
        RestAssured.filters(new AllureRestAssured());

        RestAssured.config = RestAssured.config()
                .sslConfig(SSLConfig.sslConfig().relaxedHTTPSValidation())
                .httpClient(HttpClientConfig.httpClientConfig()
                        .setParam("http.connection.timeout", (int) DEFAULT_TIMEOUT.toMillis())
                        .setParam("http.socket.timeout", (int) DEFAULT_TIMEOUT.toMillis()));
    }
    
    private static String getBaseUrl() {
        return System.getProperty("api.base.url", DEFAULT_BASE_URL);
    }
}