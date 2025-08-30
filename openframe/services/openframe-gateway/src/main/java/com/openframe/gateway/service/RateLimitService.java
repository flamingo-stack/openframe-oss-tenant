package com.openframe.gateway.service;

import com.openframe.data.model.enums.RateLimitWindow;
import com.openframe.data.repository.redis.ReactiveRateLimitRepository;
import com.openframe.data.repository.redis.ReactiveRateLimitRepository.RateLimitResult;
import com.openframe.gateway.config.prop.RateLimitProperties;
import com.openframe.gateway.constants.RateLimitConstants;
import com.openframe.gateway.model.RateLimitStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;

import static java.time.LocalDateTime.now;
import static java.time.format.DateTimeFormatter.ofPattern;

/**
 * Service for rate limiting API requests using Redis atomic operations via repository
 * <p>
 * Features:
 * - Multiple time windows (minute, hour, day)
 * - Configurable limits per window
 * - Fail-open strategy for Redis errors
 * - Detailed rate limit status reporting
 * - Atomic Redis operations through ReactiveRateLimitRepository
 * - Fully reactive Redis operations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RateLimitProperties rateLimitProperties;
    private final ReactiveRateLimitRepository rateLimitRepository;

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

        return Mono.zip(minuteResult, hourResult, dayResult)
                .map(tuple -> {
                    RateLimitResult minute = tuple.getT1();
                    RateLimitResult hour = tuple.getT2();
                    RateLimitResult day = tuple.getT3();

                    boolean allowed = minute.isAllowed() && hour.isAllowed() && day.isAllowed();

                    if (!allowed) {
                        log.warn("Rate limit exceeded for keyId: {} - minute:{}/{}, hour:{}/{}, day:{}/{}", 
                                keyId, minute.getCurrentCount(), minute.getLimit(), 
                                hour.getCurrentCount(), hour.getLimit(), 
                                day.getCurrentCount(), day.getLimit());
                    }

                    return allowed;
                })
                .onErrorReturn(rateLimitProperties.isFailOpen());
    }

    /**
     * Get comprehensive rate limit status for debugging and monitoring
     */
    public Mono<RateLimitStatus> getRateLimitStatus(String keyId) {
        log.debug(RateLimitConstants.LOG_RATE_LIMIT_STATUS, keyId);

        Mono<RateLimitResult> minuteResult = getStatus(keyId, RateLimitWindow.MINUTE, rateLimitProperties.getDefaultRequestsPerMinute());
        Mono<RateLimitResult> hourResult = getStatus(keyId, RateLimitWindow.HOUR, rateLimitProperties.getDefaultRequestsPerHour());
        Mono<RateLimitResult> dayResult = getStatus(keyId, RateLimitWindow.DAY, rateLimitProperties.getDefaultRequestsPerDay());

        return Mono.zip(minuteResult, hourResult, dayResult)
                .map(tuple -> {
                    RateLimitResult minute = tuple.getT1();
                    RateLimitResult hour = tuple.getT2();
                    RateLimitResult day = tuple.getT3();

                    return RateLimitStatus.builder()
                            .keyId(keyId)
                            .minuteRequests((int) minute.getCurrentCount())
                            .minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute())
                            .hourRequests((int) hour.getCurrentCount())
                            .hourLimit(rateLimitProperties.getDefaultRequestsPerHour())
                            .dayRequests((int) day.getCurrentCount())
                            .dayLimit(rateLimitProperties.getDefaultRequestsPerDay())
                            .isMinuteExceeded(!minute.isAllowed())
                            .isHourExceeded(!hour.isAllowed())
                            .isDayExceeded(!day.isAllowed())
                            .build();
                })
                .onErrorReturn(createEmptyStatus(keyId));
    }

    /**
     * Check rate limit and increment counter atomically using repository
     */
    private Mono<RateLimitResult> checkAndIncrement(String keyId, RateLimitWindow window, long limit) {
        String timestamp = now().format(ofPattern(window.getTimestampFormat()));
        Duration ttl = Duration.ofSeconds(Math.max(redisTtl, window.getSeconds() * 2));

        return rateLimitRepository.checkAndIncrement(keyId, window.name(), timestamp, limit, ttl)
                .onErrorResume(e -> {
                    log.error("Rate limit check failed for keyId: {}, window: {}", keyId, window, e);
                    return Mono.just(createFailureResult(limit));
                });
    }

    /**
     * Get current rate limit status without incrementing counter using repository
     */
    private Mono<RateLimitResult> getStatus(String keyId, RateLimitWindow window, long limit) {
        String timestamp = now().format(ofPattern(window.getTimestampFormat()));

        return rateLimitRepository.getStatus(keyId, window.name(), timestamp, limit)
                .onErrorResume(e -> {
                    log.error("Failed to get rate limit status for keyId: {}, window: {}", keyId, window, e);
                    return Mono.just(createFailureResult(limit));
                });
    }

    /**
     * Create failure result for error cases
     */
    private RateLimitResult createFailureResult(long limit) {
        return RateLimitResult.builder()
                .allowed(failOpen)
                .currentCount(0L)
                .limit(limit)
                .remaining(failOpen ? limit : 0L)
                .windowStart(null)
                .windowEnd(null)
                .build();
    }

    /**
     * Create empty status for error cases
     */
    private RateLimitStatus createEmptyStatus(String keyId) {
        return RateLimitStatus.builder()
                .keyId(keyId)
                .minuteRequests(0)
                .minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute())
                .hourRequests(0)
                .hourLimit(rateLimitProperties.getDefaultRequestsPerHour())
                .dayRequests(0)
                .dayLimit(rateLimitProperties.getDefaultRequestsPerDay())
                .isMinuteExceeded(false)
                .isHourExceeded(false)
                .isDayExceeded(false)
                .build();
    }
} 