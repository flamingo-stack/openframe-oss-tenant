package com.openframe.gateway.config.ws.nats;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@AllArgsConstructor
@Getter
public class NatsMessageValidationResult {

    private final boolean isValid;
    private String message;

}
