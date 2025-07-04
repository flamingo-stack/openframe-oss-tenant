package com.openframe.management.scheduler;

import com.openframe.management.service.ApiKeyStatsSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "openframe.api-key-stats.enabled", havingValue = "true", matchIfMissing = true)
public class ApiKeyStatsSyncScheduler {

    private final ApiKeyStatsSyncService syncService;

    @PostConstruct
    public void init() {
        log.info("ApiKeyStatsSyncScheduler initialized with distributed locking");
    }

    @Scheduled(fixedDelayString = "${openframe.api-key-stats.sync-interval}")
    @SchedulerLock(name = "apiKeyStatsSync", 
                   lockAtMostFor = "${openframe.api-key-stats.lock-at-most-for:10m}", 
                   lockAtLeastFor = "${openframe.api-key-stats.lock-at-least-for:1m}")
    public void syncStatsToMongo() {
        log.info("Starting scheduled Redis to MongoDB sync");
        try {
            syncService.syncStatsToMongo();
            log.info("Completed scheduled Redis to MongoDB sync successfully");
        } catch (Exception e) {
            log.error("Failed to sync Redis stats to MongoDB", e);
        }
    }
} 