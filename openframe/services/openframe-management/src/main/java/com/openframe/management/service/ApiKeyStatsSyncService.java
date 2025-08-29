package com.openframe.management.service;

import com.openframe.data.document.apikey.ApiKeyStats;
import com.openframe.data.repository.apikey.ApiKeyStatsMongoRepository;
import com.openframe.data.repository.redis.ApiKeyStatsSyncRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyStatsSyncService {

    private final ApiKeyStatsSyncRepository redisRepository;
    private final ApiKeyStatsMongoRepository mongoRepository;

    public void syncStatsToMongo() {
        try {
            log.info("Starting sync from Redis to MongoDB");

            Set<String> statsKeys = redisRepository.getAllStatsKeys();
            if (statsKeys.isEmpty()) {
                log.info("No stats found in Redis");
                return;
            }

            log.info("Found {} stats keys to sync", statsKeys.size());

            for (String redisKey : statsKeys) {
                try {
                    syncSingleKey(redisKey);
                    redisRepository.deleteStatsKey(redisKey);
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
        String keyId = redisRepository.extractKeyId(redisKey);

        Map<Object, Object> redisData = redisRepository.getStatsData(redisKey);
        if (redisData.isEmpty()) {
            return;
        }

        Long total = redisRepository.getLong(redisData, "total");
        Long success = redisRepository.getLong(redisData, "success");
        Long failed = redisRepository.getLong(redisData, "failed");
        String lastUsedStr = redisRepository.getString(redisData, "lastUsed");

        ApiKeyStats mongo = mongoRepository.findById(keyId)
                .orElse(new ApiKeyStats());

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



    private Long add(Long a, Long b) {
        return (a == null ? 0 : a) + (b == null ? 0 : b);
    }
} 