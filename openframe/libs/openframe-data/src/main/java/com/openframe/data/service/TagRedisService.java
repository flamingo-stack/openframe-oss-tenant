package com.openframe.data.service;

import com.openframe.data.model.redis.RedisTag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class TagRedisService {

    private final RedisTemplate<String, RedisTag> tagRedisTemplate;
    private final MongoTemplate mongoTemplate;
    private static final String TAG_KEY_PREFIX = "tag:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30); // 30 days by default

    public TagRedisService(RedisTemplate<String, RedisTag> tagRedisTemplate, MongoTemplate mongoTemplate) {
        this.tagRedisTemplate = tagRedisTemplate;
        this.mongoTemplate = mongoTemplate;
        log.info("TagRedisService initialized with Redis support");
    }

    /**
     * Saves tag to Redis
     * @param tag tag to save
     * @return true if save was successful
     */
    public boolean saveTag(RedisTag tag) {
        try {
            String key = TAG_KEY_PREFIX + tag.getId();
            tagRedisTemplate.opsForValue().set(key, tag, DEFAULT_TTL);
            log.debug("Tag saved to Redis with key: {}", key);
            return true;
        } catch (Exception e) {
            log.error("Failed to save tag to Redis: {}", tag.getId(), e);
            return false;
        }
    }

    /**
     * Saves tag to Redis with custom TTL
     * @param tag tag to save
     * @param ttl time to live for the record
     * @return true if save was successful
     */
    public boolean saveTag(RedisTag tag, Duration ttl) {
        try {
            String key = TAG_KEY_PREFIX + tag.getId();
            tagRedisTemplate.opsForValue().set(key, tag, ttl);
            log.debug("Tag saved to Redis with key: {} and TTL: {}", key, ttl);
            return true;
        } catch (Exception e) {
            log.error("Failed to save tag to Redis: {}", tag.getId(), e);
            return false;
        }
    }

    /**
     * Gets tag from Redis by ID
     * @param id tag ID
     * @return Optional with tag if found
     */
    public Optional<RedisTag> getTag(String id) {
        try {
            String key = TAG_KEY_PREFIX + id;
            RedisTag tag = tagRedisTemplate.opsForValue().get(key);
            if (tag != null) {
                log.debug("Tag retrieved from Redis with key: {}", key);
            }
            return Optional.ofNullable(tag);
        } catch (Exception e) {
            log.error("Failed to get tag from Redis: {}", id, e);
            return Optional.empty();
        }
    }

    /**
     * Gets tag from Redis by ID with automatic refresh from MongoDB if not found
     * @param id tag ID
     * @return Optional with tag if found
     */
    public Optional<RedisTag> getTagWithRefresh(String id) {
        Optional<RedisTag> tag = getTag(id);
        if (tag.isEmpty()) {
            log.debug("Tag {} not found in Redis, attempting to refresh from MongoDB", id);
            if (refreshTagFromMongoDB(id)) {
                return getTag(id);
            }
        }
        return tag;
    }

    /**
     * Gets all tags from Redis
     * @return list of all tags in Redis
     */
    public List<RedisTag> getAllTags() {
        try {
            String pattern = TAG_KEY_PREFIX + "*";
            Set<String> keys = tagRedisTemplate.keys(pattern);
            
            if (keys == null || keys.isEmpty()) {
                return List.of();
            }
            
            return keys.stream()
                .map(key -> tagRedisTemplate.opsForValue().get(key))
                .filter(tag -> tag != null)
                .toList();
        } catch (Exception e) {
            log.error("Failed to get all tags from Redis", e);
            return List.of();
        }
    }

    /**
     * Gets all tags with automatic refresh from MongoDB if Redis is empty
     * @return list of all tags
     */
    public List<RedisTag> getAllTagsWithRefresh() {
        List<RedisTag> tags = getAllTags();
        if (tags.isEmpty()) {
            log.debug("No tags found in Redis, attempting to refresh from MongoDB");
            refreshFromMongoDB();
            return getAllTags();
        }
        return tags;
    }

    /**
     * Deletes tag from Redis
     * @param id tag ID to delete
     * @return true if deletion was successful
     */
    public boolean deleteTag(String id) {
        try {
            String key = TAG_KEY_PREFIX + id;
            Boolean result = tagRedisTemplate.delete(key);
            log.debug("Tag deleted from Redis with key: {}", key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to delete tag from Redis: {}", id, e);
            return false;
        }
    }

    /**
     * Checks if tag exists in Redis
     * @param id tag ID
     * @return true if tag exists
     */
    public boolean exists(String id) {
        try {
            String key = TAG_KEY_PREFIX + id;
            Boolean result = tagRedisTemplate.hasKey(key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to check tag existence in Redis: {}", id, e);
            return false;
        }
    }

    /**
     * Updates TTL for tag
     * @param id tag ID
     * @param ttl new time to live
     * @return true if update was successful
     */
    public boolean updateTtl(String id, Duration ttl) {
        try {
            String key = TAG_KEY_PREFIX + id;
            Boolean result = tagRedisTemplate.expire(key, ttl);
            log.debug("TTL updated for tag with key: {} to {}", key, ttl);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to update TTL for tag in Redis: {}", id, e);
            return false;
        }
    }

    /**
     * Refreshes all tag data from MongoDB to Redis
     * Clears all existing tag data in Redis and reloads from MongoDB
     * @return number of tags refreshed
     */
    public long refreshFromMongoDB() {
        try {
            log.info("Starting tag data refresh from MongoDB to Redis");
            
            // Clear all existing tag data in Redis
            String pattern = TAG_KEY_PREFIX + "*";
            Set<String> keys = tagRedisTemplate.keys(pattern);
            if (keys != null && !keys.isEmpty()) {
                Long deletedCount = tagRedisTemplate.delete(keys);
                log.info("Cleared {} existing tag entries from Redis", deletedCount);
            }
            
            // Load all tags from MongoDB
            List<RedisTag> tags = mongoTemplate.findAll(RedisTag.class, "tags");
            log.info("Found {} tags in MongoDB", tags.size());
            
            // Save all tags to Redis
            long savedCount = 0;
            for (RedisTag tag : tags) {
                if (saveTag(tag)) {
                    savedCount++;
                }
            }
            
            log.info("Successfully refreshed {} tags from MongoDB to Redis", savedCount);
            return savedCount;
            
        } catch (Exception e) {
            log.error("Failed to refresh tag data from MongoDB to Redis", e);
            return 0;
        }
    }

    /**
     * Refreshes specific tag data from MongoDB to Redis
     * @param tagId tag ID to refresh
     * @return true if refresh was successful
     */
    public boolean refreshTagFromMongoDB(String tagId) {
        try {
            log.debug("Refreshing tag {} from MongoDB to Redis", tagId);
            
            // Get tag from MongoDB
            RedisTag tag = mongoTemplate.findById(tagId, RedisTag.class, "tags");
            if (tag == null) {
                log.warn("Tag {} not found in MongoDB", tagId);
                return false;
            }
            
            // Delete existing tag from Redis
            deleteTag(tagId);
            
            // Save updated tag to Redis
            boolean success = saveTag(tag);
            if (success) {
                log.debug("Successfully refreshed tag {} from MongoDB to Redis", tagId);
            }
            
            return success;
            
        } catch (Exception e) {
            log.error("Failed to refresh tag {} from MongoDB to Redis", tagId, e);
            return false;
        }
    }
} 