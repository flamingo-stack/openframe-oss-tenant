package com.openframe.gateway.config.ws.nats.messagevalidator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.gateway.config.ws.nats.NatsMessageValidationResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class ConnectNatsMessageValidator implements NatsMessageByTypeValidator {

    private static final String COMMAND = "CONNECT";
    // Example: CONNECT {"verbose":false,"pedantic":false,"jwt":null,"nkey":null,"sig":null,"name":"device-1234","echo":true,"lang":"rust","version":"0.42.0","protocol":1,"tls_required":false,"user":"device","pass":"1234","auth_token":null,"headers":true,"no_responders":true}
    private static final Pattern CONNECT_PATTERN = Pattern.compile("^CONNECT\\s+(.+)$");
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public boolean canHandle(String commandLine) {
        return CONNECT_PATTERN.matcher(commandLine.trim()).matches();
    }

    @Override
    public NatsMessageValidationResult validate(String payload, Jwt jwt) {
        String machineId = jwt.getClaimAsString("machine_id");
        
        String trimmedPayload = payload.trim();
        String[] lines = trimmedPayload.split("\n", 2);
        String commandLine = lines[0].trim();
        
        Matcher connectMatcher = CONNECT_PATTERN.matcher(commandLine);
        if (!connectMatcher.matches()) {
            return new NatsMessageValidationResult(false, "Invalid CONNECT command format");
        }

        return validateConnect(connectMatcher.group(1), machineId);
    }

    private NatsMessageValidationResult validateConnect(String connectJson, String machineId) {
        try {
            JsonNode connectInfo = objectMapper.readTree(connectJson);
            
            // Validate required fields
            if (!connectInfo.has("name")) {
                return new NatsMessageValidationResult(false, "CONNECT missing required 'name' field");
            }
            
            String clientName = connectInfo.get("name").asText();
            
            // Validate that device name matches JWT machine ID or follows expected pattern
            if (!isValidDeviceName(clientName, machineId)) {
                return new NatsMessageValidationResult(false, 
                    "CONNECT client name '" + clientName + "' does not match machine ID: " + machineId);
            }
            
            // Validate authentication fields
            if (connectInfo.has("user") && connectInfo.has("pass")) {
                String user = connectInfo.get("user").asText();
                String pass = connectInfo.get("pass").asText();
                
                if (!"device".equals(user)) {
                    return new NatsMessageValidationResult(false, "Invalid user in CONNECT");
                }
                
                // Validate password matches machine ID or expected pattern
                if (!machineId.equals(pass)) {
                    return new NatsMessageValidationResult(false, "Invalid credentials in CONNECT");
                }
            }
            
            return new NatsMessageValidationResult(true, "Valid CONNECT command");
            
        } catch (Exception e) {
            return new NatsMessageValidationResult(false, "Invalid CONNECT JSON: " + e.getMessage());
        }
    }

    private boolean isValidDeviceName(String clientName, String machineId) {
        // Allow exact match or device-{id} pattern
        return machineId.equals(clientName) || 
               clientName.equals("device-" + machineId) ||
               clientName.startsWith("device-") && clientName.contains(machineId);
    }
} 