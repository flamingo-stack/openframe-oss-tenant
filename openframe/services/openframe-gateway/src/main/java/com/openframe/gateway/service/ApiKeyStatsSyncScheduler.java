package com.openframe.gateway.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "openframe.api-key-stats.enabled", havingValue = "true", matchIfMissing = true)
public class ApiKeyStatsSyncScheduler {

    private final ApiKeyStatsService apiKeyStatsService;

    @PostConstruct
    public void init() {
        log.info("ApiKeyStatsSyncScheduler initialized");
    }

    @Scheduled(fixedDelayString = "${openframe.api-key-stats.sync-interval}")
    public void syncStatsToMongo() {
        log.info("Starting scheduled Redis to MongoDB sync");

        try {
            apiKeyStatsService.syncToMongoAndClear();
            log.info("Completed scheduled Redis to MongoDB sync successfully");
        } catch (Exception e) {
            log.error("Failed to sync Redis stats to MongoDB", e);
        }
    }
} 