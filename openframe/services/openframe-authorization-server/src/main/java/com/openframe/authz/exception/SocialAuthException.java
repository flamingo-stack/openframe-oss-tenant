package com.openframe.authz.exception;

/**
 * Exception for social authentication errors
 */
public class SocialAuthException extends RuntimeException {
    private final String errorCode;

    public SocialAuthException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public SocialAuthException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}