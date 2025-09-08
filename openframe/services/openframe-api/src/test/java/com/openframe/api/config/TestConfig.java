package com.openframe.api.config;

import com.openframe.data.repository.user.UserRepository;
import org.apache.pinot.client.Connection;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.cassandra.core.CassandraTemplate;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.mockito.Mockito.mock;


@TestConfiguration
public class TestConfig {
    
    @Bean
    @Primary
    public MongoTemplate mongoTemplate() {
        return mock(MongoTemplate.class);
    }

    @Bean
    @Primary
    public UserRepository userRepository() {
        return mock(UserRepository.class);
    }

    @Bean
    @Primary
    public RedisTemplate<String, Object> redisTemplate() {
        return mock(RedisTemplate.class);
    }

    @Bean
    @Primary
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return mock(KafkaTemplate.class);
    }

    @Bean
    @Primary
    public CassandraTemplate cassandraTemplate() {
        return mock(CassandraTemplate.class);
    }

    @Bean
    @Primary
    public Connection pinotConnection() {
        return mock(Connection.class);
    }

    @Bean
    @Primary
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
} 