package com.openframe.api.controller.management;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.config.ManagementConfig;
import com.openframe.api.service.IntegratedToolTokenService;
import com.openframe.data.model.IntegratedToolType;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/v1/tools")
@RequiredArgsConstructor
public class TokenManagementController {
    private static final Logger logger = LoggerFactory.getLogger(TokenManagementController.class);
    
    private final IntegratedToolTokenService tokenService;
    private final ManagementConfig managementConfig;

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @PostMapping("/{toolType}/register-token")
    public ResponseEntity<?> registerToken(
            @PathVariable IntegratedToolType toolType,
            @RequestBody Map<String, String> request,
            @RequestHeader("X-Management-Key") String managementKey) {
        
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
            tokenService.saveToken(toolType, token);
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