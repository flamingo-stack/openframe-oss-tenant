package com.openframe.data.repository.kafka;

import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

/**
 * Generic Kafka producer for sending messages to Kafka topics.
 * Provides unified interface for message sending with proper error handling and logging.
 */
@Slf4j
@Component
public class GenericKafkaProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public GenericKafkaProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Sends a message to Kafka topic with a key.
     *
     * @param topic   the Kafka topic
     * @param key     the message key
     * @param message the message to send
     * @param <T>     the message type
     * @throws MessageDeliveryException if message sending fails
     */
    public <T> void sendMessage(String topic, String key, T message) {
        try {
            kafkaTemplate.send(topic, key, message);
            log.info("Message sent to Kafka topic {} with key {}: {}", topic, key, message);
        } catch (Exception e) {
            log.error("Error sending message to Kafka topic {} with key {}: {}", topic, key, message, e);
            throw new MessageDeliveryException("Failed to send message to Kafka topic: %s, cause: %s".formatted(topic, e.getMessage()));
        }
    }
} 