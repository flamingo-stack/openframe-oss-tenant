package com.openframe.data.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;

@Service
public class ToolUrlService {

    public Optional<ToolUrl> getUrlByToolType(IntegratedTool integratedTool, ToolUrlType toolType) {
        List<ToolUrl> toolUrls = integratedTool.getToolUrls();
        return toolUrls.stream()
            .filter(toolUrl -> toolUrl.getType().equals(toolType))
            .findFirst();
    }

} 