package com.openframe.support.enums;

public enum ApiEndpoints {
    REGISTRATION_ENDPOINT("/sas/oauth/register"),
    TENANT_DISCOVER_ENDPOINT("/sas/tenant/discover");

    private final String path;
    
    ApiEndpoints(String path) {
        this.path = path;
    }
    
    public String getPath() {
        return path;
    }
    
    public String getFullUrl(String baseUrl) {
        return baseUrl + path;
    }
    
    public String getPathWithParams(Object... pathParams) {
        String resultPath = path;
        for (Object param : pathParams) {
            resultPath = resultPath.replaceFirst("\\{[^}]+}", String.valueOf(param));
        }
        return resultPath;
    }
    
    public String getFullUrlWithParams(String baseUrl, Object... pathParams) {
        return baseUrl + getPathWithParams(pathParams);
    }
} 