package com.openframe.client.controller;

import com.openframe.client.service.NatsMessagePublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Simple REST controller for NATS message publishing
 */
@RestController
@RequestMapping("/api/nats")
public class NatsPublisherController {

    private static final Logger log = LoggerFactory.getLogger(NatsPublisherController.class);
    
    private final NatsMessagePublisher natsPublisher;
    
    @Autowired
    public NatsPublisherController(NatsMessagePublisher natsPublisher) {
        this.natsPublisher = natsPublisher;
    }
    
    /**
     * Send test message to device commands topic
     * POST /api/nats/device/{deviceId}/test
     */
    @PostMapping("/device/{deviceId}/test")
    public ResponseEntity<?> sendTestMessage(@PathVariable String deviceId, @RequestBody String data) {
        try {
            String topic = "device." + deviceId + ".commands";
            String message = data;
            
            boolean result = natsPublisher.publish(topic, message);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", result);
            response.put("deviceId", deviceId);
            response.put("topic", topic);
            response.put("message", message);
            response.put("status", result ? "Message sent successfully" : "Failed to send message");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error sending test message for device: {}", deviceId, e);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Failed to send test message: " + e.getMessage()));
        }
    }
} 