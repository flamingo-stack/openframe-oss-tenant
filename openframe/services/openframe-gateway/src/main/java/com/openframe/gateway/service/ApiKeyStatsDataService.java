package com.openframe.gateway.service;

import com.openframe.data.model.mongo.ApiKeyStatsMongo;
import com.openframe.data.model.redis.ApiKeyStats;
import com.openframe.data.repository.mongo.ApiKeyStatsMongoRepository;
import com.openframe.data.repository.redis.ApiKeyStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for handling API key statistics data operations
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyStatsDataService {

    private final ApiKeyStatsRepository redisRepository;
    private final ApiKeyStatsMongoRepository mongoRepository;

    @Value("${openframe.api-key-stats.redis-ttl}")
    private Long redisTtl;

    /**
     * Increment successful requests for an API key
     */
    public void incrementSuccessful(String keyId) {
        try {
            log.debug("Incrementing successful for keyId: {}", keyId);
            ApiKeyStats stats = getOrCreateRedisStats(keyId);
            stats.incrementSuccessful();
            redisRepository.save(stats);
        } catch (Exception e) {
            log.error("Failed to increment successful requests for keyId: {}", keyId, e);
        }
    }

    /**
     * Increment failed requests for an API key
     */
    public void incrementFailed(String keyId) {
        try {
            log.debug("Incrementing failed for keyId: {}", keyId);
            ApiKeyStats stats = getOrCreateRedisStats(keyId);
            stats.incrementFailed();
            redisRepository.save(stats);
        } catch (Exception e) {
            log.error("Failed to increment failed requests for keyId: {}", keyId, e);
        }
    }

    /**
     * Sync Redis data to MongoDB and clear Redis (called by scheduler)
     */
    public void syncToMongoAndClear() {
        try {
            log.info("Starting Redis to MongoDB sync");

            List<ApiKeyStats> allRedisStats = (List<ApiKeyStats>) redisRepository.findAll();
            log.info("Found {} stats records in Redis for sync", allRedisStats.size());

            for (ApiKeyStats redisStats : allRedisStats) {
                try {
                    syncSingleStatToMongo(redisStats);
                    redisRepository.deleteById(redisStats.getId());
                } catch (Exception e) {
                    log.error("Failed to sync/delete stats for keyId: {}", redisStats.getId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Error during Redis to MongoDB sync", e);
        }
    }

    /**
     * Get or create Redis stats record
     */
    private ApiKeyStats getOrCreateRedisStats(String keyId) {
        return redisRepository.findById(keyId)
                .orElseGet(() -> {
                    ApiKeyStats newStats = ApiKeyStats.builder()
                            .id(keyId)
                            .totalRequests(0L)
                            .successfulRequests(0L)
                            .failedRequests(0L)
                            .ttl(redisTtl)
                            .build();
                    log.debug("Created new Redis stats for keyId: {}", keyId);
                    return newStats;
                });
    }

    /**
     * Sync single Redis stats to MongoDB
     */
    private void syncSingleStatToMongo(ApiKeyStats redisStats) {
        try {
            ApiKeyStatsMongo mongoStats = mongoRepository.findById(redisStats.getId())
                    .orElse(ApiKeyStatsMongo.builder()
                            .id(redisStats.getId())
                            .totalRequests(0L)
                            .successfulRequests(0L)
                            .failedRequests(0L)
                            .build());

            mongoStats.setTotalRequests((mongoStats.getTotalRequests() != null ? mongoStats.getTotalRequests() : 0)
                    + (redisStats.getTotalRequests() != null ? redisStats.getTotalRequests() : 0));
            mongoStats.setSuccessfulRequests((mongoStats.getSuccessfulRequests() != null ? mongoStats.getSuccessfulRequests() : 0)
                    + (redisStats.getSuccessfulRequests() != null ? redisStats.getSuccessfulRequests() : 0));
            mongoStats.setFailedRequests((mongoStats.getFailedRequests() != null ? mongoStats.getFailedRequests() : 0)
                    + (redisStats.getFailedRequests() != null ? redisStats.getFailedRequests() : 0));

            if (redisStats.getLastUsed() != null) {
                if (mongoStats.getLastUsed() == null || redisStats.getLastUsed().isAfter(mongoStats.getLastUsed())) {
                    mongoStats.setLastUsed(redisStats.getLastUsed());
                }
            }

            mongoRepository.save(mongoStats);
            log.debug("Synced to MongoDB: keyId={}, newTotal={}, newSuccessful={}, newFailed={}",
                    mongoStats.getId(), mongoStats.getTotalRequests(),
                    mongoStats.getSuccessfulRequests(), mongoStats.getFailedRequests());

        } catch (Exception e) {
            log.error("Failed to sync stats to MongoDB for keyId: {}", redisStats.getId(), e);
            throw e;
        }
    }
} 