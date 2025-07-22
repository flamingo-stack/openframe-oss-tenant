package com.openframe.gateway.config.ws;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.experimental.Delegate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class WebSocketSessionWrapper implements WebSocketSession {

    @Delegate
    private final WebSocketSession delegate;
    
    // Pattern to match operation type and topic: "PUB topic" or "SUB topic"
    private static final Pattern MESSAGE_PATTERN = Pattern.compile("^(PUB|SUB)\\s+(\\S+)\\s*(.*)$", Pattern.DOTALL);
    
    // Pattern to match CONNECT operation: "CONNECT {json}"
    private static final Pattern CONNECT_PATTERN = Pattern.compile("^CONNECT\\s+(.*)$", Pattern.DOTALL);
    
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final String ALLOWED_DEVICE_NAME = "device-1234";

    public WebSocketSessionWrapper(WebSocketSession delegate) {
        this.delegate = delegate;
    }

    @Override
    public Flux<WebSocketMessage> receive() {
        return delegate.receive()
                .handle((message, sink) -> {
                    String payload = message.getPayloadAsText();
                    sink.next(message);
//                    // Handle CONNECT messages
//                    if (isConnectMessage(payload)) {
//                        if (validateConnectMessage(payload)) {
//                            log.info("CONNECT validation successful for device: {}", ALLOWED_DEVICE_NAME);
//                            sink.next(message); // Allow the connection
//                        } else {
//                            // Send rejection message and don't proxy the original
//                            delegate.send(Mono.just(delegate.textMessage("Connection denied: Only device-1234 is allowed to connect")))
//                                    .subscribe();
//                            log.warn("Blocked connection attempt from unauthorized device");
//                            return; // Don't forward the message
//                        }
//                    } else {
//                        // Handle PUB/SUB messages
//                        extractAndLogMessageInfo(payload);
//
//                        // Check if this is a SUB operation for a topic containing "1234"
//                        if (isRestrictedSubscription(payload)) {
//                            // Send rejection message and don't proxy the original
//                            delegate.send(Mono.just(delegate.textMessage("Subscription denied: Access to topics containing '1234' is restricted")))
//                                    .subscribe();
//                            log.warn("Blocked subscription attempt to restricted topic containing '1234'");
//                        } else {
//                            // Proxy the original message
//                            sink.next(message);
//                        }
//                    }
                });
    }
    
    private boolean isConnectMessage(String payload) {
        if (payload == null || payload.trim().isEmpty()) {
            return false;
        }
        return payload.trim().startsWith("CONNECT");
    }
    
    private boolean validateConnectMessage(String payload) {
        try {
            Matcher matcher = CONNECT_PATTERN.matcher(payload.trim());
            if (matcher.matches()) {
                String jsonContent = matcher.group(1).trim();
                log.debug("Extracted CONNECT JSON: {}", jsonContent);
                
                JsonNode connectJson = objectMapper.readTree(jsonContent);
                String deviceName = connectJson.path("name").asText();

                if (!deviceName.startsWith("device")) {
                    return true;
                }
                
                log.info("CONNECT attempt from device: '{}'", deviceName);
                
                // Validate that the device name is exactly "device-1234"
                boolean isValid = ALLOWED_DEVICE_NAME.equals(deviceName);
                
                if (isValid) {
                    log.info("Device name validation successful: {}", deviceName);
                    
                    // Log additional connection details
                    String user = connectJson.path("user").asText();
                    String lang = connectJson.path("lang").asText();
                    String version = connectJson.path("version").asText();
                    int protocol = connectJson.path("protocol").asInt();
                    
                    log.info("CONNECT details - User: {}, Language: {}, Version: {}, Protocol: {}", 
                            user, lang, version, protocol);
                } else {
                    log.warn("Device name validation failed. Expected: '{}', Actual: '{}'", 
                            ALLOWED_DEVICE_NAME, deviceName);
                }
                
                return isValid;
            } else {
                log.warn("CONNECT message does not match expected format: {}", payload);
                return false;
            }
        } catch (Exception e) {
            log.error("Error parsing CONNECT message: {}", payload, e);
            return false;
        }
    }
    
    private boolean isRestrictedSubscription(String payload) {
        if (payload == null || payload.trim().isEmpty()) {
            return false;
        }
        
        Matcher matcher = MESSAGE_PATTERN.matcher(payload.trim());
        if (matcher.matches()) {
            String operationType = matcher.group(1); // PUB or SUB
            String topicName = matcher.group(2);     // topic name
            
            return "SUB".equals(operationType) && topicName.contains("1234");
        }
        
        return false;
    }
    
    private void extractAndLogMessageInfo(String payload) {
        if (payload == null || payload.trim().isEmpty()) {
            log.debug("Received empty WebSocket message");
            return;
        }
        
        Matcher matcher = MESSAGE_PATTERN.matcher(payload.trim());
        if (matcher.matches()) {
            String operationType = matcher.group(1); // PUB or SUB
            String topicName = matcher.group(2);     // topic name
            String messageContent = matcher.group(3); // remaining content
            
            log.info("WebSocket Message - Operation: {}, Topic: {}, Content: {}", 
                    operationType, topicName, messageContent);
            
            // You can add additional processing based on operation type
            switch (operationType) {
                case "PUB":
                    log.debug("Processing PUBLISH operation for topic: {}", topicName);
                    break;
                case "SUB":
                    log.debug("Processing SUBSCRIBE operation for topic: {}", topicName);
                    break;
                default:
                    log.warn("Unknown operation type: {}", operationType);
            }
        } else {
            log.warn("WebSocket message does not match expected format: {}", payload);
        }
    }
}
