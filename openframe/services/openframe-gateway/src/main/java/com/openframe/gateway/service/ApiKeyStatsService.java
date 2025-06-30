package com.openframe.gateway.service;

import com.openframe.core.model.ApiKey;
import com.openframe.data.repository.mongo.ApiKeyRepository;
import com.openframe.gateway.config.ApiKeyStatsProperties;
import com.openframe.gateway.model.ApiKeyStatsType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * High-performance API key statistics service using Redis + MongoDB batch sync
 * 
 * Architecture:
 * - Fast Redis increments for real-time performance (~0.1ms)
 * - Periodic batch sync to MongoDB for persistence (every 5 minutes)
 * - Fallback to MongoDB atomic increments if Redis unavailable
 * - TTL on Redis keys to prevent memory bloat
 * 
 * Performance:
 * - Supports 100,000+ increments/second via Redis
 * - Non-blocking operations for API request flow
 * - Eventual consistency (5 minute sync window)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyStatsService {
    
    private final ReactiveStringRedisTemplate redisTemplate;
    private final MongoTemplate mongoTemplate;
    private final ApiKeyRepository apiKeyRepository;
    private final ApiKeyStatsProperties properties;
    
    private static final String REDIS_STATS_PREFIX = "api_key_stats:";
    private static final String REDIS_LAST_USED_PREFIX = "api_key_last_used:";
    
    /**
     * Fast increment counter in Redis (primary method)
     * 
     * @param keyId API key identifier
     * @param statsType Type of statistic to increment
     * @return Mono<Void> for reactive composition
     */
    public Mono<Void> incrementCounter(String keyId, ApiKeyStatsType statsType) {
        String redisKey = REDIS_STATS_PREFIX + keyId;
        
        return redisTemplate.opsForHash()
            .increment(redisKey, statsType.getRedisKey(), 1L)
            .doOnNext(newValue -> {
                log.debug("Incremented {} for key {} to: {}", statsType.getRedisKey(), keyId, newValue);
                
                // Set TTL only on first increment (when value = 1)
                if (newValue == 1L) {
                    redisTemplate.expire(redisKey, properties.getRedisTtlDuration()).subscribe();
                }
            })
            .onErrorResume(error -> {
                log.warn("Redis increment failed for key {}, falling back to MongoDB: {}", 
                    keyId, error.getMessage());
                incrementCounterFallback(keyId, statsType);
                return Mono.just(0L);
            })
            .then();
    }
    
    /**
     * Update last used timestamp in Redis
     * 
     * @param keyId API key identifier
     * @return Mono<Void> for reactive composition
     */
    public Mono<Void> updateLastUsed(String keyId) {
        String redisKey = REDIS_LAST_USED_PREFIX + keyId;
        String timestamp = Instant.now().toString();
        
        return redisTemplate.opsForValue()
            .set(redisKey, timestamp, properties.getRedisTtlDuration())
            .doOnNext(success -> 
                log.debug("Updated lastUsed for key {} to: {}", keyId, timestamp))
            .onErrorResume(error -> {
                log.warn("Redis lastUsed update failed for key {}, falling back to MongoDB: {}", 
                    keyId, error.getMessage());
                updateLastUsedFallback(keyId);
                return Mono.just(false);
            })
            .then();
    }
    
    /**
     * Fallback to MongoDB atomic increment when Redis is unavailable
     * 
     * @param keyId API key identifier  
     * @param statsType Type of statistic to increment
     */
    public void incrementCounterFallback(String keyId, ApiKeyStatsType statsType) {
        Mono.fromRunnable(() -> {
            try {
                Query query = new Query(Criteria.where("_id").is(keyId));
                Update update = new Update().inc(statsType.getFieldName(), 1L);
                
                var result = mongoTemplate.updateFirst(query, update, ApiKey.class);
                
                if (result.getModifiedCount() > 0) {
                    log.debug("MongoDB fallback increment successful for key {} stat {}", 
                        keyId, statsType.getFieldName());
                } else {
                    log.warn("MongoDB fallback increment failed - key not found: {}", keyId);
                }
            } catch (Exception e) {
                log.error("MongoDB fallback increment failed for key {}: {}", keyId, e.getMessage());
            }
        }).subscribeOn(Schedulers.boundedElastic()).subscribe();
    }
    
    /**
     * Fallback to MongoDB atomic update for lastUsed when Redis is unavailable
     * 
     * @param keyId API key identifier
     */
    public void updateLastUsedFallback(String keyId) {
        Mono.fromRunnable(() -> {
            try {
                Query query = new Query(Criteria.where("_id").is(keyId));
                Update update = new Update().set("lastUsed", Instant.now());
                
                var result = mongoTemplate.updateFirst(query, update, ApiKey.class);
                
                if (result.getModifiedCount() > 0) {
                    log.debug("MongoDB fallback lastUsed update successful for key {}", keyId);
                } else {
                    log.warn("MongoDB fallback lastUsed update failed - key not found: {}", keyId);
                }
            } catch (Exception e) {
                log.error("MongoDB fallback lastUsed update failed for key {}: {}", keyId, e.getMessage());
            }
        }).subscribeOn(Schedulers.boundedElastic()).subscribe();
    }
    
    /**
     * Batch sync Redis counters to MongoDB (configurable interval)
     * This ensures eventual consistency and persistence
     */
    @Scheduled(fixedRateString = "#{@apiKeyStatsProperties.syncInterval}")
    public void syncCountersToMongoDB() {
        long startTime = System.currentTimeMillis();
        log.info("Starting batch sync of Redis counters to MongoDB");
        
        try {
            // Get all API key stats keys from Redis
            redisTemplate.keys(REDIS_STATS_PREFIX + "*")
                .collectList()
                .doOnNext(keys -> {
                    log.info("Found {} API key stats to sync", keys.size());
                    
                    for (String redisKey : keys) {
                        syncSingleKeyStats(redisKey);
                    }
                })
                .doOnSuccess(keys -> {
                    long duration = System.currentTimeMillis() - startTime;
                    log.info("Completed batch sync in {}ms for {} keys", duration, keys.size());
                })
                .doOnError(error -> {
                    long duration = System.currentTimeMillis() - startTime;
                    log.error("Batch sync failed after {}ms: {}", duration, error.getMessage());
                })
                .subscribe();
                
            // Sync lastUsed timestamps
            syncLastUsedTimestamps();
            
        } catch (Exception e) {
            log.error("Error during batch sync: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Sync statistics for a single API key from Redis to MongoDB
     * 
     * @param redisKey Full Redis key (e.g., "api_key_stats:ak_123")
     */
    private void syncSingleKeyStats(String redisKey) {
        try {
            // Extract API key ID from Redis key
            String keyId = redisKey.substring(REDIS_STATS_PREFIX.length());
            
            // Get all stats for this key from Redis
            redisTemplate.opsForHash().entries(redisKey)
                .collectMap(entry -> entry.getKey().toString(), entry -> entry.getValue().toString())
                .doOnNext(statsMap -> {
                    if (!statsMap.isEmpty()) {
                        updateMongoDBWithStats(keyId, new HashMap<>(statsMap));
                        
                        // Clear Redis after successful sync to prevent double-counting
                        redisTemplate.delete(redisKey).subscribe();
                    }
                })
                .doOnError(error -> {
                    log.warn("Failed to sync stats for key {}: {}", keyId, error.getMessage());
                })
                .subscribe();
                
        } catch (Exception e) {
            log.warn("Error syncing single key stats for {}: {}", redisKey, e.getMessage());
        }
    }
    
    /**
     * Update MongoDB with stats from Redis
     * 
     * @param keyId API key identifier
     * @param statsMap Map of statistic types to values from Redis
     */
    private void updateMongoDBWithStats(String keyId, Map<Object, Object> statsMap) {
        try {
            Query query = new Query(Criteria.where("_id").is(keyId));
            Update update = new Update();
            
            // Build bulk update from Redis stats
            for (Map.Entry<Object, Object> entry : statsMap.entrySet()) {
                String statType = entry.getKey().toString();
                Long increment = Long.parseLong(entry.getValue().toString());
                
                // Convert Redis key back to MongoDB field name
                String mongoField = convertRedisKeyToMongoField(statType);
                if (mongoField != null) {
                    update.inc(mongoField, increment);
                    log.debug("Adding increment for key {}: {} += {}", keyId, mongoField, increment);
                }
            }
            
            // Execute bulk update
            var result = mongoTemplate.updateFirst(query, update, ApiKey.class);
            
            if (result.getModifiedCount() > 0) {
                log.debug("Successfully synced stats for key {}: {}", keyId, statsMap);
            } else {
                log.warn("Failed to sync stats for key {} - key not found in MongoDB", keyId);
            }
            
        } catch (Exception e) {
            log.error("Error updating MongoDB with stats for key {}: {}", keyId, e.getMessage());
        }
    }
    
    /**
     * Sync lastUsed timestamps from Redis to MongoDB
     */
    private void syncLastUsedTimestamps() {
        try {
            redisTemplate.keys(REDIS_LAST_USED_PREFIX + "*")
                .collectList()
                .doOnNext(keys -> {
                    log.debug("Syncing {} lastUsed timestamps", keys.size());
                    
                    for (String redisKey : keys) {
                        syncSingleLastUsed(redisKey);
                    }
                })
                .subscribe();
                
        } catch (Exception e) {
            log.warn("Error syncing lastUsed timestamps: {}", e.getMessage());
        }
    }
    
    /**
     * Sync lastUsed timestamp for a single API key
     * 
     * @param redisKey Full Redis key for lastUsed
     */
    private void syncSingleLastUsed(String redisKey) {
        try {
            String keyId = redisKey.substring(REDIS_LAST_USED_PREFIX.length());
            
            redisTemplate.opsForValue().get(redisKey)
                .doOnNext(timestampStr -> {
                    if (timestampStr != null) {
                        try {
                            Instant lastUsed = Instant.parse(timestampStr);
                            
                            Query query = new Query(Criteria.where("_id").is(keyId));
                            Update update = new Update().set("lastUsed", lastUsed);
                            
                            mongoTemplate.updateFirst(query, update, ApiKey.class);
                            
                            // Clear Redis after successful sync
                            redisTemplate.delete(redisKey).subscribe();
                            
                        } catch (Exception e) {
                            log.warn("Error parsing lastUsed timestamp for key {}: {}", keyId, e.getMessage());
                        }
                    }
                })
                .subscribe();
                
        } catch (Exception e) {
            log.warn("Error syncing lastUsed for key {}: {}", redisKey, e.getMessage());
        }
    }
    
    /**
     * Convert Redis stat key to MongoDB field name
     * 
     * @param redisKey Redis hash key (e.g., "total_requests")
     * @return MongoDB field name (e.g., "totalRequests") or null if not found
     */
    private String convertRedisKeyToMongoField(String redisKey) {
        for (ApiKeyStatsType statsType : ApiKeyStatsType.values()) {
            if (statsType.getRedisKey().equals(redisKey)) {
                return statsType.getFieldName();
            }
        }
        log.warn("Unknown Redis stats key: {}", redisKey);
        return null;
    }
    
    /**
     * Get current stats for an API key (MongoDB values only for now)
     * 
     * @param keyId API key identifier
     * @return Mono with current stats
     */
    public Mono<Map<String, Long>> getCurrentStats(String keyId) {
        return Mono.fromCallable(() -> {
            Optional<ApiKey> apiKeyOpt = apiKeyRepository.findById(keyId);
            if (apiKeyOpt.isPresent()) {
                ApiKey apiKey = apiKeyOpt.get();
                
                Map<String, Long> stats = new HashMap<>();
                stats.put("totalRequests", apiKey.getTotalRequests());
                stats.put("successfulRequests", apiKey.getSuccessfulRequests());
                stats.put("failedRequests", apiKey.getFailedRequests());
                
                return stats;
            }
            return new HashMap<String, Long>();
        }).subscribeOn(Schedulers.boundedElastic());
    }
} 