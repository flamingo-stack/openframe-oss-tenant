package com.openframe.core.security.interceptor;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@ConditionalOnProperty(name = "spring.redis.enabled", havingValue = "true", matchIfMissing = false)
public class RateLimitInterceptor implements HandlerInterceptor {
    
    private final RedisTemplate<String, String> redisTemplate;
    private static final int RATE_LIMIT = 100; // requests per minute
    private static final Duration WINDOW = Duration.ofMinutes(1);
    
    public RateLimitInterceptor(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey == null) {
            return true; // Skip rate limiting if no API key (will be handled by security filter)
        }
        
        String key = "rate_limit:" + apiKey;
        
        Long requests = redisTemplate.opsForValue().increment(key, 1);
        if (requests == 1) {
            redisTemplate.expire(key, WINDOW);
        }
        
        if (requests > RATE_LIMIT) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Rate limit exceeded. Please try again later.");
            return false;
        }
        
        return true;
    }
} 