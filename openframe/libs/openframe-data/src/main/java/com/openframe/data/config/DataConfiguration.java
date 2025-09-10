package com.openframe.data.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.cassandra.repository.config.EnableCassandraRepositories;
import org.springframework.kafka.annotation.EnableKafka;

@Configuration
public class DataConfiguration {
    @Configuration
    @ConditionalOnProperty(name = "spring.data.cassandra.enabled", havingValue = "true", matchIfMissing = false)
    @EnableCassandraRepositories(basePackages = "com.openframe.data.repository.cassandra")
    public static class CassandraConfiguration {}

    @Configuration
    @ConditionalOnProperty(name = "spring.kafka.enabled", havingValue = "true", matchIfMissing = false)
    @EnableKafka
    public static class KafkaConfiguration {}
}