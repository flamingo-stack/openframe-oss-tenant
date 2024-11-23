package com.openframe.stream.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class EventStreamService {
    
    private final KafkaTemplate<String, String> kafkaTemplate;

    @KafkaListener(topics = "openframe-events", groupId = "openframe-group")
    public void consume(String message) {
        log.info("Received message: {}", message);
        // Process event
        processEvent(message);
    }

    public void produce(String topic, String message) {
        kafkaTemplate.send(topic, message)
            .addCallback(
                result -> log.info("Message sent successfully"),
                ex -> log.error("Failed to send message", ex)
            );
    }

    private void processEvent(String message) {
        // Add event processing logic here
    }
}
