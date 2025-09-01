package com.openframe.stream.config;
import com.openframe.data.model.enums.MessageType;
import com.openframe.kafka.producer.GenericKafkaProducer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.kafka.ConcurrentKafkaListenerContainerFactoryConfigurer;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.boot.ssl.SslBundles;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;

import java.nio.charset.StandardCharsets;

@Configuration
public class KafkaConfig {

    @Bean
    public GenericKafkaProducer genericKafkaProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        return new GenericKafkaProducer(kafkaTemplate);
    }

    @Bean
    public ConsumerFactory<Object, Object> kafkaConsumerFactory(
            KafkaProperties kafkaProperties,
            ObjectProvider<SslBundles> sslBundlesProvider) {
        return new DefaultKafkaConsumerFactory<>(
                kafkaProperties.buildConsumerProperties(sslBundlesProvider.getIfAvailable()));
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<Object, Object> debeziumKafkaListenerContainerFactory(
            ConcurrentKafkaListenerContainerFactoryConfigurer configurer,
            ConsumerFactory<Object, Object> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<Object, Object> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        configurer.configure(factory, consumerFactory);
        return factory;
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
