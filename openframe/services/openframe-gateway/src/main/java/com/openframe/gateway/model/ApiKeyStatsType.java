package com.openframe.gateway.model;

/**
 * Enumeration of API key statistics types
 */
public enum ApiKeyStatsType {
    TOTAL_REQUESTS("totalRequests"),
    SUCCESSFUL_REQUESTS("successfulRequests"), 
    FAILED_REQUESTS("failedRequests");
    
    private final String fieldName;
    
    ApiKeyStatsType(String fieldName) {
        this.fieldName = fieldName;
    }
    
    /**
     * Get MongoDB field name for this stat type
     */
    public String getFieldName() {
        return fieldName;
    }
    
    /**
     * Get Redis hash key for this stat type
     */
    public String getRedisKey() {
        return name().toLowerCase();
    }
} 