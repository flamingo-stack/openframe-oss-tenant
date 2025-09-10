package com.openframe.management.service;

import com.openframe.core.service.AgentRegistrationSecretGenerator;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.document.agent.AgentRegistrationSecret;
import com.openframe.data.repository.agent.AgentRegistrationSecretRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentRegistrationSecretManagementService {

    private final AgentRegistrationSecretRepository secretRepository;
    private final AgentRegistrationSecretGenerator secretGenerator;
    private final EncryptionService encryptionService;

    public void createInitialSecret() {
        if (secretRepository.existsAny()) {
            log.info("Agent registration keys already exist. Skipping key generation.");
            return;
        }

        String secretKey = secretGenerator.generate();

        AgentRegistrationSecret agentRegistrationSecret = new AgentRegistrationSecret();
        agentRegistrationSecret.setSecretKey(encryptionService.encrypt(secretKey));
        agentRegistrationSecret.setCreatedAt(Instant.now());
        agentRegistrationSecret.setActive(true);

        AgentRegistrationSecret savedKey = secretRepository.save(agentRegistrationSecret);
        log.info("Generated new agent registration key with ID: {}", savedKey.getId());
    }

}
