package com.openframe.data.repository.redis;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.Optional;

/**
 * Repository for Redis operations to cache agent_id by host_id
 * Used in Fleet activities stream processing for enriching activities with agent information
 */
@Repository
@Slf4j
public class HostAgentCacheRepository {

    private final RedisTemplate<String, String> redisTemplate;
    
    private static final String HOST_AGENT_CACHE_KEY_PREFIX = "host_agent:";
    private static final Duration HOST_AGENT_CACHE_TTL = Duration.ofHours(24); // Longer TTL for host-agent mapping

    public HostAgentCacheRepository(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Get agent ID from Redis cache by host ID
     * 
     * @param hostId the host ID to look up
     * @return Optional containing agent ID if found in cache, empty otherwise
     */
    public Optional<String> getAgentIdFromCache(Long hostId) {
        try {
            String cacheKey = HOST_AGENT_CACHE_KEY_PREFIX + hostId;
            String agentId = redisTemplate.opsForValue().get(cacheKey);
            return Optional.ofNullable(agentId);
        } catch (Exception e) {
            log.warn("Failed to get agent ID from cache for host: {}, error: {}", hostId, e.getMessage());
            return Optional.empty();
        }
    }
    
    /**
     * Store agent ID in Redis cache with TTL
     * 
     * @param hostId the host ID
     * @param agentId the agent ID to cache
     * @return true if successfully cached, false otherwise
     */
    public boolean putAgentIdToCache(Long hostId, String agentId) {
        try {
            String cacheKey = HOST_AGENT_CACHE_KEY_PREFIX + hostId;
            redisTemplate.opsForValue().set(cacheKey, agentId, HOST_AGENT_CACHE_TTL);
            log.debug("Cached agent ID for host: {} with TTL: {}", hostId, HOST_AGENT_CACHE_TTL);
            return true;
        } catch (Exception e) {
            log.warn("Failed to cache agent ID for host: {}, error: {}", hostId, e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if agent ID exists in cache for given host ID
     * 
     * @param hostId the host ID
     * @return true if exists in cache, false otherwise
     */
    public boolean hasAgentIdInCache(Long hostId) {
        try {
            String cacheKey = HOST_AGENT_CACHE_KEY_PREFIX + hostId;
            return redisTemplate.hasKey(cacheKey);
        } catch (Exception e) {
            log.warn("Failed to check agent ID in cache for host: {}, error: {}", hostId, e.getMessage());
            return false;
        }
    }

    /**
     * Remove agent ID from cache
     * 
     * @param hostId the host ID
     * @return true if successfully removed, false otherwise
     */
    public boolean removeAgentIdFromCache(Long hostId) {
        try {
            String cacheKey = HOST_AGENT_CACHE_KEY_PREFIX + hostId;
            Boolean result = redisTemplate.delete(cacheKey);
            log.debug("Removed agent ID from cache for host: {}", hostId);
            return result != null && result;
        } catch (Exception e) {
            log.warn("Failed to remove agent ID from cache for host: {}, error: {}", hostId, e.getMessage());
            return false;
        }
    }
} 