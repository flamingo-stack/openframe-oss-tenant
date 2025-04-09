package com.openframe.api.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    
    private static final Logger logger = LoggerFactory.getLogger(HealthController.class);
    
    @GetMapping({"/health", "/api/core/health"})
    public ResponseEntity<String> health() {
        logger.info("Health check endpoint called");
        return ResponseEntity.ok("OK");
    }
} 