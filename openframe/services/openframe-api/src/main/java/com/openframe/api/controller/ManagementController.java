package com.openframe.api.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.config.ManagementConfig;
import com.openframe.api.model.IntegratedToolType;
import com.openframe.api.service.IntegratedToolTokenService;

@RestController
@RequestMapping("/management/v1")
public class ManagementController {
    private static final Logger logger = LoggerFactory.getLogger(ManagementController.class);
    
    private final IntegratedToolTokenService tokenService;
    private final ManagementConfig managementConfig;

    public ManagementController(IntegratedToolTokenService tokenService, ManagementConfig managementConfig) {
        this.tokenService = tokenService;
        this.managementConfig = managementConfig;
    }

    @PostMapping("/tools/{toolType}/register-token")
    public ResponseEntity<?> registerToken(
            @PathVariable IntegratedToolType toolType,
            @RequestBody Map<String, String> request,
            @RequestHeader("X-Management-Key") String managementKey,
            @RequestHeader(value = "X-Tool-Metadata", required = false) String metadata) {
        
        // Validate management key
        if (!isValidManagementKey(managementKey)) {
            logger.warn("Invalid management key used for tool: {}", toolType);
            return ResponseEntity.status(403).build();
        }

        String token = request.get("token");
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token is required"));
        }

        try {
            if (metadata != null) {
                tokenService.updateToken(toolType, token, metadata);
            } else {
                tokenService.updateToken(toolType, token);
            }
            
            logger.info("Successfully registered token for tool: {}", toolType);
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (Exception e) {
            logger.error("Failed to register token for tool: {}", toolType, e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to register token"));
        }
    }

    private boolean isValidManagementKey(String key) {
        return managementConfig.getKey() != null && 
               managementConfig.getKey().equals(key);
    }
} 