package com.openframe.client.service.validator;

import com.openframe.client.exception.AgentRegistrationSecretValidationErrorException;
import com.openframe.client.exception.AgentRegistrationSecretValidationException;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.document.agent.AgentRegistrationSecret;
import com.openframe.data.repository.agent.AgentRegistrationSecretRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import static org.apache.commons.lang3.StringUtils.isBlank;

@Component
@RequiredArgsConstructor
public class AgentRegistrationSecretValidator {

    private final AgentRegistrationSecretRepository secretRepository;
    private final EncryptionService encryptionService;

    public void validate(String initialKey) {
        if (isBlank(initialKey)) {
            throw new AgentRegistrationSecretValidationException("initial_key_empty", "Initial key is empty");
        }

        AgentRegistrationSecret secret = secretRepository.findByActiveTrue()
                .orElseThrow(() -> new AgentRegistrationSecretValidationErrorException("No active agent secret found"));

        String decryptedSecretKey = encryptionService.decrypt(secret.getSecretKey());
        if (!decryptedSecretKey.equals(initialKey)) {
            throw new AgentRegistrationSecretValidationException("initial_key_invalid", "Invalid initial key");
        }
    }

}
