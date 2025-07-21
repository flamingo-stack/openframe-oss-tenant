package com.openframe.gateway.config.ws;

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

    public WebSocketSessionWrapper(WebSocketSession delegate) {
        this.delegate = delegate;
    }

    @Override
    public Flux<WebSocketMessage> receive() {
        return delegate.receive()
                .handle((message, sink) -> {
                    String payload = message.getPayloadAsText();
                    extractAndLogMessageInfo(payload);
                    
                    // Check if this is a SUB operation for a topic containing "1234"
                    if (isRestrictedSubscription(payload)) {
                        // Send rejection message and don't proxy the original
                        delegate.send(Mono.just(delegate.textMessage("Subscription denied: Access to topics containing '1234' is restricted")))
                                .subscribe();
                        log.warn("Blocked subscription attempt to restricted topic containing '1234'");
                    } else {
                        // Proxy the original message
                        sink.next(message);
                    }
                });
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
