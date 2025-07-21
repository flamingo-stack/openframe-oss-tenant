package com.openframe.client.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

/**
 * NATS message publisher service using Spring Cloud Stream
 */
@Service
public class NatsMessagePublisher {

    private static final Logger log = LoggerFactory.getLogger(NatsMessagePublisher.class);
    
    private final StreamBridge streamBridge;
    
    @Autowired
    public NatsMessagePublisher(StreamBridge streamBridge) {
        this.streamBridge = streamBridge;
    }
    
    /**
     * Publish a message to a specific NATS subject using StreamBridge
     * 
     * @param subject The NATS subject to publish to
     * @param payload The message payload
     * @return true if message was sent successfully
     */
    public boolean publish(String subject, String payload) {
        try {
            log.info("Publishing message to subject: {} with payload: {}", subject, payload);
            
            // Create message with NATS subject header
            Message<String> message = MessageBuilder
                    .withPayload(payload)
                    .setHeader("nats_subject", subject)
                    .setHeader("scst_targetDestination", subject)
                    .build();
            
            // Use StreamBridge to send the message
            // For dynamic destinations, we can use the subject directly
            boolean result = streamBridge.send(subject, message);
            
            if (result) {
                log.info("Successfully published message to subject: {}", subject);
            } else {
                log.warn("Failed to publish message to subject: {}", subject);
            }
            
            return result;
            
        } catch (Exception e) {
            log.error("Error publishing message to subject: {}", subject, e);
            return false;
        }
    }
    
    /**
     * Publish a message to a device-specific command topic
     * 
     * @param deviceId The target device ID
     * @param command The command to send
     * @return true if message was sent successfully
     */
    public boolean publishDeviceCommand(String deviceId, String command) {
        String subject = "device." + deviceId + ".commands";
        return publish(subject, command);
    }
    
    /**
     * Publish device data
     * 
     * @param deviceId The device ID
     * @param data The device data
     * @return true if message was sent successfully
     */
    public boolean publishDeviceData(String deviceId, String data) {
        String subject = "device." + deviceId + ".data";
        return publish(subject, data);
    }
} 