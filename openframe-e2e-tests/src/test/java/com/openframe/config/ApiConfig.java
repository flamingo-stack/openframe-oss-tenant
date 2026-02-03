package com.openframe.config;

import lombok.extern.slf4j.Slf4j;


@Slf4j
public class ApiConfig {

    public static final String DEFAULT_BASE_URL = "https://localhost/";
    public static final String GRAPHQL = "api/graphql";

    private static String baseUrl;

    public static String getBaseUrl() {
        if (baseUrl == null) {
            String cmdVar = System.getProperty("api.base.url");
            String envVar = System.getenv("API_BASE_URL");
            if (cmdVar != null && !cmdVar.trim().isEmpty()) {
                baseUrl = cmdVar.endsWith("/") ? cmdVar : cmdVar.concat("/");
            } else if (envVar != null && !envVar.trim().isEmpty()) {
                baseUrl = envVar.endsWith("/") ? envVar : envVar.concat("/");
            } else {
                baseUrl = DEFAULT_BASE_URL;
            }
            log.debug("BASE_URL: {}", baseUrl);
        }
        return baseUrl;
    }

}
