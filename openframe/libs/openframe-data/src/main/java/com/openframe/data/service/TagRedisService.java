package com.openframe.data.service;

import com.openframe.core.model.Tag;
import com.openframe.data.model.redis.RedisTag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TagRedisService {

    private final RedisTemplate<String, RedisTag> tagRedisTemplate;
    private static final String TAG_KEY_PREFIX = "tag:";
    private static final Duration DEFAULT_TTL = Duration.ofDays(30); // 30 дней по умолчанию

    /**
     * Сохраняет тег в Redis
     * @param tag тег для сохранения
     * @return true если сохранение прошло успешно
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
     * Сохраняет тег в Redis с кастомным TTL
     * @param tag тег для сохранения
     * @param ttl время жизни записи
     * @return true если сохранение прошло успешно
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
     * Получает тег из Redis по ID
     * @param id ID тега
     * @return Optional с тегом, если найден
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
     * Удаляет тег из Redis
     * @param id ID тега для удаления
     * @return true если удаление прошло успешно
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
     * Проверяет существование тега в Redis
     * @param id ID тега
     * @return true если тег существует
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
     * Обновляет TTL для тега
     * @param id ID тега
     * @param ttl новое время жизни
     * @return true если обновление прошло успешно
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
} 