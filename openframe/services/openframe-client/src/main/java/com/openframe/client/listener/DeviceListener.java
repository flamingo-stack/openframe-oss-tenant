package com.openframe.client.listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
public class DeviceListener {

    private static final Logger log = LoggerFactory.getLogger(DeviceListener.class);

    @Bean
    public Consumer<Message<String>> deviceDataConsumer() {
        return message -> {
            try {
                String subject = getSubjectFromHeaders(message);
                String data = message.getPayload();
                
                log.info("Received message on topic: {} with data: {}", subject, data);
                
            } catch (Exception e) {
                log.error("Error processing message", e);
            }
        };
    }
    
    private String getSubjectFromHeaders(Message<String> message) {
        // Spring Cloud Stream with NATS sets the subject in headers
        Object subject = message.getHeaders().get("nats_subject");
        if (subject != null) {
            return subject.toString();
        }
        
        // Fallback to check other possible header names
        Object destination = message.getHeaders().get("scst_targetDestination");
        if (destination != null) {
            return destination.toString();
        }
        
        return "unknown-topic";
    }
}