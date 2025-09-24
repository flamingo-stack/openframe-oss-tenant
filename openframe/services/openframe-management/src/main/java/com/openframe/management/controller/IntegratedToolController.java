package com.openframe.management.controller;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.management.service.DebeziumService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/v1/tools")
@RequiredArgsConstructor
public class IntegratedToolController {

    private final IntegratedToolService toolService;
    private final DebeziumService debeziumService;

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
            debeziumService.createDebeziumConnector(savedTool.getDebeziumConnector());
            return Map.of("status", "success", "tool", savedTool);
        } catch (Exception e) {
            log.error("Failed to save tool: {}", id, e);
            return Map.of("status", "error", "message", e.getMessage());
        }
    }
} 