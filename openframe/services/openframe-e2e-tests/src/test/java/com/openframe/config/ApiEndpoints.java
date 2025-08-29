package com.openframe.config;

public enum ApiEndpoints {
    GET_ALL_PLAYERS("/player/get/all"),
    CREATE_PLAYER("/player/create/{editor}"),
    GET_PLAYER_BY_ID("/player/{playerId}"),
    UPDATE_PLAYER("/player/update/{editor}/{id}"),
    DELETE_PLAYER("/player/delete/{editor}");

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
            resultPath = resultPath.replaceFirst("\\{[^}]+\\}", String.valueOf(param));
        }
        return resultPath;
    }
    
    public String getFullUrlWithParams(String baseUrl, Object... pathParams) {
        return baseUrl + getPathWithParams(pathParams);
    }
} 