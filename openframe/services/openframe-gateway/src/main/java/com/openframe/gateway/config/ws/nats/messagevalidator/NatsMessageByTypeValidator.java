package com.openframe.gateway.config.ws.nats.messagevalidator;

import com.openframe.gateway.config.ws.nats.NatsMessageValidationResult;
import org.springframework.security.oauth2.jwt.Jwt;

public interface NatsMessageByTypeValidator {

    boolean canHandle(String commandLine);
    NatsMessageValidationResult validate(String payload, Jwt jwt);

}
