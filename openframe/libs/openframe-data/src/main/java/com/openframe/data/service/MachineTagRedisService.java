package com.openframe.data.service;

import com.openframe.core.model.MachineTag;
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

    private final RedisTemplate<String, MachineTag> machineTagRedisTemplate;
    private final MongoTemplate mongoTemplate;
    private static final String MACHINE_TAG_KEY_PREFIX = "machineTag:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30); // 30 days by default

    public MachineTagRedisService(RedisTemplate<String, MachineTag> machineTagRedisTemplate, MongoTemplate mongoTemplate) {
        this.machineTagRedisTemplate = machineTagRedisTemplate;
        this.mongoTemplate = mongoTemplate;
        log.info("MachineTagRedisService initialized with Redis support");
    }

    /**
     * Saves machine-tag relationship to Redis
     * @param machineTag machine-tag relationship to save
     * @return true if save was successful
     */
    public boolean saveMachineTag(MachineTag machineTag) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + machineTag.getId();
            machineTagRedisTemplate.opsForValue().set(key, machineTag, DEFAULT_TTL);
            log.debug("MachineTag saved to Redis with key: {}", key);
            return true;
        } catch (Exception e) {
            log.error("Failed to save machineTag to Redis: {}", machineTag.getId(), e);
            return false;
        }
    }

    /**
     * Saves machine-tag relationship to Redis with custom TTL
     * @param machineTag machine-tag relationship to save
     * @param ttl time to live for the record
     * @return true if save was successful
     */
    public boolean saveMachineTag(MachineTag machineTag, Duration ttl) {
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

    /**
     * Gets machine-tag relationship from Redis by ID
     * @param id machine-tag relationship ID
     * @return Optional with machine-tag relationship if found
     */
    public Optional<MachineTag> getMachineTag(String id) {
        try {
            String key = MACHINE_TAG_KEY_PREFIX + id;
            MachineTag machineTag = machineTagRedisTemplate.opsForValue().get(key);
            if (machineTag != null) {
                log.debug("MachineTag retrieved from Redis with key: {}", key);
            }
            return Optional.ofNullable(machineTag);
        } catch (Exception e) {
            log.error("Failed to get machineTag from Redis: {}", id, e);
            return Optional.empty();
        }
    }

    /**
     * Gets machine-tag relationship from Redis by ID with automatic refresh from MongoDB if not found
     * @param id machine-tag relationship ID
     * @return Optional with machine-tag relationship if found
     */
    public Optional<MachineTag> getMachineTagWithRefresh(String id) {
        Optional<MachineTag> machineTag = getMachineTag(id);
        if (machineTag.isEmpty()) {
            log.debug("MachineTag {} not found in Redis, attempting to refresh from MongoDB", id);
            if (refreshMachineTagFromMongoDB(id)) {
                return getMachineTag(id);
            }
        }
        return machineTag;
    }

    /**
     * Gets all machine-tag relationships by machineId
     * @param machineId machine ID
     * @return list of machine-tag relationships
     */
    public List<MachineTag> getMachineTagsByMachineId(String machineId) {
        try {
            String pattern = MACHINE_TAG_KEY_PREFIX + "*";
            Set<String> keys = machineTagRedisTemplate.keys(pattern);
            
            return keys.stream()
                .map(key -> machineTagRedisTemplate.opsForValue().get(key))
                .filter(machineTag -> machineTag != null && machineId.equals(machineTag.getMachineId()))
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to get machineTags by machineId from Redis: {}", machineId, e);
            return List.of();
        }
    }

    /**
     * Gets all machine-tag relationships by machineId with automatic refresh from MongoDB if not found
     * @param machineId machine ID
     * @return list of machine-tag relationships
     */
    public List<MachineTag> getMachineTagsByMachineIdWithRefresh(String machineId) {
        List<MachineTag> machineTags = getMachineTagsByMachineId(machineId);
        if (machineTags.isEmpty()) {
            log.debug("No machine-tag relationships found for machineId {} in Redis, attempting to refresh from MongoDB", machineId);
            refreshFromMongoDB();
            return getMachineTagsByMachineId(machineId);
        }
        return machineTags;
    }

    /**
     * Gets all machine-tag relationships by tagId
     * @param tagId tag ID
     * @return list of machine-tag relationships
     */
    public List<MachineTag> getMachineTagsByTagId(String tagId) {
        try {
            String pattern = MACHINE_TAG_KEY_PREFIX + "*";
            Set<String> keys = machineTagRedisTemplate.keys(pattern);
            
            return keys.stream()
                .map(key -> machineTagRedisTemplate.opsForValue().get(key))
                .filter(machineTag -> machineTag != null && tagId.equals(machineTag.getTagId()))
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to get machineTags by tagId from Redis: {}", tagId, e);
            return List.of();
        }
    }

    /**
     * Gets all machine-tag relationships by tagId with automatic refresh from MongoDB if not found
     * @param tagId tag ID
     * @return list of machine-tag relationships
     */
    public List<MachineTag> getMachineTagsByTagIdWithRefresh(String tagId) {
        List<MachineTag> machineTags = getMachineTagsByTagId(tagId);
        if (machineTags.isEmpty()) {
            log.debug("No machine-tag relationships found for tagId {} in Redis, attempting to refresh from MongoDB", tagId);
            refreshFromMongoDB();
            return getMachineTagsByTagId(tagId);
        }
        return machineTags;
    }

    /**
     * Gets all machine-tag relationships from Redis
     * @return list of all machine-tag relationships in Redis
     */
    public List<MachineTag> getAllMachineTags() {
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

    /**
     * Gets all machine-tag relationships with automatic refresh from MongoDB if Redis is empty
     * @return list of all machine-tag relationships
     */
    public List<MachineTag> getAllMachineTagsWithRefresh() {
        List<MachineTag> machineTags = getAllMachineTags();
        if (machineTags.isEmpty()) {
            log.debug("No machine-tag relationships found in Redis, attempting to refresh from MongoDB");
            refreshFromMongoDB();
            return getAllMachineTags();
        }
        return machineTags;
    }

    /**
     * Deletes machine-tag relationship from Redis
     * @param id machine-tag relationship ID to delete
     * @return true if deletion was successful
     */
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

    /**
     * Deletes all machine-tag relationships by machineId
     * @param machineId machine ID
     * @return number of deleted relationships
     */
    public long deleteMachineTagsByMachineId(String machineId) {
        try {
            List<MachineTag> machineTags = getMachineTagsByMachineId(machineId);
            long deletedCount = 0;
            
            for (MachineTag machineTag : machineTags) {
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

    /**
     * Deletes all machine-tag relationships by tagId
     * @param tagId tag ID
     * @return number of deleted relationships
     */
    public long deleteMachineTagsByTagId(String tagId) {
        try {
            List<MachineTag> machineTags = getMachineTagsByTagId(tagId);
            long deletedCount = 0;
            
            for (MachineTag machineTag : machineTags) {
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

    /**
     * Checks if machine-tag relationship exists in Redis
     * @param id machine-tag relationship ID
     * @return true if relationship exists
     */
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

    /**
     * Updates TTL for machine-tag relationship
     * @param id machine-tag relationship ID
     * @param ttl new time to live
     * @return true if update was successful
     */
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

    /**
     * Refreshes all machine-tag relationship data from MongoDB to Redis
     * Clears all existing machine-tag relationship data in Redis and reloads from MongoDB
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
            
            // Load all machine-tag relationships from MongoDB
            List<MachineTag> machineTags = mongoTemplate.findAll(MachineTag.class, "machine_tags");
            log.info("Found {} machine-tag relationships in MongoDB", machineTags.size());
            
            // Save all machine-tag relationships to Redis
            long savedCount = 0;
            for (MachineTag machineTag : machineTags) {
                if (saveMachineTag(machineTag)) {
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
     * Refreshes specific machine-tag relationship data from MongoDB to Redis
     * @param machineTagId machine-tag relationship ID to refresh
     * @return true if refresh was successful
     */
    public boolean refreshMachineTagFromMongoDB(String machineTagId) {
        try {
            log.debug("Refreshing machine-tag relationship {} from MongoDB to Redis", machineTagId);
            
            // Get machine-tag relationship from MongoDB
            MachineTag machineTag = mongoTemplate.findById(machineTagId, MachineTag.class, "machine_tags");
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
} 