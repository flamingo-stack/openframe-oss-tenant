package com.openframe.api.service;

import com.openframe.api.dto.AgentRegistrationSecretResponse;
import com.openframe.api.exception.AgentRegistrationSecretNotFoundException;
import com.openframe.core.service.AgentRegistrationSecretGenerator;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.document.agent.AgentRegistrationSecret;
import com.openframe.data.repository.agent.AgentRegistrationSecretRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentRegistrationSecretService {

    private final AgentRegistrationSecretRepository secretRepository;
    private final EncryptionService encryptionService;
    private final AgentRegistrationSecretGenerator secretGenerator;

    public AgentRegistrationSecretResponse getActiveSecret() {
       return secretRepository.findByActiveTrue()
               .map(secret -> AgentRegistrationSecretResponse.builder()
                       .id(secret.getId())
                       .key(encryptionService.decrypt(secret.getSecretKey()))
                       .createdAt(secret.getCreatedAt())
                       .active(secret.isActive())
                       .build())
               .orElseThrow(() -> new AgentRegistrationSecretNotFoundException("agent_registration_secret_not_found", "Active agent registration secret not found"));
    }

    public List<AgentRegistrationSecretResponse> getAllSecrets() {
        List<AgentRegistrationSecret> secrets = secretRepository.findAll();
        return secrets.stream()
                .map(secret -> AgentRegistrationSecretResponse.builder()
                        .id(secret.getId())
                        .key(encryptionService.decrypt(secret.getSecretKey()))
                        .createdAt(secret.getCreatedAt())
                        .active(secret.isActive())
                        .build())
                .toList();
    }

    public AgentRegistrationSecretResponse generateNewSecret() {
        deactivateExisting();
        String newSecretKey = secretGenerator.generate();

        AgentRegistrationSecret newSecret = new AgentRegistrationSecret();
        newSecret.setSecretKey(encryptionService.encrypt(newSecretKey));
        newSecret.setCreatedAt(Instant.now());
        newSecret.setActive(true);

        AgentRegistrationSecret savedKey = secretRepository.save(newSecret);
        log.info("Generated new agent registration secret with ID: {}", savedKey.getId());

        return AgentRegistrationSecretResponse.builder()
                .id(savedKey.getId())
                .key(newSecretKey)
                .createdAt(savedKey.getCreatedAt())
                .active(savedKey.isActive())
                .build();
    }

    private void deactivateExisting() {
        AgentRegistrationSecret activeSecret = secretRepository.findByActiveTrue()
                .orElseThrow(() -> new AgentRegistrationSecretNotFoundException("no_active_secret_found", "Not found active agent secret"));
        activeSecret.setActive(false);
        secretRepository.save(activeSecret);
        log.info("Deactivated previous key with ID: {}", activeSecret.getId());
    }
} 