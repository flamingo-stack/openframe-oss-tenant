package com.openframe.data.repository.redis;

import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Repository for rate limiting operations using reactive Redis
 */
@Repository
@Slf4j
@RequiredArgsConstructor
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
public class ReactiveRateLimitRepository {

    private final ReactiveStringRedisTemplate redisTemplate;

    private static final String RATE_LIMIT_KEY_PREFIX = "rate_limit:";

    /**
     * Check rate limit and increment counter atomically
     */
    public Mono<RateLimitResult> checkAndIncrement(String keyId, String window, String timestamp, long limit, Duration ttl) {
        String redisKey = buildRedisKey(keyId, window, timestamp);
        LocalDateTime requestTime = LocalDateTime.now();

        return redisTemplate.opsForHash().increment(redisKey, "count", 1)
                .flatMap(requestCount -> {
                    Mono<Void> setupFirstRequest = Mono.empty();

                    if (requestCount == 1) {
                        setupFirstRequest = redisTemplate.opsForHash()
                                .put(redisKey, "firstRequest", requestTime.toString())
                                .then();
                    }

                    return setupFirstRequest
                            .then(redisTemplate.opsForHash().put(redisKey, "lastRequest", requestTime.toString()).then())
                            .then(redisTemplate.expire(redisKey, ttl))
                            .then(getTimestamp(redisKey, "firstRequest")
                                    .defaultIfEmpty(requestTime)
                                    .map(windowStart -> buildRateLimitResult(requestCount, limit, windowStart, requestTime)));
                });
    }

    /**
     * Get current rate limit status without incrementing counter
     */
    public Mono<RateLimitResult> getStatus(String keyId, String window, String timestamp, long limit) {
        String redisKey = buildRedisKey(keyId, window, timestamp);

        Mono<Long> countMono = redisTemplate.opsForHash().get(redisKey, "count")
                .map(value -> value != null ? Long.parseLong(value.toString()) : 0L)
                .defaultIfEmpty(0L);

        Mono<LocalDateTime> windowStartMono = getTimestamp(redisKey, "firstRequest")
                .defaultIfEmpty(LocalDateTime.now());
        Mono<LocalDateTime> windowEndMono = getTimestamp(redisKey, "lastRequest")
                .defaultIfEmpty(LocalDateTime.now());

        return countMono.flatMap(currentCount ->
                Mono.zip(windowStartMono, windowEndMono)
                        .map(tuple -> buildRateLimitResult(currentCount, limit, tuple.getT1(), tuple.getT2())));
    }

    /**
     * Get timestamp from Redis hash field
     */
    private Mono<LocalDateTime> getTimestamp(String redisKey, String field) {
        return redisTemplate.opsForHash().get(redisKey, field)
                .map(timestamp -> {
                    try {
                        return LocalDateTime.parse(timestamp.toString());
                    } catch (Exception e) {
                        log.warn("Failed to parse timestamp: {}", timestamp, e);
                        return null;
                    }
                })
                .filter(Objects::nonNull);
    }

    /**
     * Build Redis key for rate limiting
     */
    private String buildRedisKey(String keyId, String window, String timestamp) {
        return String.format("%s%s:%s:%s", RATE_LIMIT_KEY_PREFIX, keyId, window, timestamp);
    }

    /**
     * Build rate limit result
     */
    private RateLimitResult buildRateLimitResult(Long requestCount, long limit, LocalDateTime windowStart, LocalDateTime windowEnd) {
        return RateLimitResult.builder()
                .allowed(requestCount <= limit)
                .currentCount(requestCount)
                .limit(limit)
                .remaining(Math.max(0, limit - requestCount))
                .windowStart(windowStart)
                .windowEnd(windowEnd)
                .build();
    }

    @Getter
    @Builder
    public static class RateLimitResult {
        private final boolean allowed;
        private final long currentCount;
        private final long limit;
        private final long remaining;
        private final LocalDateTime windowStart;
        private final LocalDateTime windowEnd;
    }
} 