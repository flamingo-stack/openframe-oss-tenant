package com.openframe.stream.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.model.fleet.ActivityMessage;
import com.openframe.stream.model.fleet.HostActivityMessage;
import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serdes;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

/**
 * Configuration for Serde (Serializer/Deserializer) for typed DebeziumMessage models
 * Enables automatic JSON serialization/deserialization for Kafka Streams
 */
@Configuration
public class SerdeConfig {

    private final ObjectMapper objectMapper;

    public SerdeConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Serde for ActivityMessage (DebeziumMessage<Activity>)
     */
    @Bean
    public Serde<ActivityMessage> activityMessageSerde() {
        return Serdes.serdeFrom(
            new JsonSerializer<>(objectMapper),
            new JsonDeserializer<>(ActivityMessage.class, objectMapper)
        );
    }

    /**
     * Serde for HostActivityMessage (DebeziumMessage<HostActivity>)
     */
    @Bean
    public Serde<HostActivityMessage> hostActivityMessageSerde() {
        return Serdes.serdeFrom(
            new JsonSerializer<>(objectMapper),
            new JsonDeserializer<>(HostActivityMessage.class, objectMapper)
        );
    }
} 