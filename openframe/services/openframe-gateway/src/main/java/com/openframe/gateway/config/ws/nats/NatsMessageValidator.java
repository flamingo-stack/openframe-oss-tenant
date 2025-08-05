package com.openframe.gateway.config.ws.nats;

import com.openframe.gateway.config.ws.nats.messagevalidator.NatsMessageByTypeValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
public class NatsMessageValidator {

    private final List<NatsMessageByTypeValidator> validators;

    public NatsMessageValidator(List<NatsMessageByTypeValidator> validators) {
        this.validators = validators;
    }

    public NatsMessageValidationResult validate(String payload, Jwt jwt) {
        if (payload == null || payload.trim().isEmpty()) {
            return new NatsMessageValidationResult(false, "Empty message payload");
        }

        String trimmedPayload = payload.trim();
        String[] lines = trimmedPayload.split("\n", 2);
        String commandLine = lines[0].trim();

        try {
            // Find validator that can handle this command
            for (NatsMessageByTypeValidator validator : validators) {
                if (validator.canHandle(commandLine)) {
                    return validator.validate(payload, jwt);
                }
            }

            return new NatsMessageValidationResult(false, "Unknown NATS command: " + commandLine);

        } catch (Exception e) {
            String machineId = jwt.getClaimAsString("machine_id");
            log.error("Error validating NATS message for device {}: {}", machineId, e.getMessage());
            return new NatsMessageValidationResult(false, "Validation error: " + e.getMessage());
        }
    }
}
