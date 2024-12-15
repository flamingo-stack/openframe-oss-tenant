package com.openframe.data.service;

import java.util.List;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.openframe.data.model.IntegratedTool;
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
        return toolRepository.findByToolType(toolType);
    }

    public IntegratedTool saveTool(IntegratedTool tool) {
        return toolRepository.save(tool);
    }

    public String getActiveToken(String toolType) {
        return getTool(toolType)
            .filter(IntegratedTool::isEnabled)
            .map(IntegratedTool::getToken)
            .orElse(null);
    }
} 