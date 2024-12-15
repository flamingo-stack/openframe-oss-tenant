package com.openframe.api.service;

import org.springframework.stereotype.Service;

import com.openframe.data.model.IntegratedToolToken;
import com.openframe.data.model.IntegratedToolType;
import com.openframe.data.repository.IntegratedToolTokenRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class IntegratedToolTokenService {
    private final IntegratedToolTokenRepository repository;

    public String getActiveToken(IntegratedToolType toolType) {
        return repository.findFirstByToolTypeAndActiveOrderByCreatedAtDesc(toolType, true)
                .map(IntegratedToolToken::getToken)
                .orElse(null);
    }

    public void saveToken(IntegratedToolType toolType, String token) {
        // Deactivate all existing tokens for this tool
        repository.deactivateAllByToolType(toolType);

        // Create and save new token
        IntegratedToolToken newToken = new IntegratedToolToken();
        newToken.setToolType(toolType);
        newToken.setToken(token);
        newToken.setActive(true);
        repository.save(newToken);
    }
} 