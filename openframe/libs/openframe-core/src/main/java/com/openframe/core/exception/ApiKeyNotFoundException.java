package com.openframe.core.exception;

/**
 * Exception thrown when an API key is not found
 */
public class ApiKeyNotFoundException extends RuntimeException {
    
    public ApiKeyNotFoundException(String keyId) {
        super("API key not found: " + keyId);
    }
    
    public ApiKeyNotFoundException(String keyId, String userId) {
        super("API key '" + keyId + "' not found for user: " + userId);
    }
    
    public ApiKeyNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
} 