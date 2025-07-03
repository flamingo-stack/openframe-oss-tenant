package com.openframe.management.service;

import com.openframe.data.model.mongo.ApiKeyStatsMongo;
import com.openframe.data.repository.mongo.ApiKeyStatsMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyStatsSyncService {

    private final StringRedisTemplate redisTemplate;
    private final ApiKeyStatsMongoRepository mongoRepository;

    public void syncStatsToMongo() {
        try {
            log.info("Starting sync from Redis to MongoDB");

            Set<String> statsKeys = redisTemplate.keys("stats:*");
            if (statsKeys.isEmpty()) {
                log.info("No stats found in Redis");
                return;
            }

            log.info("Found {} stats keys to sync", statsKeys.size());

            for (String redisKey : statsKeys) {
                try {
                    syncSingleKey(redisKey);
                    redisTemplate.delete(redisKey);
                } catch (Exception e) {
                    log.error("Failed to sync key: {}", redisKey, e);
                }
            }

            log.info("Completed stats sync");
        } catch (Exception e) {
            log.error("Stats sync failed", e);
        }
    }

    private void syncSingleKey(String redisKey) {
        String keyId = redisKey.replace("stats:", "");

        Map<Object, Object> redisData = redisTemplate.opsForHash().entries(redisKey);
        if (redisData.isEmpty()) {
            return;
        }

        Long total = getLong(redisData, "total");
        Long success = getLong(redisData, "success");
        Long failed = getLong(redisData, "failed");
        String lastUsedStr = getString(redisData, "lastUsed");

        ApiKeyStatsMongo mongo = mongoRepository.findById(keyId)
                .orElse(new ApiKeyStatsMongo());

        mongo.setId(keyId);
        mongo.setTotalRequests(add(mongo.getTotalRequests(), total));
        mongo.setSuccessfulRequests(add(mongo.getSuccessfulRequests(), success));
        mongo.setFailedRequests(add(mongo.getFailedRequests(), failed));

        if (lastUsedStr != null) {
            try {
                LocalDateTime lastUsed = LocalDateTime.parse(lastUsedStr);
                if (mongo.getLastUsed() == null || lastUsed.isAfter(mongo.getLastUsed())) {
                    mongo.setLastUsed(lastUsed);
                }
            } catch (Exception e) {
                log.warn("Failed to parse lastUsed: {}", lastUsedStr);
            }
        }

        mongoRepository.save(mongo);
        log.debug("Synced stats for keyId: {} - total: {}, success: {}, failed: {}",
                keyId, total, success, failed);
    }

    private Long getLong(Map<Object, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return 0L;
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private String getString(Map<Object, Object> data, String key) {
        Object value = data.get(key);
        return value != null ? value.toString() : null;
    }

    private Long add(Long a, Long b) {
        return (a == null ? 0 : a) + (b == null ? 0 : b);
    }
} 