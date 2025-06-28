package com.openframe.gateway.service;

import com.openframe.gateway.config.RateLimitProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * Service for rate limiting API requests using Redis
 * Uses sliding window algorithm with configurable limits
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {
    
    private final ReactiveStringRedisTemplate redisTemplate;
    private final RateLimitProperties rateLimitProperties;
    
    private static final String RATE_LIMIT_KEY_PREFIX = "rate_limit:";
    
    /**
     * Check if request is allowed based on rate limits
     */
    public Mono<Boolean> isAllowed(String keyId) {
        return checkRateLimit(keyId, "minute", rateLimitProperties.getDefaultRequestsPerMinute(), Duration.ofMinutes(1))
            .flatMap(minuteAllowed -> {
                if (!minuteAllowed) {
                    return Mono.just(false);
                }
                return checkRateLimit(keyId, "hour", rateLimitProperties.getDefaultRequestsPerHour(), Duration.ofHours(1));
            })
            .doOnNext(allowed -> {
                if (!allowed) {
                    log.warn("Rate limit exceeded for API key: {}", keyId);
                }
            })
            .onErrorReturn(true); // Fail open on Redis errors
    }
    
    /**
     * Check rate limit for specific time window
     */
    private Mono<Boolean> checkRateLimit(String keyId, String window, int limit, Duration duration) {
        String key = RATE_LIMIT_KEY_PREFIX + keyId + ":" + window;
        
        return redisTemplate.opsForValue()
            .increment(key)
            .flatMap(count -> {
                if (count == 1) {
                    // First request in window, set expiration
                    return redisTemplate.expire(key, duration)
                        .then(Mono.just(true));
                } else if (count <= limit) {
                    return Mono.just(true);
                } else {
                    return Mono.just(false);
                }
            })
            .onErrorResume(error -> {
                log.error("Redis error in rate limiting for key {}: {}", key, error.getMessage());
                return Mono.just(true); // Fail open
            });
    }
    
    /**
     * Get current rate limit status for debugging
     */
    public Mono<RateLimitStatus> getRateLimitStatus(String keyId) {
        String minuteKey = RATE_LIMIT_KEY_PREFIX + keyId + ":minute";
        String hourKey = RATE_LIMIT_KEY_PREFIX + keyId + ":hour";
        
        return Mono.zip(
            redisTemplate.opsForValue().get(minuteKey).defaultIfEmpty("0"),
            redisTemplate.opsForValue().get(hourKey).defaultIfEmpty("0")
        ).map(tuple -> {
            int minuteCount = Integer.parseInt(tuple.getT1());
            int hourCount = Integer.parseInt(tuple.getT2());
            
            return RateLimitStatus.builder()
                .keyId(keyId)
                .minuteRequests(minuteCount)
                .minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute())
                .hourRequests(hourCount)
                .hourLimit(rateLimitProperties.getDefaultRequestsPerHour())
                .build();
        })
        .onErrorReturn(RateLimitStatus.builder()
            .keyId(keyId)
            .minuteRequests(0)
            .minuteLimit(rateLimitProperties.getDefaultRequestsPerMinute())
            .hourRequests(0)
            .hourLimit(rateLimitProperties.getDefaultRequestsPerHour())
            .build());
    }
    
    /**
     * Rate limit status information
     */
    public static class RateLimitStatus {
        private final String keyId;
        private final int minuteRequests;
        private final int minuteLimit;
        private final int hourRequests;
        private final int hourLimit;
        
        private RateLimitStatus(String keyId, int minuteRequests, int minuteLimit, 
                               int hourRequests, int hourLimit) {
            this.keyId = keyId;
            this.minuteRequests = minuteRequests;
            this.minuteLimit = minuteLimit;
            this.hourRequests = hourRequests;
            this.hourLimit = hourLimit;
        }
        
        public static Builder builder() {
            return new Builder();
        }
        
        public boolean isMinuteExceeded() {
            return minuteRequests >= minuteLimit;
        }
        
        public boolean isHourExceeded() {
            return hourRequests >= hourLimit;
        }
        
        // Getters
        public String getKeyId() { return keyId; }
        public int getMinuteRequests() { return minuteRequests; }
        public int getMinuteLimit() { return minuteLimit; }
        public int getHourRequests() { return hourRequests; }
        public int getHourLimit() { return hourLimit; }
        
        public static class Builder {
            private String keyId;
            private int minuteRequests;
            private int minuteLimit;
            private int hourRequests;
            private int hourLimit;
            
            public Builder keyId(String keyId) {
                this.keyId = keyId;
                return this;
            }
            
            public Builder minuteRequests(int minuteRequests) {
                this.minuteRequests = minuteRequests;
                return this;
            }
            
            public Builder minuteLimit(int minuteLimit) {
                this.minuteLimit = minuteLimit;
                return this;
            }
            
            public Builder hourRequests(int hourRequests) {
                this.hourRequests = hourRequests;
                return this;
            }
            
            public Builder hourLimit(int hourLimit) {
                this.hourLimit = hourLimit;
                return this;
            }
            
            public RateLimitStatus build() {
                return new RateLimitStatus(keyId, minuteRequests, minuteLimit, hourRequests, hourLimit);
            }
        }
    }
} 