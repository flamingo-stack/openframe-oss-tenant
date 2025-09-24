package com.openframe.stream.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.stream.model.fleet.ActivityMessage;
import com.openframe.stream.model.fleet.HostActivityMessage;
import org.apache.kafka.common.serialization.Serde;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.StreamsConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafkaStreams;
import org.springframework.kafka.annotation.KafkaStreamsDefaultConfiguration;
import org.springframework.kafka.config.KafkaStreamsConfiguration;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerde;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.util.HashMap;
import java.util.Map;

/**
 * Configuration for Kafka Streams processing
 * Sets up stream processing properties, serializers, and application settings
 */
@Configuration
@EnableKafkaStreams
public class KafkaStreamsConfig {

    @Value("${spring.oss-tenant.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.application.name}")
    private String applicationName;

    private final ObjectMapper objectMapper;

    public KafkaStreamsConfig(ObjectMapper objectMapper) {
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

    @Bean
    public Serde<ActivityMessage> outgoingActivityMessageSerde() {
        JsonSerde<ActivityMessage> serde = new JsonSerde<>(ActivityMessage.class);
        serde.serializer().setAddTypeInfo(false);
        return serde;
    }

    @Bean(name = KafkaStreamsDefaultConfiguration.DEFAULT_STREAMS_CONFIG_BEAN_NAME)
    public KafkaStreamsConfiguration kStreamsConfig() {
        Map<String, Object> props = new HashMap<>();
        
        // Basic Kafka Streams configuration
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, applicationName);
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        
        // Serialization configuration - using String for keys, custom Serde for values
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.AT_LEAST_ONCE);
        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);
        
        // State store configuration
        props.put(StreamsConfig.STATE_DIR_CONFIG, "/tmp/kafka-streams");
        
        // Consumer configuration
        props.put(StreamsConfig.consumerPrefix(org.apache.kafka.clients.consumer.ConsumerConfig.AUTO_OFFSET_RESET_CONFIG), "earliest");
        props.put(StreamsConfig.consumerPrefix(org.apache.kafka.clients.consumer.ConsumerConfig.MAX_POLL_RECORDS_CONFIG), 100);
        
        // Producer configuration
        props.put(StreamsConfig.producerPrefix(org.apache.kafka.clients.producer.ProducerConfig.BATCH_SIZE_CONFIG), 16384);
        props.put(StreamsConfig.producerPrefix(org.apache.kafka.clients.producer.ProducerConfig.LINGER_MS_CONFIG), 10);
        props.put(StreamsConfig.producerPrefix(org.apache.kafka.clients.producer.ProducerConfig.BUFFER_MEMORY_CONFIG), 33554432);
        
        return new KafkaStreamsConfiguration(props);
    }
} 