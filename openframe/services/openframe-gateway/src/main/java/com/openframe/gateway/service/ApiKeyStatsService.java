package com.openframe.gateway.service;

import com.openframe.data.repository.redis.ReactiveApiKeyStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Service for handling API key statistics with atomic Redis operations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyStatsService {

    private final ReactiveApiKeyStatsRepository statsRepository;

    @Value("${openframe.api-key-stats.redis-ttl}")
    private Long redisTtl;

    /**
     * Atomically increment successful request counters
     */
    public void incrementSuccessful(String keyId) {
        statsRepository.incrementSuccessful(keyId, Duration.ofSeconds(redisTtl))
                .doOnError(e -> log.error("Failed to increment success for {}", keyId, e))
                .onErrorResume(e -> Mono.empty())
                .subscribe();
    }

    /**
     * Atomically increment failed request counters
     */
    public void incrementFailed(String keyId) {
        statsRepository.incrementFailed(keyId, Duration.ofSeconds(redisTtl))
                .doOnError(e -> log.error("Failed to increment failed for {}", keyId, e))
                .onErrorResume(e -> Mono.empty())
                .subscribe();
    }
} 