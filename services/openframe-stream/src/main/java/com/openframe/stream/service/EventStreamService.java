package com.openframe.stream.service;

import java.util.concurrent.CompletableFuture;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EventStreamService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @KafkaListener(topics = "openframe.events", groupId = "openframe-group")
    public void consume(String message) {
        System.out.println(String.format("Received message: {}", message));
        processEvent(message);
    }

    public void produce(String topic, Object message) {
        CompletableFuture<SendResult<String, Object>> future = kafkaTemplate.send(topic, message);

        future.whenComplete((result, ex) -> {
            if (ex == null) {
                System.out.println(String.format("Message sent successfully to topic {}: {}", topic, result.getRecordMetadata().offset()));
            } else {
                System.out.println(String.format("Failed to send message to topic {}", topic, ex));
            }
        });
    }

    private void processEvent(String message) {
        try {
            System.out.println(String.format("Processing event: {}", message));
            produce("openframe.events.processed", message);
        } catch (Exception e) {
            System.out.println(String.format("Error processing event", e));
        }
    }
}
