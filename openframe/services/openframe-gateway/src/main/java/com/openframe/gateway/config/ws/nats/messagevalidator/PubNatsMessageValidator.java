package com.openframe.gateway.config.ws.nats.messagevalidator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.gateway.config.ws.nats.NatsMessageValidationResult;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class PubNatsMessageValidator implements NatsMessageByTypeValidator {

    private static final String COMMAND = "PUB";
    // Example: PUB $JS.API.CONSUMER.CREATE.DEVICE_COMMANDS.device_1234_commands_consumer _INBOX.8Hmtxm5pCyhC447k38pCu5.8Hmtxm5pCyhC447k38pCxW 258
    // Example: PUB $JS.ACK.DEVICE_COMMANDS.device_1234_commands_consumer.1.6.8.1753392043610559889.0 0
    private static final Pattern PUB_PATTERN = Pattern.compile("^PUB\\s+(\\S+)(?:\\s+(\\S+))?\\s+(\\d+)$");
    
    /**
     * Defines allowed subject patterns for device communication
     */
    private static final List<SubjectPattern> ALLOWED_SUBJECT_PATTERNS = List.of(
        // Device-specific patterns
        new SubjectPattern("device.{machineId}.toolconnection", "Device tool connection"),
        new SubjectPattern("device.{machineId}.status", "Device status updates"),
        new SubjectPattern("device.{machineId}.metrics", "Device metrics"),
        new SubjectPattern("device.{machineId}.alerts", "Device alerts"),
        new SubjectPattern("device.{machineId}.commands", "Device commands"),
        new SubjectPattern("device.{machineId}.responses", "Device command responses"),
        
        // JetStream patterns
        new SubjectPattern("$JS.ACK.*{machineId}.*", "JetStream acknowledgment"),
        new SubjectPattern("$JS.API.*", "JetStream API calls"),
        
        // Inbox patterns for request-reply
        new SubjectPattern("_INBOX.*", "Request-reply inbox"),
        
        // System patterns
        new SubjectPattern("system.{machineId}.*", "System messages"),
        new SubjectPattern("health.{machineId}.*", "Health check messages")
    );
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean canHandle(String commandLine) {
        return PUB_PATTERN.matcher(commandLine.trim()).matches();
    }

    @Override
    public NatsMessageValidationResult validate(String payload, Jwt jwt) {
        String machineId = jwt.getClaimAsString("machine_id");
        
        String trimmedPayload = payload.trim();
        String[] lines = trimmedPayload.split("\n", 2);
        String commandLine = lines[0].trim();
        
        Matcher pubMatcher = PUB_PATTERN.matcher(commandLine);
        if (!pubMatcher.matches()) {
            return new NatsMessageValidationResult(false, "Invalid PUB command format");
        }

        String subject = pubMatcher.group(1);
        String replyTo = pubMatcher.group(2);
        int payloadSize = Integer.parseInt(pubMatcher.group(3));
        String messagePayload = lines.length > 1 ? lines[1] : "";
        
        return validatePub(subject, replyTo, payloadSize, messagePayload, machineId);
    }

    private NatsMessageValidationResult validatePub(String subject, String replyTo, int payloadSize, 
                                                   String messagePayload, String machineId) {
        
        // Validate subject format and device ownership
        if (!isValidSubjectForDevice(subject, machineId)) {
            return new NatsMessageValidationResult(false, 
                "PUB subject '" + subject + "' not allowed for device: " + machineId);
        }
        
        // Validate payload size matches actual payload
        int actualSize = messagePayload != null ? messagePayload.getBytes().length : 0;
        if (actualSize != payloadSize) {
            return new NatsMessageValidationResult(false, 
                "PUB payload size mismatch. Expected: " + payloadSize + ", Actual: " + actualSize);
        }
        
        // Validate JetStream API calls
        if (subject.startsWith("$JS.API.")) {
            return validateJetStreamApiCall(subject, messagePayload, machineId);
        }
        
        return new NatsMessageValidationResult(true, "Valid PUB command");
    }

    private NatsMessageValidationResult validateJetStreamApiCall(String subject, String payload, String machineId) {
        try {
            // Validate consumer creation calls
            if (subject.contains("CONSUMER.CREATE")) {
                JsonNode consumerConfig = objectMapper.readTree(payload);
                
                if (consumerConfig.has("config")) {
                    JsonNode config = consumerConfig.get("config");
                    
                    // Validate deliver_subject matches device
                    if (config.has("deliver_subject")) {
                        String deliverSubject = config.get("deliver_subject").asText();
                        if (!isValidSubjectForDevice(deliverSubject, machineId)) {
                            return new NatsMessageValidationResult(false, 
                                "JetStream deliver_subject not allowed for device: " + machineId);
                        }
                    }
                    
                    // Validate durable_name contains device identifier
                    if (config.has("durable_name")) {
                        String durableName = config.get("durable_name").asText();
                        if (!durableName.contains(machineId)) {
                            return new NatsMessageValidationResult(false, 
                                "JetStream durable_name must contain machine ID: " + machineId);
                        }
                    }
                }
            }
            
            return new NatsMessageValidationResult(true, "Valid JetStream API call");
            
        } catch (Exception e) {
            return new NatsMessageValidationResult(false, "Invalid JetStream API payload: " + e.getMessage());
        }
    }

    private boolean isValidSubjectForDevice(String subject, String machineId) {
        return ALLOWED_SUBJECT_PATTERNS.stream()
            .anyMatch(pattern -> pattern.matches(subject, machineId));
    }
    

} 