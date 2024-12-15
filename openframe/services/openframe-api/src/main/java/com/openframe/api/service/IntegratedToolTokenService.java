package com.openframe.api.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.openframe.api.model.IntegratedToolToken;
import com.openframe.api.model.IntegratedToolType;
import com.openframe.api.repository.IntegratedToolTokenRepository;

@Service
public class IntegratedToolTokenService {
    private static final Logger logger = LoggerFactory.getLogger(IntegratedToolTokenService.class);
    
    private final IntegratedToolTokenRepository tokenRepository;
    private final Map<IntegratedToolType, String> tokenCache;

    public IntegratedToolTokenService(IntegratedToolTokenRepository tokenRepository) {
        this.tokenRepository = tokenRepository;
        this.tokenCache = new ConcurrentHashMap<>();
    }

    public String getActiveToken(IntegratedToolType toolType) {
        // Try cache first
        String cachedToken = tokenCache.get(toolType);
        if (cachedToken != null) {
            return cachedToken;
        }

        // Try database
        return tokenRepository.findFirstByToolTypeAndActiveOrderByCreatedAtDesc(toolType, true)
            .map(token -> {
                tokenCache.put(toolType, token.getToken());
                return token.getToken();
            })
            .orElseThrow(() -> new RuntimeException("No active token found for " + toolType.getDisplayName()));
    }

    public void updateToken(IntegratedToolType toolType, String newToken) {
        // Deactivate all existing tokens for this tool
        tokenRepository.deactivateAllByToolType(toolType);

        // Create new active token
        IntegratedToolToken token = new IntegratedToolToken(toolType, newToken);
        tokenRepository.save(token);
        
        // Update cache
        tokenCache.put(toolType, newToken);
        
        logger.info("{} token updated successfully", toolType.getDisplayName());
    }

    public void updateToken(IntegratedToolType toolType, String newToken, String metadata) {
        IntegratedToolToken token = new IntegratedToolToken(toolType, newToken);
        token.setMetadata(metadata);
        updateToken(toolType, newToken);
    }

    @Scheduled(fixedDelay = 60000) // Refresh cache every minute
    public void refreshTokenCache() {
        for (IntegratedToolType toolType : IntegratedToolType.values()) {
            tokenRepository.findFirstByToolTypeAndActiveOrderByCreatedAtDesc(toolType, true)
                .ifPresent(token -> tokenCache.put(toolType, token.getToken()));
        }
    }

    public void invalidateCache(IntegratedToolType toolType) {
        tokenCache.remove(toolType);
    }

    public void invalidateAllCaches() {
        tokenCache.clear();
    }
} 