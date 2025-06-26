package com.openframe.api.exception;

import lombok.Getter;

@Getter
public class AgentRegistrationSecretNotFoundException extends RuntimeException {

    private final String errorCode;

    public AgentRegistrationSecretNotFoundException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

}
