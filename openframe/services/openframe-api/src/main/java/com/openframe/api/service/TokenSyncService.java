package com.openframe.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;

import com.openframe.api.model.IntegratedToolType;

public abstract class TokenSyncService {
    protected final Logger logger = LoggerFactory.getLogger(getClass());
    protected final IntegratedToolTokenService tokenService;
    protected final IntegratedToolType toolType;

    protected TokenSyncService(IntegratedToolTokenService tokenService, IntegratedToolType toolType) {
        this.tokenService = tokenService;
        this.toolType = toolType;
    }

    @Scheduled(fixedDelay = 30000) // Check every 30 seconds
    public void syncToken() {
        try {
            String token = fetchToken();
            if (token != null && !token.isEmpty()) {
                tokenService.updateToken(toolType, token);
                logger.debug("{} token synchronized successfully", toolType.getDisplayName());
            }
        } catch (Exception e) {
            logger.warn("Failed to sync {} token: {}", toolType.getDisplayName(), e.getMessage());
        }
    }

    // Each tool implementation must provide its own token fetching logic
    protected abstract String fetchToken() throws Exception;
} 