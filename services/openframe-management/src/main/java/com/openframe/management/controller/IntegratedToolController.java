package com.openframe.management.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.data.model.IntegratedTool;
import com.openframe.data.service.IntegratedToolService;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1/tools")
@RequiredArgsConstructor
public class IntegratedToolController {

    private final IntegratedToolService toolService;

    @GetMapping
    public Map<String, Object> getTools() {
        return Map.of(
            "status", "success",
            "tools", toolService.getAllTools()
        );
    }

    @GetMapping("/{id}")
    public Map<String, Object> getTool(@PathVariable String id) {
        return toolService.getTool(id)
            .map(tool -> Map.of("status", "success", "tool", tool))
            .orElse(Map.of("status", "error", "message", "Tool not found"));
    }

    @Data
    public static class SaveToolRequest {
        private IntegratedTool tool;
    }

    @PostMapping("/{id}")
    public Map<String, Object> saveTool(
            @PathVariable String id,
            @RequestBody SaveToolRequest request) {
        try {
            IntegratedTool tool = request.getTool();
            tool.setId(id);
            tool.setEnabled(true);

            IntegratedTool savedTool = toolService.saveTool(tool);
            log.info("Successfully saved tool configuration for: {}", id);
            return Map.of("status", "success", "tool", savedTool);
        } catch (Exception e) {
            log.error("Failed to save tool: {}", id, e);
            return Map.of("status", "error", "message", e.getMessage());
        }
    }
} 