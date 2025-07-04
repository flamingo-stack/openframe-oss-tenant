package com.openframe.data.repository.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Repository for API key statistics operations using reactive Redis
 */
@Repository
@Slf4j
@RequiredArgsConstructor
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveApiKeyStatsRepository {

    private final ReactiveStringRedisTemplate redisTemplate;

    private static final String STATS_KEY_PREFIX = "stats:";

    /**
     * Atomically increment successful request counters
     */
    public Mono<Void> incrementSuccessful(String keyId, Duration ttl) {
        String key = STATS_KEY_PREFIX + keyId;
        String now = LocalDateTime.now().toString();

        return redisTemplate.opsForHash().increment(key, "total", 1)
                .then(redisTemplate.opsForHash().increment(key, "success", 1))
                .then(redisTemplate.opsForHash().put(key, "lastUsed", now))
                .then(redisTemplate.expire(key, ttl))
                .then();
    }

    /**
     * Atomically increment failed request counters
     */
    public Mono<Void> incrementFailed(String keyId, Duration ttl) {
        String key = STATS_KEY_PREFIX + keyId;
        String now = LocalDateTime.now().toString();

        return redisTemplate.opsForHash().increment(key, "total", 1)
                .then(redisTemplate.opsForHash().increment(key, "failed", 1))
                .then(redisTemplate.opsForHash().put(key, "lastUsed", now))
                .then(redisTemplate.expire(key, ttl))
                .then();
    }
} 