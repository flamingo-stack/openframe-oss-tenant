package com.openframe.gateway.service;

import com.openframe.data.model.enums.RateLimitWindow;
import com.openframe.data.model.redis.RateLimit;
import com.openframe.data.repository.redis.RateLimitRepository;
import com.openframe.gateway.config.RateLimitProperties;
import com.openframe.gateway.constants.RateLimitConstants;
import com.openframe.gateway.model.RateLimitStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

import static java.time.LocalDateTime.now;
import static java.time.format.DateTimeFormatter.ofPattern;

/**
 * Service for rate limiting API requests using the new data layer
 * 
 * Features:
 * - Multiple time windows (minute, hour, day)
 * - Configurable limits per window
 * - Fail-open strategy for Redis errors
 * - Detailed rate limit status reporting
 * - TTL management via data layer
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RateLimitProperties rateLimitProperties;
    private final RateLimitRepository rateLimitRepository;

    @Value("${openframe.rate-limit.redis-ttl}")
    private Long redisTtl;

    @Value("${openframe.rate-limit.fail-open}")
    private boolean failOpen;

    /**
     * Check if request is allowed for all configured time windows
     * 
     * @param keyId API key identifier
     * @return true if request is allowed, false if any limit is exceeded
     */
    public Mono<Boolean> isAllowed(String keyId) {
        if (!rateLimitProperties.isEnabled()) {
            log.debug("Rate limiting is disabled globally");
            return Mono.just(true);
        }
        
        log.debug(RateLimitConstants.LOG_RATE_LIMIT_CHECK, keyId);

        return Mono.fromCallable(() -> {
                    RateLimitResult minuteResult = isAllowed(
                            keyId, RateLimitWindow.MINUTE, rateLimitProperties.getDefaultRequestsPerMinute());

                    RateLimitResult hourResult = isAllowed(
                            keyId, RateLimitWindow.HOUR, rateLimitProperties.getDefaultRequestsPerHour());

                    RateLimitResult dayResult = isAllowed(
                            keyId, RateLimitWindow.DAY, rateLimitProperties.getDefaultRequestsPerDay());

                    boolean allowed = minuteResult.isAllowed() && hourResult.isAllowed() && dayResult.isAllowed();

                    if (!allowed) {
                        log.warn("Rate limit exceeded for keyId: {} - minute:{}/{}, hour:{}/{}, day:{}/{}",
                                keyId, minuteResult.getCurrentCount(), minuteResult.getLimit(),
                                hourResult.getCurrentCount(), hourResult.getLimit(),
                                dayResult.getCurrentCount(), dayResult.getLimit());
                    }

                    return allowed;
                })
                .onErrorReturn(rateLimitProperties.isFailOpen());
    }
    
    /**
     * Get comprehensive rate limit status for debugging and monitoring
     * 
     * @param keyId API key identifier
     * @return detailed rate limit status
     */
    public Mono<RateLimitStatus> getRateLimitStatus(String keyId) {
        log.debug(RateLimitConstants.LOG_RATE_LIMIT_STATUS, keyId);

        return Mono.fromCallable(() -> {
                    RateLimitResult minuteResult = getStatus(
                            keyId, RateLimitWindow.MINUTE, rateLimitProperties.getDefaultRequestsPerMinute());

                    RateLimitResult hourResult = getStatus(
                            keyId, RateLimitWindow.HOUR, rateLimitProperties.getDefaultRequestsPerHour());

                    RateLimitResult dayResult = getStatus(
                            keyId, RateLimitWindow.DAY, rateLimitProperties.getDefaultRequestsPerDay());

                    return RateLimitStatus.builder()
                            .keyId(keyId)
                            .minuteRequests((int) minuteResult.getCurrentCount())
                            .minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute())
                            .hourRequests((int) hourResult.getCurrentCount())
                            .hourLimit(rateLimitProperties.getDefaultRequestsPerHour())
                            .dayRequests((int) dayResult.getCurrentCount())
                            .dayLimit(rateLimitProperties.getDefaultRequestsPerDay())
                            .isMinuteExceeded(!minuteResult.isAllowed())
                            .isHourExceeded(!hourResult.isAllowed())
                            .isDayExceeded(!dayResult.isAllowed())
                            .build();
                })
                .onErrorReturn(createEmptyStatus(keyId));
    }

    /**
     * Create empty rate limit status for error cases
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

    /**
     * Check if request is allowed and increment counter
     */
    public RateLimitResult isAllowed(String keyId, RateLimitWindow window, long limit) {
        try {
            String timestamp = now().format(ofPattern(window.getTimestampFormat()));
            String id = RateLimit.buildId(keyId, window.name(), timestamp);

            RateLimit rateLimit = rateLimitRepository.findById(id)
                    .orElse(RateLimit.builder()
                            .id(id)
                            .keyId(keyId)
                            .window(window.name())
                            .timestamp(timestamp)
                            .ttl(Math.max(redisTtl, window.getSeconds() * 2)) // Ensure TTL is at least 2x window
                            .build());

            rateLimit.initializeIfNull();

            boolean allowed = rateLimit.getRequestCount() < limit;

            if (allowed) {
                rateLimit.incrementRequest();
                rateLimitRepository.save(rateLimit);
            }

            return RateLimitResult.builder()
                    .allowed(allowed)
                    .currentCount(rateLimit.getRequestCount())
                    .limit(limit)
                    .remaining(Math.max(0, limit - rateLimit.getRequestCount()))
                    .windowStart(rateLimit.getFirstRequest())
                    .windowEnd(rateLimit.getLastRequest())
                    .build();

        } catch (Exception e) {
            log.error("Rate limit check failed for keyId: {}, window: {}", keyId, window, e);
            return RateLimitResult.builder()
                    .allowed(failOpen)
                    .currentCount(0L)
                    .limit(limit)
                    .remaining(failOpen ? limit : 0L)
                    .build();
        }
    }

    /**
     * Get current rate limit status without incrementing
     */
    public RateLimitResult getStatus(String keyId, RateLimitWindow window, long limit) {
        try {
            String timestamp = now().format(ofPattern(window.getTimestampFormat()));
            String id = RateLimit.buildId(keyId, window.name(), timestamp);

            RateLimit rateLimit = rateLimitRepository.findById(id).orElse(null);

            if (rateLimit == null) {
                return RateLimitResult.builder()
                        .allowed(true)
                        .currentCount(0L)
                        .limit(limit)
                        .remaining(limit)
                        .build();
            }

            return RateLimitResult.builder()
                    .allowed(rateLimit.getRequestCount() < limit)
                    .currentCount(rateLimit.getRequestCount())
                    .limit(limit)
                    .remaining(Math.max(0, limit - rateLimit.getRequestCount()))
                    .windowStart(rateLimit.getFirstRequest())
                    .windowEnd(rateLimit.getLastRequest())
                    .build();

        } catch (Exception e) {
            log.error("Failed to get rate limit status for keyId: {}, window: {}", keyId, window, e);
            return RateLimitResult.builder()
                    .allowed(failOpen)
                    .currentCount(0L)
                    .limit(limit)
                    .remaining(failOpen ? limit : 0L)
                    .build();
        }
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