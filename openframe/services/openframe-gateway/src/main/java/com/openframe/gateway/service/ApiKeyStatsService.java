package com.openframe.gateway.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Service for handling API key statistics with atomic Redis operations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyStatsService {

    private final ReactiveStringRedisTemplate redisTemplate;

    @Value("${openframe.api-key-stats.redis-ttl}")
    private Long redisTtl;

    /**
     * Atomically increment successful request counters with a single Redis call
     */
    public void incrementSuccessful(String keyId) {
        String key = "stats:" + keyId;
        String now = LocalDateTime.now().toString();

        redisTemplate.opsForHash().increment(key, "total", 1)
                .then(redisTemplate.opsForHash().increment(key, "success", 1))
                .then(redisTemplate.opsForHash().put(key, "lastUsed", now))
                .then(redisTemplate.expire(key, Duration.ofSeconds(redisTtl)))
                .then()
                .doOnError(e -> log.error("Failed to increment success for {}", keyId, e))
                .onErrorResume(e -> Mono.empty())
                .subscribe();
    }

    /**
     * Atomically increment failed request counters with a single Redis call
     */
    public void incrementFailed(String keyId) {
        String key = "stats:" + keyId;
        String now = LocalDateTime.now().toString();

        redisTemplate.opsForHash().increment(key, "total", 1)
                .then(redisTemplate.opsForHash().increment(key, "failed", 1))
                .then(redisTemplate.opsForHash().put(key, "lastUsed", now))
                .then(redisTemplate.expire(key, Duration.ofSeconds(redisTtl)))
                .then()
                .doOnError(e -> log.error("Failed to increment failed for {}", keyId, e))
                .onErrorResume(e -> Mono.empty())
                .subscribe();
    }
} 