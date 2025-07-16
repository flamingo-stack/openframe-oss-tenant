package com.openframe.stream.config;

import com.openframe.stream.service.ActivityEnrichmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Properties;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class StreamProcessingConfig {

    private final ActivityEnrichmentService activityEnrichmentService;
    private final KafkaStreamsConfig kafkaStreamsConfig;

    @Value("${spring.application.name}")
    private String applicationName;

    @Bean
    public KafkaStreams kafkaStreams() {
        // Build the topology
        Topology topology = buildTopology();
        
        // Create Kafka Streams instance
        Properties props = kafkaStreamsConfig.kStreamsConfig().asProperties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, applicationName + "-streams");
        
        KafkaStreams streams = new KafkaStreams(topology, props);
        
        // Set state listener for monitoring
        streams.setStateListener((newState, oldState) -> {
            log.info("Kafka Streams state changed from {} to {}", oldState, newState);
        });
        
        // Set exception handler
        streams.setUncaughtExceptionHandler((thread, throwable) -> {
            log.error("Uncaught exception in Kafka Streams thread: {}", thread.getName(), throwable);
        });
        
        return streams;
    }

    private Topology buildTopology() {
        log.info("Building Kafka Streams topology");
        
        // Build the activity enrichment stream
        activityEnrichmentService.buildStream();
        
        // Get the topology from StreamsBuilder
        return activityEnrichmentService.getStreamsBuilder().build();
    }
} 