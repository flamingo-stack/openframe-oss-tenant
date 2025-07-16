package com.openframe.stream.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.streams.KafkaStreams;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import javax.annotation.PreDestroy;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreamLifecycleService {

    private final KafkaStreams kafkaStreams;

    @EventListener(ApplicationReadyEvent.class)
    public void startStreams() {
        log.info("Starting Kafka Streams application");
        
        try {
            kafkaStreams.start();
            log.info("Kafka Streams application started successfully");
        } catch (Exception e) {
            log.error("Failed to start Kafka Streams application", e);
            throw new RuntimeException("Failed to start Kafka Streams", e);
        }
    }

    @PreDestroy
    public void stopStreams() {
        log.info("Stopping Kafka Streams application");
        
        try {
            kafkaStreams.close();
            log.info("Kafka Streams application stopped successfully");
        } catch (Exception e) {
            log.error("Error stopping Kafka Streams application", e);
        }
    }

    public boolean isRunning() {
        return kafkaStreams.state() == KafkaStreams.State.RUNNING;
    }

    public KafkaStreams.State getState() {
        return kafkaStreams.state();
    }
} 