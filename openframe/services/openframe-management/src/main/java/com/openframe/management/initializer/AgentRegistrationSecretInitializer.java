package com.openframe.management.initializer;

import com.openframe.management.service.AgentRegistrationSecretManagementService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class AgentRegistrationSecretInitializer implements ApplicationRunner {

    private final AgentRegistrationSecretManagementService agentRegistrationSecretService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Initializing agent registration secret...");
            agentRegistrationSecretService.createInitialSecret();
            log.info("Agent registration secret initialization completed successfully");
        } catch (Exception e) {
            log.error("Error initializing agent registration secret", e);
        }
    }
} 