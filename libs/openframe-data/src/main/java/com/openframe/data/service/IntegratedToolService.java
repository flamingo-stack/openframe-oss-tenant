package com.openframe.data.service;

import java.util.List;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.data.repository.mongo.IntegratedToolRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "spring.data.mongodb.enabled", havingValue = "true", matchIfMissing = true)
public class IntegratedToolService {
    private final IntegratedToolRepository toolRepository;

    public List<IntegratedTool> getAllTools() {
        return toolRepository.findAll();
    }

    public Optional<IntegratedTool> getTool(String toolType) {
        return toolRepository.findByType(toolType);
    }

    public IntegratedTool saveTool(IntegratedTool tool) {
        return toolRepository.save(tool);
    }

    public String getActiveToken(String toolType) {
        Optional<IntegratedTool> tool = getTool(toolType);
        if (tool.isPresent() && tool.get().isEnabled() && tool.get().getCredentials() != null) {
            return tool.get().getCredentials().getToken();
        }
        return null;
    }
} 