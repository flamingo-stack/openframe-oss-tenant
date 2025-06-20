package com.openframe.data.service;

import com.openframe.core.model.MachineTag;
import com.openframe.data.model.redis.RedisMachineTag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class MachineTagRedisService {

    private final RedisTemplate<String, RedisMachineTag> machineTagRedisTemplate;
    private final MongoTemplate mongoTemplate;
    private static final String MACHINE_TAG_KEY_PREFIX = "machineTag:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30); // 30 days by default

    public MachineTagRedisService(RedisTemplate<String, RedisMachineTag> machineTagRedisTemplate, MongoTemplate mongoTemplate) {
        this.machineTagRedisTemplate = machineTagRedisTemplate;
        this.mongoTemplate = mongoTemplate;
        log.info("MachineTagRedisService initialized with Redis support");
    }

    /**
     * 1. Save/update one machineTag
     * @param machineTag machine-tag relationship to save
     * @return true if save was successful
     */
    public boolean saveMachineTag(RedisMachineTag machineTag) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + machineTag.getMachineId() + ":" + machineTag.getTagId();
            machineTagRedisTemplate.opsForValue().set(key, machineTag, DEFAULT_TTL);
            log.debug("MachineTag saved to Redis with key: {}", key);
            return true;
        } catch (Exception e) {
            log.error("Failed to save machineTag to Redis: machineId={}, tagId={}", machineTag.getMachineId(), machineTag.getTagId(), e);
            return false;
        }
    }

    /**
     * 2. Update one from MongoDB database if not found in Redis
     * @param machineId machine ID
     * @param tagId tag ID
     * @return Optional with machine-tag relationship if found
     */
    public Optional<RedisMachineTag> getMachineTagWithRefresh(String machineId, String tagId) {
        String key = MACHINE_TAG_KEY_PREFIX + machineId + ":" + tagId;
        Optional<RedisMachineTag> machineTag = getMachineTag(machineId, tagId);
        if (machineTag.isEmpty()) {
            log.debug("MachineTag not found in Redis for machineId={}, tagId={}, attempting to refresh from MongoDB", machineId, tagId);
            if (refreshMachineTagFromMongoDB(machineId, tagId)) {
                return getMachineTag(machineId, tagId);
            }
        }
        return machineTag;
    }

    /**
     * 3. Update all from MongoDB
     * @return number of machine-tag relationships refreshed
     */
    public long refreshFromMongoDB() {
        try {
            log.info("Starting machine-tag relationship data refresh from MongoDB to Redis");
            
            // Clear all existing machine-tag relationship data in Redis
            String pattern = MACHINE_TAG_KEY_PREFIX + "*";
            Set<String> keys = machineTagRedisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                Long deletedCount = machineTagRedisTemplate.delete(keys);
                log.info("Cleared {} existing machine-tag relationship entries from Redis", deletedCount);
            }
            
            // Load all machine-tag relationships from MongoDB (returns MachineTag objects)
            List<MachineTag> machineTags = mongoTemplate.findAll(MachineTag.class, "machine_tags");
            log.info("Found {} machine-tag relationships in MongoDB", machineTags.size());
            
            // Convert MachineTag to RedisMachineTag and save to Redis
            long savedCount = 0;
            for (MachineTag machineTag : machineTags) {
                RedisMachineTag redisMachineTag = convertToRedisMachineTag(machineTag);
                if (saveMachineTag(redisMachineTag)) {
                    savedCount++;
                }
            }
            
            log.info("Successfully refreshed {} machine-tag relationships from MongoDB to Redis", savedCount);
            return savedCount;
            
        } catch (Exception e) {
            log.error("Failed to refresh machine-tag relationship data from MongoDB to Redis", e);
            return 0;
        }
    }

    /**
     * 4. Find all by machineId (part of primary key)
     * @param machineId machine ID
     * @return list of machine-tag relationships
     */
    public List<RedisMachineTag> getMachineTagsByMachineId(String machineId) {
        try {
            String pattern = MACHINE_TAG_KEY_PREFIX + machineId + ":*";
            Set<String> keys = machineTagRedisTemplate.keys(pattern);
            
            return keys.stream()
                .map(key -> machineTagRedisTemplate.opsForValue().get(key))
                .filter(machineTag -> machineTag != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to get machineTags by machineId from Redis: {}", machineId, e);
            return List.of();
        }
    }

    /**
     * 5. Find all by TagId (part of primary key)
     * @param tagId tag ID
     * @return list of machine-tag relationships
     */
    public List<RedisMachineTag> getMachineTagsByTagId(String tagId) {
        try {
            String pattern = MACHINE_TAG_KEY_PREFIX + "*:" + tagId;
            Set<String> keys = machineTagRedisTemplate.keys(pattern);
            
            return keys.stream()
                .map(key -> machineTagRedisTemplate.opsForValue().get(key))
                .filter(machineTag -> machineTag != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to get machineTags by tagId from Redis: {}", tagId, e);
            return List.of();
        }
    }

    // Helper method to get machineTag by machineId and tagId
    private Optional<RedisMachineTag> getMachineTag(String machineId, String tagId) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + machineId + ":" + tagId;
            RedisMachineTag machineTag = machineTagRedisTemplate.opsForValue().get(key);
            if (machineTag != null) {
                log.debug("MachineTag retrieved from Redis with key: {}", key);
            }
            return Optional.ofNullable(machineTag);
        } catch (Exception e) {
            log.error("Failed to get machineTag from Redis: machineId={}, tagId={}", machineId, tagId, e);
            return Optional.empty();
        }
    }

    // Helper method to refresh one machineTag from MongoDB
    private boolean refreshMachineTagFromMongoDB(String machineId, String tagId) {
        try {
            log.debug("Refreshing machine-tag relationship from MongoDB to Redis: machineId={}, tagId={}", machineId, tagId);
            
            // Get machine-tag relationship from MongoDB (returns MachineTag object)
            MachineTag machineTag = mongoTemplate.findById(machineId + ":" + tagId, MachineTag.class, "machine_tags");
            if (machineTag == null) {
                log.warn("Machine-tag relationship not found in MongoDB: machineId={}, tagId={}", machineId, tagId);
                return false;
            }
            
            // Convert MachineTag to RedisMachineTag and save to Redis
            RedisMachineTag redisMachineTag = convertToRedisMachineTag(machineTag);
            boolean success = saveMachineTag(redisMachineTag);
            if (success) {
                log.debug("Successfully refreshed machine-tag relationship from MongoDB to Redis: machineId={}, tagId={}", machineId, tagId);
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("Failed to refresh machine-tag relationship from MongoDB to Redis: machineId={}, tagId={}", machineId, tagId, e);
            return false;
        }
    }

    // Helper method to convert MachineTag to RedisMachineTag
    private RedisMachineTag convertToRedisMachineTag(MachineTag machineTag) {
        RedisMachineTag redisMachineTag = new RedisMachineTag();
        redisMachineTag.setId(machineTag.getId());
        redisMachineTag.setMachineId(machineTag.getMachineId());
        redisMachineTag.setTagId(machineTag.getTagId());
        redisMachineTag.setTaggedAt(machineTag.getTaggedAt().toString());
        redisMachineTag.setTaggedBy(machineTag.getTaggedBy());
        return redisMachineTag;
    }

    // ========== COMMENTED METHODS ==========
    
    /*
    public boolean saveMachineTag(RedisMachineTag machineTag, Duration ttl) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + machineTag.getId();
            machineTagRedisTemplate.opsForValue().set(key, machineTag, ttl);
            log.debug("MachineTag saved to Redis with key: {} and TTL: {}", key, ttl);
            return true;
        } catch (Exception e) {
            log.error("Failed to save machineTag to Redis: {}", machineTag.getId(), e);
            return false;
        }
    }

    public Optional<RedisMachineTag> getMachineTag(String id) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + id;
            RedisMachineTag machineTag = machineTagRedisTemplate.opsForValue().get(key);
            if (machineTag != null) {
                log.debug("MachineTag retrieved from Redis with key: {}", key);
            }
            return Optional.ofNullable(machineTag);
        } catch (Exception e) {
            log.error("Failed to get machineTag from Redis: {}", id, e);
            return Optional.empty();
        }
    }

    public Optional<RedisMachineTag> getMachineTagWithRefresh(String id) {
        Optional<RedisMachineTag> machineTag = getMachineTag(id);
        if (machineTag.isEmpty()) {
            log.debug("MachineTag {} not found in Redis, attempting to refresh from MongoDB", id);
            if (refreshMachineTagFromMongoDB(id)) {
                return getMachineTag(id);
            }
        }
        return machineTag;
    }

    public List<RedisMachineTag> getMachineTagsByMachineIdWithRefresh(String machineId) {
        List<RedisMachineTag> machineTags = getMachineTagsByMachineId(machineId);
        if (machineTags.isEmpty()) {
            log.debug("No machine-tag relationships found for machineId {} in Redis, attempting to refresh from MongoDB", machineId);
            refreshFromMongoDB();
            return getMachineTagsByMachineId(machineId);
        }
        return machineTags;
    }

    public List<RedisMachineTag> getMachineTagsByTagIdWithRefresh(String tagId) {
        List<RedisMachineTag> machineTags = getMachineTagsByTagId(tagId);
        if (machineTags.isEmpty()) {
            log.debug("No machine-tag relationships found for tagId {} in Redis, attempting to refresh from MongoDB", tagId);
            refreshFromMongoDB();
            return getMachineTagsByTagId(tagId);
        }
        return machineTags;
    }

    public List<RedisMachineTag> getAllMachineTags() {
        try {
            String pattern = MACHINE_TAG_KEY_PREFIX + "*";
            Set<String> keys = machineTagRedisTemplate.keys(pattern);
            
            if (keys == null || keys.isEmpty()) {
                return List.of();
            }
            
            return keys.stream()
                .map(key -> machineTagRedisTemplate.opsForValue().get(key))
                .filter(machineTag -> machineTag != null)
                .toList();
        } catch (Exception e) {
            log.error("Failed to get all machine-tag relationships from Redis", e);
            return List.of();
        }
    }

    public List<RedisMachineTag> getAllMachineTagsWithRefresh() {
        List<RedisMachineTag> machineTags = getAllMachineTags();
        if (machineTags.isEmpty()) {
            log.debug("No machine-tag relationships found in Redis, attempting to refresh from MongoDB");
            refreshFromMongoDB();
            return getAllMachineTags();
        }
        return machineTags;
    }

    public boolean deleteMachineTag(String id) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + id;
            Boolean result = machineTagRedisTemplate.delete(key);
            log.debug("MachineTag deleted from Redis with key: {}", key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to delete machineTag from Redis: {}", id, e);
            return false;
        }
    }

    public long deleteMachineTagsByMachineId(String machineId) {
        try {
            List<RedisMachineTag> machineTags = getMachineTagsByMachineId(machineId);
            long deletedCount = 0;
            
            for (RedisMachineTag machineTag : machineTags) {
                if (deleteMachineTag(machineTag.getId())) {
                    deletedCount++;
                }
            }
            
            log.debug("Deleted {} machineTags for machineId: {}", deletedCount, machineId);
            return deletedCount;
        } catch (Exception e) {
            log.error("Failed to delete machineTags by machineId from Redis: {}", machineId, e);
            return 0;
        }
    }

    public long deleteMachineTagsByTagId(String tagId) {
        try {
            List<RedisMachineTag> machineTags = getMachineTagsByTagId(tagId);
            long deletedCount = 0;
            
            for (RedisMachineTag machineTag : machineTags) {
                if (deleteMachineTag(machineTag.getId())) {
                    deletedCount++;
                }
            }
            
            log.debug("Deleted {} machineTags for tagId: {}", deletedCount, tagId);
            return deletedCount;
        } catch (Exception e) {
            log.error("Failed to delete machineTags by tagId from Redis: {}", tagId, e);
            return 0;
        }
    }

    public boolean exists(String id) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + id;
            Boolean result = machineTagRedisTemplate.hasKey(key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to check machineTag existence in Redis: {}", id, e);
            return false;
        }
    }

    public boolean updateTtl(String id, Duration ttl) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + id;
            Boolean result = machineTagRedisTemplate.expire(key, ttl);
            log.debug("TTL updated for machineTag with key: {} to {}", key, ttl);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to update TTL for machineTag in Redis: {}", id, e);
            return false;
        }
    }

    public boolean refreshMachineTagFromMongoDB(String machineTagId) {
        try {
            log.debug("Refreshing machine-tag relationship {} from MongoDB to Redis", machineTagId);
            
            // Get machine-tag relationship from MongoDB
            RedisMachineTag machineTag = mongoTemplate.findById(machineTagId, RedisMachineTag.class, "machine_tags");
            if (machineTag == null) {
                log.warn("Machine-tag relationship {} not found in MongoDB", machineTagId);
                return false;
            }
            
            // Delete existing machine-tag relationship from Redis
            deleteMachineTag(machineTagId);
            
            // Save updated machine-tag relationship to Redis
            boolean success = saveMachineTag(machineTag);
            if (success) {
                log.debug("Successfully refreshed machine-tag relationship {} from MongoDB to Redis", machineTagId);
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("Failed to refresh machine-tag relationship {} from MongoDB to Redis", machineTagId, e);
            return false;
        }
    }
    */
} 