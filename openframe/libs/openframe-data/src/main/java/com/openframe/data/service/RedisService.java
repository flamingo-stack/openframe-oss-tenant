package com.openframe.data.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final Duration DEFAULT_TTL = Duration.ofDays(30);

    /**
     * Универсальный метод для сохранения объекта в Redis
     * @param key ключ для сохранения
     * @param value значение для сохранения
     * @return true если сохранение прошло успешно
     */
    public boolean save(String key, String value) {
        return save(key, value, DEFAULT_TTL);
    }

    /**
     * Универсальный метод для сохранения объекта в Redis с TTL
     * @param key ключ для сохранения
     * @param value значение для сохранения
     * @param ttl время жизни записи
     * @return true если сохранение прошло успешно
     */
    public boolean save(String key, String value, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(key, value, ttl);
            log.debug("Value saved to Redis with key: {} and TTL: {}", key, ttl);
            return true;
        } catch (Exception e) {
            log.error("Failed to save value to Redis: {}", key, e);
            return false;
        }
    }

    /**
     * Универсальный метод для получения объекта из Redis
     * @param key ключ для получения
     * @return Optional с значением, если найдено
     */
    public Optional<String> get(String key) {
        try {
            String value = redisTemplate.opsForValue().get(key);
            if (value != null) {
                log.debug("Value retrieved from Redis with key: {}", key);
            }
            return Optional.ofNullable(value);
        } catch (Exception e) {
            log.error("Failed to get value from Redis: {}", key, e);
            return Optional.empty();
        }
    }

    /**
     * Универсальный метод для удаления объекта из Redis
     * @param key ключ для удаления
     * @return true если удаление прошло успешно
     */
    public boolean delete(String key) {
        try {
            Boolean result = redisTemplate.delete(key);
            log.debug("Value deleted from Redis with key: {}", key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to delete value from Redis: {}", key, e);
            return false;
        }
    }

    /**
     * Универсальный метод для проверки существования ключа в Redis
     * @param key ключ для проверки
     * @return true если ключ существует
     */
    public boolean exists(String key) {
        try {
            Boolean result = redisTemplate.hasKey(key);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to check key existence in Redis: {}", key, e);
            return false;
        }
    }

    /**
     * Универсальный метод для обновления TTL ключа
     * @param key ключ для обновления TTL
     * @param ttl новое время жизни
     * @return true если обновление прошло успешно
     */
    public boolean updateTtl(String key, Duration ttl) {
        try {
            Boolean result = redisTemplate.expire(key, ttl);
            log.debug("TTL updated for key: {} to {}", key, ttl);
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.error("Failed to update TTL for key in Redis: {}", key, e);
            return false;
        }
    }

    /**
     * Универсальный метод для получения TTL ключа
     * @param key ключ для получения TTL
     * @return Optional с TTL в секундах, если ключ существует
     */
    public Optional<Long> getTtl(String key) {
        try {
            Long ttl = redisTemplate.getExpire(key);
            return Optional.ofNullable(ttl);
        } catch (Exception e) {
            log.error("Failed to get TTL for key in Redis: {}", key, e);
            return Optional.empty();
        }
    }
} 