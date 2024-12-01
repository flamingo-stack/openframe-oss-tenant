package com.openframe.core.security.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class ApiKeyService {
    
    private final RedisTemplate<String, String> redisTemplate;
    private static final String API_KEY_PREFIX = "api_key:";
    
    public ApiKeyService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    public boolean validateApiKey(String apiKey) {
        String owner = redisTemplate.opsForValue().get(API_KEY_PREFIX + apiKey);
        return owner != null;
    }
    
    public String getApiKeyOwner(String apiKey) {
        return redisTemplate.opsForValue().get(API_KEY_PREFIX + apiKey);
    }
    
    public void registerApiKey(String apiKey, String owner) {
        redisTemplate.opsForValue().set(API_KEY_PREFIX + apiKey, owner);
    }
    
    public void revokeApiKey(String apiKey) {
        redisTemplate.delete(API_KEY_PREFIX + apiKey);
    }
} 