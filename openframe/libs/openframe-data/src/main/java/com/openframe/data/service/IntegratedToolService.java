package com.openframe.data.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.openframe.data.model.IntegratedTool;
import com.openframe.data.repository.IntegratedToolRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
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