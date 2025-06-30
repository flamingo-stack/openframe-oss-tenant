package com.openframe.data.repository.redis;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.Optional;

/**
 * Repository for Redis operations in OpenFrame
 */
@Repository
@Slf4j
public class RedisRepository {

    private final RedisTemplate<String, String> redisTemplate;
    
    private static final String MACHINE_ID_CACHE_KEY_PREFIX = "machine_id:";
    private static final Duration MACHINE_ID_CACHE_TTL = Duration.ofHours(6);

    public RedisRepository(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Get machine ID from Redis cache
     * 
     * @param agentId the agent ID to look up
     * @return Optional containing machine ID if found in cache, empty otherwise
     */
    public Optional<String> getMachineIdFromCache(String agentId) {
        try {
            String cacheKey = MACHINE_ID_CACHE_KEY_PREFIX + agentId;
            String machineId = redisTemplate.opsForValue().get(cacheKey);
            return Optional.ofNullable(machineId);
        } catch (Exception e) {
            log.warn("Failed to get machine ID from cache for agent: {}, error: {}", agentId, e.getMessage());
            return Optional.empty();
        }
    }
    
    /**
     * Store machine ID in Redis cache with TTL
     * 
     * @param agentId the agent ID
     * @param machineId the machine ID to cache
     * @return true if successfully cached, false otherwise
     */
    public boolean putMachineIdToCache(String agentId, String machineId) {
        try {
            String cacheKey = MACHINE_ID_CACHE_KEY_PREFIX + agentId;
            redisTemplate.opsForValue().set(cacheKey, machineId, MACHINE_ID_CACHE_TTL);
            log.debug("Cached machine ID for agent: {} with TTL: {}", agentId, MACHINE_ID_CACHE_TTL);
            return true;
        } catch (Exception e) {
            log.warn("Failed to cache machine ID for agent: {}, error: {}", agentId, e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if machine ID exists in cache
     * 
     * @param agentId the agent ID
     * @return true if exists in cache, false otherwise
     */
    public boolean hasMachineIdInCache(String agentId) {
        try {
            String cacheKey = MACHINE_ID_CACHE_KEY_PREFIX + agentId;
            return redisTemplate.hasKey(cacheKey);
        } catch (Exception e) {
            log.warn("Failed to check machine ID in cache for agent: {}, error: {}", agentId, e.getMessage());
            return false;
        }
    }
}
