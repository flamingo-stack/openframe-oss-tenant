package com.openframe.api.exception;

import lombok.Getter;

@Getter
public class SocialAuthException extends RuntimeException {
    private final String errorCode;

    public SocialAuthException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

}