package com.openframe.core.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentRegistrationSecretGenerator {

    private static final Integer LENGTH = 32;

    private final SecretGenerator secretGenerator;

    public String generate() {
        return secretGenerator.generate(LENGTH);
    }

}
