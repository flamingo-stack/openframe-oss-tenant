package com.openframe.support.enums;

import lombok.Getter;

@Getter
public enum ApiEndpoints {
    REGISTRATION_ENDPOINT("/sas/oauth/register"),
    TENANT_DISCOVER_ENDPOINT("/sas/oauth/tenant-discover");

    private final String path;
    
    ApiEndpoints(String path) {
        this.path = path;
    }

    public String getPathWithParams(Object... pathParams) {
        String resultPath = path;
        for (Object param : pathParams) {
            resultPath = resultPath.replaceFirst("\\{[^}]+}", String.valueOf(param));
        }
        return resultPath;
    }
}