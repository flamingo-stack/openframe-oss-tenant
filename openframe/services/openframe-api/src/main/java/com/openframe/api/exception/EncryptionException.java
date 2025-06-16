package com.openframe.api.exception;

import lombok.Getter;

@Getter
public class EncryptionException extends RuntimeException {
    private final String errorCode;

    public EncryptionException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public EncryptionException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
} 