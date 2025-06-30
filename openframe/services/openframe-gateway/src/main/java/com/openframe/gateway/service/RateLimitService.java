package com.openframe.gateway.service;

import com.openframe.gateway.config.RateLimitProperties;
import com.openframe.gateway.constants.RateLimitConstants;
import com.openframe.gateway.model.RateLimitStatus;
import com.openframe.gateway.model.RateLimitWindow;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * Service for rate limiting API requests using Redis with sliding window algorithm
 * 
 * Features:
 * - Multiple time windows (minute, hour, day)
 * - Configurable limits per window
 * - Fail-open strategy for Redis errors
 * - Detailed rate limit status reporting
 * - Redis key expiration management
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {
    
    private final ReactiveStringRedisTemplate redisTemplate;
    private final RateLimitProperties rateLimitProperties;
    
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
        
        // Check all time windows sequentially (fail-fast)
        return checkTimeWindow(keyId, RateLimitWindow.MINUTE)
            .flatMap(minuteAllowed -> {
                if (!minuteAllowed) {
                    logRateLimitViolation(keyId, RateLimitWindow.MINUTE);
                    return Mono.just(false);
                }
                return checkTimeWindow(keyId, RateLimitWindow.HOUR);
            })
            .flatMap(hourAllowed -> {
                if (!hourAllowed) {
                    logRateLimitViolation(keyId, RateLimitWindow.HOUR);
                    return Mono.just(false);
                }
                return checkTimeWindow(keyId, RateLimitWindow.DAY);
            })
            .doOnNext(allowed -> {
                if (!allowed) {
                    logRateLimitViolation(keyId, RateLimitWindow.DAY);
                }
            })
            .onErrorResume(error -> {
                log.error(RateLimitConstants.LOG_REDIS_ERROR, keyId, error.getMessage());
                return Mono.just(rateLimitProperties.isFailOpen()); // Configurable fail strategy
            });
    }
    
    /**
     * Check rate limit for specific time window
     * 
     * @param keyId API key identifier
     * @param window Time window to check
     * @return true if request is allowed within this window
     */
    private Mono<Boolean> checkTimeWindow(String keyId, RateLimitWindow window) {
        String redisKey = buildRedisKey(keyId, window);
        int limit = rateLimitProperties.getLimitForWindow(window);
        
        return redisTemplate.opsForValue()
            .increment(redisKey)
            .timeout(rateLimitProperties.getRedisTimeout())
            .flatMap(count -> {
                log.debug("Current count for key {} in window {}: {}/{}", 
                    keyId, window.getKeySuffix(), count, limit);
                
                if (count == 1) {
                    // First request in window, set expiration
                    return redisTemplate.expire(redisKey, window.getDuration())
                        .then(Mono.just(true));
                } else if (count <= limit) {
                    return Mono.just(true);
                } else {
                    return Mono.just(false);
                }
            });
    }
    
    /**
     * Get comprehensive rate limit status for debugging and monitoring
     * 
     * @param keyId API key identifier
     * @return detailed rate limit status
     */
    public Mono<RateLimitStatus> getRateLimitStatus(String keyId) {
        log.debug(RateLimitConstants.LOG_RATE_LIMIT_STATUS, keyId);
        
        List<Mono<String>> countMonos = List.of(
            getCurrentCount(keyId, RateLimitWindow.MINUTE),
            getCurrentCount(keyId, RateLimitWindow.HOUR)
        );
        
        return Flux.merge(countMonos)
            .collectList()
            .map(counts -> {
                int minuteCount = parseCount(counts.get(0));
                int hourCount = parseCount(counts.get(1));
                
                int minuteLimit = rateLimitProperties.getDefaultRequestsPerMinute();
                int hourLimit = rateLimitProperties.getDefaultRequestsPerHour();
                
                return RateLimitStatus.builder()
                    .keyId(keyId)
                    .minuteRequests(minuteCount)
                    .minuteLimit(minuteLimit)
                    .hourRequests(hourCount)
                    .hourLimit(hourLimit)
                    .isMinuteExceeded(minuteCount >= minuteLimit)
                    .isHourExceeded(hourCount >= hourLimit)
                    .build();
            })
            .onErrorReturn(createEmptyStatus(keyId));
    }
    
    /**
     * Reset rate limits for a specific API key (useful for testing/admin operations)
     * 
     * @param keyId API key identifier
     * @return completion signal
     */
    public Mono<Void> resetRateLimits(String keyId) {
        log.info(RateLimitConstants.LOG_RATE_LIMIT_RESET, keyId);
        
        List<String> keysToDelete = List.of(
            buildRedisKey(keyId, RateLimitWindow.MINUTE),
            buildRedisKey(keyId, RateLimitWindow.HOUR),
            buildRedisKey(keyId, RateLimitWindow.DAY)
        );
        
        return redisTemplate.delete(keysToDelete.toArray(new String[0]))
                         .doOnSuccess(deletedCount -> 
                log.info(RateLimitConstants.LOG_RATE_LIMIT_DELETED, deletedCount, keyId))
            .then();
    }
    
    /**
     * Get current request count for specific time window
     */
    private Mono<String> getCurrentCount(String keyId, RateLimitWindow window) {
        String redisKey = buildRedisKey(keyId, window);
        return redisTemplate.opsForValue()
            .get(redisKey)
            .defaultIfEmpty("0");
    }
    
    /**
     * Build Redis key for rate limiting
     */
    private String buildRedisKey(String keyId, RateLimitWindow window) {
        return rateLimitProperties.getKeyPrefix() + keyId + ":" + window.getKeySuffix();
    }
    
    /**
     * Parse count string to integer, handling errors gracefully
     */
    private int parseCount(String countStr) {
        try {
            return Integer.parseInt(countStr);
        } catch (NumberFormatException e) {
            log.warn("Failed to parse count: {}, defaulting to 0", countStr);
            return 0;
        }
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
            .isMinuteExceeded(false)
            .isHourExceeded(false)
            .build();
    }
    
    /**
     * Log rate limit violation if logging is enabled
     */
    private void logRateLimitViolation(String keyId, RateLimitWindow window) {
        if (rateLimitProperties.isLogViolations()) {
            log.warn(RateLimitConstants.LOG_RATE_LIMIT_EXCEEDED, keyId, window.getKeySuffix());
        }
    }
} 