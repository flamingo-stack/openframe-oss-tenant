package com.openframe.external.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/test")
public class TestController {
    
    @GetMapping
    public ResponseEntity<Map<String, Object>> testGet(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {
        
        log.info("External API test endpoint called - userId: {}, apiKeyId: {}", userId, apiKeyId);
        
        return ResponseEntity.ok(Map.of(
            "message", "External API Test Endpoint",
            "timestamp", LocalDateTime.now(),
            "method", "GET",
            "authenticated", userId != null || apiKeyId != null,
            "userId", userId != null ? userId : "N/A",
            "apiKeyId", apiKeyId != null ? apiKeyId : "N/A"
        ));
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> testPost(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-API-Key-Id", required = false) String apiKeyId) {
        
        log.info("External API test POST called - userId: {}, apiKeyId: {}, body: {}", userId, apiKeyId, body);
        
        return ResponseEntity.ok(Map.of(
            "message", "External API Test POST Endpoint",
            "timestamp", LocalDateTime.now(),
            "method", "POST",
            "receivedData", body != null ? body : Map.of(),
            "authenticated", userId != null || apiKeyId != null,
            "userId", userId != null ? userId : "N/A",
            "apiKeyId", apiKeyId != null ? apiKeyId : "N/A"
        ));
    }
} 