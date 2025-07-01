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

    /**
     * Sends a message to Kafka topic without a key.
     *
     * @param topic   the Kafka topic
     * @param message the message to send
     * @param <T>     the message type
     * @throws MessageDeliveryException if message sending fails
     */
    public <T> void sendMessage(String topic, T message) {
        sendMessage(topic, null, message);
    }
    /**
     * Sends a message to Kafka topic with retry logic.
     *
     * @param topic   the Kafka topic
     * @param key     the message key
     * @param message the message to send
     * @param maxRetries the maximum number of retry attempts
     * @param <T>     the message type
     * @throws MessageDeliveryException if message sending fails after all retries
     */
    public <T> void sendMessageWithRetry(String topic, String key, T message, int maxRetries) {
        int attempts = 0;
        Exception lastException = null;

        while (attempts < maxRetries) {
            try {
                kafkaTemplate.send(topic, key, message);
                log.info("Message sent to Kafka topic {} with key {} (attempt {}): {}", 
                        topic, key, attempts + 1, message);
                return;
            } catch (Exception e) {
                lastException = e;
                attempts++;
                log.warn("Failed to send message to Kafka topic {} (attempt {}): {}", 
                        topic, attempts, e.getMessage());
                
                if (attempts < maxRetries) {
                    try {
                        Thread.sleep(1000L * attempts); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new MessageDeliveryException("Message sending interrupted: %s".formatted(ie.getMessage()));
                    }
                }
            }
        }

        log.error("Failed to send message to Kafka topic {} after {} attempts: {}", 
                topic, maxRetries, message, lastException);
        assert lastException != null;
        throw new MessageDeliveryException("Failed to send message to Kafka topic: %s after %d attempts, cause: %s".formatted(topic, maxRetries, lastException.getMessage()));
    }

    /**
     * Sends a message to Kafka topic with retry logic (default 3 retries).
     *
     * @param topic   the Kafka topic
     * @param key     the message key
     * @param message the message to send
     * @param <T>     the message type
     * @throws MessageDeliveryException if message sending fails after all retries
     */
    public <T> void sendMessageWithRetry(String topic, String key, T message) {
        sendMessageWithRetry(topic, key, message, 3);
    }
} 