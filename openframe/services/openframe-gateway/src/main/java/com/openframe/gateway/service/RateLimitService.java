package com.openframe.gateway.service;

import com.openframe.data.model.enums.RateLimitWindow;
import com.openframe.gateway.config.RateLimitProperties;
import com.openframe.gateway.constants.RateLimitConstants;
import com.openframe.gateway.model.RateLimitStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

import static java.time.LocalDateTime.now;
import static java.time.format.DateTimeFormatter.ofPattern;

/**
 * Service for rate limiting API requests using Redis atomic operations
 * <p>
 * Features:
 * - Multiple time windows (minute, hour, day)
 * - Configurable limits per window
 * - Fail-open strategy for Redis errors
 * - Detailed rate limit status reporting
 * - Atomic Redis hash increments for thread safety
 * - Fully reactive Redis operations using ReactiveStringRedisTemplate
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RateLimitProperties rateLimitProperties;
    private final ReactiveStringRedisTemplate reactiveRedisTemplate;

    @Value("${openframe.rate-limit.redis-ttl}")
    private Long redisTtl;

    @Value("${openframe.rate-limit.fail-open}")
    private boolean failOpen;

    /**
     * Check if request is allowed for all configured time windows
     */
    public Mono<Boolean> isAllowed(String keyId) {
        if (!rateLimitProperties.isEnabled()) {
            log.debug("Rate limiting is disabled globally");
            return Mono.just(true);
        }

        log.debug(RateLimitConstants.LOG_RATE_LIMIT_CHECK, keyId);

        Mono<RateLimitResult> minuteResult = checkAndIncrement(keyId, RateLimitWindow.MINUTE, rateLimitProperties.getDefaultRequestsPerMinute());
        Mono<RateLimitResult> hourResult = checkAndIncrement(keyId, RateLimitWindow.HOUR, rateLimitProperties.getDefaultRequestsPerHour());
        Mono<RateLimitResult> dayResult = checkAndIncrement(keyId, RateLimitWindow.DAY, rateLimitProperties.getDefaultRequestsPerDay());

        return Mono.zip(minuteResult, hourResult, dayResult).map(tuple -> {
            RateLimitResult minute = tuple.getT1();
            RateLimitResult hour = tuple.getT2();
            RateLimitResult day = tuple.getT3();

            boolean allowed = minute.isAllowed() && hour.isAllowed() && day.isAllowed();

            if (!allowed) {
                log.warn("Rate limit exceeded for keyId: {} - minute:{}/{}, hour:{}/{}, day:{}/{}", keyId, minute.getCurrentCount(), minute.getLimit(), hour.getCurrentCount(), hour.getLimit(), day.getCurrentCount(), day.getLimit());
            }

            return allowed;
        }).onErrorReturn(rateLimitProperties.isFailOpen());
    }

    /**
     * Get comprehensive rate limit status for debugging and monitoring
     */
    public Mono<RateLimitStatus> getRateLimitStatus(String keyId) {
        log.debug(RateLimitConstants.LOG_RATE_LIMIT_STATUS, keyId);

        Mono<RateLimitResult> minuteResult = getStatus(keyId, RateLimitWindow.MINUTE, rateLimitProperties.getDefaultRequestsPerMinute());
        Mono<RateLimitResult> hourResult = getStatus(keyId, RateLimitWindow.HOUR, rateLimitProperties.getDefaultRequestsPerHour());
        Mono<RateLimitResult> dayResult = getStatus(keyId, RateLimitWindow.DAY, rateLimitProperties.getDefaultRequestsPerDay());

        return Mono.zip(minuteResult, hourResult, dayResult).map(tuple -> {
            RateLimitResult minute = tuple.getT1();
            RateLimitResult hour = tuple.getT2();
            RateLimitResult day = tuple.getT3();

            return RateLimitStatus.builder().keyId(keyId).minuteRequests((int) minute.getCurrentCount()).minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute()).hourRequests((int) hour.getCurrentCount()).hourLimit(rateLimitProperties.getDefaultRequestsPerHour()).dayRequests((int) day.getCurrentCount()).dayLimit(rateLimitProperties.getDefaultRequestsPerDay()).isMinuteExceeded(!minute.isAllowed()).isHourExceeded(!hour.isAllowed()).isDayExceeded(!day.isAllowed()).build();
        }).onErrorReturn(createEmptyStatus(keyId));
    }

    /**
     * Check rate limit and increment counter atomically
     */
    private Mono<RateLimitResult> checkAndIncrement(String keyId, RateLimitWindow window, long limit) {
        String timestamp = now().format(ofPattern(window.getTimestampFormat()));
        String redisKey = buildRedisKey(keyId, window.name(), timestamp);
        LocalDateTime requestTime = now();

        return reactiveRedisTemplate.opsForHash().increment(redisKey, "count", 1).flatMap(requestCount -> {
            Mono<Void> setupFirstRequest = Mono.empty();

            if (requestCount == 1) {
                setupFirstRequest = reactiveRedisTemplate.opsForHash().put(redisKey, "firstRequest", requestTime.toString()).then();
            }

            return setupFirstRequest.then(reactiveRedisTemplate.opsForHash().put(redisKey, "lastRequest", requestTime.toString()).then()).then(setTtl(redisKey, window)).then(getTimestamp(redisKey, "firstRequest").defaultIfEmpty(requestTime).map(windowStart -> buildRateLimitResult(requestCount, limit, windowStart, requestTime)));
        }).onErrorResume(e -> {
            log.error("Rate limit check failed for keyId: {}, window: {}", keyId, window, e);
            return Mono.just(createFailureResult(limit));
        });
    }

    /**
     * Get current rate limit status without incrementing counter
     */
    private Mono<RateLimitResult> getStatus(String keyId, RateLimitWindow window, long limit) {
        String timestamp = now().format(ofPattern(window.getTimestampFormat()));
        String redisKey = buildRedisKey(keyId, window.name(), timestamp);

        Mono<Long> countMono = reactiveRedisTemplate.opsForHash().get(redisKey, "count").map(value -> {
            try {
                return value != null ? Long.parseLong(value.toString()) : 0L;
            } catch (NumberFormatException e) {
                log.warn("Invalid count value in Redis for key {}", redisKey, e);
                return 0L;
            }
        }).defaultIfEmpty(0L);

        Mono<LocalDateTime> windowStartMono = getTimestamp(redisKey, "firstRequest").defaultIfEmpty(null);
        Mono<LocalDateTime> windowEndMono = getTimestamp(redisKey, "lastRequest").defaultIfEmpty(null);

        return countMono.flatMap(currentCount -> Mono.zip(windowStartMono, windowEndMono).map(tuple -> buildRateLimitResult(currentCount, limit, tuple.getT1(), tuple.getT2())).defaultIfEmpty(buildRateLimitResult(currentCount, limit, null, null))).onErrorResume(e -> {
            log.error("Failed to get rate limit status for keyId: {}, window: {}", keyId, window, e);
            return Mono.just(createFailureResult(limit));
        });
    }

    private String buildRedisKey(String keyId, String window, String timestamp) {
        return String.format("rate_limit:%s:%s:%s", keyId, window, timestamp);
    }

    private Mono<Boolean> setTtl(String redisKey, RateLimitWindow window) {
        long ttlSeconds = Math.max(redisTtl, window.getSeconds() * 2);
        return reactiveRedisTemplate.expire(redisKey, Duration.ofSeconds(ttlSeconds));
    }

    private Mono<LocalDateTime> getTimestamp(String redisKey, String field) {
        return reactiveRedisTemplate.opsForHash().get(redisKey, field).map(timestamp -> {
            try {
                return LocalDateTime.parse(timestamp.toString());
            } catch (Exception e) {
                log.warn("Failed to parse timestamp: {}", timestamp, e);
                return null;
            }
        }).filter(Objects::nonNull);
    }


    private RateLimitResult buildRateLimitResult(Long requestCount, long limit, LocalDateTime windowStart, LocalDateTime windowEnd) {
        return RateLimitResult.builder().allowed(requestCount <= limit).currentCount(requestCount).limit(limit).remaining(Math.max(0, limit - requestCount)).windowStart(windowStart).windowEnd(windowEnd).build();
    }

    private RateLimitResult createFailureResult(long limit) {
        return RateLimitResult.builder().allowed(failOpen).currentCount(0L).limit(limit).remaining(failOpen ? limit : 0L).windowStart(null).windowEnd(null).build();
    }

    private RateLimitStatus createEmptyStatus(String keyId) {
        return RateLimitStatus.builder().keyId(keyId).minuteRequests(0).minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute()).hourRequests(0).hourLimit(rateLimitProperties.getDefaultRequestsPerHour()).dayRequests(0).dayLimit(rateLimitProperties.getDefaultRequestsPerDay()).isMinuteExceeded(false).isHourExceeded(false).isDayExceeded(false).build();
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