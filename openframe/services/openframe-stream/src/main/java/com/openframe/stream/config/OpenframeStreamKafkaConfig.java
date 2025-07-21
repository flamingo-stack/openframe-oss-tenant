package com.openframe.stream.config;

import com.openframe.data.model.debezium.DeserializedDebeziumMessage;
import com.openframe.data.model.enums.MessageType;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;
import org.springframework.kafka.support.converter.JsonMessageConverter;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class OpenframeStreamKafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Bean
    public ProducerFactory<String, Object> kafkaProducerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        configProps.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, 10485760);
        configProps.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 10485760);
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(kafkaProducerFactory());
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, DeserializedDebeziumMessage> debeziumKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, DeserializedDebeziumMessage> factory =
                new ConcurrentKafkaListenerContainerFactory<>();

        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "event-processor");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG, 10485760);
        props.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG, 10485760);
        props.put(ConsumerConfig.RECEIVE_BUFFER_CONFIG, 10485760);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, "com.openframe.data.model.debezium.CommonDebeziumMessage");
        props.put(JsonDeserializer.TYPE_MAPPINGS, "debeziumMessage:com.openframe.data.model.debezium.CommonDebeziumMessage");

        ConsumerFactory<String, DeserializedDebeziumMessage> consumerFactory =
                new DefaultKafkaConsumerFactory<>(props, new StringDeserializer(),
                        new JsonDeserializer<>(DeserializedDebeziumMessage.class));

        factory.setConsumerFactory(consumerFactory);
        return factory;
    }

    @Bean
    public JsonMessageConverter jsonMessageConverter() {
        return new JsonMessageConverter();
    }

    @Bean
    public Converter<byte[], MessageType> messageTypeConverter() {
        return new Converter<byte[], MessageType>() {
            @Override
            public MessageType convert(byte[] source) {
                try {
                    String stringValue = new String(source, StandardCharsets.UTF_8);
                    return MessageType.valueOf(stringValue.toUpperCase());
                } catch (IllegalArgumentException e) {
                    return null;
                }
            }

        };
    }
} 