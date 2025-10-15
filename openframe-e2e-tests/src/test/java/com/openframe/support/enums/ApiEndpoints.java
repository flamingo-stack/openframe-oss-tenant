package com.openframe.support.enums;

import lombok.Getter;

@Getter
public enum ApiEndpoints {
    REGISTRATION_ENDPOINT("sas/oauth/register"),
    OAUTH_LOGIN("oauth/login"),
    OAUTH2_AUTHORIZE("sas/{tenantId}/oauth2/authorize"),
    SAS_LOGIN("sas/login"),
    OAUTH_CALLBACK("oauth/callback"),
    API_ME("api/me"),
    REDIRECT_TO_DASHBOARD("dashboard");

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