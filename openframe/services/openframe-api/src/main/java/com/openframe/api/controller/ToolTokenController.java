package com.openframe.api.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.model.IntegratedToolType;
import com.openframe.api.service.IntegratedToolTokenService;

@RestController
@RequestMapping("/api/tools/tokens")
public class ToolTokenController {
    private static final Logger logger = LoggerFactory.getLogger(ToolTokenController.class);
    
    private final IntegratedToolTokenService tokenService;

    public ToolTokenController(IntegratedToolTokenService tokenService) {
        this.tokenService = tokenService;
    }

    @GetMapping("/{toolType}")
    public ResponseEntity<Map<String, String>> getToken(@PathVariable IntegratedToolType toolType) {
        try {
            String token = tokenService.getActiveToken(toolType);
            return ResponseEntity.ok(Map.of("token", token));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{toolType}")
    public ResponseEntity<?> updateToken(
            @PathVariable IntegratedToolType toolType,
            @RequestBody Map<String, String> request) {
        
        String token = request.get("token");
        String metadata = request.get("metadata");

        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        if (metadata != null) {
            tokenService.updateToken(toolType, token, metadata);
        } else {
            tokenService.updateToken(toolType, token);
        }

        logger.info("Updated token for tool: {}", toolType.getDisplayName());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{toolType}")
    public ResponseEntity<Void> invalidateToken(@PathVariable IntegratedToolType toolType) {
        tokenService.invalidateCache(toolType);
        logger.info("Invalidated token cache for tool: {}", toolType.getDisplayName());
        return ResponseEntity.ok().build();
    }
} 