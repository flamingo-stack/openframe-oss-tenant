package com.openframe.gateway.config.ws.nats.messagevalidator;

import com.openframe.gateway.config.ws.nats.NatsMessageValidationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
@Slf4j
public class PingPongNatsMessageValidator implements NatsMessageByTypeValidator {

    private static final String COMMAND = "PING_PONG";
    // Example: PING
    // Example: PONG
    private static final Pattern PING_PONG_PATTERN = Pattern.compile("^(PING|PONG)$");

    @Override
    public boolean canHandle(String commandLine) {
        return PING_PONG_PATTERN.matcher(commandLine.trim()).matches();
    }

    @Override
    public NatsMessageValidationResult validate(String payload, Jwt jwt) {
        String machineId = jwt.getClaimAsString("machine_id");
        
        String trimmedPayload = payload.trim();
        String commandLine = trimmedPayload.split("\n")[0].trim();
        
        if (!PING_PONG_PATTERN.matcher(commandLine).matches()) {
            return new NatsMessageValidationResult(false, "Invalid PING/PONG command format");
        }

        return validatePingPong(commandLine, machineId);
    }

    private NatsMessageValidationResult validatePingPong(String command, String machineId) {
        // PING and PONG are always allowed for authenticated devices
        return new NatsMessageValidationResult(true, "Valid " + command + " command");
    }
} 