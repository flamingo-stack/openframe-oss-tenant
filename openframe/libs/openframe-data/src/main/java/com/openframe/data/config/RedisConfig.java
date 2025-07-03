package com.openframe.data.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.repository.configuration.EnableRedisRepositories;

/**
 * Redis configuration for Spring Data Redis
 */
@Configuration
@EnableRedisRepositories(basePackages = "com.openframe.data.repository.redis")
@ConditionalOnProperty(name = "spring.data.redis.enabled", havingValue = "true", matchIfMissing = true)
public class RedisConfig {
}