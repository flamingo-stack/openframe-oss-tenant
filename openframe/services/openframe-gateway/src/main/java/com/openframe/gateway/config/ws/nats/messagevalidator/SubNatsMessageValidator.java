package com.openframe.gateway.config.ws.nats.messagevalidator;

import com.openframe.gateway.config.ws.nats.NatsMessageValidationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class SubNatsMessageValidator implements NatsMessageByTypeValidator {

    private static final String COMMAND = "SUB";
    // Example: SUB device.1234.commands.deliver 1
    private static final Pattern SUB_PATTERN = Pattern.compile("^SUB\\s+(\\S+)(?:\\s+(\\S+))?\\s+(\\S+)$");

    @Override
    public boolean canHandle(String commandLine) {
        return SUB_PATTERN.matcher(commandLine.trim()).matches();
    }

    @Override
    public NatsMessageValidationResult validate(String payload, Jwt jwt) {
        String machineId = jwt.getClaimAsString("machine_id");
        
        String trimmedPayload = payload.trim();
        String[] lines = trimmedPayload.split("\n", 2);
        String commandLine = lines[0].trim();
        
        Matcher subMatcher = SUB_PATTERN.matcher(commandLine);
        if (!subMatcher.matches()) {
            return new NatsMessageValidationResult(false, "Invalid SUB command format");
        }

        String subject = subMatcher.group(1);
        String queueGroup = subMatcher.group(2);
        String subscriptionId = subMatcher.group(3);
        
        return validateSub(subject, queueGroup, subscriptionId, machineId);
    }

    private NatsMessageValidationResult validateSub(String subject, String queueGroup, 
                                                   String subscriptionId, String machineId) {
        
        // Validate subject format and device ownership
        if (!isValidSubjectForDevice(subject, machineId)) {
            return new NatsMessageValidationResult(false, 
                "SUB subject '" + subject + "' not allowed for device: " + machineId);
        }
        
        // Validate subscription ID format
        if (subscriptionId == null || subscriptionId.trim().isEmpty()) {
            return new NatsMessageValidationResult(false, "SUB missing subscription ID");
        }
        
        return new NatsMessageValidationResult(true, "Valid SUB command");
    }

    private boolean isValidSubjectForDevice(String subject, String machineId) {
        // Allow subjects that:
        // 1. Start with device.{machineId}
        // 2. Are JetStream ACK subjects for this device
        // 3. Are inbox subjects
        // 4. Are JetStream API subjects (will be validated separately)
        
        return subject.startsWith("device." + machineId + ".") ||
               subject.startsWith("$JS.ACK.") && subject.contains(machineId) ||
               subject.startsWith("_INBOX.") ||
               subject.startsWith("$JS.API.");
    }
} 