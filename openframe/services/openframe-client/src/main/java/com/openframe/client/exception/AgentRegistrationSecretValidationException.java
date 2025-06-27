package com.openframe.client.exception;

import lombok.Getter;

@Getter
public class AgentRegistrationSecretValidationException extends RuntimeException {

    private final String errorCode;

    public AgentRegistrationSecretValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

}
